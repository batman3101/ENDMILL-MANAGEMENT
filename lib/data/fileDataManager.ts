// 파일 기반 목업 데이터 매니저
import equipmentData from './mock/equipment.json'
import endmillData from './mock/endmill.json'
import camSheetsData from './mock/camSheets.json'
import inventoryData from './mock/inventory.json'
import toolChangesData from './mock/toolChanges.json'
import usersData from './mock/users.json'

// 타입 정의
export interface Equipment {
  id: string
  equipmentNumber: string
  location: 'A동' | 'B동'
  status: '가동중' | '점검중' | '셋업중'
  currentModel: string
  process: string
  toolPositions: {
    used: number
    total: number
  }
  lastMaintenance: string
}

export interface EndmillMaster {
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
  unitPrice: number
  minStock: number
  maxStock: number
  recommendedStock: number
  qualityGrade: string
  suppliers: {
    name: string
    unitPrice: number
    currentStock: number
    minOrderQuantity: number
    leadTime: number
    qualityRating: number
    isPreferred: boolean
  }[]
  description: string
  tags: string[]
}

export interface CAMSheet {
  id: string
  model: string
  process: string
  camVersion: string
  versionDate: string
  endmills: {
    tNumber: number
    endmillCode: string
    endmillName: string
    specifications: string
    toolLife: number
  }[]
  createdAt: string
  updatedAt: string
}

export interface InventoryItem {
  id: string
  endmillCode: string
  currentStock: number
  minStock: number
  maxStock: number
  status: 'sufficient' | 'low' | 'critical'
  location: string
  lastUpdated: string
  suppliers: {
    name: string
    unitPrice: number
    currentStock: number
    status: string
  }[]
}

export interface ToolChange {
  id: string
  changeDate: string
  equipmentNumber: string
  productionModel: string
  process: string
  tNumber: number
  endmillCode: string
  endmillName: string
  changedBy: string
  changeReason: string
  toolLife: number
  createdAt: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'operator'
  shift: 'A' | 'B' | 'C'
  department: string
  isActive: boolean
  createdAt: string
  lastLogin: string
}

// 로컬 스토리지 키
const STORAGE_KEYS = {
  equipments: 'mockdata_equipments',
  endmills: 'mockdata_endmills', 
  camSheets: 'mockdata_camSheets',
  inventory: 'mockdata_inventory',
  toolChanges: 'mockdata_toolChanges',
  users: 'mockdata_users'
} as const

// 파일 데이터 매니저 클래스
export class FileDataManager {
  // 초기화 - 로컬 스토리지가 비어있으면 JSON 파일 데이터로 초기화
  static initialize(): void {
    if (typeof window === 'undefined') return // SSR 체크

    if (!localStorage.getItem(STORAGE_KEYS.equipments)) {
      localStorage.setItem(STORAGE_KEYS.equipments, JSON.stringify(equipmentData.equipments))
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.endmills)) {
      localStorage.setItem(STORAGE_KEYS.endmills, JSON.stringify(endmillData.endmillMaster))
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.camSheets)) {
      localStorage.setItem(STORAGE_KEYS.camSheets, JSON.stringify(camSheetsData.camSheets))
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.inventory)) {
      localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventoryData.inventory))
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.toolChanges)) {
      localStorage.setItem(STORAGE_KEYS.toolChanges, JSON.stringify(toolChangesData.toolChanges))
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.users)) {
      localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(usersData.users))
    }
  }

  // 설비 데이터 관리
  static getEquipments(): Equipment[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEYS.equipments)
    return stored ? JSON.parse(stored) : []
  }

  static saveEquipments(equipments: Equipment[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.equipments, JSON.stringify(equipments))
  }

  static generateEquipments(count: number = 800): Equipment[] {
    const equipments: Equipment[] = []
    const models = equipmentData.models
    const processes = equipmentData.processes
    const locations = equipmentData.locations
    const statuses = equipmentData.statuses as Equipment['status'][]

    for (let i = 1; i <= count; i++) {
      const equipmentNumber = `C${i.toString().padStart(3, '0')}`
      const location = i <= 400 ? 'A동' : 'B동'
      const currentModel = models[Math.floor(Math.random() * models.length)]
      const process = processes[Math.floor(Math.random() * processes.length)]
      
      // 상태 분포: 가동중 70%, 점검중 20%, 셋업중 10%
      let status: Equipment['status']
      const rand = Math.random()
      if (rand < 0.7) status = '가동중'
      else if (rand < 0.9) status = '점검중'
      else status = '셋업중'
      
      const used = status === '점검중' ? 0 : Math.floor(Math.random() * 7) + 15
      
      const lastMaintenanceDate = new Date()
      lastMaintenanceDate.setDate(lastMaintenanceDate.getDate() - Math.floor(Math.random() * 30))

      equipments.push({
        id: `eq-${i.toString().padStart(3, '0')}`,
        equipmentNumber,
        location,
        status,
        currentModel,
        process,
        toolPositions: { used, total: 21 },
        lastMaintenance: lastMaintenanceDate.toISOString().split('T')[0]
      })
    }

    this.saveEquipments(equipments)
    return equipments
  }

  // 앤드밀 마스터 데이터 관리
  static getEndmillMaster(): EndmillMaster[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEYS.endmills)
    return stored ? JSON.parse(stored) : []
  }

  static saveEndmillMaster(endmills: EndmillMaster[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.endmills, JSON.stringify(endmills))
  }

  // 앤드밀 마스터 데이터 업데이트 (엑셀 데이터용)
  static updateEndmillMasterFromExcel(excelData: any[]): { 
    success: number; 
    updated: number; 
    errors: string[] 
  } {
    const currentEndmills = this.getEndmillMaster()
    const result = { success: 0, updated: 0, errors: [] as string[] }

    excelData.forEach((row, index) => {
      try {
        const endmillCode = row['앤드밀코드']?.toString().trim()
        if (!endmillCode) {
          result.errors.push(`${index + 2}행: 앤드밀 코드가 필요합니다.`)
          return
        }

        // 공급업체 데이터 처리
        const suppliers: EndmillMaster['suppliers'] = []
        for (let i = 1; i <= 3; i++) {
          const supplierName = row[`공급업체${i}`]?.toString().trim()
          const supplierPrice = Number(row[`공급업체${i}단가`])
          
          if (supplierName && supplierPrice > 0) {
            suppliers.push({
              name: supplierName,
              unitPrice: supplierPrice,
              currentStock: Math.floor(Math.random() * 100) + 20, // 임시 재고량
              minOrderQuantity: 10,
              leadTime: 5 + Math.floor(Math.random() * 10),
              qualityRating: 4 + Math.random(),
              isPreferred: i === 1 // 첫 번째 공급업체를 우선업체로 설정
            })
          }
        }

        const endmillData: EndmillMaster = {
          code: endmillCode,
          name: row['Type']?.toString() || '',
          category: row['카테고리']?.toString() || 'FLAT',
          specifications: row['앤드밀이름']?.toString() || '',
          diameter: Number(row['직경(mm)']) || 0,
          flutes: Number(row['날수']) || 2,
          coating: row['코팅']?.toString() || 'TiAlN',
          material: row['소재']?.toString() || '카바이드',
          tolerance: row['공차']?.toString() || '±0.01mm',
          helix: row['나선각']?.toString() || '30°',
          standardLife: Number(row['표준수명']) || 2000,
          unitPrice: suppliers.length > 0 ? suppliers[0].unitPrice : 1000000,
          minStock: Number(row['최소재고']) || 10,
          maxStock: Number(row['최대재고']) || 100,
          recommendedStock: Number(row['권장재고']) || Number(row['최소재고']) * 2 || 20,
          qualityGrade: row['품질등급']?.toString() || 'A',
          suppliers,
          description: row['설명']?.toString() || '',
          tags: []
        }

        // 기존 데이터 확인 및 업데이트
        const existingIndex = currentEndmills.findIndex(e => e.code === endmillCode)
        if (existingIndex >= 0) {
          currentEndmills[existingIndex] = endmillData
          result.updated++
        } else {
          currentEndmills.push(endmillData)
          result.success++
        }

      } catch (error) {
        result.errors.push(`${index + 2}행: 데이터 처리 중 오류가 발생했습니다.`)
      }
    })

    // 업데이트된 데이터 저장
    this.saveEndmillMaster(currentEndmills)

    return result
  }

  // 앤드밀 마스터 데이터를 엑셀 형식으로 내보내기
  static exportEndmillMasterToExcel(): any[] {
    const endmills = this.getEndmillMaster()
    
    return endmills.map(endmill => {
      const exportData: any = {
        '앤드밀코드': endmill.code,
        'Type': endmill.name,
        '카테고리': endmill.category,
        '앤드밀이름': endmill.specifications,
        '직경(mm)': endmill.diameter,
        '날수': endmill.flutes,
        '코팅': endmill.coating,
        '소재': endmill.material,
        '공차': endmill.tolerance,
        '나선각': endmill.helix,
        '표준수명': endmill.standardLife,
        '최소재고': endmill.minStock,
        '최대재고': endmill.maxStock,
        '권장재고': endmill.recommendedStock,
        '품질등급': endmill.qualityGrade,
        '설명': endmill.description
      }

      // 공급업체 정보 추가 (최대 3개)
      endmill.suppliers.slice(0, 3).forEach((supplier, index) => {
        const num = index + 1
        exportData[`공급업체${num}`] = supplier.name
        exportData[`공급업체${num}단가`] = supplier.unitPrice
      })

      // 빈 공급업체 슬롯 채우기
      for (let i = endmill.suppliers.length + 1; i <= 3; i++) {
        exportData[`공급업체${i}`] = ''
        exportData[`공급업체${i}단가`] = ''
      }

      return exportData
    })
  }

  // CAM Sheet 데이터 관리
  static getCAMSheets(): CAMSheet[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEYS.camSheets)
    return stored ? JSON.parse(stored) : []
  }

  static saveCAMSheets(camSheets: CAMSheet[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.camSheets, JSON.stringify(camSheets))
  }

  // 재고 데이터 관리
  static getInventory(): InventoryItem[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEYS.inventory)
    return stored ? JSON.parse(stored) : []
  }

  static saveInventory(inventory: InventoryItem[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventory))
  }

  // 교체 이력 데이터 관리
  static getToolChanges(): ToolChange[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEYS.toolChanges)
    return stored ? JSON.parse(stored) : []
  }

  static saveToolChanges(toolChanges: ToolChange[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.toolChanges, JSON.stringify(toolChanges))
  }

  // 사용자 데이터 관리
  static getUsers(): User[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEYS.users)
    return stored ? JSON.parse(stored) : []
  }

  static saveUsers(users: User[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
  }

  // 데이터 리셋
  static resetAllData(): void {
    if (typeof window === 'undefined') return
    
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    
    this.initialize()
  }

  // 데이터 통계
  static getDataStats() {
    return {
      equipments: this.getEquipments().length,
      endmills: this.getEndmillMaster().length,
      camSheets: this.getCAMSheets().length,
      inventory: this.getInventory().length,
      toolChanges: this.getToolChanges().length,
      users: this.getUsers().length
    }
  }

  // 데이터 내보내기/가져오기
  static exportData(): string {
    const data = {
      equipments: this.getEquipments(),
      endmills: this.getEndmillMaster(),
      camSheets: this.getCAMSheets(),
      inventory: this.getInventory(),
      toolChanges: this.getToolChanges(),
      users: this.getUsers(),
      exportedAt: new Date().toISOString()
    }
    
    return JSON.stringify(data, null, 2)
  }

  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.equipments) this.saveEquipments(data.equipments)
      if (data.endmills) this.saveEndmillMaster(data.endmills)
      if (data.camSheets) this.saveCAMSheets(data.camSheets)
      if (data.inventory) this.saveInventory(data.inventory)
      if (data.toolChanges) this.saveToolChanges(data.toolChanges)
      if (data.users) this.saveUsers(data.users)
      
      return true
    } catch (error) {
      console.error('데이터 가져오기 실패:', error)
      return false
    }
  }

  // 참조 데이터 조회
  static getModels(): string[] {
    return equipmentData.models
  }

  static getProcesses(): string[] {
    return equipmentData.processes
  }

  static getCategories() {
    return endmillData.categories
  }

  static getSuppliers(): string[] {
    return endmillData.suppliers
  }

  static getChangeReasons(): string[] {
    return toolChangesData.changeReasons
  }

  static getOperators(): string[] {
    return toolChangesData.operators
  }

  static getRoles() {
    return usersData.roles
  }

  static getShifts(): string[] {
    return usersData.shifts
  }

  static getDepartments(): string[] {
    return usersData.departments
  }
}

// 브라우저 환경에서 초기화
if (typeof window !== 'undefined') {
  FileDataManager.initialize()
} 