import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const url = new URL(request.url)
    const code = url.searchParams.get('code')

    // 특정 코드로 검색하는 경우
    let endmillTypes, error;

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

    // 데이터 정리 및 가공
    const processEndmill = async (endmill: any) => {
      // CAM Sheet 정보 (기존)
      const camSheets = endmill.cam_sheet_endmills?.map((cs: any) => ({
        model: cs.cam_sheets?.model || '',
        process: cs.cam_sheets?.process || '',
        toolLife: cs.tool_life,
        tNumber: cs.t_number
      })) || []

      // 최근 교체 이력 조회 (신규)
      const { data: toolChanges } = await supabase
        .from('tool_changes')
        .select('equipment_number, t_number, change_reason, change_date, tool_life, changed_by')
        .eq('endmill_code', endmill.code)
        .order('change_date', { ascending: false })
        .limit(10)

      // 교체자 이름 조회를 위한 user_profiles 조회
      const userIds = toolChanges?.map((tc: any) => tc.changed_by).filter(Boolean) || []
      const { data: userProfiles } = userIds.length > 0
        ? await supabase
            .from('user_profiles')
            .select('id, name')
            .in('id', userIds)
        : { data: [] }

      const userMap = new Map(userProfiles?.map((up: any) => [up.id, up.name]) || [])

      const recentChanges = toolChanges?.map((tc: any) => ({
        equipmentNumber: tc.equipment_number ? `C${tc.equipment_number.toString().padStart(3, '0')}` : '',
        tNumber: tc.t_number,
        changeReason: tc.change_reason,
        changeDate: tc.change_date,
        previousLife: tc.tool_life,
        changedBy: tc.changed_by ? (userMap.get(tc.changed_by) || '알 수 없음') : '알 수 없음'
      })) || []

      // 모든 교체 실적 조회 (설비별, T번호별로 그룹화하기 위해)
      const { data: allToolChanges } = await supabase
        .from('tool_changes')
        .select('equipment_number, t_number, tool_life')
        .eq('endmill_code', endmill.code)

      // 전체 평균 수명 (기본 정보용)
      const overallAverageLife = allToolChanges && allToolChanges.length > 0
        ? Math.round(allToolChanges.reduce((sum, tc) => sum + (tc.tool_life || 0), 0) / allToolChanges.length)
        : null

      // 실시간 사용 현황 (신규)
      const currentUsage = endmill.tool_positions
        ?.filter((tp: any) => tp.status === 'in_use') // 'in_use' 상태만 필터링
        ?.map((tp: any) => {
          // 현재 설비의 모델/공정/T번호에 맞는 CAM Sheet 사양 찾기
          const matchingCamSheet = endmill.cam_sheet_endmills?.find(
            (cs: any) =>
              cs.cam_sheets?.model === tp.equipment?.current_model &&
              cs.cam_sheets?.process === tp.equipment?.process &&
              cs.t_number === tp.position_number  // T번호도 정확히 매칭
          )

          // 설비 번호를 숫자로 정규화 (C002 -> 2)
          let normalizedEquipmentNumber = tp.equipment?.equipment_number
          if (typeof normalizedEquipmentNumber === 'string') {
            normalizedEquipmentNumber = parseInt(normalizedEquipmentNumber.replace(/^C/i, ''))
          }

          // 해당 설비의 해당 T번호에서의 교체 실적만 필터링
          const equipmentToolChanges = allToolChanges?.filter(
            (tc: any) =>
              tc.equipment_number === normalizedEquipmentNumber &&
              tc.t_number === tp.position_number
          ) || []

          // 해당 설비/T번호의 평균 수명 계산
          const equipmentAverageLife = equipmentToolChanges.length > 0
            ? Math.round(equipmentToolChanges.reduce((sum, tc) => sum + (tc.tool_life || 0), 0) / equipmentToolChanges.length)
            : null

          return {
            equipmentNumber: tp.equipment?.equipment_number || '',
            equipmentModel: tp.equipment?.current_model || '',
            equipmentProcess: tp.equipment?.process || '',
            positionNumber: tp.position_number,
            currentLife: tp.current_life || 0,
            totalLife: tp.total_life || 0,
            installDate: tp.install_date,
            status: tp.status,
            specToolLife: matchingCamSheet?.tool_life || null,
            averageActualLife: equipmentAverageLife,  // 설비별 T번호별 평균
            usagePercentage: equipmentAverageLife && matchingCamSheet?.tool_life
              ? Math.round((equipmentAverageLife / matchingCamSheet.tool_life) * 100)
              : null
          }
        }) || []

      return {
        id: endmill.id,
        code: endmill.code,
        category: endmill.endmill_categories?.code || '',
        categoryName: endmill.endmill_categories?.name_ko || '',
        name: endmill.name,
        unitCost: endmill.unit_cost,
        standardLife: endmill.standard_life,
        averageLifespan: overallAverageLife,  // 전체 평균 수명 (기본 정보용)
        suppliers: endmill.endmill_supplier_prices?.map((sp: any) => ({
          code: sp.suppliers?.code || '',
          name: sp.suppliers?.name || '',
          unitPrice: sp.unit_price
        })) || [],
        camSheets,           // CAM Sheet 사양 정보 (정적)
        currentUsage,        // 실시간 사용 현황 (동적)
        recentChanges,       // 최근 교체 이력 (신규)
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
      ? (endmillTypes ? [await processEndmill(endmillTypes as any)] : [])
      : (Array.isArray(endmillTypes) ? await Promise.all(endmillTypes.map(processEndmill)) : [])

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