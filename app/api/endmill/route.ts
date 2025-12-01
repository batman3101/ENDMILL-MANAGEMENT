import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const url = new URL(request.url)
    const code = url.searchParams.get('code')

    // 특정 코드로 검색하는 경우
    let endmillTypes, error;
    let recentChanges: any[] = [];

    if (code) {
      const result = await supabase
        .from('endmill_types')
        .select(`
          *,
          endmill_categories(code, name_ko),
          endmill_supplier_prices(
            unit_price,
            suppliers(code, name)
          ),
          cam_sheet_endmills(
            tool_life,
            t_number,
            cam_sheets(model, process)
          ),
          tool_positions(
            position_number,
            current_life,
            total_life,
            install_date,
            status,
            equipment:equipment_id(
              equipment_number,
              current_model,
              process
            )
          ),
          inventory!inventory_endmill_type_id_fkey(
            current_stock,
            min_stock,
            max_stock,
            status,
            location
          )
        `)
        .eq('code', code.toUpperCase())
        .single()

      // 최근 교체 이력 조회 (상세 페이지용)
      if (result.data?.code) {
        const changesResult = await supabase
          .from('tool_changes')
          .select(`
            id,
            change_date,
            tool_life,
            change_reason,
            t_number,
            equipment_number,
            model,
            production_model,
            process,
            user_profiles:changed_by(name)
          `)
          .eq('endmill_code', result.data.code)
          .order('change_date', { ascending: false })
          .limit(20)

        if (changesResult.data) {
          recentChanges = changesResult.data.map((change: any) => ({
            equipmentNumber: change.equipment_number ? `C${change.equipment_number.toString().padStart(3, '0')}` : 'N/A',
            equipmentModel: change.production_model || change.model || 'N/A',
            changeDate: change.change_date ? new Date(change.change_date).toLocaleString('ko-KR') : 'N/A',
            changeReason: change.change_reason || '정상 교체',
            tNumber: change.t_number,
            previousLife: change.tool_life || 0,
            changedBy: change.user_profiles?.name || '알 수 없음'
          }))
        }
      }

      endmillTypes = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('endmill_types')
        .select(`
          *,
          endmill_categories(code, name_ko),
          endmill_supplier_prices(
            unit_price,
            suppliers(code, name)
          ),
          cam_sheet_endmills(
            tool_life,
            t_number,
            cam_sheets(model, process)
          ),
          tool_positions(
            position_number,
            current_life,
            total_life,
            install_date,
            status,
            equipment:equipment_id(
              equipment_number,
              current_model,
              process
            )
          ),
          inventory!inventory_endmill_type_id_fkey(
            current_stock,
            min_stock,
            max_stock,
            status,
            location
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10000) // 모든 데이터 가져오기

      endmillTypes = result.data
      error = result.error
    }

    if (error) {
      logger.error('엔드밀 데이터 조회 오류:', error)
      return NextResponse.json(
        { error: '엔드밀 데이터를 불러오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    // 데이터 정리 및 가공 (최적화: 기본 정보만 반환, 상세 정보는 개별 조회 시)
    const processEndmill = (endmill: any, changes: any[] = []) => {
      // CAM Sheet 정보
      const camSheets = endmill.cam_sheet_endmills?.map((cs: any) => ({
        model: cs.cam_sheets?.model || '',
        process: cs.cam_sheets?.process || '',
        toolLife: cs.tool_life,
        tNumber: cs.t_number
      })) || []

      // 현재 사용 중인 설비 정보 (tool_positions에서 status가 'in_use'인 것만)
      const currentUsage = endmill.tool_positions?.filter((tp: any) => tp.status === 'in_use' && tp.equipment)
        .map((tp: any) => ({
          equipmentNumber: tp.equipment?.equipment_number || 'N/A',
          equipmentModel: tp.equipment?.current_model || 'N/A',
          equipmentProcess: tp.equipment?.process || 'N/A',
          positionNumber: tp.position_number,
          currentLife: tp.current_life || 0,
          totalLife: tp.total_life || 0,
          specToolLife: camSheets.find((cs: any) =>
            cs.model === tp.equipment?.current_model &&
            cs.process === tp.equipment?.process
          )?.toolLife || null,
          installDate: tp.install_date
        })) || []

      // 총 사용 횟수 계산
      const totalUsageCount = endmill.tool_positions?.reduce((sum: number, tp: any) => {
        return sum + (tp.total_life || 0)
      }, 0) || 0

      return {
        id: endmill.id,
        code: endmill.code,
        category: endmill.endmill_categories?.code || '',
        categoryName: endmill.endmill_categories?.name_ko || '',
        name: endmill.name,
        unitCost: endmill.unit_cost,
        standardLife: endmill.standard_life,
        averageLifespan: null,
        totalUsageCount,
        suppliers: endmill.endmill_supplier_prices?.map((sp: any) => ({
          code: sp.suppliers?.code || '',
          name: sp.suppliers?.name || '',
          unitPrice: sp.unit_price
        })) || [],
        camSheets,
        currentUsage,
        recentChanges: changes,
        inventory: (endmill.inventory && (Array.isArray(endmill.inventory) ? endmill.inventory[0] : endmill.inventory)) ? {
          current_stock: (Array.isArray(endmill.inventory) ? endmill.inventory[0]?.current_stock : endmill.inventory.current_stock) || 0,
          min_stock: (Array.isArray(endmill.inventory) ? endmill.inventory[0]?.min_stock : endmill.inventory.min_stock) || 0,
          max_stock: (Array.isArray(endmill.inventory) ? endmill.inventory[0]?.max_stock : endmill.inventory.max_stock) || 0,
          status: (Array.isArray(endmill.inventory) ? endmill.inventory[0]?.status : endmill.inventory.status) || 'unknown',
          location: (Array.isArray(endmill.inventory) ? endmill.inventory[0]?.location : endmill.inventory.location) || ''
        } : null,
        createdAt: endmill.created_at,
        updatedAt: endmill.updated_at
      }
    }

    const processedEndmills = code
      ? (endmillTypes ? [processEndmill(endmillTypes as any, recentChanges)] : [])
      : (Array.isArray(endmillTypes) ? endmillTypes.map((e) => processEndmill(e, [])) : [])

    return NextResponse.json({
      success: true,
      data: processedEndmills,
      count: processedEndmills.length
    })

  } catch (error) {
    logger.error('엔드밀 조회 API 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}