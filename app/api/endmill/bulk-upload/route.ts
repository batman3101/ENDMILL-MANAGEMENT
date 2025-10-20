import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

// 엔드밀 타입 마스터 데이터만 처리 (MODEL, PROCESS, TOOL LIFE, T NUMBER는 CAM Sheet에서 관리)
interface ExcelRowData {
  code: string
  category: string
  name: string
  supplier: string
  unit_cost: number
  standard_life: number
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

    // 1. 데이터 정규화 및 그룹핑 - 엔드밀 타입 마스터 데이터만
    const {
      endmillTypesMap,
      supplierPrices,
      suppliersMap
    } = normalizeExcelData(endmills)

    logger.log('정규화된 데이터:', {
      endmillTypes: endmillTypesMap.size,
      supplierPrices: supplierPrices.length
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

    // 4. 순차 처리 - 엔드밀 타입 마스터 데이터만
    logger.log('엔드밀 타입 UPSERT 시작...')
    const processedEndmills = await upsertEndmillTypes(supabase, endmillTypesMap, categoryMap)
    logger.log('처리된 엔드밀 타입:', processedEndmills.length)

    logger.log('공급업체별 가격 정보 처리 시작...')
    const processedSupplierPrices = await upsertSupplierPrices(supabase, supplierPrices, processedEndmills, supplierMap)
    logger.log('처리된 공급업체 가격:', processedSupplierPrices.length)

    // 5. 인벤토리 생성 (새로운 엔드밀 타입에 대해서만)
    logger.log('인벤토리 생성 시작...')
    await createInventoryForNewEndmills(supabase, processedEndmills)

    return NextResponse.json({
      success: true,
      count: endmills.length,
      message: `${endmills.length}개의 엔드밀 타입이 성공적으로 처리되었습니다. (MODEL, PROCESS, TOOL LIFE는 CAM Sheet에서 관리하세요)`,
      summary: {
        endmillTypes: processedEndmills.length,
        supplierPrices: processedSupplierPrices.length
      }
    })

  } catch (error) {
    logger.error('엔드밀 일괄 등록 API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 헬퍼 함수들 - 엔드밀 타입 마스터 데이터만 처리
function normalizeExcelData(excelRows: ExcelRowData[]) {
  const endmillTypesMap = new Map()
  const supplierPrices = []
  const suppliersMap = new Map()

  for (const row of excelRows) {
    // 엔드밀 타입 기본 정보 (중복 코드는 첫 번째 값 사용)
    if (!endmillTypesMap.has(row.code)) {
      endmillTypesMap.set(row.code, {
        code: row.code,
        category: row.category,
        name: row.name || row.code,
        unit_cost: row.unit_cost, // 기본 단가 (첫 번째 공급업체 값)
        standard_life: row.standard_life || 1000
      })
    }

    // 공급업체 정보 수집
    if (row.supplier) {
      suppliersMap.set(row.supplier, { code: row.supplier })
    }

    // 공급업체별 가격 정보 (같은 엔드밀 코드에 여러 공급업체 가능)
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
  }

  return {
    endmillTypesMap,
    supplierPrices,
    suppliersMap
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
    logger.error('엔드밀 타입 UPSERT 오류:', error)
    throw new Error('엔드밀 타입 저장 중 오류가 발생했습니다.')
  }

  return data || []
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
        logger.warn(`Invalid supplier price mapping for item ${index}:`, item)
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
    logger.warn('공급업체 가격 UPSERT 오류:', error)
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
      logger.warn('인벤토리 생성 오류:', error)
    }
  }
}