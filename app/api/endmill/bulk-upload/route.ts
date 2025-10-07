import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

interface ExcelRowData {
  code: string
  category: string
  name: string
  supplier: string
  unit_cost: number
  standard_life: number
  model: string
  process: string
  tool_life: number
  t_number: number
}

export async function POST(request: NextRequest) {
  try {
    const { endmills } = await request.json()

    if (!endmills || !Array.isArray(endmills) || endmills.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않은 엔드밀 데이터입니다.' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // 1. 데이터 정규화 및 그룹핑
    const {
      endmillTypesMap,
      supplierPrices,
      camSheetEndmills,
      suppliersMap,
      camSheetsMap
    } = normalizeExcelData(endmills)

    logger.log('정규화된 데이터:', {
      endmillTypes: endmillTypesMap.size,
      supplierPrices: supplierPrices.length,
      camSheetEndmills: camSheetEndmills.length
    })

    // 2. 필요한 카테고리와 공급업체 수집
    const requiredCategories = new Set<string>()
    const requiredSuppliers = new Set<string>()

    endmillTypesMap.forEach(endmill => {
      if (endmill.category) requiredCategories.add(endmill.category)
    })

    suppliersMap.forEach((_, code) => {
      requiredSuppliers.add(code)
    })

    // 3. 카테고리 ID 매핑 생성 (자동 생성 포함)
    const categoryMap = await getCategoryMapping(supabase, requiredCategories)
    const supplierMap = await getSupplierMapping(supabase, requiredSuppliers)

    // 4. 순차 처리
    logger.log('엔드밀 타입 UPSERT 시작...')
    const processedEndmills = await upsertEndmillTypes(supabase, endmillTypesMap, categoryMap)
    logger.log('처리된 엔드밀 타입:', processedEndmills.length)

    logger.log('CAM Sheet 확인/생성 시작...')
    const processedCamSheets = await ensureCamSheets(supabase, camSheetsMap)
    logger.log('처리된 CAM Sheet:', processedCamSheets.length)

    logger.log('공급업체별 가격 정보 처리 시작...')
    const processedSupplierPrices = await upsertSupplierPrices(supabase, supplierPrices, processedEndmills, supplierMap)
    logger.log('처리된 공급업체 가격:', processedSupplierPrices.length)

    logger.log('CAM Sheet 엔드밀 매핑 처리 시작...')
    const processedCamSheetEndmills = await upsertCamSheetEndmills(supabase, camSheetEndmills, processedEndmills, processedCamSheets)
    logger.log('처리된 CAM Sheet 매핑:', processedCamSheetEndmills.length)

    // 5. 인벤토리 생성 (새로운 엔드밀 타입에 대해서만)
    logger.log('인벤토리 생성 시작...')
    await createInventoryForNewEndmills(supabase, processedEndmills)

    return NextResponse.json({
      success: true,
      count: endmills.length,
      message: `${endmills.length}개 행이 성공적으로 처리되었습니다.`,
      summary: {
        endmillTypes: processedEndmills.length,
        supplierPrices: processedSupplierPrices.length,
        camSheetMappings: processedCamSheetEndmills.length,
        camSheets: processedCamSheets.length
      }
    })

  } catch (error) {
    console.error('엔드밀 일괄 등록 API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 헬퍼 함수들
function normalizeExcelData(excelRows: ExcelRowData[]) {
  const endmillTypesMap = new Map()
  const supplierPrices = []
  const camSheetEndmills = []
  const suppliersMap = new Map()
  const camSheetsMap = new Map()

  for (const row of excelRows) {
    // 엔드밀 타입 기본 정보 (중복 코드는 첫 번째 값 또는 평균값 사용)
    if (!endmillTypesMap.has(row.code)) {
      endmillTypesMap.set(row.code, {
        code: row.code,
        category: row.category,
        name: row.name || row.code,
        unit_cost: row.unit_cost, // 기본 단가 (첫 번째 값)
        standard_life: row.standard_life || 1000
      })
    }

    // 공급업체 정보 수집
    if (row.supplier) {
      suppliersMap.set(row.supplier, { code: row.supplier })
    }

    // CAM Sheet 정보 수집
    if (row.model && row.process) {
      const key = `${row.model}_${row.process}`
      camSheetsMap.set(key, {
        model: row.model,
        process: row.process
      })
    }

    // 공급업체별 가격 정보
    if (row.supplier && row.unit_cost) {
      supplierPrices.push({
        endmill_code: row.code,
        supplier_code: row.supplier,
        unit_price: row.unit_cost,
        min_order_quantity: 1,
        lead_time_days: 7,
        is_preferred: false
      })
    }

    // CAM Sheet 엔드밀 매핑 정보
    if (row.model && row.process && row.tool_life && row.t_number) {
      camSheetEndmills.push({
        endmill_code: row.code,
        model: row.model,
        process: row.process,
        tool_life: row.tool_life,
        t_number: row.t_number,
        endmill_name: row.name || row.code
      })
    }
  }

  return {
    endmillTypesMap,
    supplierPrices,
    camSheetEndmills,
    suppliersMap,
    camSheetsMap
  }
}

async function getCategoryMapping(supabase: any, requiredCategories: Set<string>) {
  const { data, error } = await supabase
    .from('endmill_categories')
    .select('id, code')

  if (error) {
    console.error('카테고리 매핑 조회 오류:', error)
    return new Map()
  }

  const categoryMap = new Map(data.map((cat: any) => [cat.code, cat.id]))

  // 누락된 카테고리 자동 생성
  const missingCategories = Array.from(requiredCategories).filter(cat => !categoryMap.has(cat))

  if (missingCategories.length > 0) {
    logger.log('누락된 카테고리 생성:', missingCategories)

    const newCategories = missingCategories.map(code => ({
      code,
      name_ko: code,
      name_vi: code,
      description: `${code} 엔드밀`,
      created_at: new Date().toISOString()
    }))

    const { data: createdCategories, error: createError } = await supabase
      .from('endmill_categories')
      .insert(newCategories)
      .select('id, code')

    if (createError) {
      console.warn('카테고리 자동 생성 오류:', createError)
    } else if (createdCategories) {
      // 새로 생성된 카테고리를 맵에 추가
      createdCategories.forEach((cat: any) => {
        categoryMap.set(cat.code, cat.id)
      })
    }
  }

  return categoryMap
}

async function getSupplierMapping(supabase: any, requiredSuppliers: Set<string>) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, code')

  if (error) {
    console.error('공급업체 매핑 조회 오류:', error)
    return new Map()
  }

  const supplierMap = new Map(data.map((sup: any) => [sup.code, sup.id]))

  // 누락된 공급업체 자동 생성
  const missingSuppliers = Array.from(requiredSuppliers).filter(sup => !supplierMap.has(sup))

  if (missingSuppliers.length > 0) {
    logger.log('누락된 공급업체 생성:', missingSuppliers)

    const newSuppliers = missingSuppliers.map(code => ({
      code,
      name: `${code} 공구`,
      is_active: true,
      quality_rating: 4.0,
      contact_info: {
        phone: '',
        email: '',
        address: '',
        contact_person: ''
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { data: createdSuppliers, error: createError } = await supabase
      .from('suppliers')
      .insert(newSuppliers)
      .select('id, code')

    if (createError) {
      console.warn('공급업체 자동 생성 오류:', createError)
    } else if (createdSuppliers) {
      // 새로 생성된 공급업체를 맵에 추가
      createdSuppliers.forEach((sup: any) => {
        supplierMap.set(sup.code, sup.id)
      })
    }
  }

  return supplierMap
}

async function upsertEndmillTypes(supabase: any, endmillTypesMap: Map<string, any>, categoryMap: Map<string, string>) {
  const endmillTypes = Array.from(endmillTypesMap.values()).map(endmill => ({
    code: endmill.code,
    category_id: categoryMap.get(endmill.category) || null,
    name: endmill.name,
    unit_cost: endmill.unit_cost,
    standard_life: endmill.standard_life
  }))

  const { data, error } = await supabase
    .from('endmill_types')
    .upsert(endmillTypes, {
      onConflict: 'code',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    console.error('엔드밀 타입 UPSERT 오류:', error)
    throw new Error('엔드밀 타입 저장 중 오류가 발생했습니다.')
  }

  return data || []
}

async function ensureCamSheets(supabase: any, camSheetsMap: Map<string, any>) {
  const camSheets = Array.from(camSheetsMap.values())
  const results = []

  for (const camSheet of camSheets) {
    // 기존 CAM Sheet 확인
    const { data: existing } = await supabase
      .from('cam_sheets')
      .select('id, model, process')
      .eq('model', camSheet.model)
      .eq('process', camSheet.process)
      .single()

    if (existing) {
      results.push(existing)
    } else {
      // 새 CAM Sheet 생성
      const { data: newCamSheet, error } = await supabase
        .from('cam_sheets')
        .insert({
          model: camSheet.model,
          process: camSheet.process,
          cam_version: 'v1.0',
          version_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (error) {
        console.warn('CAM Sheet 생성 오류:', error)
      } else {
        results.push(newCamSheet)
      }
    }
  }

  return results
}

async function upsertSupplierPrices(
  supabase: any,
  supplierPrices: any[],
  endmills: any[],
  supplierMap: Map<string, string>
) {
  const endmillMap = new Map(endmills.map(e => [e.code, e.id]))

  const priceData = supplierPrices
    .map(sp => ({
      endmill_type_id: endmillMap.get(sp.endmill_code),
      supplier_id: supplierMap.get(sp.supplier_code),
      unit_price: sp.unit_price,
      min_order_quantity: sp.min_order_quantity || 1,
      lead_time_days: sp.lead_time_days || 7,
      is_preferred: sp.is_preferred || true
    }))
    .filter((item, index) => {
      const isValid = item.endmill_type_id && item.supplier_id
      if (!isValid) {
        console.warn(`Invalid supplier price mapping for item ${index}:`, item)
      }
      return isValid
    })

  if (priceData.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('endmill_supplier_prices')
    .upsert(priceData, {
      onConflict: 'endmill_type_id,supplier_id',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    console.warn('공급업체 가격 UPSERT 오류:', error)
    return []
  }

  return data || []
}

async function upsertCamSheetEndmills(
  supabase: any,
  camSheetEndmills: any[],
  endmills: any[],
  camSheets: any[]
) {
  const endmillMap = new Map(endmills.map(e => [e.code, e.id]))
  const camSheetMap = new Map(camSheets.map(cs => [`${cs.model}_${cs.process}`, cs.id]))

  const mappingData = camSheetEndmills
    .map(cse => ({
      cam_sheet_id: camSheetMap.get(`${cse.model}_${cse.process}`),
      endmill_type_id: endmillMap.get(cse.endmill_code),
      t_number: cse.t_number,
      tool_life: cse.tool_life,
      endmill_code: cse.endmill_code,
      endmill_name: cse.endmill_name
    }))
    .filter(item => item.cam_sheet_id && item.endmill_type_id)

  if (mappingData.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('cam_sheet_endmills')
    .upsert(mappingData, {
      onConflict: 'cam_sheet_id,t_number',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    console.warn('CAM Sheet 엔드밀 매핑 UPSERT 오류:', error)
    return []
  }

  return data || []
}

async function createInventoryForNewEndmills(supabase: any, endmills: any[]) {
  // 이미 인벤토리에 있는 엔드밀 확인
  const { data: existingInventory } = await supabase
    .from('inventory')
    .select('endmill_type_id')
    .in('endmill_type_id', endmills.map(e => e.id))

  const existingIds = new Set(existingInventory?.map((inv: any) => inv.endmill_type_id) || [])

  const newInventoryData = endmills
    .filter(endmill => !existingIds.has(endmill.id))
    .map(endmill => ({
      endmill_type_id: endmill.id,
      current_stock: 0,
      min_stock: 5,
      max_stock: 50,
      status: 'critical',
      location: 'A동 공구창고'
    }))

  if (newInventoryData.length > 0) {
    const { error } = await supabase
      .from('inventory')
      .insert(newInventoryData)

    if (error) {
      console.warn('인벤토리 생성 오류:', error)
    }
  }
}