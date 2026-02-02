import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

interface BulkUserData {
  name: string
  employeeId: string
  email: string
  department: string
  position: string
  shift: string
  role: string
  password: string
  phone?: string
}

// POST /api/users/bulk-upload - 사용자 일괄 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 권한 확인
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    if (!hasPermission(userRole, 'users', 'create', customPermissions)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { users, factoryId } = body as { users: BulkUserData[]; factoryId?: string }

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'No user data provided' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 역할 ID 조회
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id, type')

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: 'No roles found in database' }, { status: 500 })
    }

    const roleMap = new Map<string, string>()
    roles.forEach((r: { id: string; type: string }) => {
      roleMap.set(r.type, r.id)
    })

    // 기존 사번/이메일 중복 확인
    const employeeIds = users.map((u) => u.employeeId)
    const { data: existingProfiles } = await (adminClient as any)
      .from('user_profiles')
      .select('employee_id')
      .in('employee_id', employeeIds)

    const existingEmpIds = new Set(
      (existingProfiles || []).map((p: { employee_id: string }) => p.employee_id)
    )

    const success: Array<{ name: string; employeeId: string; email: string }> = []
    const failed: Array<{ row: number; name: string; reason: string }> = []
    const duplicates: Array<{ row: number; name: string; field: string; value: string }> = []

    // 순차 처리 (Auth 생성은 병렬 불가)
    for (let i = 0; i < users.length; i++) {
      const userData = users[i]
      const rowNum = i + 2

      // 사번 중복 체크
      if (existingEmpIds.has(userData.employeeId)) {
        duplicates.push({
          row: rowNum,
          name: userData.name,
          field: '사번',
          value: userData.employeeId,
        })
        continue
      }

      // 역할 ID 매핑
      const roleId = roleMap.get(userData.role)
      if (!roleId) {
        failed.push({
          row: rowNum,
          name: userData.name,
          reason: `유효하지 않은 역할: ${userData.role}`,
        })
        continue
      }

      try {
        // Supabase Auth 사용자 생성
        const { data: authData, error: authCreateError } = await adminClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            name: userData.name,
            employee_id: userData.employeeId,
          },
        })

        if (authCreateError || !authData.user) {
          if (authCreateError?.message?.includes('already been registered')) {
            duplicates.push({
              row: rowNum,
              name: userData.name,
              field: '이메일',
              value: userData.email,
            })
          } else {
            failed.push({
              row: rowNum,
              name: userData.name,
              reason: authCreateError?.message || 'Auth 사용자 생성 실패',
            })
          }
          continue
        }

        // user_profiles 생성
        const { error: profileError } = await (supabase as any)
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            name: userData.name,
            employee_id: userData.employeeId,
            department: userData.department || '',
            position: userData.position || '',
            shift: userData.shift || 'A',
            role_id: roleId,
            phone: userData.phone || null,
            is_active: true,
            default_factory_id: factoryId || null,
          })

        if (profileError) {
          // 롤백: Auth 사용자 삭제
          await adminClient.auth.admin.deleteUser(authData.user.id)
          failed.push({
            row: rowNum,
            name: userData.name,
            reason: `프로필 생성 실패: ${profileError.message}`,
          })
          continue
        }

        // 공장 접근 권한 생성
        if (factoryId) {
          const { error: factoryAccessError } = await (adminClient as any)
            .from('user_factory_access')
            .insert({
              user_id: authData.user.id,
              factory_id: factoryId,
              is_default: true,
            })

          if (factoryAccessError) {
            logger.warn(`Factory access creation failed for ${userData.name}:`, factoryAccessError)
          }
        }

        // 중복 방지를 위해 세트에 추가
        existingEmpIds.add(userData.employeeId)

        success.push({
          name: userData.name,
          employeeId: userData.employeeId,
          email: userData.email,
        })
      } catch (error: any) {
        failed.push({
          row: rowNum,
          name: userData.name,
          reason: error.message || '알 수 없는 오류',
        })
      }
    }

    return NextResponse.json({
      success,
      failed,
      duplicates,
      total: users.length,
      successCount: success.length,
      failedCount: failed.length,
      duplicateCount: duplicates.length,
    })
  } catch (error: any) {
    logger.error('Unexpected error in POST /api/users/bulk-upload:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
