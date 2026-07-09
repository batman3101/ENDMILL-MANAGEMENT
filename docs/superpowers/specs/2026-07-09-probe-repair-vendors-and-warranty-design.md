# 프로브 수리 업체 관리 + 보증 계산 설계

- **작성일**: 2026-07-09
- **대상 도메인**: 프로브(Renishaw 터치 프로브) 수리 관리
- **관련 파일**: `probe_repairs`, `app/api/probes/[id]/repairs/route.ts`, `components/features/probe/ProbeRepairModal.tsx`, `app/dashboard/probes/repairs/page.tsx`

## 1. 목적 (Purpose)

현장에서 프로브 수리를 외주(외부 업체) 또는 내부(부품 구매 후 자체 수리)로 처리한다. 두 가지 실무 요구가 있다:

1. **업체 추적** — 어떤 수리가 어느 업체로 나가 있는지 기록해, 현장에서 "어느 업체에 재촉해야 하는지" 파악한다.
2. **보증 계산** — 업체별 수리 횟수를 세어 보증 기간/청구 가능 여부를 계산한다.

## 2. 요구사항 (Requirements)

### 2.1 업체(vendor)
- 외주 수리 업체와 부품 구매 업체를 한 곳에서 관리한다.
- 한 업체가 **두 역할(외주수리·부품구매)을 모두** 가질 수 있다.
- 간단한 **업체 관리 페이지**(목록 + 추가/수정/삭제).

### 2.2 보증 규칙 (확정)
- **외주/RBE**: 최초 수리 **반환일 기준 6개월 고정** 창. 그 창 안에서 **보증 수리 2회까지 인정**. **3회째** 수리는 보증 불인정 → **새 유상 수리**로 그 반환일부터 **새 6개월 시작 + 카운트 리셋**.
- **보증 카운트 단위**: **(프로브 + 업체)**. 다른 업체로 보내면 그 업체 기준 새 수리·새 보증.
- **내부 수리(부품 구매)**: **완료일 기준 단순 3개월** 보증. "2회 후 리셋" 규칙 없음.
- **RBE**: 외주와 동일(6개월·2회-리셋). 업체 선택은 optional(보통 레니쇼).

### 2.3 UI
- 수리 등록 시 **업체 드롭다운**: 외주면 수리 업체 목록, 내부면 부품 구매 업체 목록으로 필터.
- 신규 외주·내부 수리는 업체 선택 **필수**. RBE·기존 이력은 optional(null 허용).
- 보증 분류는 **시스템 자동 판단**하고 현황(예: "업체 A 보증 2회 중 1회 사용, ~2026-01-01")을 표시.

## 3. 데이터 모델 (Data Model)

### 3.1 신규 테이블 `probe_vendors`
```sql
create table public.probe_vendors (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.factories(id),
  name varchar(100) not null,
  is_repair_vendor boolean not null default false,  -- 외주 수리 업체 역할
  is_parts_vendor  boolean not null default false,  -- 부품 구매 업체 역할
  contact_name varchar(50),
  phone varchar(30),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_probe_vendors_role check (is_repair_vendor or is_parts_vendor)  -- 최소 1개 역할
);
create unique index uq_probe_vendors_factory_name on public.probe_vendors (factory_id, lower(name));
create index idx_probe_vendors_factory_active on public.probe_vendors (factory_id, is_active);
```
- **RLS**: `probe_repairs`/`probes`와 **동일한 posture를 따른다**(프로젝트 제약상 public 테이블 RLS 재활성화 금지 — 접근 제어는 API 라우트의 `authorizeFactory`가 담당). 신규 테이블에 RLS를 새로 켜지 않는다.

### 3.2 `probe_repairs` 변경
```sql
alter table public.probe_repairs
  add column vendor_id uuid references public.probe_vendors(id);
create index idx_probe_repairs_probe_vendor on public.probe_repairs (probe_id, vendor_id);
```
- `vendor_id`는 nullable(기존 이력 보존). 외주/RBE=수리 업체, 내부=부품 구매 업체.

### 3.3 `warranty_until` GENERATED 재정의 (유형 인지)
현재: `(returned_at + interval '6 months')::date` — 6개월 하드코딩, 내부수리는 returned_at이 null이라 warranty_until도 null.

변경:
```sql
-- 인덱스 먼저 드롭 → 컬럼 재정의 → 인덱스 재생성
drop index if exists idx_probe_repairs_factory_warranty;
alter table public.probe_repairs drop column warranty_until;
alter table public.probe_repairs add column warranty_until date
  generated always as (
    case repair_type
      when 'internal' then (completed_at + interval '3 months')::date
      else (returned_at + interval '6 months')::date  -- external/rbe
    end
  ) stored;
create index idx_probe_repairs_factory_warranty on public.probe_repairs (factory_id, warranty_until);
```
- `completed_at`/`returned_at`은 `date` 타입 → `date + interval → ::date`는 IMMUTABLE이라 GENERATED에 안전(기존 마이그레이션 주석과 동일 근거).
- 효과: 기존 내부수리(과거)도 `completed_at + 3개월`로 warranty_until이 채워진다.

## 4. 보증 알고리즘 (핵심)

**기존 `original_repair_id` 체인을 재사용**하되, **업체 차원 + 2회 카운트**를 더한다.

### 4.1 정의
- **기간-원점(period-origin)**: `original_repair_id IS NULL`인 외주/RBE 수리. 6개월 보증 창 `[returned_at, returned_at + 6mo]`을 연다.
- **보증 청구(warranty claim)**: `original_repair_id = <원점 id>`인 수리. 원점의 보증 창 아래서 수행.
- **기간 내 보증수리 수**: 해당 원점을 `original_repair_id`로 참조하는 수리의 개수.

### 4.2 등록 시 자동 분류 (external/rbe)
새 수리(프로브 P, 업체 V, 발생일 D)에 대해:
1. (P, V)의 **활성 기간-원점 R0**을 찾는다: 조건 —
   - R0.repair_type ∈ {external, rbe}, R0.status = 'completed'
   - R0.vendor_id = V, R0.probe_id = P
   - R0.original_repair_id IS NULL (원점)
   - R0.warranty_until (= R0.returned_at + 6mo) >= D (창이 아직 열림)
   - R0을 참조하는 보증 청구 수 < 2
   - (여러 후보 시 가장 최근 R0)
2. R0이 있으면 → 새 수리는 **보증 청구**: `original_repair_id = R0.id`.
3. R0이 없으면(활성 기간 없음 또는 2회 소진) → 새 수리는 **새 기간-원점**: `original_repair_id = null`. 마감(반환일 입력) 시 새 6개월 창이 열린다.

**내부수리**: 리셋 규칙 없음. 단순히 `warranty_until = completed_at + 3mo`만 적용. `original_repair_id`는 사용하지 않음(항상 null).

### 4.3 워크플로우 예시 (external, 프로브 P + 업체 V)
| 순서 | 수리 | 발생일 | 반환일 | 분류 | original_repair_id | warranty_until |
|------|------|--------|--------|------|--------------------|-----------------|
| R0 | 최초(유상) | 01-01 | 01-10 | 새 원점 | null | 07-10 |
| W1 | 보증수리 1 | 03-01 | 03-05 | 청구(1/2) | R0 | (창=R0의 07-10) |
| W2 | 보증수리 2 | 05-01 | 05-04 | 청구(2/2) | R0 | (창=R0의 07-10) |
| R1 | 3회째 → 새 유상 | 06-01 | 06-05 | 새 원점(리셋) | null | 12-05 |
- W2 이후 창(07-10)이 열려 있어도 2회 소진 → R1은 새 원점. R1의 창은 06-05 기준 12-05.

### 4.4 표시(현황)
- 수리 등록 모달에서 업체 선택 시: (P, V)의 활성 기간 조회 → "보증 2회 중 X회 사용 · 만료 YYYY-MM-DD" 또는 "새 보증 기간으로 등록됨" 표시.
- 서버가 `original_repair_id`를 자동 계산하므로, 클라이언트는 원점을 수동 선택하지 않는다(기존 수동 라디오 UI 제거).

## 5. API 변경

### 5.1 업체 CRUD — `/api/probe-vendors`
- `GET ?factoryId=&role=repair|parts&activeOnly=true` — 목록(역할·활성 필터). user+ (드롭다운용 읽기).
- `POST` — 생성. admin+. body: name, is_repair_vendor, is_parts_vendor, contact_name?, phone?, notes?
- `PUT /api/probe-vendors/[id]` — 수정. admin+.
- `DELETE /api/probe-vendors/[id]` — 삭제. admin+. **수리에 참조되면 삭제 거부(409)**, 대신 `is_active=false`(비활성) 권장.
- 모두 `authorizeFactory`로 공장 스코핑.

### 5.2 수리 등록 `POST /api/probes/[id]/repairs`
- 스키마에 `vendor_id` 추가: external·internal은 **필수(uuid)**, rbe는 optional.
- `vendor_id` 검증: 존재 + 같은 factory + 역할 일치(external/rbe→is_repair_vendor, internal→is_parts_vendor).
- **`original_repair_id`는 클라이언트 입력을 무시하고 서버가 4.2로 자동 계산**(external/rbe만). internal은 null.
- 나머지 기존 로직(권한, 프로브 상태 검증, 오픈 1건 제약) 유지.

### 5.3 수리 정정/조회
- `update` 액션 및 목록 조회 응답에 `vendor_id`(+조인한 vendor name) 포함.
- `GET /api/probes/repairs`에 `vendorId` 필터 파라미터 추가(수리 현황 페이지 업체별 필터).

## 6. UI 변경

### 6.1 업체 관리 페이지 — `/dashboard/probes/vendors`
- 간단 CRUD: 목록 테이블(이름·역할 뱃지·연락처·전화·활성) + 추가/수정 모달.
- 모달 필드: 이름(필수), 역할 체크박스(외주수리/부품구매, 최소 1개), 담당자, 전화, 비고, 활성 토글.
- 수리 현황 페이지(`/dashboard/probes/repairs`) 헤더에 "업체 관리" 링크. admin+만 편집.

### 6.2 수리 등록 모달 (`ProbeRepairModal`)
- **업체 드롭다운** 추가: `repairType`에 따라 역할 필터(external/rbe→수리 업체, internal→부품 업체). external·internal 필수.
- 기존 수동 보증 후보 라디오(`warrantyCandidates`) **제거** → 대신 업체 선택 시 **보증 현황 텍스트** 표시(4.4).
- `previewWarrantyUntil`을 유형 인지로 수정(internal=완료일+3mo, external/rbe=반환일+6mo).

### 6.3 수리 현황 페이지
- **업체 컬럼** 추가, **업체별 필터** 드롭다운 추가(→ "어느 업체에 재촉?" 해결).

### 6.4 i18n
- 신규 문자열(업체 관리, 역할, 보증 현황 등)은 `lib/i18n.ts`에 ko/vi 키 추가.

## 7. 기존 데이터 / 마이그레이션

- 기존 `probe_repairs`는 `vendor_id = null`(과거 이력, 백필 안 함).
- `warranty_until` GENERATED 재계산으로 기존 내부수리에 3개월 보증이 채워진다(부수 효과, 의도됨).
- 기존 external 수리의 `original_repair_id` 링크는 그대로 유지(하위호환).

## 8. 범위 밖 (Non-goals)

- 기존 이력에 업체 소급 입력(백필) — 하지 않음.
- 업체별 비용/정산, 발주서 생성 — 이번 범위 아님.
- 보증 청구 거부/수동 오버라이드(자동 분류가 틀렸을 때) — 이번엔 자동만. 필요 시 후속.
- endmill 도메인의 supplier와 통합 — 별개 유지(프로브 전용 업체).

## 9. 테스트 고려

- 보증 알고리즘 단위: R0 창 내 1·2회 청구, 3회째 리셋, 창 만료 후 새 원점, 다른 업체 선택 시 새 원점, 내부수리 3개월.
- GENERATED 재정의 후 기존 행 warranty_until 값 검증(internal=완료일+3mo).
- API: vendor_id 역할 불일치 거부, 필수/optional 규칙, 삭제 참조 거부.
- 타입체크(`tsc --noEmit`) + 린트(`next lint`).

## 10. 구현 순서(초안)

1. 마이그레이션: `probe_vendors` 테이블 + `probe_repairs.vendor_id` + `warranty_until` 재정의.
2. 업체 CRUD API + 관리 페이지.
3. 수리 등록 API에 vendor_id + 보증 자동 분류.
4. 수리 모달(업체 드롭다운 + 보증 현황) + 수리 현황(업체 컬럼·필터).
5. i18n, 타입체크/린트, 검증.
