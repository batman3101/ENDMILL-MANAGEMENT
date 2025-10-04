/**
 * 리포트 시스템 타입 정의
 *
 * 이 파일은 분석 & 리포트 페이지에서 사용되는 모든 타입을 정의합니다.
 */

// 리포트 유형
export type ReportType = 'monthly' | 'cost' | 'tool-life' | 'performance'

// 리포트 기간 타입
export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

// 리포트 필터
export interface ReportFilter {
  period: ReportPeriod
  startDate?: string
  endDate?: string
  equipmentModel?: string
  endmillCategory?: string
  equipmentNumber?: number
}

// 리포트 메타데이터
export interface ReportMetadata {
  id: string
  type: ReportType
  title: string
  generatedAt: string
  generatedBy: string
  filter: ReportFilter
}

// ========================================
// 월간 리포트 (Monthly Report)
// ========================================

export interface MonthlyReportData {
  metadata: ReportMetadata
  summary: {
    totalChanges: number // 총 교체 건수
    totalCost: number // 총 비용
    averageToolLife: number // 평균 공구 수명
    mostChangedTool: string // 가장 많이 교체된 공구
    mostExpensiveTool: string // 가장 비용이 많이 든 공구
  }
  changesByDate: Array<{
    date: string
    count: number
    cost: number
  }>
  changesByModel: Array<{
    model: string
    count: number
    cost: number
    percentage: number
  }>
  changesByCategory: Array<{
    category: string
    count: number
    cost: number
    percentage: number
  }>
  changesByReason: Array<{
    reason: string
    count: number
    percentage: number
  }>
  topTools: Array<{
    code: string
    name: string
    changeCount: number
    totalCost: number
    averageLife: number
  }>
}

// ========================================
// 비용 분석 (Cost Analysis)
// ========================================

export interface CostAnalysisData {
  metadata: ReportMetadata
  summary: {
    totalCost: number // 총 비용
    averageCostPerChange: number // 교체당 평균 비용
    costTrend: 'increasing' | 'decreasing' | 'stable' // 비용 트렌드
    highestCostPeriod: string // 비용이 가장 높았던 기간
    lowestCostPeriod: string // 비용이 가장 낮았던 기간
  }
  costByPeriod: Array<{
    period: string
    cost: number
    changeCount: number
    averageCost: number
  }>
  costByModel: Array<{
    model: string
    totalCost: number
    changeCount: number
    averageCost: number
    costPercentage: number
  }>
  costByCategory: Array<{
    category: string
    totalCost: number
    changeCount: number
    averageCost: number
    costPercentage: number
  }>
  costEfficiency: Array<{
    toolCode: string
    toolName: string
    unitCost: number
    averageLife: number
    standardLife: number
    costPerLife: number // 수명당 비용 (unit_cost / average_life)
    efficiencyRating: number // 효율성 평가 (0-100)
    recommendation: string // 추천 사항
  }>
}

// ========================================
// Tool Life 분석 (Tool Life Analysis)
// ========================================

export interface ToolLifeAnalysisData {
  metadata: ReportMetadata
  summary: {
    averageLife: number // 평균 공구 수명
    totalChanges: number // 총 교체 건수
    prematureFailures: number // 조기 파손 건수
    standardLifeAchievement: number // 표준 수명 달성률 (%)
    topPerformingTool: string // 최고 성능 공구
    worstPerformingTool: string // 최저 성능 공구
  }
  lifeByTool: Array<{
    toolCode: string
    toolName: string
    category: string
    averageLife: number
    standardLife: number
    achievementRate: number // 표준 수명 대비 달성률 (%)
    changeCount: number
    minLife: number
    maxLife: number
    stdDeviation: number // 표준편차
  }>
  lifeByReason: Array<{
    reason: string
    averageLife: number
    count: number
    percentage: number
  }>
  lifeTrend: Array<{
    period: string
    averageLife: number
    changeCount: number
  }>
  lifeDistribution: Array<{
    range: string // e.g., "0-100", "101-200"
    count: number
    percentage: number
  }>
  prematureFailureAnalysis: Array<{
    toolCode: string
    toolName: string
    failureCount: number
    averageLifeAtFailure: number
    standardLife: number
    achievementRate: number
    mainReason: string
  }>
}

// ========================================
// 성능 리포트 (Performance Report)
// ========================================

export interface PerformanceReportData {
  metadata: ReportMetadata
  summary: {
    totalEquipment: number // 총 설비 수
    averageChangesPerEquipment: number // 설비당 평균 교체 건수
    topPerformer: string // 최고 성능 설비
    worstPerformer: string // 최저 성능 설비
    overallEfficiency: number // 전체 효율성 (%)
  }
  equipmentPerformance: Array<{
    equipmentNumber: number
    model: string
    location: string
    totalChanges: number
    totalCost: number
    averageToolLife: number
    standardLifeAchievement: number // 표준 수명 달성률
    prematureFailures: number
    efficiencyScore: number // 0-100
    ranking: number
  }>
  modelComparison: Array<{
    model: string
    equipmentCount: number
    averageChanges: number
    averageCost: number
    averageLife: number
    standardLifeAchievement: number
    efficiencyScore: number
  }>
  locationComparison: Array<{
    location: string
    equipmentCount: number
    totalChanges: number
    totalCost: number
    averageLife: number
    efficiencyScore: number
  }>
  processEfficiency: Array<{
    process: string
    changeCount: number
    averageLife: number
    cost: number
    efficiencyScore: number
  }>
  timeBasedAnalysis: Array<{
    period: string
    changeCount: number
    cost: number
    averageLife: number
    efficiencyScore: number
  }>
}

// ========================================
// 저장된 리포트 (Saved Report)
// ========================================

export interface SavedReport {
  id: string
  type: ReportType
  title: string
  description?: string
  filter: ReportFilter
  data: MonthlyReportData | CostAnalysisData | ToolLifeAnalysisData | PerformanceReportData
  generatedAt: string
  generatedBy: string
  createdAt: string
}

// ========================================
// 리포트 생성 옵션
// ========================================

export interface GenerateReportOptions {
  type: ReportType
  filter: ReportFilter
  saveReport?: boolean
  title?: string
  description?: string
}

// ========================================
// 리포트 통계 헬퍼 타입
// ========================================

export interface ToolChangeStats {
  toolCode: string
  toolName: string
  category: string
  unitCost: number
  standardLife: number
  changes: Array<{
    date: string
    life: number
    reason: string
    equipmentNumber: number
    model: string
    process: string
  }>
}

export interface EquipmentStats {
  equipmentNumber: number
  model: string
  location: string
  changes: Array<{
    date: string
    toolCode: string
    toolName: string
    life: number
    cost: number
    reason: string
  }>
}