# Impeccable 시리즈 진행 상황 — 2026-05-07

> **목적**: 세션 핸드오프 문서. 다음 세션에서 이 문서만 읽으면 즉시 재개 가능.

---

## 🎯 다음 진행할 페이지 (대기 큐)

남은 후보 페이지 (2개):

| 후보 페이지 | 경로 | 예상 복잡도 | 비고 |
|---|---|---|---|
| **사용자 관리** | `app/dashboard/users/page.tsx` | 중 | bulk Excel 업로드 + 역할 관리 |
| **엔드밀 마스터** | `app/dashboard/endmill/page.tsx` | 대 | 카테고리 + 공급업체 가격 관리 |

**우선순위 추천**:
1. **users** (가장 단순, 패턴 안착)
2. **endmill** (마스터 데이터, inventory와 연계)

### 별도 후속 PR 후보 (롤오버)
- **`StatusChangeDropdown` 컴포넌트 토큰화** (PR #24 작업 시 의도적 분리). raw `bg-{green,red,purple}-50/100/200/700/800` + 이모지 🟢🔧⚙️▶️ 다수, 다른 페이지에서도 import되는 공유 컴포넌트
- **4개 리포트 뷰 한글 하드코딩 i18n 추출** (PR #25 분리). "모델별 교체 현황", "카테고리별 교체 현황" 등 헤딩 + 표 헤더 ~30개 키
- **4개 리포트 뷰에 `ReportSortHeader`/`ReportSummaryCard` 실제 적용** (PR #25에서 컴포넌트 *생성만*). 4개 뷰의 SortIcon/sort handler/summary card 중복 제거 후속 작업, ~400줄 절감 가능
- **PR #25 리뷰 important 이슈 (I3/I4/I5)**: summary card hierarchy / suffix prop / sort header API tightening
- **사이드바 키보드 리사이즈 접근성** (PR #26 분리): 좌·우 방향키로 폭 조정, Home/End 리셋

---

## ✅ 완료된 작업 (오늘 2026-05-07 세션)

### 머지된 PR 목록 (이번 세션 누적)

| PR | 브랜치 | 주제 | 변경 |
|---|---|---|---|
| #13 | impeccable/9 | inventory 모바일 우선 + 듀얼 렌더링 | 346+/183− + 신규 컴포넌트 |
| #14 | impeccable/10 | dashboard hotfix (토큰 + 스켈레톤) | 28+/28− |
| #16 | impeccable/11 | inventory follow-up (N+1 + dead field + 단가) | 23+/14− |
| #17 | impeccable/12 | inbound 모바일 우선 + 듀얼 렌더링 | 267+/135− + InboundHistoryCard |
| #18 | impeccable/13 | outbound 모바일 우선 + 듀얼 렌더링 | 283+/140− + OutboundHistoryCard |
| #19 | impeccable/14 | InventoryListCard + ToolChangeListCard i18n labels | 61+/15− |
| #20 | impeccable/15 | ToolChangeListCard formatDateTime locale | 14+/3− |
| #21 | impeccable/16 | dashboard 도넛 텍스트 오버플로우 hotfix | (소규모) |
| **#22** | impeccable/17 | **CAM Sheet 모바일 우선 + 인사이트 시각화 다양화** | **1212+/710− + CAMSheetListCard** |
| **#23** | impeccable/18 | **폐기 관리 모바일 우선 + 일별 트렌드 차트** | **1182+/767− + DisposalRecordCard + DailyTrendChart** |
| **#24** | impeccable/19 | **설비 관리 모바일 우선 + Triple-Encoding + 모달 중복 제거** | **1288+/1109− + EquipmentListCard (hotfix 포함)** |
| **#25** | impeccable/20 | **분석 리포트 페이지 + 4개 뷰 토큰화** | **705+/561− + ReportSortHeader + ReportSummaryCard (review hotfix 포함)** |
| **#26** | impeccable/sidebar-21 | **사이드바 레이아웃 + 드롭다운 + Resize 핸들** | **831+/384− + LanguageSelector + FactorySelector 변환 + docs** |

**누적 (이번 세션 기여 PR #22~#26)**:
- 약 5200+/3500− 변경
- 신규 컴포넌트 6개:
  - `CAMSheetListCard` / `DisposalRecordCard` / `DailyTrendChart` / `EquipmentListCard`
  - `LanguageSelector` (드롭다운, 신규)
  - 공통 2개: `ReportSortHeader` / `ReportSummaryCard`
- `FactorySelector` 토글 → 드롭다운 변환
- 새 i18n 키 ~50개 (KO/VI 양쪽)
- 모달 중복 제거 (설비 페이지 184줄 × 2 → 184줄)
- **레이아웃 구조 변경**: 상단 가로 메뉴 → 좌측 사이드바 (다크 ink + 라이트 메인 패턴)
- **사이드바 폭 드래그 리사이즈** + localStorage 영구 저장

### 머지 순서 (main 히스토리, 이번 세션)
```
73ddee1 Merge PR #26 (sidebar layout + dropdowns + resize)
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
  {items.map((item) => <XxxCard key={item.id} item={item} labels={...} ... />)}
</div>

{/* 데스크톱 테이블 (lg 이상) */}
<div className="hidden lg:block bg-paper-warm rounded-md border border-divider overflow-hidden">
  <div className="overflow-x-auto"><table>...</table></div>
</div>
```

**예외**: 리포트 페이지(PR #25)는 PRODUCT.md 기준 *경영진 사무실 PC 위주*이므로 모바일 카드 변환 *없이* 데스크톱 표 + 가로 스크롤 허용 (도그마는 컨텍스트로 판단).

### 2. Page Guard useEffect (impeccable/9 review에서 학습)

```tsx
useEffect(() => {
  if (totalPages > 0 && currentPage > totalPages) {
    setCurrentPage(totalPages)
  }
}, [totalPages, currentPage])
```

### 3. Card Component Labels Props 패턴 (PR #19~#20)

부모에서 `t()` 키를 `labels` 객체로 주입. 카드는 i18n 키 모름.

### 4. Locale-Aware Date Formatting (PR #20)

```tsx
function resolveDateLocale(language: string | undefined): string {
  if (!language) return 'ko-KR'
  if (language.toLowerCase().startsWith('vi')) return 'vi-VN'
  return 'ko-KR'
}
```

### 5. 4-카드 히어로 안티패턴 분쇄 전략 (PR #22~#25)

- **A. 메트릭이 결정 가능한 데이터일 때 (CAM Sheet)**: 4개 카드를 *각각 다른 시각화*로 분쇄 (도넛 / 순위 막대 / 분할 게이지 / 반원호). 동형 격자 회피.
- **B. 메트릭이 단순 합계+평균일 때 (Disposal, Equipment)**: 단일 stat strip 4셀로 압축. 별도 시각화는 *시간 차원 같은 진짜 결정 데이터*가 있을 때만 추가.

### 6. PowerShell 정규식 일괄 토큰 치환 (PR #25 학습)

큰 컴포넌트 또는 다수 파일에 *일관된* 안티 패턴이 있을 때 효율적.

**한계 (PR #25 hotfix 학습)**:
- **단어 경계 누락 부작용**: `bg-yellow-50` 패턴이 `bg-yellow-500`의 prefix를 매칭해 `bg-paper-warm0` 같은 잘못된 클래스 생성. `(?<![\w-])bg-yellow-50(?![\w-])` 같은 단어 경계 사용 권장
- **그라디언트 누락**: `bg-gradient-to-br from-blue-50 to-blue-100` 같은 합성 패턴은 별도 매핑 필요
- **시맨틱 회귀**: 서로 다른 raw 색이 같은 시맨틱 토큰에 매핑되면 시각 구분 사라짐 (4단계 → 3단계 통합 필요)

### 7. 독립 코드 리뷰 → Hotfix 사이클 (PR #25)

작성자 컨텍스트에 갇힌 셀프 리뷰는 한계. `pr-review-toolkit:code-reviewer` 에이전트로 독립 리뷰 → Critical 이슈만 hotfix → 같은 PR에 추가 커밋. CLAUDE.md 도그마 "Keep authoring and review as separate passes" 실천.

### 8. Triple-Encoding StatusBadge 적용 (PR #24)

`components/ui/status-badge.tsx`가 색 + 형태(점/사각/삼각) + 라벨 삼중 인코딩 제공. 한국 적록색약 5-8% 대응.

매핑 예 (설비 페이지):
- 가동중 → `go` (점/녹)
- 점검중 → `stop` (사각/적)
- 셋업중 → `watch` (삼각/주황)

### 9. 추가 모달 DRY 정리 (PR #24)

빈 상태와 일반 상태에 *동일한* 추가 모달 JSX를 따로 작성하던 패턴 → 단일 모달에 통합. 기능/입력 변경 0건 + 184줄 순삭제.

### 10. 다크 사이드바 + 라이트 메인 패턴 (PR #26)

`bg-ink` (#1a2236) 다크 사이드바 + `bg-paper` 라이트 메인 영역. DESIGN.md 기존 토큰 시스템 안에서 새 토큰 추가 0개로 측정실 *제어판* 미감 달성.

- 활성 메뉴 항목: `bg-gauge-cobalt + text-paper`
- 비활성: `text-paper/75 + hover:bg-paper/10`
- 모바일: 사이드바는 햄버거 슬라이드 드로어, `MobileBottomNav`(하단 탭 바)는 그대로 유지 (PRODUCT.md 작업자 한 손 우선)
- 11개 메뉴 항목 이모지 → lucide 아이콘 일괄 (Home/Factory/Wrench/RefreshCw/ClipboardList/Package/Trash2/BarChart3/Sparkles/Users/Settings)

### 11. 페이지 타이틀 중복 제거 (PR #26 사용자 피드백)

- 콘텐츠 영역 24px 헤딩 + subtitle *제거*, sticky 헤더 18px Title만 유지
- 도그마 근거: DESIGN.md "데이터가 영웅이다" — 진입 직후 첫 픽셀이 실제 데이터
- subtitle은 사이드바 메뉴 라벨이 이미 운반 (반복 제거)

### 12. 토글 → 드롭다운 변환 (PR #26)

언어/공장 선택을 가로 토글 → 드롭다운으로 변환. 모바일 가로 공간 압축 + 옵션 N개 확장 용이. 신규 `LanguageSelector` (Globe + KR/VN + chevron).

### 13. 사이드바 폭 드래그 리사이즈 (PR #26)

```tsx
const [sidebarWidth, setSidebarWidth] = useState(256)
const isResizing = useRef(false)
// 마우스 드래그: 200-420px 범위, 더블클릭으로 256px 리셋
// localStorage 'sidebar-width' 키로 영구 저장
// 모바일은 max-lg:!w-64 로 강제 고정 (드로어)
```

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
- **다크 사이드바**: `bg-ink` + `text-paper` + `text-paper/75` (PR #26에서 활용)

### 타이포그래피
- `text-caption` (12px), `text-label` (14px), `text-base` (16px), `text-title` (18px), `text-headline` (24px)

### Spacing
- `min-h-touch` (48px), `min-w-touch` (48px)

### 기타
- `rounded-md` (6px), `rounded-sm` (4px)
- `tabular`, `no-break`, `shadow-hover-lift`

### Anti-Patterns (제거 대상)
- `bg-white shadow-sm`, `hover:shadow-xl`, `hover:scale-*`, `rounded-lg/xl` (대→md), `text-sm` 본문, raw color 직접 사용, `bg-gradient-to-{br,r}` 멀티 색상, 이모지 아이콘 (lucide로 대체)
- 페이지 본문에 24px 헤딩 + subtitle 반복 (헤더가 이미 운반)
- 가로 토글 (옵션 ≤2일 때도 모바일 공간 비용 큼) → 드롭다운

---

## 📂 핵심 파일 위치

### 페이지 (app/dashboard/) — 적용 완료
- `app/dashboard/layout.tsx` — **사이드바 레이아웃 + Resize 핸들** (PR #26)
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

### 공유 컴포넌트
- `components/shared/LanguageSelector.tsx` — 신규 드롭다운 (PR #26)
- `components/shared/FactorySelector.tsx` — 토글 → 드롭다운 변환 (PR #26)
- `components/ui/status-badge.tsx` — Triple-Encoding StatusBadge
- `components/ui/no-break.tsx` — 줄바꿈 방지 wrapper

### 디자인 토큰 / i18n
- `tailwind.config.ts`
- `lib/i18n.ts`

---

## 📋 다음 세션 시작 시 체크리스트

1. `git status` 후 main 최신화 (`git pull --ff-only origin main`)
2. `npm run build` 통과 확인
3. 이 문서 읽기 (패턴/토큰/체크리스트 복기)
4. 타깃 페이지 분석: 사이즈 + 안티 패턴 카운트 grep으로 빠른 견적
5. `git checkout -b impeccable/<번호 또는 이름>`
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
11. **PowerShell 정규식 단어 경계** — `bg-yellow-50` 같은 패턴이 `bg-yellow-500` prefix 매칭 사고 (PR #25 회귀)

### Vercel 빌드 디버깅
- Vercel preview 실패 시 `npx vercel inspect dpl_<id> --logs | tail -30`
- 첫 사용 시 `npx vercel login` 인터랙티브 인증 (한 번만)

### Stack PR 함정
- **base 브랜치 머지 시 자동 CLOSED**: GitHub은 base가 삭제되면 PR을 자동 닫음, reopen 불가
- **회피책**: ① stacked PR 머지 직전에 base를 main으로 변경 ② 또는 main 베이스로 별도 PR

---

## 🔗 참조 PR 링크

- #13 inventory / #17 inbound / #18 outbound / #19 i18n labels / #20 locale fix
- **#22 CAM Sheet / #23 폐기 관리 / #24 설비 관리 / #25 분석 리포트 / #26 사이드바 레이아웃**

---

## 📝 임의 메모 / 미해결 의문

- InventoryListCard / OutboundHistoryCard `unitPrice` dead field 잔존 (PR #11/#18에서 보류)
- ToolChangeListCard 베트남어 시각 포맷 미세 차이
- StatusChangeDropdown 자체 토큰화 필요 (PR #24에서 분리)
- 4개 리포트 뷰 한글 하드코딩 후속 i18n 추출 (~30개 키)
- 4개 리포트 뷰에 ReportSortHeader/ReportSummaryCard 실제 적용 (~400줄 절감 가능)
- 사이드바 키보드 리사이즈 접근성 (좌·우 방향키 + Home/End 리셋)

---

## 🎯 세션 마감 시 상태

- **모든 PR 머지됨** (#22~#26)
- **남은 후보**: users / endmill (2개)
- **롤오버 후속 PR 후보**: StatusChangeDropdown 토큰화, 리포트 뷰 i18n + 컴포넌트 적용, PR #25 리뷰 important 이슈
- **레이아웃**: 사이드바 + 드롭다운 + Resize 핸들 모두 main에 반영됨
- **다음 세션 시작점**: 이 문서 → main pull → 사용자/엔드밀 페이지 중 하나 선택 → 새 브랜치 → 작업
