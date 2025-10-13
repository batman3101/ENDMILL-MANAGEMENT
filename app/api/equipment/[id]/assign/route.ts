import { NextRequest, NextResponse } from 'next/server';
import { serverSupabaseService } from '@/lib/services/supabaseService';
import { createServerClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

// PUT: 설비 배정 변경 (모델/공정 변경 시 tool_positions 자동 업데이트)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { currentModel, process } = body;

    if (!id) {
      return NextResponse.json(
        { error: '설비 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!currentModel || !process) {
      return NextResponse.json(
        { error: '모델과 공정을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 1. 설비 정보 조회
    const equipment = await serverSupabaseService.equipment.getById(id);
    if (!equipment) {
      return NextResponse.json(
        { error: '설비를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    logger.log('🔧 설비 배정 변경 시작:', {
      equipmentId: id,
      equipmentNumber: equipment.equipment_number,
      oldModel: equipment.current_model,
      oldProcess: equipment.process,
      newModel: currentModel,
      newProcess: process
    });

    // 2. 새 모델/공정에 맞는 CAM Sheet 조회
    const camSheets = await serverSupabaseService.camSheet.getByModelAndProcess(currentModel, process);

    if (!camSheets || camSheets.length === 0) {
      logger.warn('⚠️ CAM Sheet를 찾을 수 없습니다:', { currentModel, process });
      return NextResponse.json(
        { error: `해당 모델(${currentModel})과 공정(${process})에 대한 CAM Sheet가 등록되지 않았습니다.` },
        { status: 404 }
      );
    }

    const camSheet = camSheets[0];
    logger.log('✅ CAM Sheet 조회 완료:', {
      camSheetId: camSheet.id,
      model: camSheet.model,
      process: camSheet.process,
      endmillsCount: camSheet.endmills?.length || 0
    });

    // 3. CAM Sheet의 앤드밀 목록 조회
    const camSheetEndmills = await serverSupabaseService.camSheet.getEndmills(camSheet.id);

    if (!camSheetEndmills || camSheetEndmills.length === 0) {
      logger.warn('⚠️ CAM Sheet에 등록된 앤드밀이 없습니다');
    }

    // 4. Supabase 클라이언트로 tool_positions 업데이트
    const supabase = createServerClient();

    // 현재 설비의 tool_positions 조회
    const { data: toolPositions, error: fetchError } = await supabase
      .from('tool_positions')
      .select('id, position_number, endmill_type_id, status')
      .eq('equipment_id', equipment.id);

    if (fetchError) {
      logger.error('❌ tool_positions 조회 실패:', fetchError);
      throw fetchError;
    }

    logger.log('📊 현재 tool_positions:', {
      totalCount: toolPositions?.length || 0,
      inUseCount: toolPositions?.filter(tp => tp.status === 'in_use').length || 0
    });

    // 5. CAM Sheet의 모든 T번호에 대해 tool_positions 처리 (생성 또는 업데이트)
    const processPromises = (camSheetEndmills || []).map(async (camEndmill: any) => {
      const tNumber = camEndmill.t_number;
      const toolLife = camEndmill.tool_life || 0;

      // 해당 T번호의 tool_position 레코드가 있는지 확인
      const existingPosition = toolPositions?.find(tp => tp.position_number === tNumber);

      if (!existingPosition) {
        // 레코드가 없으면 새로 생성하고 CAM Sheet의 앤드밀 자동 장착
        const { error: insertError } = await supabase
          .from('tool_positions')
          .insert({
            equipment_id: equipment.id,
            position_number: tNumber,
            endmill_type_id: camEndmill.endmill_type_id,
            current_life: 0,
            total_life: toolLife,
            status: 'in_use',
            install_date: new Date().toISOString()
          });

        if (insertError) {
          logger.error('❌ tool_position 생성 실패:', {
            positionNumber: tNumber,
            error: insertError
          });
          throw insertError;
        }

        logger.log('✅ tool_position 생성 및 앤드밀 자동 장착:', {
          positionNumber: tNumber,
          endmillTypeId: camEndmill.endmill_type_id,
          totalLife: toolLife
        });

        return {
          positionNumber: tNumber,
          action: 'created_and_installed',
          endmillTypeId: camEndmill.endmill_type_id,
          newTotalLife: toolLife
        };
      } else {
        // 레코드가 있으면 업데이트
        // 앤드밀이 장착되어 있으면 total_life 업데이트
        if (existingPosition.endmill_type_id && existingPosition.status === 'in_use') {
          // CAM Sheet에서 해당 앤드밀의 tool_life 찾기
          const matchingCamSheetEndmill = camSheetEndmills?.find(
            (cse: any) => cse.endmill_type_id === existingPosition.endmill_type_id
          );

          if (matchingCamSheetEndmill && matchingCamSheetEndmill.tool_life) {
            const { error: updateError } = await supabase
              .from('tool_positions')
              .update({ total_life: matchingCamSheetEndmill.tool_life })
              .eq('id', existingPosition.id);

            if (updateError) {
              logger.error('❌ tool_position 업데이트 실패:', {
                positionId: existingPosition.id,
                positionNumber: existingPosition.position_number,
                error: updateError
              });
              throw updateError;
            }

            logger.log('✅ tool_position 업데이트 (in_use):', {
              positionNumber: existingPosition.position_number,
              endmillTypeId: existingPosition.endmill_type_id,
              newTotalLife: matchingCamSheetEndmill.tool_life
            });

            return {
              positionNumber: existingPosition.position_number,
              action: 'updated',
              newTotalLife: matchingCamSheetEndmill.tool_life
            };
          } else {
            logger.warn('⚠️ CAM Sheet에 해당 앤드밀 사양이 없습니다:', {
              positionNumber: existingPosition.position_number,
              endmillTypeId: existingPosition.endmill_type_id
            });
            return {
              positionNumber: existingPosition.position_number,
              action: 'skipped',
              reason: 'no_cam_sheet_spec'
            };
          }
        } else {
          // 비어있으면 CAM Sheet의 앤드밀 자동 장착
          const { error: updateError } = await supabase
            .from('tool_positions')
            .update({
              endmill_type_id: camEndmill.endmill_type_id,
              current_life: 0,
              total_life: toolLife,
              status: 'in_use',
              install_date: new Date().toISOString()
            })
            .eq('id', existingPosition.id);

          if (updateError) {
            logger.error('❌ tool_position 업데이트 실패:', {
              positionId: existingPosition.id,
              positionNumber: existingPosition.position_number,
              error: updateError
            });
            throw updateError;
          }

          logger.log('✅ tool_position 업데이트 및 앤드밀 자동 장착:', {
            positionNumber: existingPosition.position_number,
            endmillTypeId: camEndmill.endmill_type_id,
            newTotalLife: toolLife
          });

          return {
            positionNumber: existingPosition.position_number,
            action: 'installed',
            endmillTypeId: camEndmill.endmill_type_id,
            newTotalLife: toolLife
          };
        }
      }
    });

    const updateResults = await Promise.all(processPromises);
    const createdCount = updateResults.filter(r => r.action === 'created_and_installed').length;
    const installedCount = updateResults.filter(r => r.action === 'installed').length;
    const updatedCount = updateResults.filter(r => r.action === 'updated').length;

    logger.log('📊 tool_positions 처리 완료:', {
      totalPositions: updateResults.length,
      createdAndInstalledCount: createdCount,
      installedCount,
      updatedCount,
      skippedCount: updateResults.filter(r => r.action === 'skipped').length
    });

    // 6. 설비 정보 업데이트 (current_model, process, updated_at)
    // equipment.id는 UUID이므로 반드시 이를 사용해야 함
    const updatedEquipment = await serverSupabaseService.equipment.update(equipment.id, {
      current_model: currentModel,
      process: process,
      updated_at: new Date().toISOString()
    });

    logger.log('✅ 설비 배정 변경 완료:', {
      equipmentId: id,
      equipmentNumber: updatedEquipment.equipment_number,
      newModel: currentModel,
      newProcess: process,
      createdAndInstalledPositions: createdCount,
      installedPositions: installedCount,
      updatedPositions: updatedCount
    });

    const totalInstalledCount = createdCount + installedCount;

    return NextResponse.json({
      success: true,
      data: {
        equipment: updatedEquipment,
        camSheet: {
          id: camSheet.id,
          model: camSheet.model,
          process: camSheet.process
        },
        updateResults: {
          totalPositions: updateResults.length,
          createdAndInstalledPositions: createdCount,
          installedPositions: installedCount,
          updatedPositions: updatedCount,
          skippedPositions: updateResults.filter(r => r.action === 'skipped').length,
          details: updateResults
        }
      },
      message: `설비 배정이 변경되었습니다. CAM Sheet 기준으로 ${totalInstalledCount}개 앤드밀이 자동 장착되었습니다.`
    });

  } catch (error) {
    logger.error('❌ 설비 배정 변경 API 에러:', error);

    // 더 자세한 에러 정보 로깅
    if (error instanceof Error) {
      logger.error('Error name:', error.name);
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
    }

    // Supabase 에러인 경우 추가 정보 로깅
    if (error && typeof error === 'object' && 'code' in error) {
      logger.error('Supabase error code:', (error as any).code);
      logger.error('Supabase error details:', (error as any).details);
      logger.error('Supabase error hint:', (error as any).hint);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '서버 에러가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
