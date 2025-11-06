import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService } from '../../../lib/services/supabaseService'
import { createServerClient } from '../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'

// 동적 라우트로 명시적 설정 (cookies 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

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

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canRead = hasPermission(userRole, 'cam_sheets', 'read', customPermissions)
    if (!canRead) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const model = searchParams.get('model')
    const process = searchParams.get('process')

    let camSheets
    if (model && process) {
      camSheets = await serverSupabaseService.camSheet.getByModelAndProcess(model, process)
    } else {
      camSheets = await serverSupabaseService.camSheet.getAll()
    }

    return NextResponse.json({
      success: true,
      data: camSheets
    })
  } catch (error) {
    logger.error('Error fetching CAM sheets:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch CAM sheets'
      },
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 사용자 프로필 조회 (권한 확인용)
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('user_id', user.id)
      .single()

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canCreate = hasPermission(userRole, 'cam_sheets', 'create', customPermissions)
    if (!canCreate) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    logger.log('CAM Sheet API 요청 데이터:', body)

    if (body.batch && Array.isArray(body.data)) {
      // 일괄 업로드 처리
      const results = []
      for (const camSheetData of body.data) {
        const result = await createCAMSheetWithEndmills(camSheetData)
        results.push(result)
      }

      return NextResponse.json({
        success: true,
        data: results,
        message: `${results.length}개의 CAM Sheet가 생성되었습니다.`
      })
    } else {
      // 단일 CAM Sheet 생성
      const result = await createCAMSheetWithEndmills(body)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'CAM Sheet가 생성되었습니다.'
      })
    }
  } catch (error) {
    logger.error('Error creating CAM sheet:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create CAM sheet'
      },
      { status: 500 }
    )
  }
}

async function createCAMSheetWithEndmills(data: any) {
  logger.log('createCAMSheetWithEndmills 실행:', data)

  // 필드명 매핑
  const camSheetData = {
    model: data.model,
    process: data.process,
    cam_version: data.camVersion || data.cam_version,
    version_date: data.versionDate || data.version_date
  }

  logger.log('변환된 CAM Sheet 데이터:', camSheetData)

  // CAM Sheet 생성
  const newCAMSheet = await serverSupabaseService.camSheet.create(camSheetData)
  logger.log('생성된 CAM Sheet:', newCAMSheet)

  // 엔드밀 데이터 처리
  if (data.endmills && Array.isArray(data.endmills) && data.endmills.length > 0) {
    logger.log('엔드밀 데이터 처리 시작:', data.endmills)

    for (const endmill of data.endmills) {
      try {
        // 엔드밀 타입 찾기 (코드로 검색)
        const endmillCode = endmill.endmillCode || endmill.endmill_code
        let endmillType = null

        if (endmillCode) {
          const supabase = createServerClient()
          const { data: foundEndmill, error: findError } = await supabase
            .from('endmill_types')
            .select('id')
            .eq('code', endmillCode)
            .single()

          if (!findError) {
            endmillType = foundEndmill
          } else if (findError.code !== 'PGRST116') {
            logger.warn('엔드밀 타입 검색 오류:', findError)
          }
        }


        const camSheetEndmillData = {
          cam_sheet_id: newCAMSheet.id,
          t_number: endmill.tNumber || endmill.t_number,
          endmill_type_id: endmillType?.id || null,
          tool_life: endmill.toolLife || endmill.tool_life || 0,
          endmill_code: endmill.endmillCode || endmill.endmill_code,
          endmill_name: endmill.endmillName || endmill.endmill_name,
          specifications: endmill.specifications || ''
        }

        logger.log('CAM Sheet 엔드밀 매핑 데이터:', camSheetEndmillData)

        await serverSupabaseService.camSheet.addEndmill(camSheetEndmillData)
      } catch (endmillError) {
        logger.warn(`엔드밀 ${endmill.endmillCode} 추가 실패:`, endmillError)
      }
    }
  }

  // 전체 데이터 다시 조회해서 반환
  const supabase = createServerClient()
  const { data: fullData, error: fetchError } = await supabase
    .from('cam_sheets')
    .select(`
      *,
      cam_sheet_endmills(*)
    `)
    .eq('id', newCAMSheet.id)
    .single()

  if (fetchError) {
    logger.warn('전체 데이터 조회 오류:', fetchError)
    return newCAMSheet
  }

  return fullData
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

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canUpdate = hasPermission(userRole, 'cam_sheets', 'update', customPermissions)
    if (!canUpdate) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { id, endmills, ...updateData } = body
    logger.log('CAM Sheet 수정 API 요청:', body)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'CAM Sheet ID is required' },
        { status: 400 }
      )
    }

    // CAM Sheet 기본 정보 업데이트
    const camSheetData = {
      model: updateData.model,
      process: updateData.process,
      cam_version: updateData.cam_version || updateData.camVersion,
      version_date: updateData.version_date || updateData.versionDate
    }

    const updatedCAMSheet = await serverSupabaseService.camSheet.update(id, camSheetData)
    logger.log('수정된 CAM Sheet:', updatedCAMSheet)

    // 엔드밀 데이터 처리 (삭제 후 재생성)
    if (endmills && Array.isArray(endmills)) {
      logger.log('엔드밀 데이터 수정 시작:', endmills)

      // 기존 엔드밀 데이터 삭제
      const supabaseDelete = createServerClient()
      const { error: deleteError } = await supabaseDelete
        .from('cam_sheet_endmills')
        .delete()
        .eq('cam_sheet_id', id)

      if (deleteError) {
        logger.warn('기존 엔드밀 삭제 오류:', deleteError)
      }

      // 새로운 엔드밀 데이터 추가
      for (const endmill of endmills) {
        try {
          // 엔드밀 타입 찾기 (코드로 검색)
          const endmillCode = endmill.endmillCode || endmill.endmill_code
          let endmillType = null

          if (endmillCode) {
            const supabaseFind = createServerClient()
            const { data: foundEndmill, error: findError } = await supabaseFind
              .from('endmill_types')
              .select('id')
              .eq('code', endmillCode)
              .single()

            if (!findError) {
              endmillType = foundEndmill
            } else if (findError.code !== 'PGRST116') {
              logger.warn('엔드밀 타입 검색 오류:', findError)
            }
          }

          const camSheetEndmillData = {
            cam_sheet_id: id,
            t_number: endmill.tNumber || endmill.t_number,
            endmill_type_id: endmillType?.id || null,
            tool_life: endmill.toolLife || endmill.tool_life || 0,
            endmill_code: endmill.endmillCode || endmill.endmill_code,
            endmill_name: endmill.endmillName || endmill.endmill_name,
            specifications: endmill.specifications || ''
          }

          logger.log('CAM Sheet 엔드밀 매핑 데이터:', camSheetEndmillData)

          await serverSupabaseService.camSheet.addEndmill(camSheetEndmillData)
        } catch (endmillError) {
          logger.warn(`엔드밀 ${endmill.endmillCode} 추가 실패:`, endmillError)
        }
      }
    }

    // 전체 데이터 다시 조회해서 반환
    const supabaseFetch = createServerClient()
    const { data: fullData, error: fetchError } = await supabaseFetch
      .from('cam_sheets')
      .select(`
        *,
        cam_sheet_endmills(*)
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      logger.warn('전체 데이터 조회 오류:', fetchError)
      return NextResponse.json({
        success: true,
        data: updatedCAMSheet,
        message: 'CAM Sheet가 업데이트되었습니다.'
      })
    }

    return NextResponse.json({
      success: true,
      data: fullData,
      message: 'CAM Sheet가 업데이트되었습니다.'
    })
  } catch (error) {
    logger.error('Error updating CAM sheet:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update CAM sheet'
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

    if (!currentUserProfile || !(currentUserProfile as any).user_roles) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    // 권한 확인 (역할 권한 + 개인 권한 병합)
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canDelete = hasPermission(userRole, 'cam_sheets', 'delete', customPermissions)
    if (!canDelete) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'CAM Sheet ID is required' },
        { status: 400 }
      )
    }

    await serverSupabaseService.camSheet.delete(id)
    
    return NextResponse.json({
      success: true,
      message: 'CAM Sheet가 삭제되었습니다.'
    })
  } catch (error) {
    logger.error('Error deleting CAM sheet:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete CAM sheet'
      },
      { status: 500 }
    )
  }
} 