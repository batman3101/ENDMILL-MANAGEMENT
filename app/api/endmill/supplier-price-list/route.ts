import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import ExcelJS from 'exceljs'

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerClient()

    // 1. 모든 앤드밀 타입 조회
    const { data: endmillTypes, error: endmillError } = await supabase
      .from('endmill_types')
      .select(`
        id,
        code,
        name,
        unit_cost,
        endmill_categories (
          name_ko
        )
      `)
      .order('code')

    if (endmillError) {
      logger.error('앤드밀 조회 오류:', endmillError)
      return NextResponse.json(
        { error: '앤드밀 정보를 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 2. 모든 공급업체별 가격 정보 조회
    const { data: supplierPrices, error: pricesError } = await supabase
      .from('endmill_supplier_prices')
      .select(`
        *,
        suppliers!inner (
          id,
          code,
          name,
          quality_rating,
          is_active
        )
      `)
      .eq('suppliers.is_active', true)

    if (pricesError) {
      logger.error('공급업체 가격 조회 오류:', pricesError)
      return NextResponse.json(
        { error: '공급업체 가격 정보를 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 3. 공급업체 목록 추출
    const suppliersMap = new Map<string, any>()
    supplierPrices?.forEach(price => {
      if (price.suppliers && !suppliersMap.has(price.suppliers.id)) {
        suppliersMap.set(price.suppliers.id, price.suppliers)
      }
    })
    const suppliers = Array.from(suppliersMap.values()).sort((a, b) =>
      a.code.localeCompare(b.code)
    )

    // 4. 엑셀 파일 생성
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('공급업체별 단가표')

    // 헤더 스타일 정의
    const headerStyle = {
      font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF1E40AF' }
      },
      alignment: { vertical: 'middle' as const, horizontal: 'center' as const },
      border: {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const }
      }
    }

    // 헤더 행 생성
    const headers = [
      '앤드밀 코드',
      '앤드밀 이름',
      '카테고리',
      '기준 단가 (VND)',
      ...suppliers.map(s => `${s.code || s.name}\n단가 (VND)`),
      ...suppliers.map(s => `${s.code || s.name}\n품질등급`),
      ...suppliers.map(s => `${s.code || s.name}\n재고`),
      ...suppliers.map(s => `${s.code || s.name}\n납기일(일)`)
    ]

    const headerRow = worksheet.addRow(headers)
    headerRow.height = 30
    headerRow.eachCell((cell) => {
      cell.style = headerStyle
    })

    // 데이터 행 생성
    endmillTypes?.forEach((endmill: any) => {
      const row: any[] = [
        endmill.code,
        endmill.name,
        endmill.endmill_categories?.name_ko || '',
        endmill.unit_cost || 0
      ]

      // 각 공급업체별로 정보 추가
      suppliers.forEach(supplier => {
        const price = supplierPrices?.find(
          p => p.endmill_type_id === endmill.id && p.suppliers?.id === supplier.id
        )
        row.push(price?.unit_price || '-')
      })

      suppliers.forEach(supplier => {
        const price = supplierPrices?.find(
          p => p.endmill_type_id === endmill.id && p.suppliers?.id === supplier.id
        )
        row.push(price?.quality_rating ? `${price.quality_rating}/10` : '-')
      })

      suppliers.forEach(supplier => {
        const price = supplierPrices?.find(
          p => p.endmill_type_id === endmill.id && p.suppliers?.id === supplier.id
        )
        row.push(price?.current_stock || '-')
      })

      suppliers.forEach(supplier => {
        const price = supplierPrices?.find(
          p => p.endmill_type_id === endmill.id && p.suppliers?.id === supplier.id
        )
        row.push(price?.lead_time_days || '-')
      })

      const dataRow = worksheet.addRow(row)
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }

        // 숫자 셀 포맷팅
        if (colNumber > 3 && cell.value !== '-' && typeof cell.value === 'number') {
          cell.numFmt = '#,##0'
        }
      })
    })

    // 컬럼 너비 설정
    worksheet.columns = [
      { width: 15 },  // 앤드밀 코드
      { width: 40 },  // 앤드밀 이름
      { width: 15 },  // 카테고리
      { width: 15 },  // 기준 단가
      ...suppliers.map(() => ({ width: 12 })),  // 공급업체 단가
      ...suppliers.map(() => ({ width: 10 })),  // 품질등급
      ...suppliers.map(() => ({ width: 10 })),  // 재고
      ...suppliers.map(() => ({ width: 10 }))   // 납기일
    ]

    // 엑셀 파일을 버퍼로 생성
    const buffer = await workbook.xlsx.writeBuffer()

    // 파일명 생성
    const fileName = `공급업체별_단가표_${new Date().toISOString().split('T')[0]}.xlsx`

    // 응답 반환
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
      }
    })

  } catch (error) {
    logger.error('공급업체별 단가표 다운로드 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
