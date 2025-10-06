import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/services/supabaseService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    const supabase = createServerSupabaseClient()

    let query: any = (supabase as any)
      .from('endmill_disposals')
      .select('*')
      .order('disposal_date', { ascending: false })

    if (start) {
      query = query.gte('disposal_date', start)
    }

    if (end) {
      query = query.lte('disposal_date', end)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching disposals:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in GET /api/endmill-disposals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch disposals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const disposal_date = formData.get('disposal_date') as string
    const quantity = parseInt(formData.get('quantity') as string)
    const weight_kg = parseFloat(formData.get('weight_kg') as string)
    const inspector = formData.get('inspector') as string
    const reviewer = formData.get('reviewer') as string
    const notes = formData.get('notes') as string
    const imageFile = formData.get('image') as File | null

    const supabase = createServerSupabaseClient()

    // 이미지 업로드 (있는 경우)
    let imageUrl = null
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `disposal-images/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('endmill-images')
        .upload(filePath, imageFile)

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('endmill-images')
          .getPublicUrl(filePath)

        imageUrl = publicUrl
      }
    }

    // 폐기 기록 저장
    const { data, error } = await (supabase as any)
      .from('endmill_disposals')
      .insert({
        disposal_date,
        quantity,
        weight_kg,
        inspector,
        reviewer,
        image_url: imageUrl,
        notes: notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating disposal:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in POST /api/endmill-disposals:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create disposal' },
      { status: 500 }
    )
  }
}
