import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService } from '../../../lib/services/supabaseService'
import { createServerClient } from '../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'

// 동적 라우트로 명시적 설정 (cookies 사용으로 인해 필요)
export const dynamic = 'force-dynamic'

// factories 캐시: ALT/ALV UUID 를 한 번만 조회해 복제 경로에서 재사용.
// 프로세스 생명주기 동안 불변이므로 안전한 가벼운 메모이제이션.
let factoryIdCache: { alt: string | null; alv: string | null } | null = null

async function getFactoryIds(): Promise<{ alt: string | null; alv: string | null }> {
  if (factoryIdCache) return factoryIdCache
  const supabase = createServerClient() as any
  const { data, error } = await supabase
    .from('factories')
    .select('id, code')
    .in('code', ['ALT', 'ALV'])
  if (error) {
    logger.warn('factories 조회 실패, 복제 비활성:', error)
    return { alt: null, alv: null }
  }
  const rows = (data || []) as Array<{ id: string; code: string }>
  const alt = rows.find((f) => f.code === 'ALT')?.id || null
  const alv = rows.find((f) => f.code === 'ALV')?.id || null
  factoryIdCache = { alt, alv }
  return factoryIdCache
}

// 주어진 endmills 배열에서 cam_sheet_endmills insert 에 쓸 payload 리스트를 만든다.
// endmill_type_id 는 코드 기반 배치 조회로 채운다.
async function buildEndmillRows(camSheetId: string, endmills: any[]): Promise<any[]> {
  if (!Array.isArray(endmills) || endmills.length === 0) return []

  const endmillCodes = endmills
    .map((e: any) => (e.endmillCode || e.endmill_code || '').toUpperCase())
    .filter((code: string) => code)

  let endmillTypeMap = new Map<string, string>()
  if (endmillCodes.length > 0) {
    const supabase = createServerClient()
    const { data: foundEndmills } = await supabase
      .from('endmill_types')
      .select('id, code')
      .in('code', endmillCodes)
    endmillTypeMap = new Map(
      (foundEndmills || []).map((et: any) => [et.code, et.id])
    )
  }

  return endmills.map((endmill: any) => {
    const endmillCode = (endmill.endmillCode || endmill.endmill_code || '').toUpperCase()
    return {
      cam_sheet_id: camSheetId,
      t_number: endmill.tNumber || endmill.t_number,
      endmill_type_id: endmillTypeMap.get(endmillCode) || null,
      tool_life: endmill.toolLife || endmill.tool_life || 0,
      endmill_code: endmill.endmillCode || endmill.endmill_code,
      endmill_name: endmill.endmillName || endmill.endmill_name,
      specifications: endmill.specifications || ''
    }
  })
}

// ALV twin 을 upsert 한다: 동일 (model, process, cam_version, ALV) 가 있으면 재사용,
// 없으면 새로 생성. 그 후 cam_sheet_endmills 를 삭제 후 재삽입해 동기화한다.
async function upsertAlvTwin(
  source: { model: string; process: string; cam_version: string; version_date: string; created_by?: string | null },
  endmills: any[],
  alvFactoryId: string
): Promise<void> {
  const supabase = createServerClient() as any

  // 기존 twin 조회
  const { data: existing } = await supabase
    .from('cam_sheets')
    .select('id')
    .eq('factory_id', alvFactoryId)
    .eq('model', source.model)
    .eq('process', source.process)
    .eq('cam_version', source.cam_version)
    .maybeSingle()

  let twinId: string
  if (existing?.id) {
    twinId = existing.id as string
    const { error: updateErr } = await supabase
      .from('cam_sheets')
      .update({ version_date: source.version_date })
      .eq('id', twinId)
    if (updateErr) {
      logger.warn('ALV twin version_date 업데이트 실패:', updateErr)
    }
  } else {
    const insertPayload: any = {
      model: source.model,
      process: source.process,
      cam_version: source.cam_version,
      version_date: source.version_date,
      factory_id: alvFactoryId
    }
    if (source.created_by) insertPayload.created_by = source.created_by
    const { data: inserted, error: insertErr } = await supabase
      .from('cam_sheets')
      .insert(insertPayload)
      .select('id')
      .single()
    if (insertErr || !inserted?.id) {
      logger.warn('ALV twin 생성 실패:', insertErr)
      return
    }
    twinId = inserted.id as string
  }

  // twin 하위 endmill 전량 교체
  const { error: deleteErr } = await supabase
    .from('cam_sheet_endmills')
    .delete()
    .eq('cam_sheet_id', twinId)
  if (deleteErr) {
    logger.warn('ALV twin endmills 삭제 실패:', deleteErr)
  }

  const rows = await buildEndmillRows(twinId, endmills)
  if (rows.length > 0) {
    const { error: insertEmErr } = await supabase
      .from('cam_sheet_endmills')
      .insert(rows)
    if (insertEmErr) {
      logger.warn('ALV twin endmills 삽입 실패:', insertEmErr)
    }
  }
}

async function deleteAlvTwin(
  source: { model: string; process: string; cam_version: string },
  alvFactoryId: string
): Promise<void> {
  const supabase = createServerClient() as any
  const { data: twin } = await supabase
    .from('cam_sheets')
    .select('id')
    .eq('factory_id', alvFactoryId)
    .eq('model', source.model)
    .eq('process', source.process)
    .eq('cam_version', source.cam_version)
    .maybeSingle()
  if (!twin?.id) return

  // 자식 endmill 먼저 제거 (FK cascade 가 없어 명시적 삭제)
  await supabase.from('cam_sheet_endmills').delete().eq('cam_sheet_id', twin.id)
  const { error } = await supabase.from('cam_sheets').delete().eq('id', twin.id)
  if (error) {
    logger.warn('ALV twin 삭제 실패:', error)
  }
}

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
    const factoryId = searchParams.get('factoryId') || undefined

    let camSheets
    if (model && process) {
      camSheets = await serverSupabaseService.camSheet.getByModelAndProcess(model, process, { factoryId })
    } else {
      camSheets = await serverSupabaseService.camSheet.getAll({ factoryId })
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
    const factory_id = body.factory_id || null
    logger.log('CAM Sheet API 요청 데이터:', body)

    if (body.batch && Array.isArray(body.data)) {
      // 일괄 업로드 처리
      const results = []
      for (const camSheetData of body.data) {
        const result = await createCAMSheetWithEndmills({ ...camSheetData, factory_id })
        results.push(result)
      }

      return NextResponse.json({
        success: true,
        data: results,
        message: `${results.length}개의 CAM Sheet가 생성되었습니다.`
      })
    } else {
      // 단일 CAM Sheet 생성
      const result = await createCAMSheetWithEndmills({ ...body, factory_id })

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
    version_date: data.versionDate || data.version_date,
    factory_id: data.factory_id || null
  }

  logger.log('변환된 CAM Sheet 데이터:', camSheetData)

  // CAM Sheet 생성
  const newCAMSheet = await serverSupabaseService.camSheet.create(camSheetData)
  logger.log('생성된 CAM Sheet:', newCAMSheet)

  // 엔드밀 데이터 처리 (N+1 제거: 배치 조회 후 매핑)
  if (data.endmills && Array.isArray(data.endmills) && data.endmills.length > 0) {
    logger.log('엔드밀 데이터 처리 시작:', data.endmills)

    const rows = await buildEndmillRows(newCAMSheet.id, data.endmills)
    for (const row of rows) {
      try {
        logger.log('CAM Sheet 엔드밀 매핑 데이터:', row)
        await serverSupabaseService.camSheet.addEndmill(row)
      } catch (endmillError) {
        logger.warn(`엔드밀 ${row.endmill_code} 추가 실패:`, endmillError)
      }
    }
  }

  // 1공장(ALT) 등록분은 자동으로 2공장(ALV) twin 으로 복제.
  // 입력 factory_id 가 ALT 일 때만 수행 (ALV 직접 등록은 제외, 재귀 방지).
  try {
    const { alt, alv } = await getFactoryIds()
    if (alt && alv && camSheetData.factory_id === alt) {
      await upsertAlvTwin(
        {
          model: camSheetData.model,
          process: camSheetData.process,
          cam_version: camSheetData.cam_version,
          version_date: camSheetData.version_date,
          created_by: (newCAMSheet as any).created_by ?? null
        },
        data.endmills || [],
        alv
      )
    }
  } catch (twinErr) {
    logger.warn('ALV twin 복제 실패 (원본 생성은 성공):', twinErr)
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

    // 업데이트 전 원본 스냅샷 (ALV twin 추적용 — cam_version 변경이 있어도
    // 이전 키 조합으로 twin 을 찾기 위함)
    const supabasePre = createServerClient() as any
    const { data: originalRowRaw } = await supabasePre
      .from('cam_sheets')
      .select('id, model, process, cam_version, factory_id')
      .eq('id', id)
      .maybeSingle()
    const originalRow = originalRowRaw as
      | { id: string; model: string; process: string; cam_version: string; factory_id: string | null }
      | null

    // CAM Sheet 기본 정보 업데이트 (factory_id는 변경 불가하므로 제외)
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

      const rows = await buildEndmillRows(id, endmills)
      for (const row of rows) {
        try {
          logger.log('CAM Sheet 엔드밀 매핑 데이터:', row)
          await serverSupabaseService.camSheet.addEndmill(row)
        } catch (endmillError) {
          logger.warn(`엔드밀 ${row.endmill_code} 추가 실패:`, endmillError)
        }
      }
    }

    // ALV twin 동기화: 원본이 ALT 인 경우에만 수행.
    // twin 조회는 "업데이트 전" 원본 키(model/process/cam_version)로 한 뒤
    // upsertAlvTwin 이 새 키로 upsert 하므로 cam_version 변경도 안전 반영됨.
    try {
      const { alt, alv } = await getFactoryIds()
      if (alt && alv && originalRow?.factory_id === alt) {
        const supabaseTwin = createServerClient() as any
        const { data: existingTwin } = await supabaseTwin
          .from('cam_sheets')
          .select('id')
          .eq('factory_id', alv)
          .eq('model', originalRow.model)
          .eq('process', originalRow.process)
          .eq('cam_version', originalRow.cam_version)
          .maybeSingle()

        if (existingTwin?.id) {
          // 기존 twin 을 새 키로 업데이트하고 endmill 도 재동기화.
          const { error: twinUpdErr } = await supabaseTwin
            .from('cam_sheets')
            .update({
              model: camSheetData.model,
              process: camSheetData.process,
              cam_version: camSheetData.cam_version,
              version_date: camSheetData.version_date
            })
            .eq('id', existingTwin.id)
          if (twinUpdErr) {
            logger.warn('ALV twin 업데이트 실패:', twinUpdErr)
          }

          if (Array.isArray(endmills)) {
            await supabaseTwin
              .from('cam_sheet_endmills')
              .delete()
              .eq('cam_sheet_id', existingTwin.id)

            const twinRows = await buildEndmillRows(existingTwin.id, endmills)
            if (twinRows.length > 0) {
              const { error: twinInsErr } = await supabaseTwin
                .from('cam_sheet_endmills')
                .insert(twinRows)
              if (twinInsErr) {
                logger.warn('ALV twin endmills 재삽입 실패:', twinInsErr)
              }
            }
          }
        } else {
          // twin 이 없다면 새로 생성 (자가 복구).
          // endmills 가 요청 body 에 없으면 ALT 원본의 현재 endmills 를 DB 에서 읽어
          // 빈 twin 이 생성되는 것을 방지한다.
          let seedEndmills: any[] = Array.isArray(endmills) ? endmills : []
          if (!Array.isArray(endmills)) {
            const { data: currentEmRows } = await supabaseTwin
              .from('cam_sheet_endmills')
              .select('*')
              .eq('cam_sheet_id', id)
            seedEndmills = (currentEmRows || []) as any[]
          }
          await upsertAlvTwin(
            {
              model: camSheetData.model,
              process: camSheetData.process,
              cam_version: camSheetData.cam_version,
              version_date: camSheetData.version_date,
              created_by: null
            },
            seedEndmills,
            alv
          )
        }
      }
    } catch (twinErr) {
      logger.warn('ALV twin 동기화 실패 (원본 수정은 성공):', twinErr)
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

    // 삭제 전 원본 스냅샷 확보 — ALV twin 위치 파악 목적
    const supabasePre = createServerClient() as any
    const { data: originalRowRaw } = await supabasePre
      .from('cam_sheets')
      .select('id, model, process, cam_version, factory_id')
      .eq('id', id)
      .maybeSingle()
    const originalRow = originalRowRaw as
      | { id: string; model: string; process: string; cam_version: string; factory_id: string | null }
      | null

    await serverSupabaseService.camSheet.delete(id)

    // ALT 원본이 삭제됐다면 ALV twin 도 함께 제거
    try {
      const { alt, alv } = await getFactoryIds()
      if (alt && alv && originalRow && originalRow.factory_id === alt) {
        await deleteAlvTwin(
          {
            model: originalRow.model,
            process: originalRow.process,
            cam_version: originalRow.cam_version
          },
          alv
        )
      }
    } catch (twinErr) {
      logger.warn('ALV twin 삭제 실패 (원본 삭제는 성공):', twinErr)
    }

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