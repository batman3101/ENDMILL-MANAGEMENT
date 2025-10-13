# 데이터 백업 및 모니터링 가이드

## 📋 목차
1. [Supabase 자동 백업 설정](#1-supabase-자동-백업-설정)
2. [수동 백업 방법](#2-수동-백업-방법)
3. [데이터 모니터링 설정](#3-데이터-모니터링-설정)
4. [복구 절차](#4-복구-절차)
5. [정기 점검 체크리스트](#5-정기-점검-체크리스트)

---

## 1. Supabase 자동 백업 설정

### 1.1 Point-in-Time Recovery (PITR) 활성화

Supabase Pro 플랜 이상에서 사용 가능한 PITR을 활성화하면 지난 7일 이내의 모든 시점으로 복구할 수 있습니다.

**설정 방법:**
```bash
# Supabase Dashboard에서 설정
1. Supabase Dashboard 접속 (https://supabase.com)
2. 프로젝트 선택
3. Settings > Database
4. Point-in-Time Recovery 섹션에서 Enable 클릭
```

**비용:**
- Pro 플랜: 월 $25 (7일 백업 보관)
- Enterprise 플랜: 30일 이상 백업 보관 가능

### 1.2 일일 자동 백업 (무료 플랜 포함)

무료 플랜에서도 Supabase는 매일 자동으로 데이터베이스를 백업합니다.

**백업 확인:**
```bash
# Supabase Dashboard
1. Settings > Database
2. Backups 탭 확인
3. 최근 7일간의 백업 목록 확인 가능
```

---

## 2. 수동 백업 방법

### 2.1 CLI를 통한 백업

```bash
# Supabase CLI 설치 (아직 설치하지 않았다면)
npm install -g supabase

# 로그인
supabase login

# 프로젝트와 연결
supabase link --project-ref npprskxlqbgmbksrnpnr

# 데이터베이스 덤프 생성
supabase db dump --data-only > backup_$(date +%Y%m%d_%H%M%S).sql

# 스키마 + 데이터 전체 백업
supabase db dump > full_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2.2 pg_dump를 통한 직접 백업

```bash
# 환경 변수 설정
export SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.npprskxlqbgmbksrnpnr.supabase.co:5432/postgres"

# 전체 백업
pg_dump $SUPABASE_DB_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 특정 테이블만 백업
pg_dump $SUPABASE_DB_URL -t equipment -t tool_changes -t inventory > partial_backup_$(date +%Y%m%d_%H%M%S).sql

# 압축 백업
pg_dump $SUPABASE_DB_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2.3 자동화된 백업 스크립트

**Windows PowerShell 스크립트:**
```powershell
# backup-supabase.ps1

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "C:\Work Drive\APP\ENDMILL MANAGEMENT\backups"
$backupFile = "$backupDir\backup_$timestamp.sql"

# 백업 디렉토리 생성
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# 백업 실행
supabase db dump --data-only > $backupFile

# 30일 이상 된 백업 파일 삭제
Get-ChildItem $backupDir -Filter "backup_*.sql" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item

Write-Host "Backup completed: $backupFile"
```

**작업 스케줄러 등록 (Windows):**
```powershell
# 매일 오전 2시에 백업 실행
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Work Drive\APP\ENDMILL MANAGEMENT\scripts\backup-supabase.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "SupabaseBackup" -Description "Daily Supabase database backup"
```

---

## 3. 데이터 모니터링 설정

### 3.1 Supabase Dashboard 모니터링

**실시간 모니터링 대시보드:**
```
https://supabase.com/dashboard/project/npprskxlqbgmbksrnpnr/logs/explorer
```

**주요 모니터링 항목:**
- Database Health (CPU, Memory, Disk)
- API Usage (Requests per minute)
- Realtime Connections
- Storage Usage

### 3.2 이메일 알림 설정

```bash
# Supabase Dashboard
1. Settings > Notifications
2. Email Alerts 활성화
3. 알림 받을 항목 선택:
   - Database disk usage > 80%
   - API rate limit exceeded
   - Realtime connection limit reached
   - Backup failures
```

### 3.3 Custom Monitoring with API

애플리케이션에 모니터링 API를 추가:

```typescript
// app/api/monitoring/health/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createServerClient()

    // 데이터베이스 연결 테스트
    const { data: testData, error } = await supabase
      .from('equipment')
      .select('id')
      .limit(1)

    const isHealthy = !error

    // 주요 테이블 레코드 수 확인
    const tables = ['equipment', 'tool_changes', 'inventory', 'endmill_types']
    const counts: Record<string, number> = {}

    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      counts[table] = count || 0
    }

    // 최근 24시간 교체 실적
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: recentChanges } = await supabase
      .from('tool_changes')
      .select('id')
      .gte('change_date', yesterday)

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      database: {
        connected: isHealthy,
        tables: counts,
        recentActivity: {
          toolChanges24h: recentChanges?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
```

### 3.4 로그 수집 및 분석

**Supabase Logs API 활용:**

```typescript
// scripts/collect-logs.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function collectLogs() {
  // 최근 1시간 에러 로그 수집
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // 실제 구현은 Supabase Management API 사용
  // https://supabase.com/docs/reference/api/logs
}
```

---

## 4. 복구 절차

### 4.1 PITR을 통한 복구 (Pro 플랜 이상)

```bash
# Supabase Dashboard
1. Settings > Database > Point-in-Time Recovery
2. "Restore to a point in time" 클릭
3. 복구할 시점 선택 (최근 7일 이내)
4. "Create restore" 클릭
5. 새로운 프로젝트로 복구됨
```

### 4.2 백업 파일로부터 복구

```bash
# 전체 복구
psql $SUPABASE_DB_URL < backup_20250113_020000.sql

# 특정 테이블만 복구
psql $SUPABASE_DB_URL < partial_backup_20250113_020000.sql

# 압축 파일 복구
gunzip -c backup_20250113_020000.sql.gz | psql $SUPABASE_DB_URL
```

### 4.3 복구 후 검증

```sql
-- 주요 테이블 레코드 수 확인
SELECT
  'equipment' as table_name, COUNT(*) as count FROM equipment
UNION ALL
SELECT 'tool_changes', COUNT(*) FROM tool_changes
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'endmill_types', COUNT(*) FROM endmill_types;

-- 최근 데이터 확인
SELECT * FROM tool_changes ORDER BY created_at DESC LIMIT 10;
SELECT * FROM equipment ORDER BY updated_at DESC LIMIT 10;
```

---

## 5. 정기 점검 체크리스트

### 5.1 일일 점검 (자동화 권장)

- [ ] 백업 파일 생성 확인
- [ ] 데이터베이스 연결 상태 확인
- [ ] 주요 테이블 레코드 수 모니터링
- [ ] API 응답 시간 확인

### 5.2 주간 점검

- [ ] 백업 파일 복구 테스트
- [ ] 디스크 사용량 확인 (80% 이상 시 경고)
- [ ] 느린 쿼리 분석
- [ ] 실시간 연결 수 모니터링

### 5.3 월간 점검

- [ ] 전체 백업 및 복구 테스트
- [ ] 데이터베이스 성능 분석
- [ ] 인덱스 최적화 검토
- [ ] 불필요한 데이터 정리 (30일 이상 된 로그 등)
- [ ] 보안 업데이트 확인

### 5.4 분기별 점검

- [ ] 재해 복구 계획(DRP) 점검
- [ ] 백업 정책 검토 및 업데이트
- [ ] 용량 계획 검토
- [ ] 보안 감사

---

## 6. 긴급 상황 대응

### 6.1 데이터 손실 발생 시

1. **즉시 조치:**
   - 추가 손실 방지를 위해 애플리케이션 중단
   - 현재 상태 스냅샷 생성

2. **원인 파악:**
   - Supabase Logs에서 오류 확인
   - Activity Logs 테이블 확인

3. **복구 실행:**
   - PITR 또는 최신 백업으로 복구
   - 복구 후 데이터 검증

4. **사후 조치:**
   - 재발 방지책 수립
   - 백업 정책 강화

### 6.2 성능 저하 발생 시

```sql
-- 느린 쿼리 확인
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 테이블 크기 확인
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 인덱스 사용률 확인
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 7. 연락처 및 지원

### Supabase 지원
- 문서: https://supabase.com/docs
- 지원 티켓: https://supabase.com/dashboard/support
- 커뮤니티: https://github.com/supabase/supabase/discussions

### 프로젝트 정보
- Project ID: npprskxlqbgmbksrnpnr
- Project URL: https://npprskxlqbgmbksrnpnr.supabase.co
- Database: PostgreSQL 15.x
- Region: ap-northeast-2 (Seoul)

---

**마지막 업데이트:** 2025-10-13
