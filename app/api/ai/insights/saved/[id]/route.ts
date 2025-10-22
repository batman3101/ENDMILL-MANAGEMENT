/**
 * Saved Insight by ID API Endpoint
 * 개별 인사이트 조회/수정/삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 인사이트 수정 요청 스키마
const updateInsightSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  chartConfig: z.any().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
})

/**
 * GET /api/ai/insights/saved/[id]
 * 인사이트 조회 (조회수 증가)
 */
export async function GET(
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

    // 2. 인사이트 조회
    const { data: insight, error } = await supabase
      .from('saved_insights' as any)
      .select('*')
      .eq('id', id)
      .single()

    if (error || !insight) {
      return NextResponse.json(
        { error: '인사이트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 접근 권한 확인
    const canAccess =
      (insight as any).created_by === user.id ||
      (insight as any).is_public ||
      ((insight as any).shared_with && (insight as any).shared_with.includes(user.id))

    if (!canAccess) {
      return NextResponse.json(
        { error: '이 인사이트에 접근할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 4. 조회수 증가
    await supabase
      .from('saved_insights' as any)
      .update({ view_count: ((insight as any).view_count || 0) + 1 })
      .eq('id', id)

    return NextResponse.json({ insight })
  } catch (error: any) {
    console.error('Saved Insight GET Error:', error)

    return NextResponse.json(
      {
        error: '인사이트 조회 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ai/insights/saved/[id]
 * 인사이트 수정
 */
export async function PUT(
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

    // 2. 기존 인사이트 확인
    const { data: existingInsight } = await supabase
      .from('saved_insights' as any)
      .select('created_by')
      .eq('id', id)
      .single()

    if (!existingInsight) {
      return NextResponse.json(
        { error: '인사이트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 본인 확인
    if ((existingInsight as any).created_by !== user.id) {
      return NextResponse.json(
        { error: '본인이 작성한 인사이트만 수정할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 4. 요청 바디 검증
    const body = await request.json()
    const validatedData = updateInsightSchema.parse(body)

    // 5. 업데이트할 데이터 준비
    const updates: any = {}
    if (validatedData.title !== undefined) updates.title = validatedData.title
    if (validatedData.content !== undefined)
      updates.content = validatedData.content
    if (validatedData.chartConfig !== undefined)
      updates.chart_config = validatedData.chartConfig
    if (validatedData.tags !== undefined) updates.tags = validatedData.tags
    if (validatedData.isPublic !== undefined)
      updates.is_public = validatedData.isPublic

    // 6. 인사이트 업데이트
    const { data: updatedInsight, error: updateError } = await supabase
      .from('saved_insights' as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      message: '인사이트가 수정되었습니다.',
      insight: updatedInsight,
    })
  } catch (error: any) {
    console.error('Saved Insight PUT Error:', error)

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
        error: '인사이트 수정 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ai/insights/saved/[id]
 * 인사이트 삭제
 */
export async function DELETE(
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

    // 2. 기존 인사이트 확인
    const { data: existingInsight } = await supabase
      .from('saved_insights' as any)
      .select('created_by')
      .eq('id', id)
      .single()

    if (!existingInsight) {
      return NextResponse.json(
        { error: '인사이트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. 본인 확인
    if ((existingInsight as any).created_by !== user.id) {
      return NextResponse.json(
        { error: '본인이 작성한 인사이트만 삭제할 수 있습니다.' },
        { status: 403 }
      )
    }

    // 4. 인사이트 삭제 (CASCADE로 댓글도 자동 삭제)
    const { error: deleteError } = await supabase
      .from('saved_insights' as any)
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      message: '인사이트가 삭제되었습니다.',
    })
  } catch (error: any) {
    console.error('Saved Insight DELETE Error:', error)

    return NextResponse.json(
      {
        error: '인사이트 삭제 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
