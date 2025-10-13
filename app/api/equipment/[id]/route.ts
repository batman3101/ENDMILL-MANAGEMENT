import { NextRequest, NextResponse } from 'next/server';
import { serverSupabaseService } from '@/lib/services/supabaseService';
import { logger } from '@/lib/utils/logger';

// GET: 설비 상세 조회 (CAM Sheet 기준 T번호 정보 + 실제 사용 현황)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: '설비 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 1. 설비 기본 정보 조회
    const equipment = await serverSupabaseService.equipment.getById(id);

    if (!equipment) {
      return NextResponse.json(
        { error: '설비를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    logger.log(`📋 설비 정보: ${equipment.equipment_number}, 모델: ${equipment.current_model}, 공정: ${equipment.process}`);

    // 2. 해당 모델/공정의 CAM Sheet 조회
    const camSheets = await serverSupabaseService.camSheet.getByModelAndProcess(
      equipment.current_model || '',
      equipment.process || ''
    );

    if (!camSheets || camSheets.length === 0) {
      logger.log(`⚠️ CAM Sheet가 없습니다: ${equipment.current_model} / ${equipment.process}`);
      return NextResponse.json({
        success: true,
        data: {
          id: equipment.id,
          equipmentNumber: equipment.equipment_number,
          modelCode: equipment.model_code,
          currentModel: equipment.current_model,
          process: equipment.process,
          location: equipment.location,
          status: equipment.status,
          toolPositionCount: equipment.tool_position_count,
          createdAt: equipment.created_at,
          updatedAt: equipment.updated_at,
          toolPositions: [],
          stats: {
            totalPositions: 0,
            usedPositions: 0,
            emptyPositions: 0,
            usagePercentage: 0
          }
        }
      });
    }

    const camSheet = camSheets[0];
    logger.log(`✅ CAM Sheet 발견: ${camSheet.id}, 엔드밀 수: ${camSheet.endmills?.length || 0}`);

    // 3. CAM Sheet의 엔드밀 정보 조회
    const camSheetEndmills = await serverSupabaseService.camSheet.getEndmills(camSheet.id);
    logger.log(`🔧 CAM Sheet 엔드밀 상세 정보: ${camSheetEndmills.length}개`);

    // 4. tool_positions에서 실제 사용 현황 조회
    const toolPositions = equipment.tool_positions || [];
    logger.log(`📌 tool_positions: ${toolPositions.length}개`);

    // 4.5. 모든 앤드밀 코드의 실제 평균 수명 계산 (교체 실적 기반)
    const endmillCodes = camSheetEndmills.map((ce: any) => ce.endmill_code).filter(Boolean);
    const supabase = (serverSupabaseService.toolChange as any).supabase;

    const averageLifeMap: Record<string, number> = {};
    const lastChangeDateMap: Record<string, string> = {}; // T번호별 최근 교체일

    if (endmillCodes.length > 0) {
      const { data: allToolChanges } = await supabase
        .from('tool_changes')
        .select('endmill_code, tool_life, t_number, change_date, equipment_number')
        .in('endmill_code', endmillCodes)
        .eq('equipment_number', equipment.equipment_number);

      // 각 앤드밀 코드별로 평균 계산
      if (allToolChanges && allToolChanges.length > 0) {
        const groupedByCode: Record<string, number[]> = {};

        allToolChanges.forEach((tc: any) => {
          if (!groupedByCode[tc.endmill_code]) {
            groupedByCode[tc.endmill_code] = [];
          }
          if (tc.tool_life) {
            groupedByCode[tc.endmill_code].push(tc.tool_life);
          }

          // T번호별 최근 교체일 저장
          const key = `T${tc.t_number}`;
          if (!lastChangeDateMap[key] || tc.change_date > lastChangeDateMap[key]) {
            lastChangeDateMap[key] = tc.change_date;
          }
        });

        // 각 코드별 평균 계산
        Object.keys(groupedByCode).forEach(code => {
          const lives = groupedByCode[code];
          if (lives.length > 0) {
            averageLifeMap[code] = Math.round(lives.reduce((sum, life) => sum + life, 0) / lives.length);
          }
        });
      }
    }

    logger.log(`📊 실제 평균 수명 맵:`, averageLifeMap);
    logger.log(`📅 T번호별 최근 교체일:`, lastChangeDateMap);

    // 5. CAM Sheet의 각 T번호별로 데이터 구성
    const toolPositionsData = camSheetEndmills.map((camEndmill: any) => {
      const tNumber = camEndmill.t_number;

      // tool_positions에서 해당 T번호의 실제 사용 현황 찾기
      const actualPosition = toolPositions.find((tp: any) => tp.position_number === tNumber);

      // 기본 앤드밀 정보 (CAM Sheet 기준)
      const endmillInfo = {
        code: camEndmill.endmill_code || '',
        name: camEndmill.endmill_name || camEndmill.endmill_type?.name || '',
        categoryCode: camEndmill.endmill_type?.endmill_categories?.code || '',
        categoryName: camEndmill.endmill_type?.endmill_categories?.name_ko || '',
        standardLife: camEndmill.tool_life || camEndmill.endmill_type?.standard_life || 0,
        unitCost: camEndmill.endmill_type?.unit_cost || 0,
        specifications: camEndmill.specifications || ''
      };

      // 실제 평균 수명 (교체 실적 기반 누적 평균값)
      const averageActualLife = averageLifeMap[camEndmill.endmill_code] || null;

      // CAM Sheet의 표준 Tool Life (항상 CAM Sheet 기준)
      const camSheetToolLife = endmillInfo.standardLife;

      // 수명 사용률: 실제 누적 평균 수명 / CAM Sheet 표준 수명
      // 교체 실적이 없으면 null 반환
      const usagePercentage = averageActualLife && camSheetToolLife > 0
        ? Math.round((averageActualLife / camSheetToolLife) * 100)
        : null;

      // 실제 장착일: tool_changes에서 가장 최근 교체일 사용
      const tKey = `T${tNumber}`;
      const actualInstallDate = lastChangeDateMap[tKey] || null;

      // 상태: 교체 실적이 있으면 'in_use', 없으면 'no_data'
      const status = averageActualLife !== null ? 'in_use' : 'no_data';

      return {
        id: actualPosition?.id || `cam-${camEndmill.id}`,
        positionNumber: tNumber,
        currentLife: averageActualLife,  // 실제 누적 평균값 (없으면 null)
        totalLife: camSheetToolLife,     // CAM Sheet 기준 Tool Life
        installDate: actualInstallDate,  // tool_changes의 최근 교체일 (없으면 null)
        status: status,                   // 교체 실적 기반 상태
        usagePercentage,  // 없으면 null
        endmill: endmillInfo
      };
    }).sort((a, b) => a.positionNumber - b.positionNumber);

    // 6. 통계 계산
    const stats = {
      totalPositions: toolPositionsData.length,
      usedPositions: toolPositionsData.filter(tp => tp.status === 'in_use').length,
      emptyPositions: toolPositionsData.filter(tp => tp.status === 'no_data').length,
      usagePercentage: toolPositionsData.length > 0
        ? Math.round((toolPositionsData.filter(tp => tp.status === 'in_use').length / toolPositionsData.length) * 100)
        : 0
    };

    logger.log(`📊 통계: 전체 ${stats.totalPositions}, 실적있음 ${stats.usedPositions}, 미등록 ${stats.emptyPositions}`);

    // 설비 데이터
    const equipmentData = {
      id: equipment.id,
      equipmentNumber: equipment.equipment_number,
      modelCode: equipment.model_code,
      currentModel: equipment.current_model,
      process: equipment.process,
      location: equipment.location,
      status: equipment.status,
      toolPositionCount: equipment.tool_position_count,
      createdAt: equipment.created_at,
      updatedAt: equipment.updated_at,
      toolPositions: toolPositionsData,
      stats
    };

    return NextResponse.json({
      success: true,
      data: equipmentData
    });

  } catch (error) {
    logger.error('설비 상세 조회 API 에러:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 설비 정보 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: '설비 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 설비 업데이트
    const updatedEquipment = await serverSupabaseService.equipment.update(id, body);

    return NextResponse.json({
      success: true,
      data: updatedEquipment,
      message: '설비가 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    logger.error('설비 업데이트 API 에러:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 설비 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: '설비 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await serverSupabaseService.equipment.delete(id);

    return NextResponse.json({
      success: true,
      message: '설비가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    logger.error('설비 삭제 API 에러:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}
