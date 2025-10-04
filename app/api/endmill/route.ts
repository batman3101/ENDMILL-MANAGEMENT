import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const url = new URL(request.url)
    const code = url.searchParams.get('code')

    // 특정 코드로 검색하는 경우
    let endmillTypes, error;

    if (code) {
      const result = await supabase
        .from('endmill_types')
        .select(`
          *,
          endmill_categories(code, name_ko),
          endmill_supplier_prices(
            unit_price,
            suppliers(code, name)
          ),
          cam_sheet_endmills(
            tool_life,
            t_number,
            cam_sheets(model, process)
          ),
          inventory(
            current_stock,
            min_stock,
            max_stock,
            status,
            location
          )
        `)
        .eq('code', code.toUpperCase())
        .single()

      endmillTypes = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('endmill_types')
        .select(`
          *,
          endmill_categories(code, name_ko),
          endmill_supplier_prices(
            unit_price,
            suppliers(code, name)
          ),
          cam_sheet_endmills(
            tool_life,
            t_number,
            cam_sheets(model, process)
          ),
          inventory(
            current_stock,
            min_stock,
            max_stock,
            status,
            location
          )
        `)
        .order('created_at', { ascending: false })

      endmillTypes = result.data
      error = result.error
    }

    if (error) {
      console.error('엔드밀 데이터 조회 오류:', error)
      return NextResponse.json(
        { error: '엔드밀 데이터를 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 데이터 정리 및 가공
    const processEndmill = (endmill: any) => ({
      id: endmill.id,
      code: endmill.code,
      category: endmill.endmill_categories?.code || '',
      categoryName: endmill.endmill_categories?.name_ko || '',
      name: endmill.name,
      unitCost: endmill.unit_cost,
      standardLife: endmill.standard_life,
      suppliers: endmill.endmill_supplier_prices?.map((sp: any) => ({
        code: sp.suppliers?.code || '',
        name: sp.suppliers?.name || '',
        unitPrice: sp.unit_price
      })) || [],
      camSheets: endmill.cam_sheet_endmills?.map((cs: any) => ({
        model: cs.cam_sheets?.model || '',
        process: cs.cam_sheets?.process || '',
        toolLife: cs.tool_life,
        tNumber: cs.t_number
      })) || [],
      inventory: endmill.inventory ? {
        currentStock: endmill.inventory.current_stock,
        minStock: endmill.inventory.min_stock,
        maxStock: endmill.inventory.max_stock,
        status: endmill.inventory.status,
        location: endmill.inventory.location
      } : null,
      createdAt: endmill.created_at,
      updatedAt: endmill.updated_at
    })

    const processedEndmills = code
      ? (endmillTypes ? [processEndmill(endmillTypes as any)] : [])
      : (Array.isArray(endmillTypes) ? endmillTypes.map(processEndmill) : [])

    return NextResponse.json({
      success: true,
      data: processedEndmills,
      count: processedEndmills.length
    })

  } catch (error) {
    console.error('엔드밀 조회 API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}