import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../../lib/types/database'

// Supabase 클라이언트 생성
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('endmill_categories')
      .select('id, code, name_ko, name_vi, description')
      .order('code')

    if (error) {
      console.error('Error fetching endmill categories:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch endmill categories'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })
  } catch (error) {
    console.error('Error in endmill categories API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}