import { NextRequest, NextResponse } from 'next/server';
import { serverSupabaseService } from '../../../lib/services/supabaseService';
import { z } from 'zod';

// 설비 생성 스키마
const createEquipmentSchema = z.object({
  equipment_number: z.union([
    z.string().regex(/^C\d{3}$/), // C001 형식
    z.number().int().min(1).max(999) // 기존 숫자 형식도 지원
  ]),
  model_code: z.string().min(1),
  location: z.string().optional(),
  status: z.union([
    z.enum(['active', 'maintenance', 'offline']),
    z.enum(['가동중', '점검중', '셋업중'])
  ]).optional(),
});

// GET: 설비 목록 조회
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')
    const modelFilter = url.searchParams.get('model')
    const locationFilter = url.searchParams.get('location')

    // Supabase에서 설비 데이터 조회
    let equipments = await serverSupabaseService.equipment.getAll()

    // CAM Sheet 데이터 가져오기
    const camSheets = await serverSupabaseService.camSheet.getAll()
    console.log('🔍 CAM Sheet 데이터:', camSheets.length, '개')

    // 각 설비에 대해 툴 포지션 정보 추가
    const equipmentsWithToolUsage = await Promise.all(
      equipments.map(async (equipment) => {
        try {
          console.log(`🔧 설비 처리 중: ${equipment.equipment_number} (모델: ${equipment.current_model}, 공정: ${equipment.process})`)

          // 해당 설비의 모델과 공정에 맞는 CAM Sheet 찾기
          const camSheet = camSheets.find(sheet =>
            sheet.model === equipment.current_model &&
            sheet.process === equipment.process
          )

          let usedPositions = 0
          let totalPositions = equipment.tool_position_count || 21

          if (camSheet) {
            console.log(`✅ CAM Sheet 발견: ${camSheet.id} (모델: ${camSheet.model}, 공정: ${camSheet.process})`)
            // CAM Sheet에서 엔드밀 데이터 가져오기
            const endmills = await serverSupabaseService.camSheet.getEndmills(camSheet.id)
            console.log(`🔧 엔드밀 데이터:`, endmills?.length, '개')

            if (endmills && endmills.length > 0) {
              // 등록된 엔드밀 수 = 사용중인 포지션 수
              usedPositions = endmills.length
              // 최대 T 번호를 툴 포지션 수로 사용
              const maxTNumber = Math.max(...endmills.map(e => e.t_number || 0))
              if (maxTNumber > 0) {
                totalPositions = maxTNumber
              }
              console.log(`📊 사용량 계산: ${usedPositions}/${totalPositions}`)
            }
          } else {
            console.log('❌ 매칭되는 CAM Sheet 없음')
          }

          return {
            ...equipment,
            used_tool_positions: usedPositions,
            total_tool_positions: totalPositions,
            tool_usage_percentage: totalPositions > 0 ? Math.round((usedPositions / totalPositions) * 100) : 0
          }
        } catch (error) {
          console.error(`설비 ${equipment.id} 툴 포지션 정보 조회 실패:`, error)
          return {
            ...equipment,
            used_tool_positions: 0,
            total_tool_positions: equipment.tool_position_count || 21,
            tool_usage_percentage: 0
          }
        }
      })
    )

    equipments = equipmentsWithToolUsage

    // 필터 적용
    if (statusFilter) {
      equipments = equipments.filter(eq => eq.status === statusFilter)
    }
    if (modelFilter) {
      equipments = equipments.filter(eq => eq.model_code === modelFilter)
    }
    if (locationFilter) {
      equipments = equipments.filter(eq => eq.location === locationFilter)
    }

    // 통계 계산
    const stats = await serverSupabaseService.equipment.getStats()
    
    return NextResponse.json({
      success: true,
      data: equipments,
      count: equipments.length,
      stats
    });
    
  } catch (error) {
    console.error('설비 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 설비 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 검증
    const validatedData = createEquipmentSchema.parse(body);

    // 새 설비 생성
    const newEquipment = await serverSupabaseService.equipment.create({
      equipment_number: validatedData.equipment_number.toString(),
      model_code: validatedData.model_code,
      location: (validatedData.location || 'A동') as 'A동' | 'B동',
      status: (validatedData.status === 'active' || !validatedData.status) ? '가동중' : validatedData.status as '가동중' | '점검중' | '셋업중',
      current_model: validatedData.model_code, // current_model 추가
      process: body.process || 'CNC1', // process 추가
      tool_position_count: 21 // 기본값 추가
    })
    
    return NextResponse.json({
      success: true,
      data: newEquipment,
      message: '설비가 성공적으로 생성되었습니다.',
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: '입력 데이터가 올바르지 않습니다.',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    console.error('설비 생성 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 설비 상태 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, model_code } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: '설비 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 설비 업데이트
    const updatedEquipment = await serverSupabaseService.equipment.update(id, {
      ...(status && { status }),
      ...(model_code && { model_code }),
    })
    
    return NextResponse.json({
      success: true,
      data: updatedEquipment,
      message: '설비가 성공적으로 업데이트되었습니다.',
    });
    
  } catch (error) {
    console.error('설비 업데이트 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
} 