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

    // factory_id 필수: 공장 미선택 출고는 거부 (DB UNIQUE 보호와 일치)
    if (!factory_id) {
      return NextResponse.json(
        { error: '공장이 선택되지 않았습니다. 헤더에서 공장을 선택해 주세요.' },
        { status: 400 }
      )
    }

    // 수량 검증
    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: '유효한 출고 수량을 입력해 주세요.' },
        { status: 400 }
      )
    }

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

    // 재고 조회: (endmill_type_id, factory_id) UNIQUE이므로 정확히 1행
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .eq('endmill_type_id', endmillType.id)
      .eq('factory_id', factory_id)
      .maybeSingle()

    if (inventoryError) {
      logger.error('재고 조회 오류:', inventoryError)
      return NextResponse.json(
        { error: '재고 정보 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (!inventory) {
      return NextResponse.json(
        { error: '해당 공장에 이 앤드밀의 재고 항목이 없습니다. 먼저 입고 처리를 해주세요.' },
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

    // 설비 정보 조회 (있는 경우, 공장별 단일 매칭)
    let equipmentId = null
    if (equipment_number) {
      const equipmentNum = equipment_number.replace(/^C/i, '')
      const { data: equipment } = await supabase
        .from('equipment')
        .select('id')
        .eq('equipment_number', equipmentNum)
        .eq('factory_id', factory_id)
        .maybeSingle()
      equipmentId = equipment?.id ?? null
    }

    // notes 생성 - 설비번호가 있는 경우와 없는 경우 구분
    let transactionNotes = notes || ''
    if (equipment_number && t_number) {
      transactionNotes = `${equipment_number} T${t_number.toString().padStart(2, '0')} ${notes || ''}`.trim()
    } else if (!equipment_number && !t_number) {
      transactionNotes = '미리 출고 (설비 미지정)'
    }

    // 재고 차감을 먼저 안전하게 (동시 출고 race condition 방어: stock>=quantity 조건부 UPDATE)
    const { data: updatedInventory, error: updateError } = await supabase
      .from('inventory')
      .update({
        current_stock: currentStock - quantity,
        last_updated: new Date().toISOString()
      })
      .eq('id', inventory.id)
      .gte('current_stock', quantity)
      .select('id, current_stock')
      .maybeSingle()

    if (updateError) {
      logger.error('재고 차감 오류:', updateError)
      return NextResponse.json(
        { error: '재고 차감 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (!updatedInventory) {
      // 다른 동시 요청이 stock을 소진시켰을 가능성 (조건부 UPDATE 매치 실패)
      return NextResponse.json(
        { error: '재고가 부족하여 출고할 수 없습니다. 화면을 새로고침 후 다시 시도해 주세요.' },
        { status: 409 }
      )
    }

    // 차감 성공 후 트랜잭션 기록 (재고 정합성 우선)
    const { data: transaction, error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        inventory_id: inventory.id,
        transaction_type: 'outbound',
        quantity: quantity,
        equipment_id: equipmentId,
        t_number: t_number || null,
        purpose: purpose || '미리 준비',
        notes: transactionNotes,
        processed_by: body.user_id || null,
        unit_price: endmillType.unit_cost || 0,
        total_amount: quantity * (endmillType.unit_cost || 0),
        processed_at: new Date().toISOString(),
        factory_id: factory_id
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
      // 차감 롤백 (트랜잭션 기록 실패 시 stock 원복)
      await supabase
        .from('inventory')
        .update({
          current_stock: currentStock,
          last_updated: new Date().toISOString()
        })
        .eq('id', inventory.id)
      return NextResponse.json(
        { error: '출고 처리 중 오류가 발생했습니다.' },
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