import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { SettingsCategory } from '@/lib/types/settings'
import { logger } from '@/lib/utils/logger'

// GET: 설정 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as SettingsCategory | null

    // app_settings 테이블에서 설정 조회
    let query = supabase
      .from('app_settings' as any)
      .select('category, key, value, description, value_type')
      .order('category')
      .order('key')

    if (category) {
      query = query.eq('category', category)
    }

    const { data: settings, error } = await query

    if (error) {
      logger.error('설정 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '설정을 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // JSONB 데이터를 SystemSettings 형태로 변환
    const parsedSettings: any = {}

    settings?.forEach((setting: any) => {
      if (!parsedSettings[setting.category]) {
        parsedSettings[setting.category] = {}
      }
      parsedSettings[setting.category][setting.key] = setting.value
    })

    // 특정 카테고리만 요청한 경우
    if (category) {
      return NextResponse.json({
        success: true,
        settings: parsedSettings[category] || {},
        message: `${category} 설정을 조회했습니다.`
      })
    }

    return NextResponse.json({
      success: true,
      settings: parsedSettings,
      data: parsedSettings, // useSettings 훅 호환성
      message: '전체 설정을 조회했습니다.'
    })

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

// PUT: 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { updates, category, reason } = body

    if (!updates) {
      return NextResponse.json(
        { success: false, error: '업데이트할 설정 데이터가 필요합니다.' },
        { status: 400 }
      )
    }

    // 현재 사용자 ID 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    // 카테고리별 업데이트
    if (category) {
      const updatePromises = Object.entries(updates).map(async ([key, value]) => {
        // 기존 값 조회 (히스토리용)
        const { data: oldSetting } = await supabase
          .from('app_settings' as any)
          .select('value')
          .eq('category', category)
          .eq('key', key)
          .single()

        // 설정 업데이트 (upsert)
        const { error: updateError } = await supabase
          .from('app_settings' as any)
          .upsert({
            category,
            key,
            value: value as any,
            value_type: typeof value,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'category,key'
          })

        if (updateError) {
          logger.error(`설정 업데이트 오류 (${category}.${key}):`, updateError)
          throw updateError
        }

        // 히스토리 기록
        if (oldSetting) {
          await supabase
            .from('settings_history')
            .insert({
              category,
              key,
              old_value: (oldSetting as any).value,
              new_value: value as any,
              changed_by: userId,
              reason: reason || '설정 변경'
            })
        }
      })

      await Promise.all(updatePromises)
    } else {
      // 전체 설정 업데이트
      const updatePromises: Promise<any>[] = []

      Object.entries(updates).forEach(([cat, categorySettings]) => {
        Object.entries(categorySettings as any).forEach(([key, value]) => {
          updatePromises.push(
            (async () => {
              // 기존 값 조회
              const { data: oldSetting } = await supabase
                .from('app_settings' as any)
                .select('value')
                .eq('category', cat)
                .eq('key', key)
                .single()

              // 설정 업데이트
              const { error: updateError } = await supabase
                .from('app_settings' as any)
                .upsert({
                  category: cat,
                  key,
                  value: value as any,
                  value_type: typeof value,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'category,key'
                })

              if (updateError) {
                logger.error(`설정 업데이트 오류 (${cat}.${key}):`, updateError)
                throw updateError
              }

              // 히스토리 기록
              if (oldSetting) {
                await supabase
                  .from('settings_history')
                  .insert({
                    category: cat,
                    key,
                    old_value: (oldSetting as any).value,
                    new_value: value as any,
                    changed_by: userId,
                    reason: reason || '설정 변경'
                  })
              }
            })()
          )
        })
      })

      await Promise.all(updatePromises)
    }

    // 업데이트된 설정 반환
    const { data: updatedSettings } = await supabase
      .from('app_settings' as any)
      .select('category, key, value')
      .order('category')
      .order('key')

    const parsedSettings: any = {}
    updatedSettings?.forEach((setting: any) => {
      if (!parsedSettings[setting.category]) {
        parsedSettings[setting.category] = {}
      }
      parsedSettings[setting.category][setting.key] = setting.value
    })

    return NextResponse.json({
      success: true,
      data: category ? parsedSettings[category] : parsedSettings,
      message: '설정이 성공적으로 업데이트되었습니다.'
    })

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
    const supabase = createServerClient()
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'reset':
        // 설정 초기화 (기본값으로 복원)
        // 실제 구현은 기본값 테이블이나 설정 파일에서 가져와야 함
        return NextResponse.json({
          success: false,
          error: '설정 초기화 기능은 아직 구현되지 않았습니다.'
        }, { status: 501 })

      case 'export':
        // 설정 내보내기
        const { data: allSettings } = await supabase
          .from('app_settings' as any)
          .select('*')
          .order('category')
          .order('key')

        return NextResponse.json({
          success: true,
          data: JSON.stringify(allSettings, null, 2),
          message: '설정이 내보내기되었습니다.'
        })

      case 'import':
        // 설정 가져오기
        if (!data) {
          return NextResponse.json(
            { success: false, error: '가져올 설정 데이터가 필요합니다.' },
            { status: 400 }
          )
        }

        const importSettings = JSON.parse(data)

        // 각 설정을 upsert
        const importPromises = importSettings.map((setting: any) =>
          supabase
            .from('app_settings' as any)
            .upsert({
              category: setting.category,
              key: setting.key,
              value: setting.value,
              description: setting.description,
              value_type: setting.value_type,
              is_encrypted: setting.is_encrypted
            }, {
              onConflict: 'category,key'
            })
        )

        await Promise.all(importPromises)

        return NextResponse.json({
          success: true,
          message: '설정이 가져오기되었습니다.'
        })

      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 액션입니다.' },
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
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as SettingsCategory | null

    let query = supabase.from('settings_history').delete()

    if (category) {
      query = query.eq('category', category)
    } else {
      // 전체 삭제는 위험하므로 제한
      return NextResponse.json(
        { success: false, error: '전체 히스토리 삭제는 지원하지 않습니다.' },
        { status: 400 }
      )
    }

    const { error } = await query

    if (error) {
      logger.error('설정 히스토리 삭제 오류:', error)
      return NextResponse.json(
        { success: false, error: '설정 히스토리 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: category
        ? `${category} 카테고리의 설정 히스토리가 삭제되었습니다.`
        : '설정 히스토리가 삭제되었습니다.'
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
