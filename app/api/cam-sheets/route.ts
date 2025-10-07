import { NextRequest, NextResponse } from 'next/server'
import { serverSupabaseService, createServerSupabaseClient } from '../../../lib/services/supabaseService'
import { logger } from '@/lib/utils/logger'

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
    logger.log('CAM Sheet API 요청 데이터:', body)

    if (body.batch && Array.isArray(body.data)) {
      // 일괄 업로드 처리
      const results = []
      for (const camSheetData of body.data) {
        const result = await createCAMSheetWithEndmills(camSheetData)
        results.push(result)
      }

      return NextResponse.json({
        success: true,
        data: results,
        message: `${results.length}개의 CAM Sheet가 생성되었습니다.`
      })
    } else {
      // 단일 CAM Sheet 생성
      const result = await createCAMSheetWithEndmills(body)

      return NextResponse.json({
        success: true,
        data: result,
        message: 'CAM Sheet가 생성되었습니다.'
      })
    }
  } catch (error) {
    console.error('Error creating CAM sheet:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create CAM sheet'
      },
      { status: 500 }
    )
  }
}

async function createCAMSheetWithEndmills(data: any) {
  logger.log('createCAMSheetWithEndmills 실행:', data)

  // 필드명 매핑
  const camSheetData = {
    model: data.model,
    process: data.process,
    cam_version: data.camVersion || data.cam_version,
    version_date: data.versionDate || data.version_date
  }

  logger.log('변환된 CAM Sheet 데이터:', camSheetData)

  // CAM Sheet 생성
  const newCAMSheet = await serverSupabaseService.camSheet.create(camSheetData)
  logger.log('생성된 CAM Sheet:', newCAMSheet)

  // 엔드밀 데이터 처리
  if (data.endmills && Array.isArray(data.endmills) && data.endmills.length > 0) {
    logger.log('엔드밀 데이터 처리 시작:', data.endmills)

    for (const endmill of data.endmills) {
      try {
        // 엔드밀 타입 찾기 (코드로 검색)
        const endmillCode = endmill.endmillCode || endmill.endmill_code
        let endmillType = null

        if (endmillCode) {
          const supabase = createServerSupabaseClient()
          const { data: foundEndmill, error: findError } = await supabase
            .from('endmill_types')
            .select('id')
            .eq('code', endmillCode)
            .single()

          if (!findError) {
            endmillType = foundEndmill
          } else if (findError.code !== 'PGRST116') {
            console.warn('엔드밀 타입 검색 오류:', findError)
          }
        }


        const camSheetEndmillData = {
          cam_sheet_id: newCAMSheet.id,
          t_number: endmill.tNumber || endmill.t_number,
          endmill_type_id: endmillType?.id || null,
          tool_life: endmill.toolLife || endmill.tool_life || 0,
          endmill_code: endmill.endmillCode || endmill.endmill_code,
          endmill_name: endmill.endmillName || endmill.endmill_name,
          specifications: endmill.specifications || ''
        }

        logger.log('CAM Sheet 엔드밀 매핑 데이터:', camSheetEndmillData)

        await serverSupabaseService.camSheet.addEndmill(camSheetEndmillData)
      } catch (endmillError) {
        console.warn(`엔드밀 ${endmill.endmillCode} 추가 실패:`, endmillError)
      }
    }
  }

  // 전체 데이터 다시 조회해서 반환
  const supabase = createServerSupabaseClient()
  const { data: fullData, error: fetchError } = await supabase
    .from('cam_sheets')
    .select(`
      *,
      cam_sheet_endmills(*)
    `)
    .eq('id', newCAMSheet.id)
    .single()

  if (fetchError) {
    console.warn('전체 데이터 조회 오류:', fetchError)
    return newCAMSheet
  }

  return fullData
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, endmills, ...updateData } = body
    logger.log('CAM Sheet 수정 API 요청:', body)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'CAM Sheet ID is required' },
        { status: 400 }
      )
    }

    // CAM Sheet 기본 정보 업데이트
    const camSheetData = {
      model: updateData.model,
      process: updateData.process,
      cam_version: updateData.cam_version || updateData.camVersion,
      version_date: updateData.version_date || updateData.versionDate
    }

    const updatedCAMSheet = await serverSupabaseService.camSheet.update(id, camSheetData)
    logger.log('수정된 CAM Sheet:', updatedCAMSheet)

    // 엔드밀 데이터 처리 (삭제 후 재생성)
    if (endmills && Array.isArray(endmills)) {
      logger.log('엔드밀 데이터 수정 시작:', endmills)

      // 기존 엔드밀 데이터 삭제
      const supabaseDelete = createServerSupabaseClient()
      const { error: deleteError } = await supabaseDelete
        .from('cam_sheet_endmills')
        .delete()
        .eq('cam_sheet_id', id)

      if (deleteError) {
        console.warn('기존 엔드밀 삭제 오류:', deleteError)
      }

      // 새로운 엔드밀 데이터 추가
      for (const endmill of endmills) {
        try {
          // 엔드밀 타입 찾기 (코드로 검색)
          const endmillCode = endmill.endmillCode || endmill.endmill_code
          let endmillType = null

          if (endmillCode) {
            const supabaseFind = createServerSupabaseClient()
            const { data: foundEndmill, error: findError } = await supabaseFind
              .from('endmill_types')
              .select('id')
              .eq('code', endmillCode)
              .single()

            if (!findError) {
              endmillType = foundEndmill
            } else if (findError.code !== 'PGRST116') {
              console.warn('엔드밀 타입 검색 오류:', findError)
            }
          }

          const camSheetEndmillData = {
            cam_sheet_id: id,
            t_number: endmill.tNumber || endmill.t_number,
            endmill_type_id: endmillType?.id || null,
            tool_life: endmill.toolLife || endmill.tool_life || 0,
            endmill_code: endmill.endmillCode || endmill.endmill_code,
            endmill_name: endmill.endmillName || endmill.endmill_name,
            specifications: endmill.specifications || ''
          }

          logger.log('CAM Sheet 엔드밀 매핑 데이터:', camSheetEndmillData)

          await serverSupabaseService.camSheet.addEndmill(camSheetEndmillData)
        } catch (endmillError) {
          console.warn(`엔드밀 ${endmill.endmillCode} 추가 실패:`, endmillError)
        }
      }
    }

    // 전체 데이터 다시 조회해서 반환
    const supabaseFetch = createServerSupabaseClient()
    const { data: fullData, error: fetchError } = await supabaseFetch
      .from('cam_sheets')
      .select(`
        *,
        cam_sheet_endmills(*)
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      console.warn('전체 데이터 조회 오류:', fetchError)
      return NextResponse.json({
        success: true,
        data: updatedCAMSheet,
        message: 'CAM Sheet가 업데이트되었습니다.'
      })
    }

    return NextResponse.json({
      success: true,
      data: fullData,
      message: 'CAM Sheet가 업데이트되었습니다.'
    })
  } catch (error) {
    console.error('Error updating CAM sheet:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update CAM sheet'
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