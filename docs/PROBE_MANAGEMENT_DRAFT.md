# Probe 관리 기능 초안 (Draft)

> 작성일: 2026-07-08
> 상태: **초안** — 딥 인터뷰를 통해 요구사항 확정 후 PRD/구현 계획으로 발전 예정
> 대상 제품: Renishaw OMP40-2 / OMP400 (머시닝센터용 광학 전송 터치 프로브)
> 참조 구현: Arbor 관리 기능 (`docs/ARBOR_GRADING_PRD.md`, `docs/ARBOR_GRADING_IMPLEMENTATION_PLAN.md`)

---

## 1. 리서치 요약

### 1.1 제품 사양 비교 (OMP40-2 vs OMP400)

두 제품 모두 Ø40 × 50 mm 초소형 광학 전송 프로브. 핵심 차이는 측정 기술.

| 항목 | OMP40-2 (표준 키네매틱) | OMP400 (RENGAGE 스트레인 게이지) |
|---|---|---|
| 측정 기술 | 표준 키네매틱 3D 터치트리거 | 키네매틱 + RENGAGE 스트레인 게이지 |
| **단방향 반복도(2σ)** | **1.0 µm** (50mm 스타일러스) | **0.25 µm** (50mm) / 0.35 µm (100mm) |
| 트리거 힘 XY | 0.5~0.9 N (50~90 gf) | 0.06 N (6 gf) — 초저 트리거 힘 |
| 감지 방향 | 5방향 ±X ±Y +Z | 5방향 ±X ±Y +Z |
| 전송 방식 | 360° 광학 (modulated) | 360° 적외선 광학 (modulated/legacy) |
| 배터리 | ½AA 리튬 ×2 | ½AA 3.6V 리튬-티오닐클로라이드 ×2 |
| **배터리 수명(연속)** | 140h (저전력 모드 210h) | 105h (modulated) — 더 짧음 |
| 방수 | IPX8 | IPX8 |
| 스타일러스 나사 | M4 | M4 |
| 부품번호(키트) | A-4071-2001 (modulated) | A-5069-2001 |

**시사점**: 모델별로 반복도 규격(1.0 vs 0.25 µm)과 배터리 교체 주기가 다르므로, **모델별 기준값 관리**가 필요.

### 1.2 소모품 / 교체 부품 (수리 관리 대상)

| 부품 | 부품번호(예) | 성격 |
|---|---|---|
| 스타일러스 (PS3-1C, 50mm, Ø6 볼) | A-5000-3709 | 소모품 — 가장 빈번한 교체 |
| ½AA 배터리 (2개 팩) | P-BT03-0007 | 소모품 — 정기 교체 |
| 배터리 카세트 조립체 | A-4071-1166 | 교체 부품 |
| 배터리 하우징 씰 | A-4038-0301 | 소모품 — 쿨런트 침투 방지 |
| 다이어프램/O링/광학 윈도우/키네매틱 시트 | — | 열화 시 교체 (일부는 레니쇼 수리 대상) |

### 1.3 주요 고장 유형

1. **충돌 손상** — 스타일러스 휨/파손, 시트 손상 → 재교정 필수
2. **쿨런트 침투** — 씰/다이어프램 열화, 광학 윈도우 오염(전송 성능 저하)
3. **배터리 방전/누액** — LED 저배터리 경고 후 약 2주 예비 작동
4. **반복도 드리프트** — 마모·경미한 충돌 누적으로 정밀도 저하
5. **광 간섭 오작동** — 조명/진동 (modulated 전송으로 완화)

### 1.4 재교정 트리거 조건 (레니쇼 공식)

① 스타일러스 교체 시 ② 충돌 후 ③ 기계 대규모 정비 후 ④ 정기 헬스체크 시
→ 앱에서 "재교정 필요" 자동 플래그로 구현 가능한 명확한 이벤트.

### 1.5 레니쇼 수리 서비스 체계

| 유형 | 내용 | 특징 |
|---|---|---|
| 수리/재교정 | 원 제품 수리 후 반환 | 시리얼 유지 |
| **RBE** (Repair by Exchange) | 고장품 수령 후 리퍼브품으로 교환 | 10~15 영업일, **6개월 보증**, **시리얼 변경됨** |
| Advanced RBE | 리퍼브품 선발송 (추가 비용) | 다운타임 최소화 |

**시사점**: RBE는 물리 개체가 바뀌므로 **사내 자산태그(고정) ↔ 레니쇼 시리얼(가변)** 분리 추적이 핵심.

### 1.6 등급 분류 — 공식 표준 없음 (사내 규칙 필요)

레니쇼에 A/B/C 정확도 등급 공식 표준은 **없음**. 현장 관행 기반 제안:

- **등급 판정 후보 지표**: 단방향 반복도 실측값(모델별 규격 대비), 마지막 교정일 경과, 충돌 이력, 배터리 상태, 트리거 힘 이상 여부
- **예시**: A = 규격 100% 이내 + 최근 교정 / B = 규격 이내이나 드리프트 또는 교정 오래됨 / C = 규격 초과 또는 수리 대기
- Arbor와 동일하게 **임계값을 설정 탭에서 조정 가능**하게 설계

### 1.7 개체 식별

- 레니쇼 시리얼 형식: `2Y986` 형(숫자+영문+숫자3) 또는 `H24985` 형(H/G+5자리)
- RBE 재고 부품번호: `...-RBE` 접미사
- 사내 자산 태그(QR/바코드) 병행 관행 — 본 앱의 QR 스캔 기능과 연계 가능

### 1.8 참고 자료

- OMP40-2: https://renishaw.com/en/omp40-2-compact-touch-probe--7992
- OMP40 데이터시트: https://www.renishaw.com/resourcecentre/download/data-sheet-omp40-probe-system--10222
- OMP400: https://www.renishaw.com/en/omp400-high-accuracy-machine-probe--6089
- 수리 서비스: https://www.renishaw.com/en/service-repair-and-recalibration--6877
- RBE: https://renishawprobe.com/c/repair-by-exchange-rbe/
- 재교정 조건: https://www.renishaw.com/cmmsupport/knowledgebase/en/maximising-performance--13157
- 시리얼 로케이터: https://www.renishaw.com/en/instrument-serial-number-locator--6786

---

## 2. 기능 기획 초안

### 2.1 범위 (사용자 요구)

1. **등급 관리** — 프로브 개체별 상태 등급 판정·추적 (Arbor 등급 관리와 유사)
2. **수리 관리** — 수리 요청 → 발송 → 수리중 → 복귀/교환 라이프사이클 관리
3. **수리 이력** — 개체별 수리·부품교체·교정 이력 조회

### 2.2 Arbor 패턴 재사용 (검증된 아키텍처)

| 레이어 | Arbor 원형 | Probe 적용 |
|---|---|---|
| 페이지 | `app/dashboard/arbors/{page, inspect/, [id]/}` | `app/dashboard/probes/{page, inspect/, [id]/}` + 수리 관리 화면 |
| API | `app/api/arbors/**` (`{success,data,pagination}`, fail-closed, Zod) | `app/api/probes/**` 동일 규약 |
| DB | 마스터+이력 2테이블, factory_id 스코핑, rule_snapshot | 마스터+이력 구조 확장(수리 테이블 추가) |
| 훅 | `lib/hooks/useArbors.ts` (TanStack Query) | `lib/hooks/useProbes.ts` |
| 타입 | `lib/types/arbor.ts` + `lib/utils/arborGrade.ts` | `lib/types/probe.ts` + `lib/utils/probeGrade.ts` |
| 설정 | 설정 탭 등급기준 (`app_settings` category) | 모델별 임계값 설정 |
| 권한 | `permissions.ts` 4곳 등록 | `'probes'` 리소스 추가 |
| i18n | `arbor.*` 단일 카테고리 (ko/vi) | `probe.*` 카테고리 |

### 2.3 데이터 모델 초안

```
probes (마스터)
├─ id, factory_id, asset_tag(사내 고정 ID, UNIQUE per factory)  ← Arbor와의 핵심 차이
├─ renishaw_serial(RBE 교환 시 변경 가능), model(OMP40-2/OMP400), part_no
├─ status: active / needs_calibration / in_repair / disposed / lost (안: 인터뷰에서 확정)
├─ current_grade: A/B/C (사내 규칙)
├─ equipment_id 또는 위치 텍스트(장착 장비 추적 — 인터뷰 확정 필요)
├─ last_calibrated_at, last_repeatability_um, battery_installed_at
└─ purchase_date, notes, created_at, updated_at

probe_inspections (검사/교정 이력) — arbor_inspections 패턴
├─ probe_id, factory_id, repeatability_um, judged_grade, previous_grade
├─ rule_snapshot(jsonb), trigger_reason(정기/충돌후/스타일러스교체/정비후)
└─ inspected_by, inspected_at, notes

probe_repairs (수리 이력) — 신규 개념
├─ probe_id, factory_id
├─ repair_type: self(자체) / renishaw_repair / rbe / advanced_rbe
├─ status: requested / sent / in_progress / returned / exchanged / cancelled
├─ serial_before / serial_after (RBE 교환 추적)
├─ requested_at, sent_at, returned_at, cost, warranty_until(RBE=6개월)
├─ failure_type(충돌/침투/배터리/드리프트/기타), description
└─ requested_by, notes

probe_part_replacements (부품 교체 이력) — 선택 범위
├─ probe_id, part_type(스타일러스/배터리/씰/카세트/기타), part_no
└─ replaced_at, replaced_by, notes
```

### 2.4 화면 구성 초안

1. **프로브 목록** (`/dashboard/probes`) — 통계카드(등급별/상태별) + 필터 + 테이블 + 신규등록/Excel 일괄등록
2. **검사/교정 모드** (`/dashboard/probes/inspect`) — 자산태그 스캔 → 반복도 입력 → 자동 등급 → 저장 (Arbor 검사모드 원형)
3. **프로브 상세** (`/dashboard/probes/[id]`) — 마스터 정보 + 검사 이력 + 수리 이력 + 부품 교체 이력 탭
4. **수리 관리** — 수리 요청 생성/상태 전환(요청→발송→수리중→복귀/교환), RBE 시 시리얼 교체 처리
5. **설정 탭** — 모델별 등급 임계값, 교정 주기, 모델/부품 목록 관리

---

## 3. 미결정 사항 (딥 인터뷰 질문 후보)

1. **등급 체계**: A/B/C 3단계? Arbor처럼 A/B/C/D 4단계? 판정 지표는 반복도 단일? 아니면 교정경과일·충돌이력 복합?
2. **반복도 측정 방법**: 현장에서 반복도를 어떻게 측정하는가? (기계 내 매크로 측정값 수기 입력? 별도 측정 장비?) 측정 단위·소수점 자리?
3. **개체 식별**: 사내 자산태그가 이미 존재하는가? QR 라벨 발행 기능 필요 여부? 레니쇼 시리얼만으로 운영 중인가?
4. **장비 연결**: 프로브가 장착된 CNC 장비(`equipments`)와 FK로 연결할 것인가? 프로브 이동(장비 간 재배치) 추적 필요 여부?
5. **수리 워크플로우**: 실제 수리 절차(누가 요청/승인/발송하는가)? RBE 사용 여부? 수리 비용 기록 필요 여부? 보증 만료 알림?
6. **배터리 관리**: 배터리 교체 주기 추적을 별도 기능으로? (교체일 기록 + 경과 알림)
7. **수량 규모**: 관리 대상 프로브 개수(공장별)? 800대 장비 전수 장착인가 일부인가?
8. **교정 주기**: 정기 교정 주기(일수)? 지연 알림 기준?
9. **권한**: 검사 입력/수리 요청/설정 변경 각각 어느 역할까지 허용?
10. **범위 우선순위**: 1차 릴리스에 부품 교체 이력·재고 연동까지 포함? 아니면 등급+수리 이력만?
