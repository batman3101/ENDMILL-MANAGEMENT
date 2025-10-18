import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

// Supabase 클라이언트 생성 (Service Role)
const supabase = createServerClient()

export async function GET(_request: NextRequest) {
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
    .eq('category', 'inventory')
    .eq('key', 'categories')
    .maybeSingle()

  if (error) {
    logger.error('Error fetching categories from settings:', error)
    return []
  }

  return (data as any)?.value || []
}

// 공급업체 조회 (app_settings에서)
async function getSuppliersFromSettings() {
  const { data, error } = await supabase
    .from('app_settings' as any)
    .select('value')
    .eq('category', 'inventory')
    .eq('key', 'suppliers')
    .maybeSingle()

  if (error) {
    logger.error('Error fetching suppliers from settings:', error)
    return []
  }

  return (data as any)?.value || []
}

// 프로세스 목록 조회 (app_settings에서)
async function getProcessesFromSettings() {
  const { data, error } = await supabase
    .from('app_settings' as any)
    .select('value')
    .eq('category', 'equipment')
    .eq('key', 'processes')
    .maybeSingle()

  if (error) {
    logger.error('Error fetching processes from settings:', error)
    // 기본값 반환
    return ['CNC1', 'CNC2', 'CNC2-1']
  }

  return (data as any)?.value || ['CNC1', 'CNC2', 'CNC2-1']
}

// 모델 목록 조회 (app_settings에서)
async function getModelsFromSettings() {
  const { data, error } = await supabase
    .from('app_settings' as any)
    .select('value')
    .eq('category', 'equipment')
    .eq('key', 'models')
    .maybeSingle()

  if (error) {
    logger.error('Error fetching models from settings:', error)
    // 기본값 반환
    return ['PA1', 'R13']
  }

  return (data as any)?.value || ['PA1', 'R13']
}