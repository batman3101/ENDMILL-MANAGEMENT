import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService } from '../../../../lib/services/supabaseService'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentNumber = searchParams.get('equipmentNumber')
    const tNumber = searchParams.get('tNumber')
    const model = searchParams.get('model')
    const process = searchParams.get('process')

    const response: any = {}

    // 1. 설비번호 기반 자동입력: equipmentNumber -> current_model, process
    if (equipmentNumber) {
      try {
        // 모든 설비 조회해서 해당 설비번호 찾기
        const equipments = await serverSupabaseService.equipment.getAll()

        // 1단계: 정확한 매칭 우선
        let equipmentData = equipments.find(eq =>
          eq.equipment_number.toString() === equipmentNumber.toString()
        )

        // 2단계: 정확한 매칭이 없으면 변환 매칭 시도
        if (!equipmentData) {
          equipmentData = equipments.find(eq => {
            const eqNum = eq.equipment_number.toString()
            const inputNum = equipmentNumber.toString()

            // C접두사 있는 경우 제거하고 매칭 (C025 → 25)
            const cleanInput = inputNum.replace(/^C/i, '')
            if (eqNum === cleanInput || parseInt(eqNum) === parseInt(cleanInput)) return true

            // 반대 경우: 25 → C025
            const cleanEq = eqNum.replace(/^C/i, '')
            if (cleanEq === inputNum || parseInt(cleanEq) === parseInt(inputNum)) return true

            return false
          })
        }

        if (equipmentData) {
          response.equipmentInfo = {
            model: equipmentData.current_model || equipmentData.model_code,
            process: equipmentData.process
          }
        }
      } catch (error) {
        logger.error('Equipment 조회 오류:', error)
      }
    }

    // 2. T번호 기반 자동입력: model + process + tNumber -> endmill_code로 마스터 데이터 조회
    if (model && process && tNumber) {
      try {
        // CAM Sheet에서 해당 모델, 공정 찾기
        const camSheets = await serverSupabaseService.camSheet.getByModelAndProcess(model, process)
        if (camSheets && camSheets.length > 0) {
          const camSheet = camSheets[0] // 첫 번째 매칭 항목 사용

          // 해당 CAM Sheet의 엔드밀 데이터 가져오기
          const endmills = await serverSupabaseService.camSheet.getEndmills(camSheet.id)
          const targetEndmill = endmills?.find(endmill => endmill.t_number === parseInt(tNumber))

          if (targetEndmill && targetEndmill.endmill_code) {
            // endmill_code로 마스터 데이터(endmill_types) 조회
            try {
              const endmillMaster = await serverSupabaseService.endmillType.getByCode(targetEndmill.endmill_code)

              if (endmillMaster) {
                // 마스터 데이터 우선 사용
                response.endmillInfo = {
                  endmillCode: endmillMaster.code,
                  endmillName: endmillMaster.name,
                  category: endmillMaster.category?.name_ko || endmillMaster.category?.code,
                  standardLife: endmillMaster.standard_life,
                  suggestedToolLife: targetEndmill.tool_life // CAM Sheet의 tool_life 사용
                }
              } else {
                // 마스터에 없으면 CAM Sheet 데이터 폴백
                response.endmillInfo = {
                  endmillCode: targetEndmill.endmill_code,
                  endmillName: targetEndmill.endmill_name || targetEndmill.specifications,
                  suggestedToolLife: targetEndmill.tool_life
                }
              }
            } catch {
              // 마스터 조회 실패 시 CAM Sheet 데이터 폴백
              response.endmillInfo = {
                endmillCode: targetEndmill.endmill_code,
                endmillName: targetEndmill.endmill_name || targetEndmill.specifications,
                suggestedToolLife: targetEndmill.tool_life
              }
            }
          } else if (targetEndmill) {
            // endmill_code가 없는 경우 CAM Sheet 데이터 사용
            response.endmillInfo = {
              endmillCode: targetEndmill.endmill_code || '',
              endmillName: targetEndmill.endmill_name || targetEndmill.specifications,
              suggestedToolLife: targetEndmill.tool_life
            }
          }
        }
      } catch (error) {
        logger.error('CAM Sheet 조회 오류:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    logger.error('자동입력 API 오류:', error)
    return NextResponse.json({
      success: false,
      error: '자동입력 정보 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}