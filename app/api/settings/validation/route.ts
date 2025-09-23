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
    // 실제 DB 테이블에서 데이터를 병렬로 조회
    const [categoriesData, suppliersData, processesData, modelsData] = await Promise.all([
      getEndmillCategoriesFromDB(),
      getSuppliersFromDB(),
      getProcessesFromSettings(),
      getModelsFromSettings()
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

// 엔드밀 카테고리 조회 (endmill_categories 테이블에서)
async function getEndmillCategoriesFromDB() {
  const { data, error } = await supabase
    .from('endmill_categories')
    .select('code')
    .order('code')

  if (error) {
    console.error('Error fetching endmill categories:', error)
    return []
  }

  return data?.map(item => item.code) || []
}

// 공급업체 조회 (suppliers 테이블에서)
async function getSuppliersFromDB() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('code')
    .eq('is_active', true)
    .order('code')

  if (error) {
    console.error('Error fetching suppliers:', error)
    return []
  }

  return data?.map(item => item.code) || []
}

// 프로세스 목록 조회 (app_settings에서)
async function getProcessesFromSettings() {
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
async function getModelsFromSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'equipment.models')
    .single()

  if (error || !data) {
    // 기본값 반환
    return ['PA1', 'R13']
  }

  return data.value || ['PA1', 'R13']
}