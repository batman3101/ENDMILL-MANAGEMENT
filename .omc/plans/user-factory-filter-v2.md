# 공장별 사용자 필터링 수정 (v2)

## 배경

기존 백필 마이그레이션에서 모든 사용자(50명)를 ALT+ALV 양쪽에 등록했으나, 올바른 요구사항은:
- 기존 사용자 전원은 **1공장(ALT)에만** 배정
- system_admin은 **양쪽 공장 모두에 항상 표시** (DB 레벨이 아닌 API 레벨 예외)

## 작업 목표

| 항목 | 내용 |
|------|------|
| 핵심 목표 | 공장 필터링에서 system_admin 예외 처리 + 잘못된 백필 데이터 정리 |
| 완료 기준 | 1공장 선택 시 1공장 사용자 + system_admin 표시, 2공장 선택 시 2공장 사용자 + system_admin 표시 |
| 영향 범위 | DB 데이터 1건, API 파일 1건 |

## 반드시 하지 말 것

- system_admin 외 사용자를 ALV에 다시 추가하지 말 것
- POST /api/users 로직 변경하지 말 것 (이미 정상)
- useUsers 훅 변경하지 말 것 (이미 정상)
- useFactory 훅 변경하지 말 것 (이미 정상)

---

## Task 1: DB 백필 수정 - ALV 잘못된 레코드 삭제

**파일:** `supabase/migrations/20260127200000_fix_user_factory_access.sql` (신규)

**작업 내용:**
- `user_factory_access` 테이블에서 ALV(2공장) 레코드 삭제
- 단, system_admin 역할 사용자는 ALV 레코드 유지

**SQL 로직:**
```sql
DELETE FROM user_factory_access
WHERE factory_id = (SELECT id FROM factories WHERE code = 'ALV')
  AND user_id NOT IN (
    SELECT up.user_id FROM user_profiles up
    JOIN user_roles ur ON up.role_id = ur.id
    WHERE ur.type = 'system_admin'
  );
```

**수용 기준:**
- [ ] system_admin이 아닌 사용자의 ALV 레코드가 모두 삭제됨
- [ ] system_admin 사용자의 ALV 레코드는 유지됨
- [ ] 모든 사용자의 ALT 레코드는 영향 없음

**리스크:**
- user_roles 테이블의 type 컬럼값이 정확히 `system_admin`인지 확인 필요
- 삭제 전 영향받는 레코드 수 카운트로 검증 권장

---

## Task 2: GET /api/users 수정 - system_admin 항상 포함

**파일:** `app/api/users/route.ts` (line 67-80)

**현재 코드:**
```typescript
if (factoryId) {
  const { data: factoryUsers } = await supabase
    .from('user_factory_access')
    .select('user_id')
    .eq('factory_id', factoryId)

  if (factoryUsers && factoryUsers.length > 0) {
    const userIds = factoryUsers.map((fu: any) => fu.user_id)
    query = query.in('user_id', userIds)
  } else {
    return NextResponse.json({ success: true, data: [], count: 0 })
  }
}
```

**수정 코드:**
```typescript
if (factoryId) {
  // 1) 해당 공장에 등록된 사용자
  const { data: factoryUsers } = await supabase
    .from('user_factory_access')
    .select('user_id')
    .eq('factory_id', factoryId)

  // 2) system_admin은 공장과 무관하게 항상 포함
  const { data: systemAdmins } = await supabase
    .from('user_profiles')
    .select('user_id, user_roles!inner(type)')
    .eq('user_roles.type', 'system_admin')

  const factoryUserIds = (factoryUsers || []).map((fu: any) => fu.user_id)
  const systemAdminIds = (systemAdmins || []).map((sa: any) => sa.user_id)
  const allUserIds = [...new Set([...factoryUserIds, ...systemAdminIds])]

  if (allUserIds.length > 0) {
    query = query.in('user_id', allUserIds)
  } else {
    return NextResponse.json({ success: true, data: [], count: 0 })
  }
}
```

**수용 기준:**
- [ ] factoryId=ALT 요청 시 ALT 사용자 + system_admin 반환
- [ ] factoryId=ALV 요청 시 ALV 사용자 + system_admin 반환
- [ ] factoryId 없는 요청 시 기존과 동일 (전체 반환)
- [ ] system_admin이 중복 없이 1번만 표시됨 (Set으로 보장)

**리스크:**
- `user_roles` 테이블 조인이 `!inner`로 되어 있으므로 role이 없는 사용자는 제외됨 (의도된 동작)
- `user_profiles`에서 `user_roles` FK 관계가 올바른지 확인 필요 (role_id → user_roles.id)

---

## 실행 순서

1. **Task 1 먼저** - DB 데이터 정리 (Supabase SQL Editor에서 직접 실행)
2. **Task 2** - API 코드 수정

## 검증 단계

1. Supabase에서 `SELECT count(*) FROM user_factory_access WHERE factory_id = (SELECT id FROM factories WHERE code = 'ALV')` 실행 → system_admin 수만 나와야 함
2. 앱에서 1공장 선택 → 사용자 목록에 system_admin 포함 확인
3. 앱에서 2공장 선택 → system_admin만 표시 확인 (아직 2공장 전용 사용자 없으므로)
4. 신규 사용자를 2공장에서 등록 → 2공장 선택 시 해당 사용자 + system_admin 표시 확인

## 커밋 전략

단일 커밋: `공장별 사용자 필터링 수정: system_admin 예외 처리 및 백필 데이터 정리`
