import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

// PUT /api/inventory/outbound/[id] - 출고 내역 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id
    const body = await request.json()

    const { quantity, equipmentNumber, tNumber, purpose } = body

    // 필수 필드 검증
    if (!quantity) {
      return NextResponse.json(
        { error: '수량은 필수입니다.' },
        { status: 400 }
      )
    }

    // 기존 트랜잭션 조회
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('inventory_transactions')
      .select(`
        *,
        inventory(
          id,
          current_stock,
          endmill_type:endmill_types(*)
        )
      `)
      .eq('id', transactionId)
      .eq('transaction_type', 'outbound')
      .single()

    if (fetchError || !existingTransaction) {
      logger.error('출고 내역 조회 오류:', fetchError)
      return NextResponse.json(
        { error: '출고 내역을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const oldQuantity = existingTransaction.quantity
    const quantityDiff = quantity - oldQuantity

    // 수량이 증가하는 경우 재고 확인
    if (quantityDiff > 0 && existingTransaction.inventory) {
      const currentStock = (existingTransaction.inventory as any).current_stock || 0
      if (currentStock < quantityDiff) {
        return NextResponse.json(
          { error: `재고가 부족합니다. 현재 재고: ${currentStock}개` },
          { status: 400 }
        )
      }
    }

    // notes 생성
    let transactionNotes = ''
    if (equipmentNumber && tNumber) {
      transactionNotes = `${equipmentNumber} T${tNumber.toString().padStart(2, '0')}`
    } else {
      transactionNotes = '미리 출고 (설비 미지정)'
    }

    // 설비 정보 조회
    let equipmentId = null
    if (equipmentNumber) {
      const equipmentNum = equipmentNumber.replace(/^C/i, '')
      const { data: equipment } = await supabase
        .from('equipment')
        .select('id')
        .eq('equipment_number', equipmentNum)
        .single()

      equipmentId = equipment?.id
    }

    // 단가 계산
    const unitPrice = existingTransaction.unit_price ||
                     (existingTransaction.inventory as any)?.endmill_type?.unit_cost || 0

    // 트랜잭션 업데이트
    const { error: updateError } = await supabase
      .from('inventory_transactions')
      .update({
        quantity: quantity,
        equipment_id: equipmentId,
        t_number: tNumber || null,
        purpose: purpose || '미리 준비',
        notes: transactionNotes,
        total_amount: quantity * unitPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)

    if (updateError) {
      logger.error('출고 내역 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: '출고 내역 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 재고 수량 조정 (수량 차이만큼)
    if (quantityDiff !== 0 && existingTransaction.inventory) {
      const currentStock = (existingTransaction.inventory as any).current_stock || 0
      const newStock = currentStock - quantityDiff // 출고는 차감이므로 -

      const { error: stockError } = await supabase
        .from('inventory')
        .update({
          current_stock: newStock,
          last_updated: new Date().toISOString(),
          status: newStock >= 50 ? 'sufficient' : newStock >= 20 ? 'low' : 'critical'
        })
        .eq('id', (existingTransaction.inventory as any).id)

      if (stockError) {
        logger.error('재고 수량 조정 오류:', stockError)
        return NextResponse.json(
          { error: '재고 수량 조정 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: '출고 내역이 수정되었습니다.'
    })

  } catch (error) {
    logger.error('출고 내역 수정 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/outbound/[id] - 출고 내역 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id

    // 기존 트랜잭션 조회
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('inventory_transactions')
      .select('*, inventory(id, current_stock)')
      .eq('id', transactionId)
      .eq('transaction_type', 'outbound')
      .single()

    if (fetchError || !existingTransaction) {
      logger.error('출고 내역 조회 오류:', fetchError)
      return NextResponse.json(
        { error: '출고 내역을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 재고 복구 (출고 수량만큼 다시 더하기)
    if (existingTransaction.inventory) {
      const currentStock = (existingTransaction.inventory as any).current_stock || 0
      const restoredStock = currentStock + existingTransaction.quantity

      const { error: stockError } = await supabase
        .from('inventory')
        .update({
          current_stock: restoredStock,
          last_updated: new Date().toISOString(),
          status: restoredStock >= 50 ? 'sufficient' : restoredStock >= 20 ? 'low' : 'critical'
        })
        .eq('id', (existingTransaction.inventory as any).id)

      if (stockError) {
        logger.error('재고 복구 오류:', stockError)
        return NextResponse.json(
          { error: '재고 복구 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }
    }

    // 관련된 tool_changes 이력도 삭제 (있는 경우)
    if (existingTransaction.equipment_id && existingTransaction.t_number) {
      await supabase
        .from('tool_changes')
        .delete()
        .eq('equipment_id', existingTransaction.equipment_id)
        .eq('t_number', existingTransaction.t_number)
        .gte('change_date', new Date(existingTransaction.created_at || existingTransaction.processed_at).toISOString())
        .lte('change_date', new Date(new Date(existingTransaction.created_at || existingTransaction.processed_at).getTime() + 60000).toISOString()) // 1분 이내
    }

    // 트랜잭션 삭제
    const { error: deleteError } = await supabase
      .from('inventory_transactions')
      .delete()
      .eq('id', transactionId)

    if (deleteError) {
      logger.error('출고 내역 삭제 오류:', deleteError)
      return NextResponse.json(
        { error: '출고 내역 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '출고 내역이 삭제되었습니다.'
    })

  } catch (error) {
    logger.error('출고 내역 삭제 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
