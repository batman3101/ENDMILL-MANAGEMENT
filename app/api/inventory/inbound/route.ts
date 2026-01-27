import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { getFactoryPeriodRange } from '@/lib/utils/dateUtils'
import { applyFactoryFilter } from '@/lib/utils/factoryFilter'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // 기간 필터 파라미터 가져오기
    const period = searchParams.get('period') as 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom' | null
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const factoryId = searchParams.get('factoryId') || undefined

    // 공장 근무시간 기준으로 기간 계산 (베트남 08:00 시작)
    const { start: dateFrom, end: dateTo } = getFactoryPeriodRange(
      period || 'today',
      startDate || undefined,
      endDate || undefined
    )

    logger.log('입고 내역 조회 기간 (공장 근무시간 기준):', { period, dateFrom, dateTo })

    let query = supabase
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
      .gte('processed_at', dateFrom)
      .lte('processed_at', dateTo)

    // factory_id 필터 적용 (inventory_transactions 테이블에 factory_id 존재)
    query = applyFactoryFilter(query, factoryId)

    const { data: transactions, error } = await query.order('processed_at', { ascending: false })

    if (error) {
      logger.error('입고 내역 조회 오류:', error)
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
      processedAt: transaction.processed_at ? new Date(transaction.processed_at).toLocaleString('ko-KR') : '',
      processedBy: transaction.notes || '관리자'
    }))

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      count: formattedTransactions.length
    })

  } catch (error) {
    logger.error('입고 내역 조회 API 오류:', error)
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

    const { endmill_code, supplier, quantity, unit_price, total_amount, factory_id } = body

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
      logger.error('앤드밀 타입 조회 오류:', endmillError)
      return NextResponse.json(
        { error: '앤드밀 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 재고 정보 조회 또는 생성 (factory_id 필터 적용)
    let inventoryQuery = supabase
      .from('inventory')
      .select('id, current_stock')
      .eq('endmill_type_id', endmillType.id)

    if (factory_id) {
      inventoryQuery = inventoryQuery.eq('factory_id', factory_id)
    } else {
      inventoryQuery = inventoryQuery.is('factory_id', null)
    }

    const { data: inventory, error } = await inventoryQuery.single()

    let finalInventory = inventory

    if (error && error.code === 'PGRST116') {
      // 재고 정보가 없으면 새로 생성
      const { data: newInventory, error: createError } = await supabase
        .from('inventory')
        .insert({
          endmill_type_id: endmillType.id,
          current_stock: 0,
          min_stock: 50,
          max_stock: 500,
          status: 'sufficient',
          location: '창고A',
          factory_id: factory_id || null
        })
        .select('id, current_stock')
        .single()

      if (createError) {
        logger.error('재고 정보 생성 오류:', createError)
        return NextResponse.json(
          { error: '재고 정보 생성 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }

      finalInventory = newInventory
    } else if (error) {
      logger.error('재고 정보 조회 오류:', error)
      return NextResponse.json(
        { error: '재고 정보 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 입고 트랜잭션 생성
    if (!finalInventory) {
      return NextResponse.json(
        { error: '재고 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        inventory_id: finalInventory.id,
        transaction_type: 'inbound',
        quantity: quantity,
        unit_price: unit_price,
        total_amount: total_amount,
        purpose: supplier, // 공급업체 정보를 purpose에 저장
        notes: '관리자', // 실제로는 로그인된 사용자 정보
        processed_at: new Date().toISOString(),
        factory_id: factory_id || null
      })
      .select()
      .single()

    if (transactionError) {
      logger.error('입고 트랜잭션 생성 오류:', transactionError)
      return NextResponse.json(
        { error: '입고 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 재고 수량 업데이트
    const newStock = (finalInventory.current_stock || 0) + quantity
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        current_stock: newStock,
        last_updated: new Date().toISOString(),
        status: newStock >= 50 ? 'sufficient' : newStock >= 20 ? 'low' : 'critical'
      })
      .eq('id', finalInventory.id)

    if (updateError) {
      logger.error('재고 수량 업데이트 오류:', updateError)
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
    logger.error('입고 처리 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}