import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const { supplier_prices, cam_sheet_data, ...endmillData } = await request.json()

    // 기본 유효성 검사
    if (!endmillData.code || !endmillData.category || !endmillData.name) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 코드 중복 검사
    const { data: existingEndmill, error: duplicateError } = await supabase
      .from('endmill_types')
      .select('code')
      .eq('code', endmillData.code)
      .single()

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      logger.error('중복 검사 오류:', duplicateError)
      return NextResponse.json(
        { error: '중복 검사 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (existingEndmill) {
      return NextResponse.json(
        { error: `엔드밀 코드 '${endmillData.code}'는 이미 존재합니다.` },
        { status: 409 }
      )
    }

    // 카테고리 ID 조회
    const { data: category, error: categoryError } = await supabase
      .from('endmill_categories')
      .select('id')
      .eq('code', endmillData.category)
      .single()

    if (categoryError || !category) {
      logger.error('카테고리 조회 오류:', categoryError)
      return NextResponse.json(
        { error: '유효하지 않은 카테고리입니다.' },
        { status: 400 }
      )
    }

    // 엔드밀 데이터 준비
    const insertData = {
      code: endmillData.code,
      category_id: category.id,
      name: endmillData.name,
      unit_cost: endmillData.unit_cost,
      standard_life: endmillData.standard_life
    }

    // 엔드밀 등록
    const { data: newEndmill, error: insertError } = await supabase
      .from('endmill_types')
      .insert(insertData)
      .select(`
        *,
        endmill_categories (
          code,
          name_ko
        )
      `)
      .single()

    if (insertError) {
      logger.error('엔드밀 등록 오류:', insertError)
      return NextResponse.json(
        { error: '엔드밀 등록 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 인벤토리에 기본 정보 추가
    const inventoryData = {
      endmill_type_id: newEndmill.id,
      current_stock: 0,
      min_stock: 5,
      max_stock: 50,
      status: 'critical' as const,
      location: 'A동 공구창고'
    }

    const { error: inventoryError } = await supabase
      .from('inventory')
      .insert(inventoryData)

    if (inventoryError) {
      logger.warn('인벤토리 생성 경고:', inventoryError)
      // 인벤토리 생성 실패는 경고로만 처리
    }

    // 공급업체별 가격 정보 저장
    if (supplier_prices && Array.isArray(supplier_prices) && supplier_prices.length > 0) {
      const priceData = supplier_prices.map(sp => ({
        endmill_type_id: newEndmill.id,
        supplier_id: sp.supplier_id,
        unit_price: sp.unit_price,
        min_order_quantity: 1,
        lead_time_days: 5,
        is_preferred: false,
        current_stock: 0
      }))

      const { error: priceError } = await supabase
        .from('endmill_supplier_prices')
        .insert(priceData)

      if (priceError) {
        logger.warn('공급업체 가격 정보 저장 경고:', priceError)
        // 가격 정보 저장 실패는 경고로만 처리
      }
    }

    // CAM Sheet 데이터 저장
    if (cam_sheet_data && Array.isArray(cam_sheet_data) && cam_sheet_data.length > 0) {
      for (const camData of cam_sheet_data) {
        try {
          // CAM Sheet ID 생성 (모델 + 프로세스 조합으로 고유 ID 생성)
          const camSheetId = `${camData.model}_${camData.process}_${Date.now()}`

          // CAM Sheet 생성 또는 기존 것 찾기
          const { data: existingCamSheet } = await supabase
            .from('cam_sheets')
            .select('id')
            .eq('model', camData.model)
            .eq('process', camData.process)
            .single()

          let camSheetDbId = existingCamSheet?.id

          // CAM Sheet가 없으면 새로 생성
          if (!existingCamSheet) {
            const { data: newCamSheet, error: camSheetError } = await supabase
              .from('cam_sheets')
              .insert({
                model: camData.model,
                process: camData.process,
                cam_version: 'v1.0',
                version_date: new Date().toISOString().split('T')[0]
              })
              .select('id')
              .single()

            if (camSheetError) {
              logger.warn('CAM Sheet 생성 경고:', camSheetError)
              continue
            }
            camSheetDbId = newCamSheet.id
          }

          // CAM Sheet Endmill 매핑 데이터 삽입
          const { error: camEndmillError } = await supabase
            .from('cam_sheet_endmills')
            .insert({
              cam_sheet_id: camSheetDbId,
              t_number: camData.tNumber || camData.t_number,
              endmill_type_id: newEndmill.id,
              tool_life: camData.toolLife || camData.tool_life,
              endmill_code: newEndmill.code,
              endmill_name: newEndmill.name
            })

          if (camEndmillError) {
            logger.warn('CAM Sheet Endmill 매핑 생성 경고:', camEndmillError)
          }
        } catch (camError) {
          logger.warn('CAM Sheet 처리 오류:', camError)
          // CAM Sheet 오류는 전체 프로세스를 중단시키지 않음
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: newEndmill,
      message: '엔드밀이 성공적으로 등록되었습니다.'
    })

  } catch (error) {
    logger.error('엔드밀 생성 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}