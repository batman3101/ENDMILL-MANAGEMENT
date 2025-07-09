import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService } from '../../../lib/services/supabaseService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const model = searchParams.get('model')
    const process = searchParams.get('process')

    let camSheets
    if (model && process) {
      camSheets = await serverSupabaseService.camSheet.getByModelAndProcess(model, process)
    } else {
      camSheets = await serverSupabaseService.camSheet.getAll()
    }

    return NextResponse.json({
      success: true,
      data: camSheets
    })
  } catch (error) {
    console.error('Error fetching CAM sheets:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch CAM sheets' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.batch && Array.isArray(body.data)) {
      // 일괄 업로드 처리
      const results = []
      for (const camSheetData of body.data) {
        const result = await serverSupabaseService.camSheet.create(camSheetData)
        results.push(result)
      }
      
      return NextResponse.json({
        success: true,
        data: results,
        message: `${results.length}개의 CAM Sheet가 생성되었습니다.`
      })
    } else {
      // 단일 CAM Sheet 생성
      const newCAMSheet = await serverSupabaseService.camSheet.create(body)
      
      return NextResponse.json({
        success: true,
        data: newCAMSheet,
        message: 'CAM Sheet가 생성되었습니다.'
      })
    }
  } catch (error) {
    console.error('Error creating CAM sheet:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create CAM sheet' 
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
        { success: false, error: 'CAM Sheet ID is required' },
        { status: 400 }
      )
    }

    const updatedCAMSheet = await serverSupabaseService.camSheet.update(id, updateData)
    
    return NextResponse.json({
      success: true,
      data: updatedCAMSheet,
      message: 'CAM Sheet가 업데이트되었습니다.'
    })
  } catch (error) {
    console.error('Error updating CAM sheet:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update CAM sheet' 
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
        { success: false, error: 'CAM Sheet ID is required' },
        { status: 400 }
      )
    }

    await serverSupabaseService.camSheet.delete(id)
    
    return NextResponse.json({
      success: true,
      message: 'CAM Sheet가 삭제되었습니다.'
    })
  } catch (error) {
    console.error('Error deleting CAM sheet:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete CAM sheet' 
      },
      { status: 500 }
    )
  }
} 