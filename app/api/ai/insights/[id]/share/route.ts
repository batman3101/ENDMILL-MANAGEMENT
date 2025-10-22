/**
 * Share Insight API Endpoint
 * 인사이트 공유 설정
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 공유 요청 스키마
const shareInsightSchema = z.object({
  shareWith: z.array(z.string().uuid()).optional(),
  isPublic: z.boolean(),
})

/**
 * POST /api/ai/insights/[id]/share
 * 인사이트 공유 설정
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 1. 인증 확인
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 2. 요청 바디 검증
    const body = await request.json()
    const validatedData = shareInsightSchema.parse(body)

    // 3. 인사이트 조회 및 권한 확인
    const { data: insight, error: fetchError } = await supabase
      .from('saved_insights' as any)
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !insight) {
      return NextResponse.json(
        { error: '인사이트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 본인 확인
    if ((insight as any).created_by !== user.id) {
      return NextResponse.json(
        { error: '본인이 작성한 인사이트만 공유할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 4. 공유 설정 업데이트
    const updateData: any = {
      is_public: validatedData.isPublic,
    }

    // shareWith가 제공된 경우에만 업데이트
    if (validatedData.shareWith !== undefined) {
      updateData.shared_with = validatedData.shareWith
    }

    const { data: updatedInsight, error: updateError } = await supabase
      .from('saved_insights' as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      message: '공유 설정이 업데이트되었습니다.',
      insight: updatedInsight,
    })
  } catch (error: any) {
    console.error('Share Insight Error:', error)

    // Zod 유효성 검사 에러
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: '요청 데이터가 올바르지 않습니다.',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: '공유 설정 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
