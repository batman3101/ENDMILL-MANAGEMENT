import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const factoryId = url.searchParams.get('factoryId')

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
            location,
            factory_id
          )
        `)
        .eq('code', code.toUpperCase())
        .single()

      // 최근 교체 이력 조회 (상세 페이지용)
      if (result.data?.code) {
        // 모든 교체 이력 조회 (평균 수명 계산용)
        let toolChangesQuery = supabase
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

        // factoryId 필터 적용
        if (factoryId) {
          toolChangesQuery = toolChangesQuery.eq('factory_id', factoryId)
        }

        const allChangesResult = await toolChangesQuery.order('change_date', { ascending: false })

        if (allChangesResult.data) {
          // 최근 20개만 recentChanges로 사용
          recentChanges = allChangesResult.data.slice(0, 20).map((change: any) => ({
            equipmentNumber: change.equipment_number ? `C${change.equipment_number.toString().padStart(3, '0')}` : 'N/A',
            equipmentModel: change.production_model || change.model || 'N/A',
            changeDate: change.change_date ? new Date(change.change_date).toLocaleString('ko-KR') : 'N/A',
            changeReason: change.change_reason || '정상 교체',
            tNumber: change.t_number,
            previousLife: change.tool_life || 0,
            changedBy: change.user_profiles?.name || '알 수 없음'
          }))

          // 모델/공정 조합별 실제 평균 수명 계산
          const averageLifeByModelProcess: Record<string, { total: number; count: number }> = {}

          allChangesResult.data.forEach((change: any) => {
            if (change.tool_life && change.tool_life > 0) {
              const model = change.production_model || change.model || 'N/A'
              const process = change.process || 'N/A'
              const key = `${model}|${process}`

              if (!averageLifeByModelProcess[key]) {
                averageLifeByModelProcess[key] = { total: 0, count: 0 }
              }
              averageLifeByModelProcess[key].total += change.tool_life
              averageLifeByModelProcess[key].count += 1
            }
          })

          // 평균 계산하여 맵에 저장
          const averageLifeMap: Record<string, number> = {}
          Object.entries(averageLifeByModelProcess).forEach(([key, value]) => {
            if (value.count > 0) {
              averageLifeMap[key] = Math.round(value.total / value.count)
            }
          })

          // result.data에 averageLifeMap 추가
          ;(result.data as any).averageLifeMap = averageLifeMap
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
            location,
            factory_id
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
    const processEndmill = (endmill: any, changes: any[] = [], filterFactoryId?: string | null) => {
      // CAM Sheet 정보
      const camSheets = endmill.cam_sheet_endmills?.map((cs: any) => ({
        model: cs.cam_sheets?.model || '',
        process: cs.cam_sheets?.process || '',
        toolLife: cs.tool_life,
        tNumber: cs.t_number
      })) || []

      // 모델/공정별 평균 수명 맵 (상세 조회 시에만 존재)
      const averageLifeMap = endmill.averageLifeMap || {}

      // 현재 사용 중인 설비 정보 (tool_positions에서 status가 'in_use'인 것만)
      const currentUsage = endmill.tool_positions?.filter((tp: any) => tp.status === 'in_use' && tp.equipment)
        .map((tp: any) => {
          const equipmentModel = tp.equipment?.current_model || 'N/A'
          const equipmentProcess = tp.equipment?.process || 'N/A'
          const averageLifeKey = `${equipmentModel}|${equipmentProcess}`

          return {
            equipmentNumber: tp.equipment?.equipment_number || 'N/A',
            equipmentModel,
            equipmentProcess,
            positionNumber: tp.position_number,
            currentLife: tp.current_life || 0,
            totalLife: tp.total_life || 0,
            specToolLife: camSheets.find((cs: any) =>
              cs.model === equipmentModel &&
              cs.process === equipmentProcess
            )?.toolLife || null,
            installDate: tp.install_date,
            averageActualLife: averageLifeMap[averageLifeKey] || null
          }
        }) || []

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
        inventory: (() => {
          const invArr = Array.isArray(endmill.inventory) ? endmill.inventory : (endmill.inventory ? [endmill.inventory] : [])
          const filtered = filterFactoryId ? invArr.filter((inv: any) => inv.factory_id === filterFactoryId) : invArr
          const inv = filtered[0]
          return inv ? {
            current_stock: inv.current_stock || 0,
            min_stock: inv.min_stock || 0,
            max_stock: inv.max_stock || 0,
            status: inv.status || 'unknown',
            location: inv.location || ''
          } : null
        })(),
        createdAt: endmill.created_at,
        updatedAt: endmill.updated_at
      }
    }

    const processedEndmills = code
      ? (endmillTypes ? [processEndmill(endmillTypes as any, recentChanges, factoryId)] : [])
      : (Array.isArray(endmillTypes) ? endmillTypes.map((e) => processEndmill(e, [], factoryId)) : [])

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