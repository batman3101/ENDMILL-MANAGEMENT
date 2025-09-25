import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../../lib/supabase/client'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; priceId: string } }
) {
  try {
    const supabase = createServerClient()
    const { id: endmillId, priceId } = params

    if (!endmillId || !priceId) {
      return NextResponse.json(
        { error: '필수 ID가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 가격 정보 삭제
    const { error } = await supabase
      .from('endmill_supplier_prices')
      .delete()
      .eq('id', priceId)
      .eq('endmill_type_id', endmillId)

    if (error) {
      console.error('가격 정보 삭제 오류:', error)
      return NextResponse.json(
        { error: '가격 정보 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '공급업체 가격 정보가 삭제되었습니다.'
    })

  } catch (error) {
    console.error('가격 정보 삭제 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; priceId: string } }
) {
  try {
    const supabase = createServerClient()
    const { id: endmillId, priceId } = params
    const updateData = await request.json()

    if (!endmillId || !priceId) {
      return NextResponse.json(
        { error: '필수 ID가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 가격 정보 수정
    const { data: updatedPrice, error } = await supabase
      .from('endmill_supplier_prices')
      .update({
        unit_price: updateData.unit_price,
        min_order_quantity: updateData.min_order_quantity || 1,
        lead_time_days: updateData.lead_time_days || 5,
        is_preferred: updateData.is_preferred || false,
        current_stock: updateData.current_stock || 0,
        quality_rating: updateData.quality_rating || 8,
        updated_at: new Date().toISOString()
      })
      .eq('id', priceId)
      .eq('endmill_type_id', endmillId)
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

    if (error) {
      console.error('가격 정보 수정 오류:', error)
      return NextResponse.json(
        { error: '가격 정보 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedPrice,
      message: '공급업체 가격 정보가 수정되었습니다.'
    })

  } catch (error) {
    console.error('가격 정보 수정 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}