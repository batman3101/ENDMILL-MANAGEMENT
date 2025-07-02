# 🗄️ 목업 데이터 시스템 가이드

## 📋 개요

Supabase 연결 전까지 프로젝트에서 사용할 수 있는 완전한 목업 데이터 시스템입니다. 
실제 데이터베이스 스키마와 일치하는 구조로 설계되어 원활한 마이그레이션이 가능합니다.

## 🏗️ 시스템 구조

### 📁 파일 구조
```
lib/data/
├── fileDataManager.ts      # 메인 데이터 매니저
├── mock/                   # JSON 데이터 파일들
│   ├── equipment.json      # 설비 데이터
│   ├── endmill.json       # 앤드밀 마스터 데이터  
│   ├── camSheets.json     # CAM Sheet 데이터
│   ├── inventory.json     # 재고 데이터
│   ├── toolChanges.json   # 교체 이력 데이터
│   └── users.json         # 사용자 데이터
└── mockData.ts            # 기존 시스템 (교체됨)
```

### 🔧 데이터 매니저 (FileDataManager)

#### 주요 기능
- **JSON 파일 기반 데이터 관리**
- **로컬 스토리지 연동**
- **타입 안전성 보장**
- **데이터 검증 및 무결성 체크**
- **Import/Export 기능**

#### 데이터 흐름
```
JSON 파일 → FileDataManager → Local Storage → React Hook → Component
```

## 📊 데이터 모델

### 1. 설비 (Equipment)
```typescript
interface Equipment {
  id: string
  equipmentNumber: string      // C001, C002...
  location: 'A동' | 'B동'
  status: '가동중' | '점검중' | '셋업중'
  currentModel: string         // PA1, PA2, PS...
  process: string             // CNC1, CNC2, CNC2-1...
  toolPositions: {
    used: number              // 사용 중인 툴 수
    total: number             // 전체 툴 수 (기본 21)
  }
  lastMaintenance: string      // YYYY-MM-DD
}
```

### 2. 앤드밀 마스터 (EndmillMaster)
```typescript
interface EndmillMaster {
  code: string                 // AT001, AT002...
  name: string                // "FLAT 6mm 4날"
  category: string            // FLAT, BALL, T-CUT...
  specifications: string      // 상세 스펙
  diameter: number            // 직경 (mm)
  flutes: number             // 날 수
  coating: string            // 코팅 (TiAlN, TiCN...)
  material: string           // 재질 (카바이드...)
  tolerance: string          // 공차 (±0.01mm)
  helix: string             // 나선각 (30°)
  standardLife: number       // 표준 수명 (분)
  unitPrice: number          // 단가 (원)
  minStock: number           // 최소 재고
  maxStock: number           // 최대 재고
  recommendedStock: number   // 권장 재고
  qualityGrade: string       // 품질 등급 (A, B, C)
  suppliers: Supplier[]      // 공급업체 목록
}
```

### 3. 재고 (Inventory)
```typescript
interface Inventory {
  id: string
  endmillCode: string         // 앤드밀 코드 (FK)
  currentStock: number        // 현재 재고
  minStock: number           // 최소 재고
  maxStock: number           // 최대 재고
  status: 'sufficient' | 'low' | 'critical'  // 재고 상태
  location: string           // 보관 위치 (A-001...)
  lastUpdated: string        // 마지막 업데이트
  suppliers: Supplier[]      // 공급업체별 재고
}
```

### 4. CAM Sheet
```typescript
interface CAMSheet {
  id: string
  model: string              // 제품 모델 (PA1, PA2...)
  process: string            // 공정 (CNC1, CNC2...)
  camVersion: string         // CAM 버전
  versionDate: string        // 버전 날짜
  endmills: EndmillInfo[]    // T번호별 앤드밀 정보
  createdAt: string
  updatedAt: string
}

interface EndmillInfo {
  tNumber: number            // T번호 (1-21)
  endmillCode: string        // 앤드밀 코드
  endmillName: string        // 앤드밀 이름
  specifications: string     // 스펙
  toolLife: number          // 공구 수명 (분)
}
```

### 5. 교체 이력 (ToolChange)
```typescript
interface ToolChange {
  id: string
  changeDate: string         // 교체 날짜
  equipmentNumber: string    // 설비 번호
  productionModel: string    // 생산 모델
  process: string           // 공정
  tNumber: number           // T번호
  endmillCode: string       // 앤드밀 코드
  endmillName: string       // 앤드밀 이름
  changedBy: string         // 교체자
  changeReason: string      // 교체 사유
  toolLife: number          // 사용 수명
  createdAt: string
}
```

## 🔄 Hook 시스템

### 1. useEquipment
```typescript
const {
  equipments,                // 설비 목록
  loading,                   // 로딩 상태
  error,                    // 에러 상태
  createEquipment,          // 설비 생성
  updateEquipment,          // 설비 업데이트
  deleteEquipment,          // 설비 삭제
  getFilteredEquipments,    // 필터링된 설비 조회
  getEquipmentStats,        // 설비 통계
  getAvailableModels,       // 사용 가능한 모델 목록
  getAvailableProcesses,    // 사용 가능한 공정 목록
  generateEquipments        // 대량 설비 생성 (개발용)
} = useEquipment()
```

### 2. useInventory
```typescript
const {
  inventory,                // 재고 목록
  endmillMaster,           // 앤드밀 마스터 데이터
  loading,                 // 로딩 상태
  error,                   // 에러 상태
  createInventory,         // 재고 생성
  updateInventory,         // 재고 업데이트
  deleteInventory,         // 재고 삭제
  getEnrichedInventory,    // 앤드밀 정보 포함 재고 조회
  getFilteredInventory,    // 필터링된 재고 조회
  getInventoryStats,       // 재고 통계
  getAvailableCategories   // 사용 가능한 카테고리 목록
} = useInventory()
```

### 3. useCAMSheets
```typescript
const {
  camSheets,               // CAM Sheet 목록
  loading,                 // 로딩 상태
  error,                   // 에러 상태
  createCAMSheet,          // CAM Sheet 생성
  updateCAMSheet,          // CAM Sheet 업데이트
  deleteCAMSheet,          // CAM Sheet 삭제
  getFilteredCAMSheets,    // 필터링된 CAM Sheet 조회
  getAvailableModels,      // 사용 가능한 모델 목록
  getAvailableProcesses    // 사용 가능한 공정 목록
} = useCAMSheets()
```

## 🛠️ 개발 도구

### MockDataManager 컴포넌트
개발 모드에서 목업 데이터를 관리할 수 있는 관리자 도구

#### 주요 기능
- **데이터 통계 확인**
- **800대 설비 데이터 자동 생성**
- **데이터 Import/Export**
- **전체 데이터 초기화**
- **실시간 통계 업데이트**

#### 사용법
```typescript
import DevMockDataManager from '@/components/dev/MockDataManager'

// 개발 페이지에서 사용
<DevMockDataManager />
```

## 📈 데이터 초기화

### 자동 초기화
- 최초 실행 시 JSON 파일에서 자동으로 데이터 로드
- 설비 데이터가 없으면 800대 자동 생성
- 모든 데이터는 로컬 스토리지에 저장

### 수동 초기화
```typescript
// 특정 데이터 타입 초기화
FileDataManager.resetEquipments()
FileDataManager.resetInventory()
FileDataManager.resetCAMSheets()

// 전체 데이터 초기화
FileDataManager.resetAllData()
```

## 🔧 API 엔드포인트

### Equipment API (`/api/equipment`)
- `GET` - 설비 목록 조회 (필터링 지원)
- `POST` - 새 설비 생성
- `PUT` - 설비 업데이트

### Inventory API (`/api/inventory`)
- `GET` - 재고 목록 조회 (필터링 지원)
- `POST` - 새 재고 항목 생성
- `PUT` - 재고 업데이트

## 🌐 Supabase 마이그레이션 준비

### 데이터 구조 호환성
- 모든 데이터 모델이 실제 데이터베이스 스키마와 일치
- 타입 정의가 데이터베이스 타입과 호환
- API 엔드포인트 구조가 실제 API와 동일

### 마이그레이션 단계
1. **Supabase 테이블 생성**
2. **목업 데이터 Export**
3. **Supabase로 데이터 Import**
4. **Hook을 React Query로 변경**
5. **API 엔드포인트 Supabase 연결**

### 변경 최소화 설계
- 컴포넌트 코드 변경 없이 Hook만 교체
- API 엔드포인트 구조 유지
- 타입 정의 재사용

## 🎯 최적화 및 성능

### 로컬 스토리지 최적화
- 대용량 데이터 효율적 저장
- 지연 로딩 및 캐싱
- 메모리 사용량 최적화

### 타입 안전성
- 전체 시스템에서 TypeScript 완전 지원
- 런타임 타임 검증
- 컴파일 타임 에러 방지

## 🔍 디버깅 및 모니터링

### 개발 도구
```typescript
// 브라우저 콘솔에서 사용 가능
FileDataManager.getDataStats()    // 전체 통계
FileDataManager.exportData()      // 데이터 Export
FileDataManager.validateData()    // 데이터 검증
```

### 로그 시스템
- 모든 데이터 변경 사항 로깅
- 에러 추적 및 디버깅 지원
- 성능 모니터링

## 📋 체크리스트

### 개발 단계
- [x] JSON 데이터 파일 생성
- [x] FileDataManager 구현
- [x] Hook 시스템 구축
- [x] API 엔드포인트 연결
- [x] 개발 도구 구현
- [x] 타입 안전성 확보

### 마이그레이션 준비
- [x] 데이터 구조 호환성 확인
- [x] Export/Import 기능 구현
- [ ] Supabase 스키마 생성
- [ ] React Query 연결
- [ ] 실제 API 연결

## 🚀 향후 계획

1. **실시간 동기화** - WebSocket 기반 실시간 데이터 동기화
2. **오프라인 지원** - 오프라인 상태에서도 데이터 관리
3. **버전 관리** - 데이터 변경 이력 추적
4. **백업 시스템** - 자동 백업 및 복구 기능
5. **성능 최적화** - 대용량 데이터 처리 최적화 