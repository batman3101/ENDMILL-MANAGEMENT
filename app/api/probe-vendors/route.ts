import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '../../../lib/supabase/client'
import { authorizeFactory, isAdminRole } from '@/lib/auth/serverRole'

export const dynamic = 'force-dynamic'

// GET /api/probe-vendors?factoryId=&role=repair|parts&activeOnly=true — 드롭다운/목록 (user+)
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const factoryId = sp.get('factoryId')
    if (!factoryId) return NextResponse.json({ success: false, error: 'factoryId is required' }, { status: 400 })
    const auth = await authorizeFactory(factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

    const supabase = createServerClient()
    let query = supabase.from('probe_vendors' as any).select('*').eq('factory_id', factoryId)
    if (sp.get('activeOnly') === 'true') query = query.eq('is_active', true)
    const role = sp.get('role')
    if (role === 'repair') query = query.eq('is_repair_vendor', true)
    else if (role === 'parts') query = query.eq('is_parts_vendor', true)

    const { data, error } = await query.order('name')
    if (error) throw error
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('GET /api/probe-vendors error:', error)
    return NextResponse.json({ success: false, error: '업체 조회 실패' }, { status: 500 })
  }
}

const createSchema = z.object({
  factoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  is_repair_vendor: z.boolean(),
  is_parts_vendor: z.boolean(),
  contact_name: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().optional(),
}).refine(v => v.is_repair_vendor || v.is_parts_vendor, { message: '최소 1개 역할 필요' })

// POST — 생성 (admin+)
export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json())
    const auth = await authorizeFactory(body.factoryId)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    if (!isAdminRole(auth.me.role)) return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })

    const supabase = createServerClient()
    const { data, error } = await supabase.from('probe_vendors' as any).insert({
      factory_id: body.factoryId,
      name: body.name,
      is_repair_vendor: body.is_repair_vendor,
      is_parts_vendor: body.is_parts_vendor,
      contact_name: body.contact_name ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    } as any).select().single()
    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: '이미 같은 이름의 업체가 있습니다.' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: '입력값이 올바르지 않습니다.' }, { status: 400 })
    console.error('POST /api/probe-vendors error:', error)
    return NextResponse.json({ success: false, error: '업체 생성 실패' }, { status: 500 })
  }
}
