import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // 오늘 입고 내역 조회
    const today = new Date().toISOString().split('T')[0]

    const { data: transactions, error } = await supabase
      .from('inventory_transactions')
      .select(`
        *,
        inventory!inner (
          endmill_type_id,
          endmill_types (
            code,
            name
          )
        )
      `)
      .eq('transaction_type', 'inbound')
      .gte('processed_at', `${today}T00:00:00.000Z`)
      .lte('processed_at', `${today}T23:59:59.999Z`)
      .order('processed_at', { ascending: false })

    if (error) {
      console.error('입고 내역 조회 오류:', error)
      return NextResponse.json(
        { error: '입고 내역을 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 데이터 정리
    const formattedTransactions = (transactions || []).map(transaction => ({
      id: transaction.id,
      endmillCode: transaction.inventory?.endmill_types?.code || '',
      endmillName: transaction.inventory?.endmill_types?.name || '',
      supplier: transaction.purpose || '', // supplier 정보를 purpose 필드에 저장
      quantity: transaction.quantity,
      unitPrice: transaction.unit_price,
      totalPrice: transaction.total_amount,
      processedAt: new Date(transaction.processed_at).toLocaleString('ko-KR'),
      processedBy: transaction.notes || '관리자'
    }))

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      count: formattedTransactions.length
    })

  } catch (error) {
    console.error('입고 내역 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { endmill_code, endmill_name, supplier, quantity, unit_price, total_amount } = body

    // 필수 필드 검증
    if (!endmill_code || !quantity || !unit_price || !supplier) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 앤드밀 타입 조회
    const { data: endmillType, error: endmillError } = await supabase
      .from('endmill_types')
      .select('id')
      .eq('code', endmill_code)
      .single()

    if (endmillError || !endmillType) {
      console.error('앤드밀 타입 조회 오류:', endmillError)
      return NextResponse.json(
        { error: '앤드밀 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 재고 정보 조회 또는 생성
    let { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('id, current_stock')
      .eq('endmill_type_id', endmillType.id)
      .single()

    if (inventoryError && inventoryError.code === 'PGRST116') {
      // 재고 정보가 없으면 새로 생성
      const { data: newInventory, error: createError } = await supabase
        .from('inventory')
        .insert({
          endmill_type_id: endmillType.id,
          current_stock: 0,
          min_stock: 50,
          max_stock: 500,
          status: 'sufficient',
          location: '창고A'
        })
        .select('id, current_stock')
        .single()

      if (createError) {
        console.error('재고 정보 생성 오류:', createError)
        return NextResponse.json(
          { error: '재고 정보 생성 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }

      inventory = newInventory
    } else if (inventoryError) {
      console.error('재고 정보 조회 오류:', inventoryError)
      return NextResponse.json(
        { error: '재고 정보 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 입고 트랜잭션 생성
    const { data: transaction, error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        inventory_id: inventory.id,
        transaction_type: 'inbound',
        quantity: quantity,
        unit_price: unit_price,
        total_amount: total_amount,
        purpose: supplier, // 공급업체 정보를 purpose에 저장
        notes: '관리자', // 실제로는 로그인된 사용자 정보
        processed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (transactionError) {
      console.error('입고 트랜잭션 생성 오류:', transactionError)
      return NextResponse.json(
        { error: '입고 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 재고 수량 업데이트
    const newStock = (inventory.current_stock || 0) + quantity
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        current_stock: newStock,
        last_updated: new Date().toISOString(),
        status: newStock >= 50 ? 'sufficient' : newStock >= 20 ? 'low' : 'critical'
      })
      .eq('id', inventory.id)

    if (updateError) {
      console.error('재고 수량 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: '재고 수량 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: transaction,
      message: '입고 처리가 완료되었습니다.'
    })

  } catch (error) {
    console.error('입고 처리 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}