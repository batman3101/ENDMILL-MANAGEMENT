import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../lib/types/database'
import { SettingsManager } from '../../../lib/data/settingsManager'
import { SystemSettings, SettingsCategory, SettingsValidationResult } from '../../../lib/types/settings'

// Supabase 클라이언트 생성
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET: 설정 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as SettingsCategory | null
    const history = searchParams.get('history') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    if (history) {
      // 히스토리 조회 (DB에서)
      let query = supabase
        .from('settings_history')
        .select('*')
        .order('changed_at', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }
      
      if (limit) {
        query = query.limit(limit)
      }

      const { data: historyData, error } = await query
      
      if (error) {
        console.error('히스토리 조회 실패:', error)
        // 폴백: 로컬 매니저 사용
        const settingsManager = SettingsManager.getInstance()
        const localHistory = settingsManager.getHistory(category || undefined, limit)
        return NextResponse.json({
          success: true,
          data: localHistory,
          message: '설정 히스토리를 조회했습니다. (로컬)'
        })
      }

      return NextResponse.json({
        success: true,
        data: historyData || [],
        message: '설정 히스토리를 조회했습니다.'
      })
    }

    // 설정 조회 (DB 우선, 실패시 로컬)
    try {
      const { data: dbSettings, error } = await supabase
        .from('system_settings')
        .select('category, key, value')
        .order('category, key')

      if (!error && dbSettings && dbSettings.length > 0) {
        // DB 데이터를 SystemSettings 형태로 변환
        const settings: any = {}
        
        dbSettings.forEach(setting => {
          if (!settings[setting.category]) {
            settings[setting.category] = {}
          }
          settings[setting.category][setting.key] = setting.value
        })

        // 기본값과 병합
        const settingsManager = SettingsManager.getInstance()
        const defaultSettings = settingsManager.getSettings()
        const mergedSettings = { ...defaultSettings, ...settings }

        if (category) {
          return NextResponse.json({
            success: true,
            data: { [category]: mergedSettings[category] || defaultSettings[category] },
            message: `${category} 카테고리 설정을 조회했습니다.`
          })
        }

        return NextResponse.json({
          success: true,
          data: mergedSettings,
          message: '전체 설정을 조회했습니다.'
        })
      }
    } catch (dbError) {
      console.warn('DB 설정 조회 실패, 로컬 사용:', dbError)
    }

    // 폴백: 로컬 설정 사용
    const settingsManager = SettingsManager.getInstance()
    
    if (category) {
      const categorySettings = settingsManager.getCategorySettings(category)
      return NextResponse.json({
        success: true,
        data: { [category]: categorySettings },
        message: `${category} 카테고리 설정을 조회했습니다. (로컬)`
      })
    }

    const allSettings = settingsManager.getSettings()
    return NextResponse.json({
      success: true,
      data: allSettings,
      message: '전체 설정을 조회했습니다. (로컬)'
    })

  } catch (error) {
    console.error('설정 조회 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '설정 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

// 설정을 DB에 저장하는 헬퍼 함수
async function saveSettingsToDB(settings: any, category?: string, changedBy: string = 'api', reason?: string) {
  const promises: Promise<any>[] = []
  const historyPromises: Promise<any>[] = []

  const settingsToSave = category ? { [category]: settings } : settings

  for (const [cat, catSettings] of Object.entries(settingsToSave)) {
    if (typeof catSettings === 'object' && catSettings !== null) {
      for (const [key, value] of Object.entries(catSettings as Record<string, any>)) {
        // 설정 저장/업데이트
        promises.push(
          supabase
            .from('system_settings')
            .upsert({
              category: cat,
              key: key,
              value: value,
              updated_by: changedBy,
              updated_at: new Date().toISOString()
            })
            .select()
        )

        // 히스토리 기록
        historyPromises.push(
          supabase
            .from('settings_history')
            .insert({
              category: cat,
              key: key,
              new_value: value,
              changed_by: changedBy,
              changed_at: new Date().toISOString(),
              reason: reason
            })
        )
      }
    }
  }

  // 모든 설정 저장
  const results = await Promise.allSettled(promises)
  const historyResults = await Promise.allSettled(historyPromises)
  
  const errors = results.filter(r => r.status === 'rejected')
  if (errors.length > 0) {
    console.error('DB 저장 실패:', errors)
    throw new Error('데이터베이스 저장 중 오류가 발생했습니다.')
  }

  return true
}

// PUT: 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates, category, changedBy = 'api', reason } = body

    if (!updates) {
      return NextResponse.json(
        {
          success: false,
          error: '업데이트할 설정 데이터가 필요합니다.'
        },
        { status: 400 }
      )
    }

    const settingsManager = SettingsManager.getInstance()

    // 유효성 검증
    if (category) {
      // 카테고리별 업데이트
      const currentSettings = settingsManager.getSettings()
      const testSettings = {
        ...currentSettings,
        [category]: { ...(currentSettings as any)[category], ...updates }
      }
      const validation = settingsManager.validateSettings(testSettings)
      
      if (!validation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: '설정 유효성 검증에 실패했습니다.',
            validation
          },
          { status: 400 }
        )
      }

      // DB에 저장
      try {
        await saveSettingsToDB(updates, category, changedBy, reason)
      } catch (dbError) {
        console.warn('DB 저장 실패, 로컬 저장만 수행:', dbError)
      }

      // 로컬에도 저장 (폴백 및 동기화)
      settingsManager.updateCategorySettings(category, updates, changedBy, reason)
    } else {
      // 전체 설정 업데이트
      const validation = settingsManager.validateSettings(updates)
      
      if (!validation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: '설정 유효성 검증에 실패했습니다.',
            validation
          },
          { status: 400 }
        )
      }

      // DB에 저장
      try {
        await saveSettingsToDB(updates, undefined, changedBy, reason)
      } catch (dbError) {
        console.warn('DB 저장 실패, 로컬 저장만 수행:', dbError)
      }

      // 로컬에도 저장 (폴백 및 동기화)
      settingsManager.updateSettings(updates, changedBy, reason)
    }

    const updatedSettings = category 
      ? settingsManager.getCategorySettings(category)
      : settingsManager.getSettings()

    return NextResponse.json({
      success: true,
      data: category ? { [category]: updatedSettings } : updatedSettings,
      message: category 
        ? `${category} 카테고리 설정이 데이터베이스에 저장되었습니다.`
        : '설정이 데이터베이스에 저장되었습니다.'
    })

  } catch (error) {
    console.error('설정 업데이트 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '설정 업데이트 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

// POST: 설정 초기화, 가져오기/내보내기
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data, category, changedBy = 'api' } = body

    const settingsManager = SettingsManager.getInstance()

    switch (action) {
      case 'reset':
        // 설정 초기화
        settingsManager.resetSettings(category, changedBy)
        const resetSettings = category 
          ? settingsManager.getCategorySettings(category)
          : settingsManager.getSettings()
        
        return NextResponse.json({
          success: true,
          data: category ? { [category]: resetSettings } : resetSettings,
          message: category 
            ? `${category} 카테고리 설정이 초기화되었습니다.`
            : '모든 설정이 초기화되었습니다.'
        })

      case 'export':
        // 설정 내보내기
        const exportData = settingsManager.exportSettings()
        return NextResponse.json({
          success: true,
          data: exportData,
          message: '설정이 내보내기되었습니다.'
        })

      case 'import':
        // 설정 가져오기
        if (!data) {
          return NextResponse.json(
            {
              success: false,
              error: '가져올 설정 데이터가 필요합니다.'
            },
            { status: 400 }
          )
        }

        settingsManager.importSettings(data, changedBy)
        const importedSettings = settingsManager.getSettings()
        
        return NextResponse.json({
          success: true,
          data: importedSettings,
          message: '설정이 가져오기되었습니다.'
        })

      case 'validate':
        // 설정 유효성 검증
        if (!data) {
          return NextResponse.json(
            {
              success: false,
              error: '검증할 설정 데이터가 필요합니다.'
            },
            { status: 400 }
          )
        }

        const validation = settingsManager.validateSettings(data)
        return NextResponse.json({
          success: true,
          data: validation,
          message: '설정 유효성 검증이 완료되었습니다.'
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: '지원하지 않는 액션입니다.'
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('설정 POST 작업 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '설정 작업 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

// DELETE: 설정 히스토리 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as SettingsCategory | null

    const settingsManager = SettingsManager.getInstance()
    settingsManager.clearHistory(category || undefined)

    return NextResponse.json({
      success: true,
      message: category 
        ? `${category} 카테고리의 설정 히스토리가 삭제되었습니다.`
        : '모든 설정 히스토리가 삭제되었습니다.'
    })

  } catch (error) {
    console.error('설정 히스토리 삭제 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '설정 히스토리 삭제 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
} 