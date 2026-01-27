import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasPermission, parsePermissionsFromDB, mergePermissionMatrices } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import { normalizeChangeReason } from '@/lib/utils/toolChangesExcelTemplate'

// 동적 라우트로 명시적 설정
export const dynamic = 'force-dynamic'

// 일괄 교체 실적 데이터 스키마
const bulkToolChangeSchema = z.object({
  equipment_number: z.string().regex(/^C\d{3}$/),
  production_model: z.string().min(1),
  process: z.string().min(1),
  t_number: z.number().min(1).max(24),
  endmill_code: z.string().min(1),
  endmill_name: z.string().min(1),
  tool_life: z.number().min(0),
  change_reason: z.string().min(1),
  changed_by: z.string().min(1)
})

const bulkUploadSchema = z.object({
  data: z.array(bulkToolChangeSchema)
})

interface ValidationError {
  row: number
  field: string
  message: string
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

    // 권한 확인
    const userRole = (currentUserProfile as any).user_roles.type
    const rolePermissions = ((currentUserProfile as any).user_roles?.permissions || {}) as Record<string, string[]>
    const userPermissions = ((currentUserProfile as any).permissions || {}) as Record<string, string[]>
    const mergedPermissions = mergePermissionMatrices(userPermissions, rolePermissions)
    const customPermissions = parsePermissionsFromDB(mergedPermissions)

    const canCreate = hasPermission(userRole, 'tool_changes', 'create', customPermissions)
    if (!canCreate) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()

    // 입력 데이터 검증
    const validatedData = bulkUploadSchema.parse(body)
    const toolChangesData = validatedData.data
    const factoryId = body.factory_id

    logger.log('일괄 업로드 데이터 수:', toolChangesData.length)
    logger.log('공장 ID:', factoryId)

    // CAM Sheet 정합성 검증
    const validationErrors: ValidationError[] = []
    const validatedRecords: any[] = []

    // CAM Sheet 전체 조회
    const { data: camSheets, error: camSheetError } = await supabase
      .from('cam_sheets')
      .select('*, cam_sheet_endmills(*)')

    if (camSheetError) {
      logger.error('CAM Sheet 조회 오류:', camSheetError)
      return NextResponse.json({
        success: false,
        error: 'CAM Sheet 조회에 실패했습니다.'
      }, { status: 500 })
    }

    // 모든 사용자 조회 (교체자 검증용)
    const { data: allUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, name, employee_id')

    if (usersError) {
      logger.error('사용자 목록 조회 오류:', usersError)
      return NextResponse.json({
        success: false,
        error: '사용자 목록 조회에 실패했습니다.'
      }, { status: 500 })
    }

    // 앤드밀 타입 전체 조회 (앤드밀 이름 검증용)
    const { data: endmillTypes, error: endmillTypesError } = await supabase
      .from('endmill_types')
      .select('code, name')

    if (endmillTypesError) {
      logger.error('앤드밀 타입 조회 오류:', endmillTypesError)
      return NextResponse.json({
        success: false,
        error: '앤드밀 타입 조회에 실패했습니다.'
      }, { status: 500 })
    }

    // 앤드밀 코드 -> 이름 매핑 생성
    const endmillCodeToName = new Map<string, string>()
    endmillTypes?.forEach((et: any) => {
      endmillCodeToName.set(et.code, et.name)
    })

    // 각 행에 대해 검증
    for (let i = 0; i < toolChangesData.length; i++) {
      const row = toolChangesData[i]
      const rowNum = i + 2 // Excel 행 번호 (헤더 제외)

      // 1. CAM Sheet 존재 여부 확인 (모델 + 공정)
      const camSheet = camSheets?.find(
        (sheet: any) => sheet.model === row.production_model && sheet.process === row.process
      )

      if (!camSheet) {
        validationErrors.push({
          row: rowNum,
          field: 'production_model/process',
          message: `모델 '${row.production_model}' + 공정 '${row.process}' 조합이 CAM Sheet에 등록되어 있지 않습니다.`
        })
        continue
      }

      // 2. T번호가 CAM Sheet에 등록되어 있는지 확인
      const endmillInCamSheet = (camSheet as any).cam_sheet_endmills?.find(
        (e: any) => e.t_number === row.t_number
      )

      if (!endmillInCamSheet) {
        validationErrors.push({
          row: rowNum,
          field: 't_number',
          message: `T${row.t_number.toString().padStart(2, '0')}가 CAM Sheet(모델: ${row.production_model}, 공정: ${row.process})에 등록되어 있지 않습니다.`
        })
        continue
      }

      // 3. 앤드밀 코드가 CAM Sheet와 일치하는지 확인
      if (endmillInCamSheet.endmill_code !== row.endmill_code) {
        validationErrors.push({
          row: rowNum,
          field: 'endmill_code',
          message: `앤드밀코드 불일치: 입력값 '${row.endmill_code}', CAM Sheet '${endmillInCamSheet.endmill_code}'`
        })
        continue
      }

      // 4. 앤드밀 이름이 endmill_types 테이블의 실제 이름과 일치하는지 확인
      const expectedEndmillName = endmillCodeToName.get(row.endmill_code)
      if (expectedEndmillName && expectedEndmillName !== row.endmill_name) {
        validationErrors.push({
          row: rowNum,
          field: 'endmill_name',
          message: `앤드밀이름 불일치: 입력값 '${row.endmill_name}', 등록된 이름 '${expectedEndmillName}'`
        })
        continue
      }

      // 5. 교체자 확인 (이름 또는 사번으로 검색)
      const user = allUsers?.find(
        (u: any) => u.name === row.changed_by || u.employee_id === row.changed_by
      )

      if (!user) {
        validationErrors.push({
          row: rowNum,
          field: 'changed_by',
          message: `교체자 '${row.changed_by}'가 사용자 목록에 존재하지 않습니다.`
        })
        continue
      }

      // 6. 설비 번호 확인
      const equipmentNumber = parseInt(row.equipment_number.replace(/^C/, ''))
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('id')
        .eq('equipment_number', equipmentNumber)
        .single()

      if (equipmentError || !equipment) {
        validationErrors.push({
          row: rowNum,
          field: 'equipment_number',
          message: `설비번호 '${row.equipment_number}'가 등록되어 있지 않습니다.`
        })
        continue
      }

      // 검증 통과한 레코드 저장
      // 교체사유가 베트남어로 입력된 경우 한국어로 정규화
      const normalizedChangeReason = normalizeChangeReason(row.change_reason)

      validatedRecords.push({
        equipment_number: equipmentNumber,
        equipment_id: (equipment as any).id,
        production_model: row.production_model,
        process: row.process,
        t_number: row.t_number,
        endmill_code: row.endmill_code,
        endmill_name: row.endmill_name,
        tool_life: row.tool_life,
        change_reason: normalizedChangeReason,
        changed_by: (user as any).id,
        change_date: new Date().toISOString().split('T')[0],
        factory_id: factoryId
      })
    }

    // 검증 오류가 있으면 반환
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'CAM Sheet 정합성 검증 실패',
        validationErrors
      }, { status: 400 })
    }

    logger.log('검증 통과한 레코드 수:', validatedRecords.length)

    // 트랜잭션으로 일괄 등록
    const insertPromises = validatedRecords.map(async (record) => {
      // 1. tool_changes 테이블에 삽입
      const { data: toolChange, error: insertError } = await (supabase as any)
        .from('tool_changes')
        .insert({
          equipment_number: record.equipment_number,
          production_model: record.production_model,
          process: record.process,
          t_number: record.t_number,
          endmill_code: record.endmill_code,
          endmill_name: record.endmill_name,
          tool_life: record.tool_life,
          change_reason: record.change_reason,
          changed_by: record.changed_by,
          change_date: record.change_date,
          factory_id: record.factory_id
        })
        .select()
        .single()

      if (insertError) {
        logger.error('교체 실적 삽입 오류:', insertError)
        throw insertError
      }

      // 2. endmill_code로 endmill_type ID 조회
      const { data: endmillType, error: endmillError } = await supabase
        .from('endmill_types')
        .select('id')
        .eq('code', record.endmill_code)
        .single()

      if (endmillError) {
        logger.warn('앤드밀 타입 조회 실패:', endmillError)
        return toolChange
      }

      // 3. tool_positions 업데이트
      const { error: positionError } = await (supabase as any)
        .from('tool_positions')
        .update({
          endmill_type_id: (endmillType as any).id,
          current_life: 0,
          total_life: record.tool_life,
          install_date: record.change_date,
          status: 'in_use',
          updated_at: new Date().toISOString()
        })
        .eq('equipment_id', record.equipment_id)
        .eq('position_number', record.t_number)

      if (positionError) {
        logger.warn('tool_positions 업데이트 실패:', positionError)
      }

      return toolChange
    })

    try {
      const results = await Promise.all(insertPromises)

      return NextResponse.json({
        success: true,
        message: `${results.length}건의 교체 실적이 성공적으로 등록되었습니다.`,
        insertedCount: results.length
      }, { status: 201 })

    } catch (error: any) {
      logger.error('일괄 등록 실패:', error)
      return NextResponse.json({
        success: false,
        error: '일괄 등록 중 오류가 발생했습니다.',
        details: error.message
      }, { status: 500 })
    }

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: '입력 데이터가 올바르지 않습니다.',
        details: error.errors
      }, { status: 400 })
    }

    logger.error('일괄 업로드 API 오류:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
