import { NextRequest, NextResponse } from 'next/server'
import { SettingsManager } from '../../../lib/data/settingsManager'
import { SystemSettings, SettingsCategory, SettingsValidationResult } from '../../../lib/types/settings'
import { logger } from '@/lib/utils/logger'

// DB 연동 비활성화 상태 유지 (필요 시 createServerClient 사용)

// GET: 설정 조회
export async function GET(request: NextRequest) {
  try {
    // 임시로 로컬 설정만 사용
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as SettingsCategory | null
    const settingsManager = SettingsManager.getInstance()
    const allSettings = settingsManager.getSettings()

    return NextResponse.json({
      success: true,
      data: category ? allSettings[category] : allSettings,
      message: '설정을 조회했습니다. (로컬)'
    })

    /* DB 연동 부분 임시 비활성화
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
        logger.error('히스토리 조회 실패:', error)
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
        .from('app_settings' as any)
        .select('key, value')
        .order('key')

      if (!error && dbSettings && dbSettings.length > 0) {
        // DB 데이터를 SystemSettings 형태로 변환
        const parsedSettings: { [key: string]: any } = {}

        (dbSettings as any[]).forEach((setting: any) => {
          // key 형식: "category.key" (예: "equipment.models")
          const keyParts = setting.key.split('.')
          if (keyParts.length >= 2) {
            const categoryKey = keyParts[0]
            const settingKey = keyParts.slice(1).join('.')

            if (!parsedSettings[categoryKey]) {
              parsedSettings[categoryKey] = {}
            }
            parsedSettings[categoryKey][settingKey] = setting.value
          }
        })

        // 기본값과 병합
        const settingsManager = SettingsManager.getInstance()
        const defaultSettings = settingsManager.getSettings()
        const mergedSettings = { ...defaultSettings, ...parsedSettings }

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
      logger.warn('DB 설정 조회 실패, 로컬 사용:', dbError)
    }

    // 폴백: 로컬 설정 사용
    // (위에서 이미 처리됨)
    */

  } catch (error) {
    logger.error('설정 조회 에러:', error)
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

/* DB 저장 기능 임시 비활성화
// 설정을 DB에 저장하는 헬퍼 함수
async function saveSettingsToDB(settings: any, category?: string, changedBy: string = 'api', reason?: string) {
  // 임시로 로컬만 사용
  return true
}
*/

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

      // 로컬에 저장
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

      // 로컬에 저장
      settingsManager.updateSettings(updates, changedBy, reason)
    }

    // 업데이트된 설정 반환
    const updatedSettings = settingsManager.getSettings()
    return NextResponse.json({
      success: true,
      data: category ? updatedSettings[category as keyof typeof updatedSettings] : updatedSettings,
      message: '설정이 성공적으로 업데이트되었습니다.'
    })

    /* DB 반환 로직 임시 비활성화
    try {
      const { data: dbSettings, error } = await supabase
        .from('app_settings' as any)
        .select('key, value')
        .order('key')

      if (!error && dbSettings && dbSettings.length > 0) {
        // DB 데이터를 SystemSettings 형태로 변환
        const settings: { [key: string]: any } = {}

        dbSettings.forEach(setting => {
          const keyParts = setting.key.split('.')
          if (keyParts.length >= 2) {
            const cat = keyParts[0]
            const settingKey = keyParts.slice(1).join('.')

            if (!settings[cat]) {
              settings[cat] = {}
            }
            settings[cat][settingKey] = setting.value
          }
        })
      }
    } catch (dbError) {
      logger.warn('DB 조회 실패, 로컬 설정 반환:', dbError)
    }
    */

  } catch (error) {
    logger.error('설정 업데이트 에러:', error)
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
    logger.error('설정 POST 작업 에러:', error)
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
    logger.error('설정 히스토리 삭제 에러:', error)
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