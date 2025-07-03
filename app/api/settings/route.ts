import { NextRequest, NextResponse } from 'next/server'
import { SettingsManager } from '../../../lib/data/settingsManager'
import { SystemSettings, SettingsCategory, SettingsValidationResult } from '../../../lib/types/settings'

// GET: 설정 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as SettingsCategory | null
    const history = searchParams.get('history') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const settingsManager = SettingsManager.getInstance()

    if (history) {
      // 히스토리 조회
      const historyData = settingsManager.getHistory(category || undefined, limit)
      return NextResponse.json({
        success: true,
        data: historyData,
        message: '설정 히스토리를 조회했습니다.'
      })
    }

    if (category) {
      // 카테고리별 설정 조회
      const categorySettings = settingsManager.getCategorySettings(category)
      return NextResponse.json({
        success: true,
        data: { [category]: categorySettings },
        message: `${category} 카테고리 설정을 조회했습니다.`
      })
    }

    // 전체 설정 조회
    const allSettings = settingsManager.getSettings()
    return NextResponse.json({
      success: true,
      data: allSettings,
      message: '전체 설정을 조회했습니다.'
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
        [category]: { ...currentSettings[category], ...updates }
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

      settingsManager.updateSettings(updates, changedBy, reason)
    }

    const updatedSettings = category 
      ? settingsManager.getCategorySettings(category)
      : settingsManager.getSettings()

    return NextResponse.json({
      success: true,
      data: category ? { [category]: updatedSettings } : updatedSettings,
      message: category 
        ? `${category} 카테고리 설정이 업데이트되었습니다.`
        : '설정이 업데이트되었습니다.'
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