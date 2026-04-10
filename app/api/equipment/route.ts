import { NextRequest, NextResponse } from 'next/server';
import { serverSupabaseService } from '../../../lib/services/supabaseService';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions';

// 동적 라우트로 명시적 설정 (cookies 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

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
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 읽기 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canRead = hasPermission(userRole, 'equipment', 'read', customPermissions)
    if (!canRead) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const statusFilter = url.searchParams.get('status')
    const modelFilter = url.searchParams.get('model')
    const locationFilter = url.searchParams.get('location')
    const factoryId = url.searchParams.get('factoryId') || undefined

    // Supabase에서 설비 데이터 조회
    let equipments = await serverSupabaseService.equipment.getAll({ factoryId })

    // CAM Sheet 데이터 가져오기
    const camSheets = await serverSupabaseService.camSheet.getAll({ factoryId })
    logger.log('🔍 CAM Sheet 데이터:', camSheets.length, '개')

    // 각 설비에 대해 툴 포지션 정보 추가 (N+1 제거: camSheets.getAll()이 이미 endmills 포함)
    const equipmentsWithToolUsage = equipments.map((equipment) => {
      try {
        // 해당 설비의 모델과 공정에 맞는 CAM Sheet 찾기
        const camSheet = camSheets.find(sheet =>
          sheet.model === equipment.current_model &&
          sheet.process === equipment.process
        )

        let usedPositions = 0
        let totalPositions = equipment.tool_position_count || 21

        if (camSheet) {
          // camSheets.getAll()이 이미 endmills를 포함하므로 추가 DB 쿼리 불필요
          const endmills = camSheet.endmills || []

          if (endmills.length > 0) {
            usedPositions = endmills.length
            const maxTNumber = Math.max(...endmills.map((e: any) => e.t_number || 0))
            if (maxTNumber > 0) {
              totalPositions = maxTNumber
            }
          }
        }

        return {
          ...equipment,
          used_tool_positions: usedPositions,
          total_tool_positions: totalPositions,
          tool_usage_percentage: totalPositions > 0 ? Math.round((usedPositions / totalPositions) * 100) : 0
        }
      } catch (error) {
        logger.error(`설비 ${equipment.id} 툴 포지션 정보 조회 실패:`, error)
        return {
          ...equipment,
          used_tool_positions: 0,
          total_tool_positions: equipment.tool_position_count || 21,
          tool_usage_percentage: 0
        }
      }
    })

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
    const stats = await serverSupabaseService.equipment.getStats({ factoryId })
    
    return NextResponse.json({
      success: true,
      data: equipments,
      count: equipments.length,
      stats
    });
    
  } catch (error) {
    logger.error('설비 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 설비 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 생성 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canCreate = hasPermission(userRole, 'equipment', 'create', customPermissions)
    if (!canCreate) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const body = await request.json();

    // 입력 데이터 검증
    const validatedData = createEquipmentSchema.parse(body);

    const currentModel = validatedData.model_code;
    const process = body.process || 'CNC1';
    const factoryId = body.factory_id || null;

    // equipment_number 변환 (string "C001" → number 1)
    let equipmentNumber: number;
    if (typeof validatedData.equipment_number === 'string') {
      // "C001" → 1
      equipmentNumber = parseInt(validatedData.equipment_number.replace(/^C/i, '')) || 0;
    } else {
      // 이미 number
      equipmentNumber = validatedData.equipment_number;
    }

    // 새 설비 생성
    const newEquipment = await serverSupabaseService.equipment.create({
      equipment_number: equipmentNumber,
      model_code: validatedData.model_code,
      location: (validatedData.location || 'A동') as 'A동' | 'B동',
      status: (validatedData.status === 'active' || !validatedData.status) ? '가동중' : validatedData.status as '가동중' | '점검중' | '셋업중',
      current_model: currentModel,
      process: process,
      tool_position_count: 21,
      ...(factoryId && { factory_id: factoryId })
    } as any)

    logger.log('✅ 설비 생성 완료:', {
      equipmentId: newEquipment.id,
      equipmentNumber: newEquipment.equipment_number,
      model: currentModel,
      process: process
    });

    // CAM Sheet 조회
    const camSheets = await serverSupabaseService.camSheet.getByModelAndProcess(currentModel, process, { factoryId });

    if (camSheets && camSheets.length > 0) {
      const camSheet = camSheets[0];
      logger.log('✅ CAM Sheet 발견:', {
        camSheetId: camSheet.id,
        model: camSheet.model,
        process: camSheet.process
      });

      // CAM Sheet의 앤드밀 목록 조회
      const camSheetEndmills = await serverSupabaseService.camSheet.getEndmills(camSheet.id);

      if (camSheetEndmills && camSheetEndmills.length > 0) {
        // Supabase 클라이언트로 tool_positions 생성
        const { createServerClient } = await import('@/lib/supabase/client');
        const supabase = createServerClient();

        // 각 T번호에 대해 tool_positions 레코드 생성
        const insertPromises = camSheetEndmills.map(async (camEndmill: any) => {
          const tNumber = camEndmill.t_number;
          const toolLife = camEndmill.tool_life || 0;

          return supabase.from('tool_positions').insert({
            equipment_id: newEquipment.id,
            position_number: tNumber,
            endmill_type_id: null,
            current_life: 0,
            total_life: toolLife,
            status: 'empty',
            install_date: null
          });
        });

        await Promise.all(insertPromises);

        logger.log('✅ tool_positions 생성 완료:', {
          count: camSheetEndmills.length,
          positions: camSheetEndmills.map((e: any) => e.t_number)
        });
      } else {
        logger.warn('⚠️ CAM Sheet에 등록된 앤드밀이 없습니다');
      }
    } else {
      logger.warn('⚠️ 해당 모델/공정의 CAM Sheet가 없습니다:', {
        model: currentModel,
        process: process
      });
    }

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

    logger.error('설비 생성 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT: 설비 상태 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // 수정 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canUpdate = hasPermission(userRole, 'equipment', 'update', customPermissions)
    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

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
    logger.error('설비 업데이트 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
} 