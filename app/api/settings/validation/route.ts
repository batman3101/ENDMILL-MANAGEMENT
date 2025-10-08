import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../../lib/types/database'
import { logger } from '@/lib/utils/logger'

// Supabase 클라이언트 생성
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // app_settings 테이블에서 모든 설정값을 병렬로 조회
    const [categoriesData, suppliersData, processesData, modelsData] = await Promise.all([
      getCategoriesFromSettings(),
      getSuppliersFromSettings(),
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
    logger.error('Error fetching validation options:', error)
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
async function getCategoriesFromSettings() {
  const { data, error } = await supabase
    .from('app_settings' as any)
    .select('value')
    .eq('key', 'inventory.categories')
    .single()

  if (error || !data) {
    logger.error('Error fetching categories from settings:', error)
    return []
  }

  return (data as any).value || []
}

// 공급업체 조회 (app_settings에서)
async function getSuppliersFromSettings() {
  const { data, error } = await supabase
    .from('app_settings' as any)
    .select('value')
    .eq('key', 'inventory.suppliers')
    .single()

  if (error || !data) {
    logger.error('Error fetching suppliers from settings:', error)
    return []
  }

  return (data as any).value || []
}

// 프로세스 목록 조회 (app_settings에서)
async function getProcessesFromSettings() {
  const { data, error } = await supabase
    .from('app_settings' as any)
    .select('value')
    .eq('key', 'equipment.processes')
    .single()

  if (error || !data) {
    // 기본값 반환
    return ['CNC1', 'CNC2', 'CNC2-1']
  }

  return (data as any).value || ['CNC1', 'CNC2', 'CNC2-1']
}

// 모델 목록 조회 (app_settings에서)
async function getModelsFromSettings() {
  const { data, error } = await supabase
    .from('app_settings' as any)
    .select('value')
    .eq('key', 'equipment.models')
    .single()

  if (error || !data) {
    // 기본값 반환
    return ['PA1', 'R13']
  }

  return (data as any).value || ['PA1', 'R13']
}