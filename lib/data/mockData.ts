import { CAMSheet, EndmillInfo } from '../hooks/useCAMSheets'
import { EndmillDetailInfo, EndmillSupplierInfo, EndmillEquipmentUsage, EndmillChangeHistory } from '../types/endmill'

// 초기 목업 데이터
export const INITIAL_CAM_SHEETS: CAMSheet[] = [
  {
    id: '1',
    model: 'PA-001',
    process: 'CNC2',
    camVersion: 'v2.1',
    versionDate: '2024-01-15',
    endmills: [
      {
        tNumber: 1,
        endmillCode: 'AT001',
        endmillName: 'FLAT 12mm 4날',
        specifications: '직경12mm, 4날, 코팅TiN',
        toolLife: 2500
      },
      {
        tNumber: 3,
        endmillCode: 'AT005',
        endmillName: 'BALL 8mm 2날',
        specifications: '직경8mm, 2날, 코팅TiAlN',
        toolLife: 2000
      },
      {
        tNumber: 15,
        endmillCode: 'AT003',
        endmillName: 'T-CUT 10mm 3날',
        specifications: '직경10mm, 3날, 코팅TiCN',
        toolLife: 1800
      },
      {
        tNumber: 7,
        endmillCode: 'AT012',
        endmillName: 'REAMER 6mm',
        specifications: '직경6mm, 리머, HSS',
        toolLife: 3000
      }
    ],
    createdAt: '2024-01-15T09:00:00.000Z',
    updatedAt: '2024-01-15T09:00:00.000Z'
  },
  {
    id: '2',
    model: 'PB-025',
    process: 'CNC1',
    camVersion: 'v1.5',
    versionDate: '2024-01-10',
    endmills: [
      {
        tNumber: 2,
        endmillCode: 'AT007',
        endmillName: 'FLAT 8mm 2날',
        specifications: '직경8mm, 2날, 코팅AlCrN',
        toolLife: 2200
      },
      {
        tNumber: 5,
        endmillCode: 'AT010',
        endmillName: 'BALL 4mm 2날',
        specifications: '직경4mm, 2날, 코팅TiAlN',
        toolLife: 1500
      },
      {
        tNumber: 12,
        endmillCode: 'AT015',
        endmillName: 'DRILL 3mm',
        specifications: '직경3mm, 드릴, HSS-E',
        toolLife: 2800
      }
    ],
    createdAt: '2024-01-10T14:30:00.000Z',
    updatedAt: '2024-01-10T14:30:00.000Z'
  },
  {
    id: '3',
    model: 'PS-012',
    process: 'CNC2-1',
    camVersion: 'v3.0',
    versionDate: '2024-01-20',
    endmills: [
      {
        tNumber: 1,
        endmillCode: 'AT002',
        endmillName: 'FLAT 16mm 4날',
        specifications: '직경16mm, 4날, 코팅TiN',
        toolLife: 3200
      },
      {
        tNumber: 4,
        endmillCode: 'AT008',
        endmillName: 'T-CUT 12mm 4날',
        specifications: '직경12mm, 4날, 코팅TiAlN',
        toolLife: 2100
      },
      {
        tNumber: 8,
        endmillCode: 'AT020',
        endmillName: 'C-CUT 6mm',
        specifications: '직경6mm, 챔퍼밀, 초경',
        toolLife: 1900
      },
      {
        tNumber: 10,
        endmillCode: 'AT025',
        endmillName: 'BALL 10mm 2날',
        specifications: '직경10mm, 2날, 코팅DLC',
        toolLife: 2400
      },
      {
        tNumber: 18,
        endmillCode: 'AT030',
        endmillName: 'REAMER 8mm',
        specifications: '직경8mm, 리머, HSS-E',
        toolLife: 3500
      }
    ],
    createdAt: '2024-01-20T11:15:00.000Z',
    updatedAt: '2024-01-20T11:15:00.000Z'
  },
  {
    id: '4',
    model: 'B7-105',
    process: 'CNC2',
    camVersion: 'v1.8',
    versionDate: '2024-01-12',
    endmills: [
      {
        tNumber: 3,
        endmillCode: 'AT011',
        endmillName: 'FLAT 14mm 3날',
        specifications: '직경14mm, 3날, 코팅TiCN',
        toolLife: 2700
      },
      {
        tNumber: 6,
        endmillCode: 'AT018',
        endmillName: 'BALL 5mm 2날',
        specifications: '직경5mm, 2날, 코팅TiAlN',
        toolLife: 1600
      },
      {
        tNumber: 11,
        endmillCode: 'AT022',
        endmillName: 'T-CUT 8mm 2날',
        specifications: '직경8mm, 2날, 초경',
        toolLife: 1750
      }
    ],
    createdAt: '2024-01-12T16:45:00.000Z',
    updatedAt: '2024-01-12T16:45:00.000Z'
  },
  {
    id: '5',
    model: 'Q7-201',
    process: 'CNC1',
    camVersion: 'v2.3',
    versionDate: '2024-01-25',
    endmills: [
      {
        tNumber: 1,
        endmillCode: 'AT004',
        endmillName: 'FLAT 20mm 4날',
        specifications: '직경20mm, 4날, 코팅TiAlN',
        toolLife: 3800
      },
      {
        tNumber: 9,
        endmillCode: 'AT016',
        endmillName: 'DRILL 5mm',
        specifications: '직경5mm, 드릴, HSS-E',
        toolLife: 3200
      },
      {
        tNumber: 14,
        endmillCode: 'AT028',
        endmillName: 'C-CUT 10mm',
        specifications: '직경10mm, 챔퍼밀, 초경',
        toolLife: 2600
      },
      {
        tNumber: 21,
        endmillCode: 'AT035',
        endmillName: 'REAMER 12mm',
        specifications: '직경12mm, 리머, HSS',
        toolLife: 4000
      }
    ],
    createdAt: '2024-01-25T08:20:00.000Z',
    updatedAt: '2024-01-25T08:20:00.000Z'
  }
]

// 앤드밀 마스터 데이터 인터페이스
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

// 앤드밀 마스터 데이터
export const ENDMILL_MASTER_DATA: EndmillMaster[] = [
  {
    code: 'AT001',
    name: 'FLAT 12mm 4날',
    category: 'FLAT',
    specifications: '직경12mm, 4날, 코팅TiN',
    unitPrice: 1080000,
    supplier: 'A-TECH',
    standardLife: 2500,
    description: '범용 평형 앤드밀'
  },
  {
    code: 'AT002',
    name: 'FLAT 16mm 4날',
    category: 'FLAT',
    specifications: '직경16mm, 4날, 코팅TiN',
    unitPrice: 1450000,
    supplier: 'A-TECH',
    standardLife: 3200,
    description: '대형 평형 앤드밀'
  },
  {
    code: 'AT003',
    name: 'T-CUT 10mm 3날',
    category: 'T-CUT',
    specifications: '직경10mm, 3날, 코팅TiCN',
    unitPrice: 1248000,
    supplier: 'B-SUPPLIER',
    standardLife: 1800,
    description: 'T홈 가공용'
  },
  {
    code: 'AT004',
    name: 'FLAT 20mm 4날',
    category: 'FLAT',
    specifications: '직경20mm, 4날, 코팅TiAlN',
    unitPrice: 1890000,
    supplier: 'C-TOOLS',
    standardLife: 3800,
    description: '대형 고속가공용'
  },
  {
    code: 'AT005',
    name: 'BALL 8mm 2날',
    category: 'BALL',
    specifications: '직경8mm, 2날, 코팅TiAlN',
    unitPrice: 912000,
    supplier: 'B-SUPPLIER',
    standardLife: 2000,
    description: '볼엔드밀 중형'
  },
  {
    code: 'AT007',
    name: 'FLAT 8mm 2날',
    category: 'FLAT',
    specifications: '직경8mm, 2날, 코팅AlCrN',
    unitPrice: 756000,
    supplier: 'A-TECH',
    standardLife: 2200,
    description: '소형 평형 앤드밀'
  },
  {
    code: 'AT008',
    name: 'T-CUT 12mm 4날',
    category: 'T-CUT',
    specifications: '직경12mm, 4날, 코팅TiAlN',
    unitPrice: 1524000,
    supplier: 'C-TOOLS',
    standardLife: 2100,
    description: 'T홈 가공용 대형'
  },
  {
    code: 'AT010',
    name: 'BALL 4mm 2날',
    category: 'BALL',
    specifications: '직경4mm, 2날, 코팅TiAlN',
    unitPrice: 680000,
    supplier: 'B-SUPPLIER',
    standardLife: 1500,
    description: '볼엔드밀 소형'
  },
  {
    code: 'AT011',
    name: 'FLAT 14mm 3날',
    category: 'FLAT',
    specifications: '직경14mm, 3날, 코팅TiCN',
    unitPrice: 1320000,
    supplier: 'A-TECH',
    standardLife: 2700,
    description: '중형 평형 앤드밀'
  },
  {
    code: 'AT012',
    name: 'REAMER 6mm',
    category: 'REAMER',
    specifications: '직경6mm, 리머, HSS',
    unitPrice: 540000,
    supplier: 'D-COMPANY',
    standardLife: 3000,
    description: '리머 소형'
  },
  {
    code: 'AT015',
    name: 'DRILL 3mm',
    category: 'DRILL',
    specifications: '직경3mm, 드릴, HSS-E',
    unitPrice: 320000,
    supplier: 'D-COMPANY',
    standardLife: 2800,
    description: '소형 드릴'
  },
  {
    code: 'AT016',
    name: 'DRILL 5mm',
    category: 'DRILL',
    specifications: '직경5mm, 드릴, HSS-E',
    unitPrice: 420000,
    supplier: 'D-COMPANY',
    standardLife: 3200,
    description: '중형 드릴'
  },
  {
    code: 'AT018',
    name: 'BALL 5mm 2날',
    category: 'BALL',
    specifications: '직경5mm, 2날, 코팅TiAlN',
    unitPrice: 720000,
    supplier: 'B-SUPPLIER',
    standardLife: 1600,
    description: '볼엔드밀 소형'
  },
  {
    code: 'AT020',
    name: 'C-CUT 6mm',
    category: 'C-CUT',
    specifications: '직경6mm, 챔퍼밀, 초경',
    unitPrice: 890000,
    supplier: 'C-TOOLS',
    standardLife: 1900,
    description: '챔퍼 가공용'
  },
  {
    code: 'AT022',
    name: 'T-CUT 8mm 2날',
    category: 'T-CUT',
    specifications: '직경8mm, 2날, 초경',
    unitPrice: 980000,
    supplier: 'B-SUPPLIER',
    standardLife: 1750,
    description: 'T홈 가공용 소형'
  },
  {
    code: 'AT025',
    name: 'BALL 10mm 2날',
    category: 'BALL',
    specifications: '직경10mm, 2날, 코팅DLC',
    unitPrice: 1180000,
    supplier: 'C-TOOLS',
    standardLife: 2400,
    description: '볼엔드밀 대형'
  },
  {
    code: 'AT028',
    name: 'C-CUT 10mm',
    category: 'C-CUT',
    specifications: '직경10mm, 챔퍼밀, 초경',
    unitPrice: 1290000,
    supplier: 'C-TOOLS',
    standardLife: 2600,
    description: '챔퍼 가공용 대형'
  },
  {
    code: 'AT030',
    name: 'REAMER 8mm',
    category: 'REAMER',
    specifications: '직경8mm, 리머, HSS-E',
    unitPrice: 720000,
    supplier: 'D-COMPANY',
    standardLife: 3500,
    description: '리머 중형'
  },
  {
    code: 'AT035',
    name: 'REAMER 12mm',
    category: 'REAMER',
    specifications: '직경12mm, 리머, HSS',
    unitPrice: 980000,
    supplier: 'D-COMPANY',
    standardLife: 4000,
    description: '리머 대형'
  }
]

// 앤드밀 마스터 데이터 검색 함수
export const findEndmillByCode = (code: string): EndmillMaster | null => {
  return ENDMILL_MASTER_DATA.find(endmill => endmill.code === code) || null
}

export const searchEndmillsByName = (query: string): EndmillMaster[] => {
  const lowercaseQuery = query.toLowerCase()
  return ENDMILL_MASTER_DATA.filter(endmill => 
    endmill.name.toLowerCase().includes(lowercaseQuery) ||
    endmill.code.toLowerCase().includes(lowercaseQuery) ||
    endmill.specifications.toLowerCase().includes(lowercaseQuery)
  )
}

export const getEndmillsBySupplier = (supplier: string): EndmillMaster[] => {
  return ENDMILL_MASTER_DATA.filter(endmill => endmill.supplier === supplier)
}

export const getEndmillsByCategory = (category: string): EndmillMaster[] => {
  return ENDMILL_MASTER_DATA.filter(endmill => endmill.category === category)
}

export const getAllSuppliers = (): string[] => {
  return Array.from(new Set(ENDMILL_MASTER_DATA.map(endmill => endmill.supplier)))
}

export const getAllCategories = (): string[] => {
  return Array.from(new Set(ENDMILL_MASTER_DATA.map(endmill => endmill.category)))
}

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  CAM_SHEETS: 'camSheets',
  TOOL_CHANGES: 'toolChanges',
  EQUIPMENT: 'equipment',
  INVENTORY: 'inventory'
} as const

// 로컬 스토리지 관리 함수들
export class MockDataManager {
  // CAM Sheets 초기화
  static initializeCAMSheets(): void {
    if (typeof window === 'undefined') return
    
    const existing = localStorage.getItem(STORAGE_KEYS.CAM_SHEETS)
    if (!existing) {
      localStorage.setItem(STORAGE_KEYS.CAM_SHEETS, JSON.stringify(INITIAL_CAM_SHEETS))
      console.log('✅ CAM Sheets 초기 데이터가 로컬 스토리지에 저장되었습니다.')
    }
  }

  // 모든 데이터 초기화
  static resetAllData(): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(STORAGE_KEYS.CAM_SHEETS, JSON.stringify(INITIAL_CAM_SHEETS))
    localStorage.removeItem(STORAGE_KEYS.TOOL_CHANGES)
    localStorage.removeItem(STORAGE_KEYS.EQUIPMENT)
    localStorage.removeItem(STORAGE_KEYS.INVENTORY)
    
    console.log('🔄 모든 목업 데이터가 초기화되었습니다.')
  }

  // 데이터 내보내기 (JSON)
  static exportData(): string {
    if (typeof window === 'undefined') return '{}'
    
    const data = {
      camSheets: JSON.parse(localStorage.getItem(STORAGE_KEYS.CAM_SHEETS) || '[]'),
      toolChanges: JSON.parse(localStorage.getItem(STORAGE_KEYS.TOOL_CHANGES) || '[]'),
      equipment: JSON.parse(localStorage.getItem(STORAGE_KEYS.EQUIPMENT) || '[]'),
      inventory: JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY) || '[]'),
      exportedAt: new Date().toISOString()
    }
    
    return JSON.stringify(data, null, 2)
  }

  // 데이터 가져오기 (JSON)
  static importData(jsonData: string): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      const data = JSON.parse(jsonData)
      
      if (data.camSheets) {
        localStorage.setItem(STORAGE_KEYS.CAM_SHEETS, JSON.stringify(data.camSheets))
      }
      if (data.toolChanges) {
        localStorage.setItem(STORAGE_KEYS.TOOL_CHANGES, JSON.stringify(data.toolChanges))
      }
      if (data.equipment) {
        localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(data.equipment))
      }
      if (data.inventory) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(data.inventory))
      }
      
      console.log('✅ 데이터 가져오기가 완료되었습니다.')
      return true
    } catch (error) {
      console.error('❌ 데이터 가져오기 실패:', error)
      return false
    }
  }

  // 현재 데이터 상태 확인
  static getDataStats(): {
    camSheets: number
    toolChanges: number
    equipment: number
    inventory: number
  } {
    if (typeof window === 'undefined') {
      return { camSheets: 0, toolChanges: 0, equipment: 0, inventory: 0 }
    }
    
    return {
      camSheets: JSON.parse(localStorage.getItem(STORAGE_KEYS.CAM_SHEETS) || '[]').length,
      toolChanges: JSON.parse(localStorage.getItem(STORAGE_KEYS.TOOL_CHANGES) || '[]').length,
      equipment: JSON.parse(localStorage.getItem(STORAGE_KEYS.EQUIPMENT) || '[]').length,
      inventory: JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY) || '[]').length
    }
  }

  // 샘플 데이터 추가
  static addSampleCAMSheet(): void {
    if (typeof window === 'undefined') return
    
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.CAM_SHEETS) || '[]')
    const newSample: CAMSheet = {
      id: Date.now().toString(),
      model: `SAMPLE-${Math.floor(Math.random() * 1000)}`,
      process: ['CNC1', 'CNC2', 'CNC2-1'][Math.floor(Math.random() * 3)],
      camVersion: `v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`,
      versionDate: new Date().toISOString().split('T')[0],
      endmills: [
        {
          tNumber: Math.floor(Math.random() * 21) + 1,
          endmillCode: `AT${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
          endmillName: 'SAMPLE ENDMILL',
          specifications: 'Sample specifications',
          toolLife: Math.floor(Math.random() * 2000) + 1000
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    existing.push(newSample)
    localStorage.setItem(STORAGE_KEYS.CAM_SHEETS, JSON.stringify(existing))
    console.log('✅ 샘플 CAM Sheet가 추가되었습니다:', newSample.model)
  }
}

// 개발자 도구용 전역 함수들 (브라우저 콘솔에서 사용)
if (typeof window !== 'undefined') {
  (window as any).mockData = {
    init: MockDataManager.initializeCAMSheets,
    reset: MockDataManager.resetAllData,
    export: MockDataManager.exportData,
    import: MockDataManager.importData,
    stats: MockDataManager.getDataStats,
    addSample: MockDataManager.addSampleCAMSheet,
    
    // 빠른 접근용
    help: () => {
      console.log(`
🔧 Mock Data Manager 사용법:

mockData.init()        - CAM Sheets 초기 데이터 로드
mockData.reset()       - 모든 데이터 초기화
mockData.stats()       - 현재 데이터 통계 확인
mockData.addSample()   - 샘플 CAM Sheet 추가
mockData.export()      - 데이터 JSON 내보내기
mockData.import(json)  - 데이터 JSON 가져오기

예시:
> mockData.stats()
> mockData.addSample()
> console.log(mockData.export())
      `)
    }
  }
  
  // 페이지 로드 시 자동 초기화
  MockDataManager.initializeCAMSheets()
}

// 앤드밀 마스터 데이터 업데이트 함수
export const updateEndmillMasterData = (updatedData: {
  code: string
  name: string
  category: string
  specifications: string
  diameter: number
  flutes: number
  coating: string
  material: string
  tolerance: string
  helix: string
  standardLife: number
  minStock: number
  maxStock: number
  recommendedStock?: number
  qualityGrade?: string
  suppliers: { name: string; unitPrice: number }[]
  description?: string
}[]): { success: number; updated: number; errors: string[] } => {
  let success = 0
  let updated = 0
  const errors: string[] = []

  updatedData.forEach(newData => {
    try {
      const existingIndex = ENDMILL_MASTER_DATA.findIndex(item => item.code === newData.code)
      
      if (existingIndex >= 0) {
        // 기존 데이터 업데이트
        ENDMILL_MASTER_DATA[existingIndex] = {
          code: newData.code,
          name: newData.name,
          category: newData.category,
          specifications: newData.specifications,
          unitPrice: newData.suppliers.length > 0 ? newData.suppliers[0].unitPrice : ENDMILL_MASTER_DATA[existingIndex].unitPrice,
          supplier: newData.suppliers.length > 0 ? newData.suppliers[0].name : ENDMILL_MASTER_DATA[existingIndex].supplier,
          standardLife: newData.standardLife,
          description: newData.description
        }
        updated++
      } else {
        // 새 데이터 추가
        ENDMILL_MASTER_DATA.push({
          code: newData.code,
          name: newData.name,
          category: newData.category,
          specifications: newData.specifications,
          unitPrice: newData.suppliers.length > 0 ? newData.suppliers[0].unitPrice : 1000000,
          supplier: newData.suppliers.length > 0 ? newData.suppliers[0].name : 'A-TECH',
          standardLife: newData.standardLife,
          description: newData.description
        })
        success++
      }
    } catch (error) {
      errors.push(`${newData.code}: 업데이트 중 오류 발생`)
    }
  })

  return { success, updated, errors }
}

// 확장된 앤드밀 상세 정보 생성 함수
export const generateEndmillDetailInfo = (code: string): EndmillDetailInfo | null => {
  const baseEndmill = findEndmillByCode(code)
  if (!baseEndmill) return null

  // 공급업체별 정보 생성
  const suppliers: EndmillSupplierInfo[] = getAllSuppliers().slice(0, 3).map(supplier => {
    const basePrice = baseEndmill.unitPrice
    const priceVariation = Math.floor(Math.random() * 200000) - 100000 // ±100,000 VND
    const currentStock = Math.floor(Math.random() * 100) + 10

    return {
      supplierName: supplier,
      unitPrice: Math.max(500000, basePrice + priceVariation),
      currentStock,
      minOrderQuantity: Math.floor(Math.random() * 50) + 10,
      leadTime: Math.floor(Math.random() * 14) + 3, // 3-17일
      stockStatus: currentStock < 20 ? 'critical' : currentStock < 50 ? 'low' : 'sufficient',
      lastOrderDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      averageDeliveryTime: Math.floor(Math.random() * 7) + 3, // 3-10일
      qualityRating: 3 + Math.random() * 2, // 3-5점
      isPreferred: supplier === 'A-TECH' // A-TECH를 기본 선호 공급업체로 설정
    }
  })

  // 설비 사용 현황 생성 (5-10개 설비에서 사용 중)
  const equipmentUsage: EndmillEquipmentUsage[] = []
  const usageCount = Math.floor(Math.random() * 6) + 5 // 5-10개
  
  for (let i = 0; i < usageCount; i++) {
    const equipmentNum = Math.floor(Math.random() * 800) + 1
    const tNum = Math.floor(Math.random() * 21) + 1
    const totalLife = baseEndmill.standardLife
    const currentLife = Math.floor(Math.random() * totalLife)
    
    let usageStatus: 'new' | 'active' | 'warning' | 'critical'
    const lifePercentage = (currentLife / totalLife) * 100
    if (lifePercentage < 10) usageStatus = 'critical'
    else if (lifePercentage < 30) usageStatus = 'warning'
    else if (currentLife === 0) usageStatus = 'new'
    else usageStatus = 'active'

    equipmentUsage.push({
      equipmentNumber: `C${equipmentNum.toString().padStart(3, '0')}`,
      process: ['CNC1', 'CNC2', 'CNC2-1'][Math.floor(Math.random() * 3)],
      tNumber: tNum,
      installDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currentLife,
      totalLife,
      usageStatus,
      lastMaintenanceDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
  }

  // 최근 교체 이력 생성 (최근 3개월)
  const recentChanges: EndmillChangeHistory[] = []
  const changeCount = Math.floor(Math.random() * 8) + 3 // 3-10개
  
  for (let i = 0; i < changeCount; i++) {
    const changeDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
    const equipmentNum = Math.floor(Math.random() * 800) + 1
    const reasons = ['Tool Life 종료', '파손', '마모', '모델 변경', '예방']
    
    recentChanges.push({
      id: `change_${Date.now()}_${i}`,
      changeDate: changeDate.toISOString().split('T')[0],
      equipmentNumber: `C${equipmentNum.toString().padStart(3, '0')}`,
      tNumber: Math.floor(Math.random() * 21) + 1,
      changeReason: reasons[Math.floor(Math.random() * reasons.length)],
      previousLife: Math.floor(Math.random() * baseEndmill.standardLife),
      changedBy: ['김관리', '이기사', '박정비', '최운영'][Math.floor(Math.random() * 4)],
      notes: Math.random() > 0.7 ? '정상 교체' : undefined
    })
  }

  // 사용 통계 계산
  const totalUsageCount = recentChanges.length + Math.floor(Math.random() * 50)
  const averageLifespan = Math.floor(baseEndmill.standardLife * (0.8 + Math.random() * 0.4)) // 80-120% 범위
  const currentStockTotal = suppliers.reduce((sum, s) => sum + s.currentStock, 0)
  const minStockTotal = Math.floor(currentStockTotal * 0.3) // 최소재고는 현재고의 30%

  // 성능 지표 계산
  const performanceRating = Math.floor(70 + Math.random() * 30) // 70-100점
  const defectRate = Math.random() * 5 // 0-5%
  const costEfficiency = Math.floor(60 + Math.random() * 40) // 60-100점
  const qualityGrade = performanceRating >= 90 ? 'A+' : 
                      performanceRating >= 80 ? 'A' : 
                      performanceRating >= 70 ? 'B+' : 
                      performanceRating >= 60 ? 'B' : 'C'

  return {
    // 기본 정보 상속
    ...baseEndmill,
    
    // 재고 관리 정보
    currentStock: currentStockTotal,
    minStock: minStockTotal,
    maxStock: Math.floor(currentStockTotal * 2), // 최대재고는 현재고의 2배
    stockStatus: currentStockTotal < minStockTotal ? 'critical' : 
                currentStockTotal < minStockTotal * 1.5 ? 'low' : 'sufficient',
    
    // 기술 사양 상세
    diameter: parseInt(baseEndmill.specifications.match(/(\d+)mm/)?.[1] || '12'),
    flutes: parseInt(baseEndmill.specifications.match(/(\d+)날/)?.[1] || '4'),
    coating: baseEndmill.specifications.includes('TiN') ? 'TiN' : 
             baseEndmill.specifications.includes('TiAlN') ? 'TiAlN' : 'None',
    material: 'HSS', // High Speed Steel
    tolerance: 'h6',
    helix: '30°',
    
    // 사용 이력 및 성능
    totalUsageCount,
    averageLifespan,
    lastUsedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    replacementFrequency: Math.round((recentChanges.length / 3) * 10) / 10, // 월 평균
    
    // 품질 및 성능 지표
    qualityGrade,
    defectRate: Math.round(defectRate * 100) / 100,
    performanceRating,
    costEfficiency,
    
    // 관련 정보
    suppliers,
    equipmentUsage,
    recentChanges: recentChanges.sort((a, b) => b.changeDate.localeCompare(a.changeDate)),
    
    // 예측 정보
    predictedNextChange: new Date(Date.now() + (averageLifespan * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
    recommendedStock: Math.ceil(minStockTotal * 1.2), // 최소재고의 120%
    
    // 메타 정보
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
    tags: [baseEndmill.category, `${Math.floor(Math.random() * 10) + 1}개월`, performanceRating >= 80 ? '고성능' : '표준']
  }
} 