import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService } from '../../../lib/services/supabaseService'
import { z } from 'zod'

// 교체 실적 생성 스키마
const createToolChangeSchema = z.object({
  equipment_number: z.union([z.string(), z.number()]),
  production_model: z.string().min(1),
  process: z.string().min(1),
  t_number: z.number().min(1),
  endmill_code: z.string().min(1),
  endmill_name: z.string().min(1),
  tool_life: z.number().min(0),
  change_reason: z.string().min(1),
  changed_by: z.string().uuid().optional(),
  change_date: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentNumber = searchParams.get('equipment_number')
    const endmillType = searchParams.get('endmill_type')
    const searchTerm = searchParams.get('search')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const sortField = searchParams.get('sort_field')
    const sortDirection = searchParams.get('sort_direction') as 'asc' | 'desc'

    console.log('GET /api/tool-changes params:', {
      equipmentNumber,
      endmillType,
      searchTerm,
      startDate,
      endDate,
      limit,
      offset,
      sortField,
      sortDirection
    })

    const result = await serverSupabaseService.toolChange.getFiltered({
      equipmentNumber: equipmentNumber ? parseInt(equipmentNumber) : undefined,
      endmillType: endmillType || undefined,
      searchTerm: searchTerm || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      sortField: sortField || undefined,
      sortDirection: sortDirection || undefined
    })

    // totalCount를 별도로 가져오기
    const countResult = await serverSupabaseService.toolChange.getCount({
      equipmentNumber: equipmentNumber ? parseInt(equipmentNumber) : undefined,
      endmillType: endmillType || undefined,
      searchTerm: searchTerm || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })

    return NextResponse.json({
      success: true,
      data: result,
      totalCount: countResult || 0
    })
  } catch (error: any) {
    console.error('Error fetching tool changes:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tool changes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST: 새 교체 실적 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 입력 데이터 검증
    const validatedData = createToolChangeSchema.parse(body)

    // equipment_number를 숫자로 변환 (C025 -> 25)
    let equipmentNumber = validatedData.equipment_number
    if (typeof equipmentNumber === 'string') {
      // C 접두사가 있으면 제거
      const cleaned = equipmentNumber.replace(/^C/i, '')
      equipmentNumber = parseInt(cleaned)
    }

    // 새 교체 실적 생성을 위한 데이터 준비
    const toolChangeData = {
      equipment_number: equipmentNumber,
      production_model: validatedData.production_model,
      process: validatedData.process,
      t_number: validatedData.t_number,
      endmill_code: validatedData.endmill_code,
      endmill_name: validatedData.endmill_name,
      tool_life: validatedData.tool_life,
      change_reason: validatedData.change_reason as "수명완료" | "파손" | "마모" | "예방교체" | "모델변경" | "기타",
      changed_by: validatedData.changed_by,
      change_date: validatedData.change_date || new Date().toISOString().split('T')[0]
    }

    console.log('Creating tool change with data:', JSON.stringify(toolChangeData, null, 2))

    // 새 교체 실적 생성
    const newToolChange = await serverSupabaseService.toolChange.create(toolChangeData)

    return NextResponse.json({
      success: true,
      data: newToolChange,
      message: '교체 실적이 성공적으로 등록되었습니다.',
    }, { status: 201 })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: '입력 데이터가 올바르지 않습니다.',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    console.error('교체 실적 생성 API 에러:', JSON.stringify(error, null, 2))
    console.error('에러 상세:', error)
    return NextResponse.json(
      {
        success: false,
        error: '서버 에러가 발생했습니다.',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}


export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tool Change ID is required' },
        { status: 400 }
      )
    }

    const updatedToolChange = await serverSupabaseService.toolChange.update(id, updateData)
    
    return NextResponse.json({
      success: true,
      data: updatedToolChange,
      message: '교체 이력이 업데이트되었습니다.'
    })
  } catch (error: any) {
    console.error('Error updating tool change:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update tool change' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tool Change ID is required' },
        { status: 400 }
      )
    }

    await serverSupabaseService.toolChange.delete(id)
    
    return NextResponse.json({
      success: true,
      message: '교체 이력이 삭제되었습니다.'
    })
  } catch (error: any) {
    console.error('Error deleting tool change:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete tool change' 
      },
      { status: 500 }
    )
  }
} 