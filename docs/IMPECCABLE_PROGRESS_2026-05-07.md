# Impeccable 시리즈 진행 상황 — 2026-05-07

> **목적**: 세션 핸드오프 문서. 다음 세션에서 이 문서만 읽으면 즉시 재개 가능.

---

## 🎯 다음 진행할 페이지 (대기 큐)

남은 후보 페이지:

| 후보 페이지 | 경로 | 예상 복잡도 | 비고 |
|---|---|---|---|
| **엔드밀 마스터** | `app/dashboard/endmill/page.tsx` | 대 | 카테고리 + 공급업체 가격 관리 |
| **사용자 관리** | `app/dashboard/users/page.tsx` | 중 | bulk Excel 업로드 + 역할 관리 |

**우선순위 추천**:
1. **users** (가장 단순, 패턴 안착)
2. **endmill** (마스터 데이터, inventory와 연계)

### 현재 진행 중 (별도 트랙)
- **사이드바 레이아웃 변경** (`impeccable/sidebar-21`): 상단 가로 메뉴 → 좌측 사이드바 (짙은 네이비). 항목/계층 변경 없음, UI 스타일·색상만 변경. 사용자 검토 후 머지 예정.

### 별도 후속 PR 후보 (부분 정리)
- `StatusChangeDropdown` 컴포넌트 토큰화 (PR #24 작업 시 영향도 큰 공유 컴포넌트라 의도적 분리)
- 4개 리포트 뷰의 한글 하드코딩 i18n 추출 (PR #25 작업 시 분리)
- 4개 리포트 뷰에 `ReportSortHeader`/`ReportSummaryCard` 실제 적용 (생성만 함)
- I3/I4/I5 (PR #25 리뷰 important 이슈) — summary card hierarchy / suffix prop / sort header API tightening

---

## ✅ 완료된 작업 (오늘 2026-05-07 세션)

### 머지된 PR 목록

| PR | 브랜치 | 주제 | 변경 |
|---|---|---|---|
| #13 | impeccable/9 | inventory 모바일 우선 + 듀얼 렌더링 | 346+/183− + 신규 컴포넌트 |
| #14 | impeccable/10 | dashboard hotfix (토큰 + 스켈레톤) | 28+/28− |
| #16 | impeccable/11 | inventory follow-up (N+1 + dead field + 단가) | 23+/14− |
| #17 | impeccable/12 | inbound 모바일 우선 + 듀얼 렌더링 | 267+/135− + InboundHistoryCard |
| #18 | impeccable/13 | outbound 모바일 우선 + 듀얼 렌더링 | 283+/140− + OutboundHistoryCard |
| #19 | impeccable/14 | InventoryListCard + ToolChangeListCard i18n labels props | 61+/15− |
| #20 | impeccable/15 | ToolChangeListCard formatDateTime locale | 14+/3− |
| #21 | impeccable/16 | dashboard 도넛 텍스트 오버플로우 hotfix | (소규모) |
| **#22** | **impeccable/17** | **CAM Sheet 모바일 우선 + 인사이트 시각화 다양화** | **1212+/710− + CAMSheetListCard** |
| **#23** | **impeccable/18** | **폐기 관리 모바일 우선 + 일별 트렌드 차트** | **1182+/767− + DisposalRecordCard + DailyTrendChart** |
| **#24** | **impeccable/19** | **설비 관리 모바일 우선 + Triple-Encoding + 모달 중복 제거** | **1288+/1109− + EquipmentListCard (hotfix 포함)** |
| **#25** | **impeccable/20** | **분석 리포트 페이지 + 4개 뷰 토큰화** | **705+/561− + ReportSortHeader + ReportSummaryCard (review hotfix 포함)** |

**누적 (이번 세션 PR #22~#25 추가)**:
- 약 4400+/3150− 변경
- 신규 컴포넌트 5개 (CAMSheetListCard, DisposalRecordCard, DailyTrendChart, EquipmentListCard) + 공통 2개 (ReportSortHeader, ReportSummaryCard)
- 새 i18n 키 ~50개 (KO/VI 양쪽)
- 모달 중복 제거 (설비 페이지 184줄 × 2 → 184줄)

### 머지 순서 (main 히스토리, 최근)
```
fc59213 Merge PR #25 (reports + hotfix)
3694bf0 Merge PR #24 (equipment + hotfix)
3cc9eaa Merge PR #23 (disposal)
4ef13a9 Merge PR #22 (cam-sheets)
2ae3fa9 Merge PR #21 (impeccable/16 — dashboard 도넛 hotfix)
```

---

## 🧰 검증된 패턴 (다음 페이지에 그대로 적용)

### 1. 듀얼 렌더링 (impeccable/3 시작점)

```tsx
{/* 모바일 카드 리스트 (lg 미만) */}
<div className="lg:hidden space-y-3">
  {items.map((item) => (
    <XxxCard key={item.id} item={item} labels={...} ... />
  ))}
</div>

{/* 데스크톱 테이블 (lg 이상) */}
<div className="hidden lg:block bg-paper-warm rounded-md border border-divider overflow-hidden">
  <div className="overflow-x-auto">
    <table>...</table>
  </div>
</div>
```

**예외**: 리포트 페이지(PR #25)는 PRODUCT.md 기준 *경영진 사무실 PC 위주*이므로 모바일 카드 변환 *없이* 데스크톱 표 + 가로 스크롤 허용 (도그마는 컨텍스트로 판단).

### 2. Page Guard useEffect (impeccable/9 review에서 학습)

```tsx
// totalPages 변경 시 currentPage clamp — 빈 화면 회귀 방지
useEffect(() => {
  if (totalPages > 0 && currentPage > totalPages) {
    setCurrentPage(totalPages)
  }
}, [totalPages, currentPage])
```

### 3. Card Component Labels Props 패턴 (PR #19~#20에서 확립)

부모에서 `t()` 키를 `labels` 객체로 주입. 카드는 i18n 키 모름.

### 4. Locale-Aware Date Formatting (PR #20에서 확립)

```tsx
function resolveDateLocale(language: string | undefined): string {
  if (!language) return 'ko-KR'
  if (language.toLowerCase().startsWith('vi')) return 'vi-VN'
  return 'ko-KR'
}
```

### 5. 4-카드 히어로 안티패턴 분쇄 전략 (PR #22~#25에서 확립)

- **A. 메트릭이 결정 가능한 데이터일 때 (CAM Sheet)**: 4개 카드를 *각각 다른 시각화*로 분쇄 (도넛 / 순위 막대 / 분할 게이지 / 반원호). 동형 격자 회피.
- **B. 메트릭이 단순 합계+평균일 때 (Disposal, Equipment)**: 단일 stat strip 4셀로 압축. 별도 시각화는 *시간 차원 같은 진짜 결정 데이터*가 있을 때만 추가.

### 6. PowerShell 정규식 일괄 토큰 치환 (PR #25에서 확립, 한계 학습)

큰 컴포넌트 또는 다수 파일에 *일관된* 안티 패턴이 있을 때 효율적.

**한계 (PR #25 hotfix 학습)**:
- **단어 경계 누락 부작용**: `bg-yellow-50` 패턴이 `bg-yellow-500`의 prefix를 매칭해 `bg-paper-warm0` 같은 잘못된 클래스 생성. `(?<![\w-])bg-yellow-50(?![\w-])` 같은 단어 경계 사용 권장
- **그라디언트 누락**: `bg-gradient-to-br from-blue-50 to-blue-100` 같은 합성 패턴은 별도 매핑 필요
- **시맨틱 회귀**: 서로 다른 raw 색이 같은 시맨틱 토큰에 매핑되면 시각 구분 사라짐 (4단계 → 3단계 통합 필요)

### 7. 독립 코드 리뷰 → Hotfix 사이클 (PR #25에서 확립)

작성자 컨텍스트에 갇힌 셀프 리뷰는 한계. `pr-review-toolkit:code-reviewer` 에이전트로 독립 리뷰 → Critical 이슈만 hotfix → 같은 PR에 추가 커밋.

### 8. Triple-Encoding StatusBadge 적용 (PR #24)

`components/ui/status-badge.tsx`가 색 + 형태(점/사각/삼각) + 라벨 삼중 인코딩 제공. 한국 적록색약 5-8% 대응.

### 9. 추가 모달 DRY 정리 (PR #24)

빈 상태와 일반 상태에 *동일한* 추가 모달 JSX를 따로 작성하던 패턴 → 단일 모달에 통합 가능. 기능/입력 변경 0건.

---

## 🎨 디자인 토큰 (DESIGN.md 도그마)

### 컬러
- `bg-paper`, `bg-paper-warm` (배경)
- `text-ink`, `text-ink-soft`, `text-ink-mute` (전경)
- `border-divider` (구획)
- `gauge-cobalt-strong/-soft` (1차 액션)
- `signal-go-strong/-soft` (긍정/완료)
- `signal-watch-strong/-soft` (경고)
- `signal-stop-strong/-soft` (위험)

### 타이포그래피
- `text-caption` (12px), `text-label` (14px), `text-base` (16px), `text-title` (18px), `text-headline` (24px)

### Spacing
- `min-h-touch` (48px), `min-w-touch` (48px)

### 기타
- `rounded-md` (6px), `rounded-sm` (4px)
- `tabular`, `no-break`, `shadow-hover-lift`

### Anti-Patterns (제거 대상)
- `bg-white shadow-sm`, `hover:shadow-xl`, `hover:scale-*`, `rounded-lg/xl` (대→md), `text-sm` 본문, raw color 직접 사용, `bg-gradient-to-{br,r}` 멀티 색상, 이모지 아이콘 (lucide로 대체)

---

## 📂 핵심 파일 위치

### 페이지 (app/dashboard/) — 적용 완료
- `app/dashboard/page.tsx` (impeccable/8 + #21)
- `app/dashboard/tool-changes/page.tsx` (impeccable/3~7 + #20)
- `app/dashboard/inventory/page.tsx` (impeccable/9~11 + #19)
- `app/dashboard/inventory/inbound/page.tsx` (impeccable/12)
- `app/dashboard/inventory/outbound/page.tsx` (impeccable/13)
- `app/dashboard/cam-sheets/page.tsx` (impeccable/17, PR #22)
- `app/dashboard/endmill-disposal/page.tsx` (impeccable/18, PR #23)
- `app/dashboard/equipment/page.tsx` (impeccable/19, PR #24)
- `app/dashboard/reports/page.tsx` (impeccable/20, PR #25)

### 신규 카드/시각화 컴포넌트
- `components/features/cam-sheets/cam-sheet-list-card.tsx`
- `components/features/endmill-disposal/disposal-record-card.tsx`
- `components/features/endmill-disposal/daily-trend-chart.tsx`
- `components/features/equipment/equipment-list-card.tsx`
- `components/reports/common/ReportSortHeader.tsx` (생성만, 적용 후속)
- `components/reports/common/ReportSummaryCard.tsx` (생성만, 적용 후속)

### 공통 UI
- `components/ui/status-badge.tsx`
- `components/ui/no-break.tsx`

### 디자인 토큰 / i18n
- `tailwind.config.ts`
- `lib/i18n.ts`

---

## 📋 다음 세션 시작 시 체크리스트

1. `git status` 후 main 최신화 (`git pull --ff-only origin main`)
2. `npm run build` 통과 확인
3. 이 문서 읽기 (패턴/토큰/체크리스트 복기)
4. 타깃 페이지 분석: 사이즈 + 안티 패턴 카운트 grep
5. `git checkout -b impeccable/<번호>`
6. 단계별 작업 (카드 컴포넌트 → 헤더 → 필터 → 표 → 모달 → page guard)
7. **Fresh 빌드 검증** (`rm -rf .next && npm run build`) — incremental 캐시 함정 회피
8. 커밋 + 푸시 + PR
9. `pr-review-toolkit:code-reviewer` 에이전트 독립 리뷰
10. Critical 이슈 hotfix (같은 PR 추가 커밋)
11. 사용자 결정으로 머지

---

## ⚠️ 주의사항 / 과거 발견 이슈 패턴

### 항상 체크할 것
1. i18n 하드코딩 → labels props
2. 로케일 하드코딩 (`'ko-KR'`) → i18n.language 분기
3. 빈 페이지 회귀 → page guard
4. N+1 lookup → useMemo Map
5. Dead field → 제거
6. 타입 표류 → Pick / export
7. 단가/수량 0 표기 일관성
8. **i18n 키 중복 grep 필수** (PR #24 빌드 실패 사례)
9. **시맨틱 회귀** (PR #25 review)
10. **Fresh 빌드 검증 필수** — `.next` incremental 캐시는 type-checking 일부 스킵 (PR #24 사례)

### Vercel 빌드 디버깅
- Vercel preview 실패 시 `npx vercel inspect dpl_<id> --logs | tail -30`
- 첫 사용 시 `npx vercel login` 인터랙티브 인증 (한 번만)

---

## 🔗 참조 PR 링크

- #13 inventory / #17 inbound / #18 outbound / #19 i18n labels / #20 locale fix
- **#22 CAM Sheet / #23 폐기 관리 / #24 설비 관리 / #25 분석 리포트**

---

## 📝 임의 메모 / 미해결 의문

- InventoryListCard / OutboundHistoryCard `unitPrice` dead field 잔존 (PR #11/#18에서 보류)
- ToolChangeListCard 베트남어 시각 포맷 미세 차이
- StatusChangeDropdown 자체 토큰화 필요 (PR #24에서 분리)
- 4개 리포트 뷰 한글 하드코딩 후속 i18n 추출 (~30개 키)
- 4개 리포트 뷰에 ReportSortHeader/ReportSummaryCard 실제 적용 (~400줄 절감 가능)
- **사이드바 레이아웃 작업 진행 중** (`impeccable/sidebar-21`) — 사용자 검토 후 머지 예정
