import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../../lib/types/database'

// Supabase 클라이언트 생성
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // 검증에 필요한 모든 옵션들을 병렬로 조회
    const [categoriesData, suppliersData, processesData, modelsData] = await Promise.all([
      getEndmillCategories(),
      getSuppliers(),
      getProcesses(),
      getModels()
    ])

    return NextResponse.json({
      success: true,
      data: {
        categories: categoriesData,
        suppliers: suppliersData,
        processes: processesData,
        models: modelsData
      }
    })
  } catch (error) {
    console.error('Error fetching validation options:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch validation options'
      },
      { status: 500 }
    )
  }
}

// 엔드밀 카테고리 조회 (app_settings에서)
async function getEndmillCategories() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'inventory.categories')
    .single()

  if (error || !data) {
    // 기본값 반환
    return ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL', 'BULL_NOSE', 'SPECIAL']
  }

  return data.value || ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL', 'BULL_NOSE', 'SPECIAL']
}

// 공급업체 조회 (app_settings에서)
async function getSuppliers() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'inventory.suppliers')
    .single()

  if (error || !data) {
    // 기본값 반환
    return ['TOOLEX', 'FULLANDI', 'ATH', 'KEOSANG']
  }

  return data.value || ['TOOLEX', 'FULLANDI', 'ATH', 'KEOSANG']
}

// 프로세스 목록 조회 (app_settings에서)
async function getProcesses() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'equipment.processes')
    .single()

  if (error || !data) {
    // 기본값 반환
    return ['CNC1', 'CNC2', 'CNC2-1']
  }

  return data.value || ['CNC1', 'CNC2', 'CNC2-1']
}

// 모델 목록 조회 (app_settings에서)
async function getModels() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'equipment.models')
    .single()

  if (error || !data) {
    // 기본값 반환
    return ['PA1', 'PA2', 'PS', 'B7', 'Q7']
  }

  return data.value || ['PA1', 'PA2', 'PS', 'B7', 'Q7']
}