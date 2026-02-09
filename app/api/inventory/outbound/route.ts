import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { getFactoryPeriodRange, getFactoryDayRange } from '@/lib/utils/dateUtils'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const period = url.searchParams.get('period') as 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom' | null
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const date = url.searchParams.get('date') // 기존 호환성 유지
    const factoryId = url.searchParams.get('factoryId')

    // 공장 근무시간 기준으로 기간 계산 (베트남 08:00 시작)
    let dateFrom: string
    let dateTo: string

    if (date) {
      // 기존 date 파라미터 - 공장 시간 기준으로 변환
      const { start, end } = getFactoryDayRange(date)
      dateFrom = start
      dateTo = end
    } else {
      // period 기반 필터링 - 공장 시간 기준
      const { start, end } = getFactoryPeriodRange(
        period || 'today',
        startDate || undefined,
        endDate || undefined
      )
      dateFrom = start
      dateTo = end
    }

    logger.log('출고 내역 조회 기간 (공장 근무시간 기준):', { period, dateFrom, dateTo })

    // 출고 트랜잭션 조회
    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        inventory(
          *,
          endmill_type:endmill_types(
            *,
            endmill_categories(*)
          )
        ),
        processed_by:user_profiles(name, employee_id)
      `)
      .eq('transaction_type', 'outbound')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)

    // factory_id 필터 적용
    if (factoryId) {
      query = query.eq('factory_id', factoryId)
    }

    const { data: transactions, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger.error('출고 내역 조회 오류:', error)
      return NextResponse.json(
        { error: '출고 내역을 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 데이터 형식 변환
    const formattedTransactions = transactions?.map(tx => ({
      ...tx,
      endmill_type: tx.inventory?.endmill_type,
      equipment_number: tx.notes?.split(' ')?.[0] || '', // notes에서 추출
    }))

    return NextResponse.json({
      success: true,
      data: formattedTransactions || [],
      count: formattedTransactions?.length || 0
    })

  } catch (error) {
    logger.error('출고 내역 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      endmill_code,
      equipment_number,
      t_number,
      quantity,
      purpose,
      notes,
      factory_id
    } = body

    // 앤드밀 타입 조회
    const { data: endmillType, error: endmillError } = await supabase
      .from('endmill_types')
      .select('*')
      .eq('code', endmill_code)
      .single()

    if (endmillError || !endmillType) {
      return NextResponse.json(
        { error: `앤드밀 코드 '${endmill_code}'를 찾을 수 없습니다.` },
        { status: 400 }
      )
    }

    // 재고 조회 (해당 공장의 재고에서만)
    let inventoryQuery = supabase
      .from('inventory')
      .select('*')
      .eq('endmill_type_id', endmillType.id)

    if (factory_id) {
      inventoryQuery = inventoryQuery.eq('factory_id', factory_id)
    } else {
      inventoryQuery = inventoryQuery.is('factory_id', null)
    }

    const { data: inventory, error: inventoryError } = await inventoryQuery.single()

    if (inventoryError || !inventory) {
      return NextResponse.json(
        { error: '재고 정보를 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    // 재고가 충분한지 확인
    const currentStock = inventory.current_stock || 0
    if (currentStock < quantity) {
      return NextResponse.json(
        { error: `재고가 부족합니다. 현재 재고: ${currentStock}개` },
        { status: 400 }
      )
    }

    // 설비 정보 조회 (있는 경우, factory_id 필터 포함)
    let equipmentId = null
    if (equipment_number) {
      const equipmentNum = equipment_number.replace(/^C/i, '')
      let equipmentQuery = supabase
        .from('equipment')
        .select('id')
        .eq('equipment_number', equipmentNum)

      if (factory_id) {
        equipmentQuery = equipmentQuery.eq('factory_id', factory_id)
      }

      const { data: equipment } = await equipmentQuery.single()
      equipmentId = equipment?.id
    }

    // notes 생성 - 설비번호가 있는 경우와 없는 경우 구분
    let transactionNotes = notes || ''
    if (equipment_number && t_number) {
      transactionNotes = `${equipment_number} T${t_number.toString().padStart(2, '0')} ${notes || ''}`.trim()
    } else if (!equipment_number && !t_number) {
      transactionNotes = '미리 출고 (설비 미지정)'
    }

    // 트랜잭션 시작 - inventory_id 사용
    const { data: transaction, error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        inventory_id: inventory.id, // inventory_id 사용
        transaction_type: 'outbound', // 소문자로 변경
        quantity: quantity,
        equipment_id: equipmentId,
        t_number: t_number || null,
        purpose: purpose || '미리 준비',
        notes: transactionNotes,
        processed_by: body.user_id || null,
        unit_price: endmillType.unit_cost || 0,
        total_amount: quantity * (endmillType.unit_cost || 0),
        processed_at: new Date().toISOString(),
        factory_id: factory_id || null
      })
      .select(`
        *,
        inventory(
          *,
          endmill_type:endmill_types(
            *,
            endmill_categories(*)
          )
        )
      `)
      .single()

    if (transactionError) {
      logger.error('출고 트랜잭션 생성 오류:', transactionError)
      return NextResponse.json(
        { error: '출고 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 재고 차감
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        current_stock: currentStock - quantity,
        last_updated: new Date().toISOString()
      })
      .eq('id', inventory.id)

    if (updateError) {
      logger.error('재고 업데이트 오류:', updateError)
      // 트랜잭션 롤백 시도
      await supabase
        .from('inventory_transactions')
        .delete()
        .eq('id', transaction.id)

      return NextResponse.json(
        { error: '재고 업데이트 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 공구 교체 이력도 기록 (설비번호가 있는 경우)
    if (equipmentId && t_number) {
      await supabase
        .from('tool_changes')
        .insert({
          equipment_id: equipmentId,
          equipment_number: parseInt(equipment_number.replace(/^C/i, '')),
          endmill_type_id: endmillType.id,
          endmill_code: endmillType.code,
          endmill_name: endmillType.name,
          t_number: t_number,
          change_reason: purpose === '교체' ? '예방교체' : (purpose || '수명완료'),
          change_date: new Date().toISOString(),
          changed_by: body.user_id || null,
          notes: notes
        })
    }

    // 응답 데이터 형식 맞추기
    const responseData = {
      ...transaction,
      endmill_type: transaction.inventory?.endmill_type,
      equipment_number: equipment_number
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: '출고 처리가 완료되었습니다.'
    })

  } catch (error) {
    logger.error('출고 처리 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 출고 취소
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const transactionId = url.searchParams.get('id')

    if (!transactionId) {
      return NextResponse.json(
        { error: '트랜잭션 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 트랜잭션 조회
    const { data: transaction, error: fetchError } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('transaction_type', 'outbound')
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: '출고 트랜잭션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 재고 복구
    if (transaction.inventory_id) {
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', transaction.inventory_id)
        .single()

      if (!inventoryError && inventory) {
        const rollbackStock = (inventory.current_stock || 0) + transaction.quantity
        await supabase
          .from('inventory')
          .update({
            current_stock: rollbackStock,
            last_updated: new Date().toISOString()
          })
          .eq('id', inventory.id)
      }
    }

    // 트랜잭션 삭제
    const { error: deleteError } = await supabase
      .from('inventory_transactions')
      .delete()
      .eq('id', transactionId)

    if (deleteError) {
      return NextResponse.json(
        { error: '출고 취소 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '출고가 취소되었습니다.'
    })

  } catch (error) {
    logger.error('출고 취소 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}