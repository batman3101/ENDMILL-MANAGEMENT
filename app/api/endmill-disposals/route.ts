import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'
import { applyFactoryFilter } from '@/lib/utils/factoryFilter'

// 동적 라우트로 명시적 설정 (cookies 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

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

    const canRead = hasPermission(userRole, 'endmill_disposals', 'read', customPermissions)
    if (!canRead) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const factoryId = searchParams.get('factoryId') || undefined

    let query: any = (supabase as any)
      .from('endmill_disposals')
      .select('*')

    // factoryId 필터 적용
    query = applyFactoryFilter(query, factoryId)

    query = query.order('disposal_date', { ascending: false })

    if (start) {
      query = query.gte('disposal_date', start)
    }

    if (end) {
      query = query.lte('disposal_date', end)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching disposals:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error('Error in GET /api/endmill-disposals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch disposals' },
      { status: 500 }
    )
  }
}

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

    const canCreate = hasPermission(userRole, 'endmill_disposals', 'create', customPermissions)
    if (!canCreate) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const disposal_date = body.disposal_date as string
    const quantity = parseInt(body.quantity as string)
    const weight_kg = parseFloat(body.weight_kg as string)
    const inspector = body.inspector as string
    const reviewer = body.reviewer as string
    const notes = (body.notes as string) || null
    const image_url = (body.image_url as string) || null
    const factory_id = body.factory_id || null

    // 폐기 기록 저장 (공장별)
    const { data, error } = await (supabase as any)
      .from('endmill_disposals')
      .insert({
        disposal_date,
        quantity,
        weight_kg,
        inspector,
        reviewer,
        image_url,
        notes,
        factory_id
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating disposal:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error('Error in POST /api/endmill-disposals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create disposal' },
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

    const canUpdate = hasPermission(userRole, 'endmill_disposals', 'update', customPermissions)
    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Disposal ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const disposal_date = body.disposal_date as string
    const quantity = parseInt(body.quantity as string)
    const weight_kg = parseFloat(body.weight_kg as string)
    const inspector = body.inspector as string
    const reviewer = body.reviewer as string
    const notes = (body.notes as string) || null
    const image_url = body.image_url as string | undefined

    // 폐기 기록 업데이트
    const updateData: any = {
      disposal_date,
      quantity,
      weight_kg,
      inspector,
      reviewer,
      notes
    }

    if (image_url !== undefined) {
      updateData.image_url = image_url
    }

    const { data, error } = await (supabase as any)
      .from('endmill_disposals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating disposal:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error('Error in PUT /api/endmill-disposals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update disposal' },
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

    // 삭제 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canDelete = hasPermission(userRole, 'endmill_disposals', 'delete', customPermissions)
    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Disposal ID is required' },
        { status: 400 }
      )
    }

    // 폐기 기록 삭제
    const { error } = await (supabase as any)
      .from('endmill_disposals')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Error deleting disposal:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/endmill-disposals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete disposal' },
      { status: 500 }
    )
  }
}
