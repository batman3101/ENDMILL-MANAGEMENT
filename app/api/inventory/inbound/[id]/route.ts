import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

// PUT /api/inventory/inbound/[id] - 입고 내역 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.log('📝 입고 내역 수정 API 호출:', { transactionId: params.id })

    const supabase = createServerClient()
    const transactionId = params.id
    const body = await request.json()

    logger.log('📝 받은 데이터:', body)

    const { quantity, unitPrice, supplier } = body

    // 필수 필드 검증
    if (!quantity || !unitPrice || !supplier) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 기존 트랜잭션 조회
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('inventory_transactions')
      .select('*, inventory(id, current_stock)')
      .eq('id', transactionId)
      .eq('transaction_type', 'inbound')
      .single()

    if (fetchError || !existingTransaction) {
      logger.error('입고 내역 조회 오류:', fetchError)
      return NextResponse.json(
        { error: '입고 내역을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const oldQuantity = existingTransaction.quantity
    const quantityDiff = quantity - oldQuantity

    // 트랜잭션 업데이트
    const { error: updateError } = await supabase
      .from('inventory_transactions')
      .update({
        quantity: quantity,
        unit_price: unitPrice,
        total_amount: quantity * unitPrice,
        purpose: supplier
      })
      .eq('id', transactionId)

    if (updateError) {
      logger.error('입고 내역 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: '입고 내역 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 재고 수량 조정
    if (quantityDiff !== 0 && existingTransaction.inventory) {
      const currentStock = (existingTransaction.inventory as any).current_stock || 0
      const newStock = currentStock + quantityDiff

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
      message: '입고 내역이 수정되었습니다.'
    })

  } catch (error) {
    logger.error('입고 내역 수정 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/inbound/[id] - 입고 내역 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const transactionId = params.id

    // 기존 트랜잭션 조회
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('inventory_transactions')
      .select('*, inventory(id, current_stock)')
      .eq('id', transactionId)
      .eq('transaction_type', 'inbound')
      .single()

    if (fetchError || !existingTransaction) {
      logger.error('입고 내역 조회 오류:', fetchError)
      return NextResponse.json(
        { error: '입고 내역을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 재고 수량에서 입고 수량 차감
    if (existingTransaction.inventory) {
      const currentStock = (existingTransaction.inventory as any).current_stock || 0
      const newStock = currentStock - existingTransaction.quantity

      if (newStock < 0) {
        return NextResponse.json(
          { error: '재고가 부족하여 삭제할 수 없습니다.' },
          { status: 400 }
        )
      }

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

    // 트랜잭션 삭제
    const { error: deleteError } = await supabase
      .from('inventory_transactions')
      .delete()
      .eq('id', transactionId)

    if (deleteError) {
      logger.error('입고 내역 삭제 오류:', deleteError)
      return NextResponse.json(
        { error: '입고 내역 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '입고 내역이 삭제되었습니다.'
    })

  } catch (error) {
    logger.error('입고 내역 삭제 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
