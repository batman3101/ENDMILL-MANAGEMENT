# 권장사항 구현 가이드

이 문서는 시스템 점검 후 제안된 3가지 권장사항의 구현 방법을 설명합니다.

## 📋 목차
1. [시스템 설정 관리 UI](#1-시스템-설정-관리-ui)
2. [실시간 알림 시스템](#2-실시간-알림-시스템)
3. [데이터 백업 및 모니터링](#3-데이터-백업-및-모니터링)

---

## 1. 시스템 설정 관리 UI

### 1.1 구현된 기능

✅ **시스템 설정 페이지**: `/dashboard/settings/system`
- system_admin 권한자만 접근 가능
- 실시간 설정 값 조회 및 수정
- 숫자, 문자열, 불리언 타입 지원
- 변경 이력 자동 기록

### 1.2 사용 방법

#### 페이지 접속
```
URL: http://localhost:3000/dashboard/settings/system
권한: system_admin만 접근 가능
```

#### 설정 값 수정
1. 시스템 설정 페이지 접속
2. 수정할 설정 행의 "수정" 버튼 클릭
3. 값 수정
4. "저장" 버튼 클릭

#### 현재 관리 가능한 설정

| 카테고리 | 키 | 설명 | 기본값 |
|---------|-----|------|--------|
| dashboard | daily_change_target | 일일 공구 교체 실적 목표 | 130 |

### 1.3 새 설정 추가 방법

#### 방법 1: SQL을 통한 추가
```sql
INSERT INTO system_settings (category, key, value, description)
VALUES (
  'dashboard',              -- 카테고리
  'monthly_cost_target',    -- 키
  '50000000',              -- 값 (JSON 형식)
  '월간 공구 비용 목표 (원)'  -- 설명
);
```

#### 방법 2: Supabase MCP를 통한 추가
```typescript
await supabase
  .from('system_settings')
  .insert({
    category: 'equipment',
    key: 'maintenance_interval_days',
    value: 90,
    description: '설비 정기 점검 주기 (일)'
  })
```

### 1.4 프로그래밍 방식으로 설정 사용

```typescript
// API에서 설정 값 조회
const { data: setting } = await supabase
  .from('system_settings')
  .select('value')
  .eq('category', 'dashboard')
  .eq('key', 'daily_change_target')
  .single()

const dailyTarget = setting?.value || 130
```

---

## 2. 실시간 알림 시스템

### 2.1 구현된 기능

✅ **알림 API**: `/api/notifications`
- GET: 알림 목록 조회 (필터링 지원)
- POST: 새 알림 생성
- PUT: 알림 읽음 처리
- DELETE: 알림 삭제

✅ **알림 헬퍼 함수**: `lib/utils/notificationHelper.ts`
- 재고 부족 알림
- 공구 교체 필요 알림
- 설비 상태 변경 알림
- 설비 점검 필요 알림
- 시스템 알림

✅ **React Hook**: `lib/hooks/useNotifications.ts`
- 실시간 알림 구독
- 읽음 처리
- 삭제 기능

### 2.2 사용 방법

#### 프론트엔드에서 알림 사용

```typescript
import { useNotifications } from '@/lib/hooks/useNotifications'

function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications()

  return (
    <div>
      <button>
        🔔 {unreadCount > 0 && <span>{unreadCount}</span>}
      </button>

      <ul>
        {notifications.map(notification => (
          <li key={notification.id}>
            <p>{notification.title}</p>
            <p>{notification.message}</p>
            {!notification.is_read && (
              <button onClick={() => markAsRead(notification.id)}>
                읽음 처리
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

#### 백엔드에서 알림 생성

```typescript
import {
  notifyLowInventory,
  notifyToolChangeRequired,
  notifyEquipmentStatusChange
} from '@/lib/utils/notificationHelper'

// 재고 부족 알림
await notifyLowInventory('EFR-001', 5, 10)

// 공구 교체 필요 알림
await notifyToolChangeRequired(1, 5, 50)

// 설비 상태 변경 알림
await notifyEquipmentStatusChange(1, '가동중', '점검중')
```

### 2.3 자동 알림 트리거 설정

#### 재고 부족 시 자동 알림 (inventory API 수정)

```typescript
// app/api/inventory/route.ts
import { notifyLowInventory } from '@/lib/utils/notificationHelper'

// PUT 요청 처리 후
if (updatedItem.current_stock < updatedItem.min_stock) {
  await notifyLowInventory(
    endmillCode,
    updatedItem.current_stock,
    updatedItem.min_stock
  )
}
```

#### 공구 수명 임박 시 자동 알림 (tool_positions 업데이트 시)

```typescript
// app/api/tool-changes/route.ts
import { notifyToolChangeRequired } from '@/lib/utils/notificationHelper'

// tool_positions 업데이트 후
if (currentLife < totalLife * 0.1) {  // 수명 10% 미만
  await notifyToolChangeRequired(
    equipmentNumber,
    tNumber,
    currentLife
  )
}
```

---

## 3. 데이터 백업 및 모니터링

### 3.1 구현된 기능

✅ **자동 백업 스크립트**: `scripts/backup-supabase.ps1`
- 일일 자동 백업
- 압축 저장
- 30일 이상 된 백업 자동 삭제
- 백업 로그 기록

✅ **모니터링 API**: `/api/monitoring/health`
- 데이터베이스 연결 상태
- 주요 테이블 레코드 수
- 최근 활동 통계
- 재고 경고
- 수명 임박 공구 확인

✅ **백업/모니터링 가이드**: `docs/BACKUP_AND_MONITORING.md`

### 3.2 백업 설정

#### 자동 백업 스케줄 등록 (Windows)

**PowerShell 관리자 권한으로 실행:**

```powershell
# 작업 스케줄러에 등록
$scriptPath = "C:\Work Drive\APP\ENDMILL MANAGEMENT\scripts\backup-supabase.ps1"

$action = New-ScheduledTaskAction `
  -Execute "PowerShell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger `
  -Daily `
  -At 2am

$principal = New-ScheduledTaskPrincipal `
  -UserId "SYSTEM" `
  -LogonType ServiceAccount `
  -RunLevel Highest

Register-ScheduledTask `
  -TaskName "SupabaseBackup" `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Description "Daily Supabase database backup for CNC Endmill Management System"
```

#### 수동 백업 실행

```powershell
# PowerShell에서 실행
cd "C:\Work Drive\APP\ENDMILL MANAGEMENT"
.\scripts\backup-supabase.ps1
```

#### 백업 확인

```powershell
# 백업 파일 목록 확인
ls "C:\Work Drive\APP\ENDMILL MANAGEMENT\backups" | Sort-Object LastWriteTime -Descending

# 백업 로그 확인
Get-Content "C:\Work Drive\APP\ENDMILL MANAGEMENT\backups\backup_log.txt" -Tail 50
```

### 3.3 모니터링 설정

#### Health Check API 사용

```bash
# curl로 확인
curl http://localhost:3000/api/monitoring/health

# 응답 예시
{
  "status": "healthy",
  "database": {
    "connected": true,
    "responseTime": "45ms",
    "tables": {
      "equipment": 25,
      "tool_changes": 1543,
      "inventory": 45,
      "endmill_types": 120,
      "user_profiles": 15
    }
  },
  "recentActivity": {
    "toolChanges24h": 23,
    "inventoryTransactions7d": 12,
    "unreadNotifications": 3
  },
  "warnings": {
    "lowInventory": [
      {
        "code": "EFR-001",
        "name": "Flat Radius R1.0",
        "currentStock": 5,
        "minStock": 10
      }
    ],
    "criticalTools": [
      {
        "equipment": "C001",
        "position": 5,
        "currentLife": 50,
        "totalLife": 800,
        "percentage": 6
      }
    ]
  },
  "timestamp": "2025-10-13T10:30:00.000Z"
}
```

#### 프론트엔드에 Health 위젯 추가

```typescript
// components/monitoring/HealthWidget.tsx
import { useState, useEffect } from 'react'

export function HealthWidget() {
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    const checkHealth = async () => {
      const res = await fetch('/api/monitoring/health')
      const data = await res.json()
      setHealth(data)
    }

    checkHealth()
    const interval = setInterval(checkHealth, 60000) // 1분마다 체크

    return () => clearInterval(interval)
  }, [])

  if (!health) return null

  return (
    <div className={`p-4 rounded-lg ${
      health.status === 'healthy' ? 'bg-green-50' :
      health.status === 'warning' ? 'bg-yellow-50' :
      'bg-red-50'
    }`}>
      <h3 className="font-semibold">시스템 상태: {
        health.status === 'healthy' ? '정상' :
        health.status === 'warning' ? '주의' :
        '오류'
      }</h3>

      <div className="mt-2 text-sm">
        <p>데이터베이스: {health.database.connected ? '연결됨' : '오류'}</p>
        <p>응답 시간: {health.database.responseTime}</p>
        <p>24시간 교체: {health.recentActivity.toolChanges24h}건</p>
      </div>

      {health.warnings.lowInventory.length > 0 && (
        <div className="mt-2 text-sm text-yellow-800">
          ⚠️ 재고 부족: {health.warnings.lowInventory.length}개 항목
        </div>
      )}
    </div>
  )
}
```

### 3.4 정기 점검 체크리스트

#### 일일 점검 (자동화 권장)
- [ ] 백업 파일 생성 확인
- [ ] Health Check API 상태 확인
- [ ] 재고 경고 확인
- [ ] 수명 임박 공구 확인

#### 주간 점검
- [ ] 백업 파일 복구 테스트
- [ ] 디스크 사용량 확인
- [ ] 알림 발송 내역 확인

#### 월간 점검
- [ ] 전체 백업 및 복구 테스트
- [ ] 성능 지표 검토
- [ ] 오래된 로그 정리

---

## 4. 적용 순서

### 단계 1: 시스템 설정 관리 (5분)

1. 시스템 설정 페이지 접속 확인
   ```
   http://localhost:3000/dashboard/settings/system
   ```

2. 대시보드에서 동작 확인
   - 일일 교체 목표가 system_settings에서 조회되는지 확인
   - 설정 값 변경 후 대시보드 새로고침

### 단계 2: 실시간 알림 시스템 (10분)

1. 레이아웃에 알림 아이콘 추가
   ```typescript
   // app/dashboard/layout.tsx에 추가
   import { useNotifications } from '@/lib/hooks/useNotifications'

   const { unreadCount } = useNotifications()
   ```

2. 알림 생성 테스트
   ```typescript
   // 재고 API에서 자동 알림 테스트
   // 재고를 최소값 이하로 설정하여 알림 발생 확인
   ```

### 단계 3: 백업 및 모니터링 (15분)

1. 백업 스크립트 실행 테스트
   ```powershell
   .\scripts\backup-supabase.ps1
   ```

2. 작업 스케줄러 등록
   ```powershell
   # 위의 스케줄러 등록 명령 실행
   ```

3. Health Check API 확인
   ```bash
   curl http://localhost:3000/api/monitoring/health
   ```

---

## 5. 문제 해결

### 시스템 설정 페이지 접근 불가
- **원인**: system_admin 권한 부족
- **해결**: 사용자 role을 system_admin으로 변경
  ```sql
  UPDATE user_profiles
  SET role_id = (SELECT id FROM user_roles WHERE type = 'system_admin')
  WHERE employee_id = '현재사용자ID';
  ```

### 알림이 생성되지 않음
- **원인**: notifications 테이블 권한 문제
- **해결**: RLS 정책 확인
  ```sql
  -- Supabase Dashboard > Authentication > Policies
  -- notifications 테이블에 INSERT 정책이 있는지 확인
  ```

### 백업 스크립트 실행 오류
- **원인**: Supabase CLI 미설치
- **해결**:
  ```bash
  npm install -g supabase
  supabase login
  supabase link --project-ref npprskxlqbgmbksrnpnr
  ```

---

## 6. 다음 단계

### 향후 개선 사항

1. **대시보드에 시스템 상태 위젯 추가**
   - Health Check API 연동
   - 실시간 상태 표시

2. **이메일 알림 추가**
   - SendGrid 또는 Resend 연동
   - 중요 알림 이메일 발송

3. **백업 자동 복구 테스트**
   - CI/CD 파이프라인에 복구 테스트 추가
   - 월 1회 자동 복구 테스트

4. **모니터링 대시보드**
   - Grafana 연동
   - 실시간 메트릭 시각화

---

**작성일**: 2025-10-13
**버전**: 1.0.0
