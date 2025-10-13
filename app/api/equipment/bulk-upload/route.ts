import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService } from '../../../../lib/services/supabaseService'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

// 동적 스키마 생성 함수 및 CAM Sheet 데이터 가져오기
const createEquipmentSchema = async () => {
  // CAM Sheet에서 사용 가능한 모델과 공정 가져오기
  const camSheets = await serverSupabaseService.camSheet.getAll()
  const availableModels = Array.from(new Set(camSheets.map(sheet => sheet.model))).filter(Boolean)
  const availableProcesses = Array.from(new Set(camSheets.map(sheet => sheet.process))).filter(Boolean)

  // 기본값 설정
  const validModels = availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  const validProcesses = availableProcesses.length > 0 ? availableProcesses : ['CNC1', 'CNC2', 'CNC2-1']

  return {
    schema: z.object({
      equipment_number: z.string().min(1),
      location: z.enum(['A동', 'B동']),
      status: z.enum(['가동중', '점검중', '셋업중']),
      current_model: z.enum(validModels as [string, ...string[]]),
      process: z.enum(validProcesses as [string, ...string[]])
      // tool_position_count는 CAM Sheet에서 자동 계산
    }),
    camSheets,
    validModels,
    validProcesses
  }
}

// CAM Sheet에서 모델별 앤드밀 개수 계산
const getToolPositionCount = async (model: string, process: string) => {
  try {
    // CAM Sheet에서 해당 모델/공정의 앤드밀 데이터 가져오기
    const camSheets = await serverSupabaseService.camSheet.getAll()
    const sheet = camSheets.find(s => s.model === model && s.process === process)

    if (sheet) {
      // 해당 CAM Sheet의 앤드밀 데이터 가져오기
      const endmills = await serverSupabaseService.camSheet.getEndmills(sheet.id)

      if (endmills && endmills.length > 0) {
        // T 번호 중 최대값을 찾아서 툴 포지션 수로 사용
        const maxTNumber = Math.max(...endmills.map(e => e.t_number || 0))
        return maxTNumber > 0 ? maxTNumber : 21
      }
    }

    return 21 // 기본값
  } catch (error) {
    logger.error('툴 포지션 수 계산 에러:', error)
    return 21 // 기본값
  }
}

const createBulkUploadSchema = (equipmentSchema: any) => z.object({
  equipments: z.array(equipmentSchema).min(1).max(100)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 동적 스키마 생성 및 CAM Sheet 데이터 가져오기
    const { schema: equipmentSchema, camSheets } = await createEquipmentSchema()
    const bulkUploadSchema = createBulkUploadSchema(equipmentSchema)

    // 데이터 검증
    const validatedData = bulkUploadSchema.parse(body)

    const results: {
      success: any[]
      failed: any[]
      duplicates: any[]
    } = {
      success: [],
      failed: [],
      duplicates: []
    }

    // 기존 설비 번호 조회
    const existingEquipments = await serverSupabaseService.equipment.getAll()
    const existingNumbers = new Set(
      existingEquipments.map(eq => eq.equipment_number)
    )

    // 각 설비 처리
    for (const equipment of validatedData.equipments) {
      try {
        // 중복 체크
        if (existingNumbers.has(equipment.equipment_number)) {
          results.duplicates.push({
            equipment_number: equipment.equipment_number,
            reason: '이미 존재하는 설비번호입니다.'
          })
          continue
        }

        // 설비번호에서 숫자 추출 (C001 -> 1)
        const numberMatch = equipment.equipment_number.match(/\d+/)
        if (!numberMatch) {
          results.failed.push({
            equipment_number: equipment.equipment_number,
            reason: '설비번호 형식이 올바르지 않습니다.'
          })
          continue
        }

        const equipmentNumber = parseInt(numberMatch[0])

        // CAM Sheet에서 툴 포지션 수 자동 계산
        const toolPositionCount = await getToolPositionCount(equipment.current_model, equipment.process)

        // 설비 생성
        const newEquipment = await serverSupabaseService.equipment.create({
          equipment_number: equipmentNumber,
          model_code: equipment.current_model.split('-')[0] || equipment.current_model,
          location: equipment.location,
          status: equipment.status,
          current_model: equipment.current_model,
          process: equipment.process,
          tool_position_count: toolPositionCount
        })

        results.success.push({
          equipment_number: equipment.equipment_number,
          id: newEquipment.id,
          tool_position_count: toolPositionCount
        })

      } catch (error) {
        results.failed.push({
          equipment_number: equipment.equipment_number,
          reason: error instanceof Error ? error.message : '설비 생성 실패'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `총 ${validatedData.equipments.length}개 중 ${results.success.length}개 설비가 추가되었습니다.`,
      results
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '데이터 형식이 올바르지 않습니다.',
          details: error.errors
        },
        { status: 400 }
      )
    }

    logger.error('설비 일괄 업로드 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 에러가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}

// GET: 엑셀 템플릿 다운로드
export async function GET() {
  try {
    // CAM Sheet에서 사용 가능한 모델과 공정 가져오기
    const camSheets = await serverSupabaseService.camSheet.getAll()
    const availableModels = Array.from(new Set(camSheets.map(sheet => sheet.model))).filter(Boolean)
    const availableProcesses = Array.from(new Set(camSheets.map(sheet => sheet.process))).filter(Boolean)

    // 기본값 설정
    const validModels = availableModels.length > 0 ? availableModels : ['PA1', 'PA2', 'PS', 'B7', 'Q7']
    const validProcesses = availableProcesses.length > 0 ? availableProcesses : ['CNC1', 'CNC2', 'CNC2-1']

    // 템플릿 데이터
    const template = {
      headers: [
        '설비번호',
        '위치',
        '상태',
        '생산모델',
        '공정'
      ],
      example: [
        'C021',
        'A동',
        '가동중',
        validModels[0] || 'PA1',
        validProcesses[0] || 'CNC1'
      ],
      instructions: [
        '설비번호: C로 시작하는 3자리 숫자 (예: C001, C002)',
        '위치: A동 또는 B동',
        '상태: 가동중, 점검중, 셋업중 중 선택',
        `생산모델: ${validModels.join(', ')} 중 선택 (CAM Sheet 등록된 모델)`,
        `공정: ${validProcesses.join(', ')} 중 선택 (CAM Sheet 등록된 공정)`,
        '※ 툴 포지션 수는 CAM Sheet에서 자동으로 계산됩니다'
      ],
      availableModels: validModels,
      availableProcesses: validProcesses
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    logger.error('템플릿 생성 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '템플릿 생성에 실패했습니다.'
      },
      { status: 500 }
    )
  }
}