/**
 * 리포트 계산 유틸리티 함수
 *
 * 이 파일은 리포트 데이터를 계산하는 모든 헬퍼 함수를 포함합니다.
 */

import { ReportFilter } from '../types/reports'

// ========================================
// 날짜 관련 유틸리티
// ========================================

/**
 * 리포트 필터에서 시작일과 종료일을 계산합니다
 */
export function getDateRangeFromFilter(filter: ReportFilter): { startDate: string; endDate: string } {
  const today = new Date()
  let startDate: Date
  const endDate: Date = today

  switch (filter.period) {
    case 'today':
      startDate = new Date(today)
      break
    case 'week':
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 7)
      break
    case 'month':
      startDate = new Date(today)
      startDate.setMonth(today.getMonth() - 1)
      break
    case 'quarter':
      startDate = new Date(today)
      startDate.setMonth(today.getMonth() - 3)
      break
    case 'year':
      startDate = new Date(today)
      startDate.setFullYear(today.getFullYear() - 1)
      break
    case 'custom':
      if (!filter.startDate || !filter.endDate) {
        throw new Error('Custom period requires startDate and endDate')
      }
      return {
        startDate: filter.startDate,
        endDate: filter.endDate
      }
    default:
      startDate = new Date(today)
      startDate.setMonth(today.getMonth() - 1)
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  }
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷합니다
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * 날짜 범위를 기간별로 그룹화합니다
 */
export function groupByPeriod(dates: string[], periodType: 'day' | 'week' | 'month'): string[] {
  const grouped = new Set<string>()

  dates.forEach(dateStr => {
    const date = new Date(dateStr)
    let key: string

    switch (periodType) {
      case 'day':
        key = formatDate(date)
        break
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = formatDate(weekStart)
        break
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
    }

    grouped.add(key)
  })

  return Array.from(grouped).sort()
}

// ========================================
// 통계 계산 유틸리티
// ========================================

/**
 * 평균을 계산합니다
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return Math.round((sum / values.length) * 100) / 100
}

/**
 * 표준편차를 계산합니다
 */
export function calculateStdDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const avg = calculateAverage(values)
  const squareDiffs = values.map(value => Math.pow(value - avg, 2))
  const avgSquareDiff = calculateAverage(squareDiffs)
  return Math.round(Math.sqrt(avgSquareDiff) * 100) / 100
}

/**
 * 백분율을 계산합니다
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 10000) / 100
}

/**
 * 비용 효율성 점수를 계산합니다 (0-100)
 * 실제 수명이 표준 수명에 가까울수록 높은 점수
 */
export function calculateEfficiencyScore(actualLife: number, standardLife: number): number {
  if (standardLife === 0) return 0
  const ratio = actualLife / standardLife

  // 표준 수명 달성률에 따른 점수 계산
  if (ratio >= 1.0) return 100 // 표준 수명 이상 달성
  if (ratio >= 0.9) return 90  // 90% 이상
  if (ratio >= 0.8) return 80  // 80% 이상
  if (ratio >= 0.7) return 70  // 70% 이상
  if (ratio >= 0.6) return 60  // 60% 이상
  if (ratio >= 0.5) return 50  // 50% 이상

  return Math.round(ratio * 100) // 50% 미만
}

/**
 * 표준 수명 달성률을 계산합니다 (%)
 */
export function calculateAchievementRate(actualLife: number, standardLife: number): number {
  if (standardLife === 0) return 0
  return Math.round((actualLife / standardLife) * 10000) / 100
}

/**
 * 수명당 비용을 계산합니다
 */
export function calculateCostPerLife(unitCost: number, averageLife: number): number {
  if (averageLife === 0) return 0
  return Math.round((unitCost / averageLife) * 100) / 100
}

/**
 * 트렌드를 계산합니다 (증가/감소/안정)
 */
export function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable'

  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))

  const firstAvg = calculateAverage(firstHalf)
  const secondAvg = calculateAverage(secondHalf)

  const diff = secondAvg - firstAvg
  const threshold = firstAvg * 0.1 // 10% 변화를 기준으로 판단

  if (Math.abs(diff) < threshold) return 'stable'
  return diff > 0 ? 'increasing' : 'decreasing'
}

// ========================================
// 데이터 그룹화 유틸리티
// ========================================

/**
 * 배열을 특정 키로 그룹화합니다
 */
export function groupBy<T>(array: T[], key: keyof T): Map<any, T[]> {
  return array.reduce((map, item) => {
    const groupKey = item[key]
    if (!map.has(groupKey)) {
      map.set(groupKey, [])
    }
    map.get(groupKey)!.push(item)
    return map
  }, new Map<any, T[]>())
}

/**
 * 객체 배열을 특정 키의 값으로 합산합니다
 */
export function sumBy<T>(array: T[], key: keyof T): number {
  return array.reduce((sum, item) => {
    const value = item[key]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
}

/**
 * 배열에서 최대값을 가진 항목을 찾습니다
 */
export function maxBy<T>(array: T[], key: keyof T): T | undefined {
  if (array.length === 0) return undefined
  return array.reduce((max, item) => {
    const maxValue = max[key]
    const itemValue = item[key]
    if (typeof maxValue === 'number' && typeof itemValue === 'number') {
      return itemValue > maxValue ? item : max
    }
    return max
  })
}

/**
 * 배열에서 최소값을 가진 항목을 찾습니다
 */
export function minBy<T>(array: T[], key: keyof T): T | undefined {
  if (array.length === 0) return undefined
  return array.reduce((min, item) => {
    const minValue = min[key]
    const itemValue = item[key]
    if (typeof minValue === 'number' && typeof itemValue === 'number') {
      return itemValue < minValue ? item : min
    }
    return min
  })
}

// ========================================
// 추천 시스템
// ========================================

/**
 * 비용 효율성을 기반으로 추천 사항을 생성합니다
 */
export function generateCostRecommendation(
  costPerLife: number,
  achievementRate: number,
  efficiencyScore: number
): string {
  if (efficiencyScore >= 90) {
    return '매우 우수한 비용 효율성을 보이고 있습니다. 현재 상태를 유지하세요.'
  }

  if (efficiencyScore >= 80) {
    return '양호한 비용 효율성입니다. 표준 수명 달성을 위해 사용 조건을 점검하세요.'
  }

  if (efficiencyScore >= 70) {
    return '보통 수준의 효율성입니다. 공구 사용 방법 및 가공 조건을 개선하세요.'
  }

  if (achievementRate < 50) {
    return '조기 파손이 빈번합니다. 공구 품질 또는 가공 조건을 검토하세요.'
  }

  return '효율성이 낮습니다. 다른 공급업체 또는 대체 공구를 검토하세요.'
}

/**
 * Tool Life 분석 기반 추천 사항을 생성합니다
 */
export function generateLifeRecommendation(
  averageLife: number,
  standardLife: number,
  stdDeviation: number
): string {
  const achievementRate = calculateAchievementRate(averageLife, standardLife)

  if (achievementRate >= 100) {
    return '표준 수명을 달성하고 있습니다. 현재 관리 방법을 유지하세요.'
  }

  if (achievementRate >= 80) {
    return '표준 수명에 근접하고 있습니다. 가공 조건 최적화를 고려하세요.'
  }

  if (stdDeviation > averageLife * 0.3) {
    return '수명 편차가 큽니다. 작업자 교육 및 가공 조건 표준화가 필요합니다.'
  }

  if (achievementRate < 50) {
    return '표준 수명 대비 실제 수명이 현저히 낮습니다. 공구 또는 가공 조건을 전면 재검토하세요.'
  }

  return '표준 수명 달성을 위해 가공 조건 및 공구 관리 방법을 개선하세요.'
}

// ========================================
// 포맷팅 유틸리티
// ========================================

/**
 * 숫자를 통화 형식으로 포맷합니다 (베트남 동 VND)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount)
}

/**
 * 숫자를 천 단위 구분 기호와 함께 포맷합니다
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

/**
 * 백분율을 포맷합니다
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}