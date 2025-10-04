import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const endmillId = params.id

    if (!endmillId) {
      return NextResponse.json(
        { error: '엔드밀 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 공급업체별 가격 정보 조회
    const { data: supplierPrices, error } = await supabase
      .from('endmill_supplier_prices')
      .select(`
        *,
        suppliers!inner (
          id,
          code,
          name,
          contact_info,
          quality_rating,
          is_active
        )
      `)
      .eq('endmill_type_id', endmillId)

    if (error) {
      console.error('공급업체별 가격 조회 오류:', error)
      return NextResponse.json(
        { error: '공급업체별 가격 정보를 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 데이터 정리 및 정렬 (가격 오름차순)
    const sortedPrices = (supplierPrices || [])
      .filter(item => item.suppliers?.is_active)
      .sort((a, b) => a.unit_price - b.unit_price)
      .map(item => ({
        id: item.id,
        supplier: {
          id: item.suppliers.id,
          code: item.suppliers.code,
          name: item.suppliers.name,
          contact_info: item.suppliers.contact_info,
          quality_rating: item.suppliers.quality_rating || 8
        },
        unit_price: item.unit_price,
        min_order_quantity: item.min_order_quantity,
        lead_time_days: item.lead_time_days,
        is_preferred: item.is_preferred,
        current_stock: item.current_stock,
        updated_at: item.updated_at
      }))

    return NextResponse.json({
      success: true,
      data: sortedPrices,
      count: sortedPrices.length
    })

  } catch (error) {
    console.error('공급업체별 가격 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const endmillId = params.id
    const priceData = await request.json()

    if (!endmillId) {
      return NextResponse.json(
        { error: '엔드밀 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 필수 필드 검증
    if (!priceData.supplier_id || !priceData.unit_price) {
      return NextResponse.json(
        { error: '공급업체와 단가는 필수입니다.' },
        { status: 400 }
      )
    }

    // 중복 검사
    const { data: existing, error: duplicateError } = await supabase
      .from('endmill_supplier_prices')
      .select('id')
      .eq('endmill_type_id', endmillId)
      .eq('supplier_id', priceData.supplier_id)
      .single()

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      console.error('중복 검사 오류:', duplicateError)
      return NextResponse.json(
        { error: '중복 검사 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: '이미 해당 공급업체의 가격 정보가 존재합니다.' },
        { status: 409 }
      )
    }

    // 가격 정보 추가
    const insertData = {
      endmill_type_id: endmillId,
      supplier_id: priceData.supplier_id,
      unit_price: priceData.unit_price,
      min_order_quantity: priceData.min_order_quantity || 1,
      lead_time_days: priceData.lead_time_days || 5,
      is_preferred: priceData.is_preferred || false,
      current_stock: priceData.current_stock || 0,
      quality_rating: priceData.quality_rating || 8
    }

    const { data: newPrice, error: insertError } = await supabase
      .from('endmill_supplier_prices')
      .insert(insertData)
      .select(`
        *,
        suppliers (
          id,
          code,
          name,
          contact_info,
          quality_rating
        )
      `)
      .single()

    if (insertError) {
      console.error('가격 정보 추가 오류:', insertError)
      return NextResponse.json(
        { error: '가격 정보 추가 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newPrice,
      message: '공급업체 가격 정보가 추가되었습니다.'
    })

  } catch (error) {
    console.error('공급업체 가격 추가 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}