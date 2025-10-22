import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService } from '../../../lib/services/supabaseService'
import { z } from 'zod'
import { logger } from '../../../lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'

// 교체 실적 생성 스키마
const createToolChangeSchema = z.object({
  equipment_number: z.union([z.string(), z.number()]),
  production_model: z.string().min(1),
  process: z.string().min(1),
  t_number: z.number().min(1),
  endmill_code: z.string().min(1),
  endmill_name: z.string().min(1),
  tool_life: z.number().min(0),
  change_reason: z.string().min(1),
  changed_by: z.string().uuid().optional(),
  change_date: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canRead = hasPermission(userRole, 'tool_changes', 'read', customPermissions)
    if (!canRead) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const equipmentNumber = searchParams.get('equipment_number')
    const endmillType = searchParams.get('endmill_type')
    const searchTerm = searchParams.get('search')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const sortField = searchParams.get('sort_field')
    const sortDirection = searchParams.get('sort_direction') as 'asc' | 'desc'

    logger.log('GET /api/tool-changes params:', {
      equipmentNumber,
      endmillType,
      searchTerm,
      startDate,
      endDate,
      limit,
      offset,
      sortField,
      sortDirection
    })

    const result = await serverSupabaseService.toolChange.getFiltered({
      equipmentNumber: equipmentNumber ? parseInt(equipmentNumber) : undefined,
      endmillType: endmillType || undefined,
      searchTerm: searchTerm || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      sortField: sortField || undefined,
      sortDirection: sortDirection || undefined
    })

    // totalCount를 별도로 가져오기
    const countResult = await serverSupabaseService.toolChange.getCount({
      equipmentNumber: equipmentNumber ? parseInt(equipmentNumber) : undefined,
      endmillType: endmillType || undefined,
      searchTerm: searchTerm || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })

    return NextResponse.json({
      success: true,
      data: result,
      totalCount: countResult || 0
    })
  } catch (error: any) {
    logger.error('Error fetching tool changes:', error)
    logger.error('Error details:', JSON.stringify(error, null, 2))
    if (error instanceof Error) {
      logger.error('Error message:', error.message)
      logger.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tool changes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST: 새 교체 실적 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canCreate = hasPermission(userRole, 'tool_changes', 'create', customPermissions)
    if (!canCreate) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()

    // 입력 데이터 검증
    const validatedData = createToolChangeSchema.parse(body)

    // equipment_number를 숫자로 변환 (C025 -> 25)
    let equipmentNumber = validatedData.equipment_number
    if (typeof equipmentNumber === 'string') {
      // C 접두사가 있으면 제거
      const cleaned = equipmentNumber.replace(/^C/i, '')
      equipmentNumber = parseInt(cleaned)
    }

    // 새 교체 실적 생성을 위한 데이터 준비
    const toolChangeData = {
      equipment_number: equipmentNumber,
      production_model: validatedData.production_model,
      process: validatedData.process,
      t_number: validatedData.t_number,
      endmill_code: validatedData.endmill_code,
      endmill_name: validatedData.endmill_name,
      tool_life: validatedData.tool_life,
      change_reason: validatedData.change_reason as "수명완료" | "파손" | "마모" | "예방교체" | "모델변경" | "기타",
      changed_by: validatedData.changed_by,
      change_date: validatedData.change_date || new Date().toISOString().split('T')[0]
    }

    logger.log('Creating tool change with data:', JSON.stringify(toolChangeData, null, 2))

    // 1. 새 교체 실적 생성
    const newToolChange = await serverSupabaseService.toolChange.create(toolChangeData)

    // 2. tool_positions 업데이트 로직
    try {
      // 2.1 endmill_code로 endmill_type ID 조회
      const supabase = (serverSupabaseService.endmillType as any).supabase
      const { data: endmillType, error: endmillError } = await supabase
        .from('endmill_types')
        .select('id')
        .eq('code', validatedData.endmill_code)
        .single()

      if (endmillError) {
        logger.error('앤드밀 타입 조회 오류:', endmillError)
        throw endmillError
      }

      // 2.2 equipment_number로 equipment ID 조회
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('id')
        .eq('equipment_number', equipmentNumber)
        .single()

      if (equipmentError) {
        logger.error('설비 조회 오류:', equipmentError)
        throw equipmentError
      }

      // 2.3 tool_positions 업데이트
      const { data: updatedPosition, error: positionError } = await supabase
        .from('tool_positions')
        .update({
          endmill_type_id: endmillType.id,
          current_life: 0,
          total_life: validatedData.tool_life,
          install_date: validatedData.change_date || new Date().toISOString().split('T')[0],
          status: 'in_use',
          updated_at: new Date().toISOString()
        })
        .eq('equipment_id', equipment.id)
        .eq('position_number', validatedData.t_number)
        .select()
        .single()

      if (positionError) {
        logger.error('tool_positions 업데이트 오류:', positionError)
        // tool_positions 업데이트 실패 시에도 교체 실적은 유지 (경고만 로깅)
        logger.warn('교체 실적은 등록되었으나 tool_positions 업데이트 실패')
      } else {
        logger.log('tool_positions 업데이트 성공:', updatedPosition)
      }

      // 재고 관리는 입/출고 관리에서만 처리하므로 여기서는 재고 감소하지 않음

    } catch (syncError) {
      logger.error('tool_positions 동기화 오류:', syncError)
      // tool_positions 업데이트 실패해도 교체 실적은 등록됨
      logger.warn('교체 실적은 등록되었으나 tool_positions 동기화 실패')
    }

    return NextResponse.json({
      success: true,
      data: newToolChange,
      message: '교체 실적이 성공적으로 등록되었습니다.',
    }, { status: 201 })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '입력 데이터가 올바르지 않습니다.',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    logger.error('교체 실적 생성 API 에러:', JSON.stringify(error, null, 2))
    logger.error('에러 상세:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 에러가 발생했습니다.',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}


export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canUpdate = hasPermission(userRole, 'tool_changes', 'update', customPermissions)
    if (!canUpdate) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tool Change ID is required' },
        { status: 400 }
      )
    }

    const updatedToolChange = await serverSupabaseService.toolChange.update(id, updateData)
    
    return NextResponse.json({
      success: true,
      data: updatedToolChange,
      message: '교체 이력이 업데이트되었습니다.'
    })
  } catch (error: any) {
    logger.error('Error updating tool change:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update tool change'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !currentUserProfile.user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = currentUserProfile.user_roles.type
    const rolePermissions = (currentUserProfile.user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = (currentUserProfile.permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canDelete = hasPermission(userRole, 'tool_changes', 'delete', customPermissions)
    if (!canDelete) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tool Change ID is required' },
        { status: 400 }
      )
    }

    await serverSupabaseService.toolChange.delete(id)
    
    return NextResponse.json({
      success: true,
      message: '교체 이력이 삭제되었습니다.'
    })
  } catch (error: any) {
    logger.error('Error deleting tool change:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete tool change'
      },
      { status: 500 }
    )
  }
} 