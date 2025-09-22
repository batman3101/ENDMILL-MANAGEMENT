import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { endmills } = await request.json()

    if (!endmills || !Array.isArray(endmills) || endmills.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않은 엔드밀 데이터입니다.' },
        { status: 400 }
      )
    }

    // 중복 검사 먼저 수행
    const codes = endmills.map(item => item.code)
    const { data: existingEndmills, error: duplicateError } = await supabase
      .from('endmill_types')
      .select('code')
      .in('code', codes)

    if (duplicateError) {
      console.error('중복 검사 오류:', duplicateError)
      return NextResponse.json(
        { error: '중복 검사 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    const existingCodes = existingEndmills?.map(item => item.code) || []
    const newEndmills = endmills.filter(item => !existingCodes.includes(item.code))

    if (newEndmills.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: '모든 엔드밀이 이미 등록되어 있습니다.',
        duplicates: existingCodes
      })
    }

    // CAM Sheet 데이터와 엔드밀 데이터 분리
    const endmillInsertData = newEndmills.map(({ cam_sheet_data, ...endmill }) => endmill)
    const camSheetDataMap = new Map()

    newEndmills.forEach((endmill, index) => {
      if (endmill.cam_sheet_data) {
        camSheetDataMap.set(endmill.code, endmill.cam_sheet_data)
      }
    })

    // 새로운 엔드밀들을 데이터베이스에 삽입
    const { data: insertedData, error: insertError } = await supabase
      .from('endmill_types')
      .insert(endmillInsertData)
      .select()

    if (insertError) {
      console.error('엔드밀 삽입 오류:', insertError)
      return NextResponse.json(
        { error: '엔드밀 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 인벤토리 테이블에도 기본 재고 정보 추가
    if (insertedData && insertedData.length > 0) {
      const inventoryData = insertedData.map(endmill => ({
        endmill_type_id: endmill.id,
        current_stock: 0,
        min_stock: 5,
        max_stock: 50,
        status: 'critical',
        location: 'A동 공구창고'
      }))

      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert(inventoryData)

      if (inventoryError) {
        console.warn('인벤토리 생성 경고:', inventoryError)
        // 인벤토리 생성 실패는 경고로만 처리하고 전체 작업은 성공으로 처리
      }

      // CAM Sheet 데이터 처리
      for (const endmill of insertedData) {
        const camSheetData = camSheetDataMap.get(endmill.code)
        if (camSheetData) {
          try {
            // CAM Sheet 생성 또는 기존 것 찾기
            let { data: existingCamSheet } = await supabase
              .from('cam_sheets')
              .select('id')
              .eq('model', camSheetData.model)
              .eq('process', camSheetData.process)
              .single()

            let camSheetDbId = existingCamSheet?.id

            // CAM Sheet가 없으면 새로 생성
            if (!existingCamSheet) {
              const { data: newCamSheet, error: camSheetError } = await supabase
                .from('cam_sheets')
                .insert({
                  model: camSheetData.model,
                  process: camSheetData.process,
                  cam_version: 'v1.0',
                  version_date: new Date().toISOString().split('T')[0]
                })
                .select('id')
                .single()

              if (camSheetError) {
                console.warn('CAM Sheet 생성 경고:', camSheetError)
                continue
              }
              camSheetDbId = newCamSheet.id
            }

            // CAM Sheet Endmill 매핑 데이터 삽입
            const { error: camEndmillError } = await supabase
              .from('cam_sheet_endmills')
              .insert({
                cam_sheet_id: camSheetDbId,
                t_number: camSheetData.t_number,
                endmill_type_id: endmill.id,
                tool_life: camSheetData.tool_life,
                endmill_code: endmill.code,
                endmill_name: endmill.name
              })

            if (camEndmillError) {
              console.warn('CAM Sheet Endmill 매핑 생성 경고:', camEndmillError)
            }
          } catch (camError) {
            console.warn('CAM Sheet 처리 오류:', camError)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: newEndmills.length,
      data: insertedData,
      message: `${newEndmills.length}개의 엔드밀이 성공적으로 등록되었습니다.`,
      duplicates: existingCodes
    })

  } catch (error) {
    console.error('엔드밀 일괄 등록 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}