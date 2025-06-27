import { CAMSheet, EndmillInfo } from '../hooks/useCAMSheets'

// 초기 목업 데이터
export const INITIAL_CAM_SHEETS: CAMSheet[] = [
  {
    id: '1',
    model: 'PA-001',
    process: '2공정',
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
    process: '1공정',
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
    process: '2-1공정',
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
    process: '2공정',
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
    process: '1공정',
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
      process: ['1공정', '2공정', '2-1공정'][Math.floor(Math.random() * 3)],
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