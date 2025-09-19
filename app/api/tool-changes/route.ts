import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService } from '../../../lib/services/supabaseService'

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

    const result = await serverSupabaseService.toolChange.getFiltered({
      equipmentNumber: equipmentNumber ? parseInt(equipmentNumber) : undefined,
      endmillType,
      searchTerm,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    })

    // totalCount를 별도로 가져오기
    const countResult = await serverSupabaseService.toolChange.getCount({
      equipmentNumber: equipmentNumber ? parseInt(equipmentNumber) : undefined,
      endmillType,
      searchTerm,
      startDate,
      endDate
    })

    return NextResponse.json({
      success: true,
      data: result,
      totalCount: countResult || 0
    })
  } catch (error) {
    console.error('Error fetching tool changes:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tool changes'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.batch && Array.isArray(body.data)) {
      // 일괄 생성 처리
      const results = []
      for (const toolChangeData of body.data) {
        const result = await serverSupabaseService.toolChange.create(toolChangeData)
        results.push(result)
      }
      
      return NextResponse.json({
        success: true,
        data: results,
        message: `${results.length}개의 교체 이력이 생성되었습니다.`
      })
    } else {
      // 단일 교체 이력 생성
      const newToolChange = await serverSupabaseService.toolChange.create(body)
      
      return NextResponse.json({
        success: true,
        data: newToolChange,
        message: '교체 이력이 생성되었습니다.'
      })
    }
  } catch (error) {
    console.error('Error creating tool change:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create tool change' 
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
  } catch (error) {
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
  } catch (error) {
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