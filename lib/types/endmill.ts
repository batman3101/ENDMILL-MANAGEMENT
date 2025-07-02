// 기존 EndmillMaster 인터페이스 확장
export interface EndmillMaster {
  code: string
  name: string
  category: string
  specifications: string
  unitPrice: number // VND
  supplier: string
  standardLife: number
  description?: string
}

// 확장된 앤드밀 상세 정보 인터페이스
export interface EndmillDetailInfo extends EndmillMaster {
  // 재고 관리 정보
  currentStock: number
  minStock: number
  maxStock: number
  stockStatus: 'sufficient' | 'low' | 'critical'
  
  // 기술 사양 상세
  diameter: number
  flutes: number
  coating: string
  material: string
  tolerance: string
  helix: string
  
  // 사용 이력 및 성능
  totalUsageCount: number
  averageLifespan: number
  lastUsedDate: string
  replacementFrequency: number // 월 평균 교체 횟수
  
  // 품질 및 성능 지표
  qualityGrade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  defectRate: number // 불량률 (%)
  performanceRating: number // 성능 점수 (1-100)
  costEfficiency: number // 비용 효율성 점수
  
  // 공급업체별 상세 정보
  suppliers: EndmillSupplierInfo[]
  
  // 설비 사용 현황
  equipmentUsage: EndmillEquipmentUsage[]
  
  // 최근 교체 이력
  recentChanges: EndmillChangeHistory[]
  
  // 예측 정보
  predictedNextChange: string
  recommendedStock: number
  
  // 메타 정보
  createdAt: string
  updatedAt: string
  isActive: boolean
  tags: string[]
}

// 공급업체별 상세 정보
export interface EndmillSupplierInfo {
  supplierName: string
  unitPrice: number // VND
  currentStock: number
  minOrderQuantity: number
  leadTime: number // 리드타임 (일)
  stockStatus: 'sufficient' | 'low' | 'critical'
  lastOrderDate: string
  averageDeliveryTime: number
  qualityRating: number // 1-5 점
  isPreferred: boolean
}

// 설비별 사용 현황
export interface EndmillEquipmentUsage {
  equipmentNumber: string
  process: string
  tNumber: number
  installDate: string
  currentLife: number
  totalLife: number
  usageStatus: 'new' | 'active' | 'warning' | 'critical'
  lastMaintenanceDate: string
}

// 교체 이력
export interface EndmillChangeHistory {
  id: string
  changeDate: string
  equipmentNumber: string
  tNumber: number
  changeReason: string
  previousLife: number
  changedBy: string
  notes?: string
}

// 앤드밀 성능 분석 데이터
export interface EndmillPerformanceAnalysis {
  code: string
  totalOperatingHours: number
  averageToolLife: number
  toolLifeVariance: number
  costPerHour: number
  reliabilityScore: number
  maintenanceScore: number
  usageRecommendations: string[]
} 