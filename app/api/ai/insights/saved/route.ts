/**
 * Saved Insights API Endpoint
 * 저장된 인사이트 CRUD
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasPermission } from '@/lib/auth/permissions'
import { z } from 'zod'

// 인사이트 저장 요청 스키마
const saveInsightSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  contentType: z.enum(['markdown', 'html']),
  chartConfig: z.any().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
})

/**
 * GET /api/ai/insights/saved
 * 저장된 인사이트 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
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

    // 2. 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams
    const filter = searchParams.get('filter') || 'my' // my, shared, public
    const sortBy = searchParams.get('sortBy') || 'newest' // newest, oldest, mostViewed
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)

    // 3. 쿼리 빌드
    let query = supabase
      .from('saved_insights')
      .select('*', { count: 'exact' })

    // 필터 적용
    if (filter === 'my') {
      query = query.eq('created_by', user.id)
    } else if (filter === 'shared') {
      query = query.contains('shared_with', [user.id])
    } else if (filter === 'public') {
      query = query.eq('is_public', true)
    }

    // 검색
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    // 태그 필터
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags)
    }

    // 정렬
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (sortBy === 'mostViewed') {
      query = query.order('view_count', { ascending: false })
    }

    const { data: insights, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      insights: insights || [],
      total: count || 0,
    })
  } catch (error: any) {
    console.error('Saved Insights GET Error:', error)

    return NextResponse.json(
      {
        error: '저장된 인사이트 조회 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/insights/saved
 * 새 인사이트 저장
 */
export async function POST(request: NextRequest) {
  try {
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

    // 2. 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || !profile.role_id) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { data: role } = await supabase
      .from('user_roles')
      .select('name')
      .eq('id', profile.role_id)
      .single()

    if (!role || !hasPermission(role.name as any, 'ai_insights', 'use')) {
      return NextResponse.json(
        { error: 'AI 인사이트 저장 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 3. 요청 바디 검증
    const body = await request.json()
    const validatedData = saveInsightSchema.parse(body)

    // 4. 인사이트 저장
    const { data: newInsight, error: insertError } = await supabase
      .from('saved_insights')
      .insert({
        title: validatedData.title,
        content: validatedData.content,
        content_type: validatedData.contentType,
        chart_config: validatedData.chartConfig || null,
        tags: validatedData.tags || [],
        is_public: validatedData.isPublic || false,
        created_by: user.id,
        shared_with: [],
        view_count: 0,
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json(
      {
        message: '인사이트가 저장되었습니다.',
        insight: newInsight,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Saved Insights POST Error:', error)

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
        error: '인사이트 저장 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
