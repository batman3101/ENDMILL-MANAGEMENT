import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const supabase = createServerClient()
    const startTime = Date.now()

    // 1. 데이터베이스 연결 테스트
    const { error: connectionError } = await supabase
      .from('equipment')
      .select('id')
      .limit(1)

    const isConnected = !connectionError
    const responseTime = Date.now() - startTime

    if (!isConnected) {
      logger.error('데이터베이스 연결 실패:', connectionError)
      return NextResponse.json({
        status: 'unhealthy',
        database: {
          connected: false,
          error: connectionError?.message || 'Connection failed'
        },
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }

    // 2. 주요 테이블 레코드 수 확인
    const tables = ['equipment', 'tool_changes', 'inventory', 'endmill_types', 'user_profiles'] as const
    const counts: Record<string, number> = {}
    const errors: string[] = []

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table as any)
          .select('*', { count: 'exact', head: true })

        if (error) {
          errors.push(`${table}: ${error.message}`)
          counts[table] = -1
        } else {
          counts[table] = count || 0
        }
      } catch (err) {
        errors.push(`${table}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        counts[table] = -1
      }
    }

    // 3. 최근 활동 확인
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 최근 24시간 교체 실적
    const { data: recentChanges } = await supabase
      .from('tool_changes')
      .select('id')
      .gte('change_date', yesterday)

    // 최근 7일 재고 거래
    const { data: recentTransactions } = await supabase
      .from('inventory_transactions')
      .select('id')
      .gte('created_at', lastWeek)

    // 읽지 않은 알림 수
    const { count: unreadNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    // 4. 재고 경고 확인
    const { data: allInventory } = await supabase
      .from('inventory')
      .select('id, current_stock, min_stock, endmill_types(code, name)')

    const lowInventory = allInventory?.filter((item: any) => item.current_stock < item.min_stock) || []

    // 5. 수명 임박 공구 확인
    const { data: allToolPositions } = await supabase
      .from('tool_positions')
      .select('id, position_number, current_life, total_life, equipment:equipment_id(equipment_number)')
      .eq('status', 'in_use')

    const criticalTools = allToolPositions?.filter((tool: any) =>
      tool.total_life > 0 && tool.current_life < tool.total_life * 0.1
    ) || []

    // 6. 시스템 상태 판단
    const hasErrors = errors.length > 0
    const hasLowInventory = (lowInventory?.length || 0) > 0
    const hasCriticalTools = (criticalTools?.length || 0) > 0

    let overallStatus = 'healthy'
    if (hasErrors) {
      overallStatus = 'unhealthy'
    } else if (hasLowInventory || hasCriticalTools) {
      overallStatus = 'warning'
    }

    return NextResponse.json({
      status: overallStatus,
      database: {
        connected: true,
        responseTime: `${responseTime}ms`,
        tables: counts
      },
      recentActivity: {
        toolChanges24h: recentChanges?.length || 0,
        inventoryTransactions7d: recentTransactions?.length || 0,
        unreadNotifications: unreadNotifications || 0
      },
      warnings: {
        lowInventory: lowInventory?.map((item: any) => ({
          code: item.endmill_types?.code || 'Unknown',
          name: item.endmill_types?.name || 'Unknown',
          currentStock: item.current_stock,
          minStock: item.min_stock
        })) || [],
        criticalTools: criticalTools?.map((tool: any) => ({
          equipment: `C${String(tool.equipment?.equipment_number || 0).padStart(3, '0')}`,
          position: tool.position_number,
          currentLife: tool.current_life,
          totalLife: tool.total_life,
          percentage: Math.round((tool.current_life / tool.total_life) * 100)
        })) || []
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Health Check 오류:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
