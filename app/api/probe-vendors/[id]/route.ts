import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../../lib/supabase/client'
import { authorizeFactory, isAdminRole } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  factoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  is_repair_vendor: z.boolean().optional(),
  is_parts_vendor: z.boolean().optional(),
  contact_name: z.string().trim().max(50).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  is_active: z.boolean().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = updateSchema.parse(await request.json())
    const auth = await authorizeFactory(body.factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    if (!isAdminRole(auth.me.role)) return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })

    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { factoryId, ...patch } = body
    const { data, error } = await supabase.from('probe_vendors' as any)
      .update({ ...patch, updated_at: new Date().toISOString() } as any)
      .eq('id', params.id).eq('factory_id', factoryId).select().single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: '이미 같은 이름의 업체가 있습니다.' }, { status: 409 })
      if (error.code === '23514') return NextResponse.json({ success: false, error: '최소 1개 역할이 필요합니다.' }, { status: 400 })
      throw error
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    console.error('PUT /api/probe-vendors/[id] error:', error)
    return NextResponse.json({ success: false, error: '업체 수정 실패' }, { status: 500 })
  }
}

// DELETE ?factoryId= — 수리에 참조되면 거부(409), 대신 is_active=false 안내
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const factoryId = request.nextUrl.searchParams.get('factoryId')
    if (!factoryId) return NextResponse.json({ success: false, error: 'factoryId가 필요합니다.' }, { status: 400 })
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    if (!isAdminRole(auth.me.role)) return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })

    const supabase = createServerClient()
    const { count, error: refError } = await supabase.from('probe_repairs')
      .select('id', { count: 'exact', head: true }).eq('vendor_id', params.id)
    if (refError) throw refError
    if ((count ?? 0) > 0) {
      return NextResponse.json({ success: false, error: '수리 이력에 연결된 업체는 삭제할 수 없습니다. 비활성 처리하세요.' }, { status: 409 })
    }
    const { error } = await supabase.from('probe_vendors' as any).delete().eq('id', params.id).eq('factory_id', factoryId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/probe-vendors/[id] error:', error)
    return NextResponse.json({ success: false, error: '업체 삭제 실패' }, { status: 500 })
  }
}
