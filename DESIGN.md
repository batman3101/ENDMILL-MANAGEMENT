---
name: CNC Endmill Management
description: 800대 CNC 장비의 엔드밀 공구 라이프사이클을 다루는 공장 운영 신경계
colors:
  gauge-cobalt: "#1e3a8a"
  gauge-cobalt-strong: "#1e40af"
  gauge-cobalt-soft: "#dbeafe"
  paper: "#fdfdfe"
  paper-warm: "#f8f9fb"
  divider: "#e6e8ee"
  ink: "#1a2236"
  ink-soft: "#475569"
  ink-mute: "#94a3b8"
  signal-go: "#10b981"
  signal-go-soft: "#d1fae5"
  signal-go-strong: "#047857"
  signal-watch: "#f59e0b"
  signal-watch-soft: "#fef3c7"
  signal-watch-strong: "#b45309"
  signal-stop: "#ef4444"
  signal-stop-soft: "#fee2e2"
  signal-stop-strong: "#b91c1c"
typography:
  display:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  body:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0"
  caption:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.01em"
  mono:
    fontFamily: "JetBrains Mono, Menlo, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.gauge-cobalt}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
    typography: "{typography.label}"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.gauge-cobalt-strong}"
    textColor: "{colors.paper}"
  button-primary-action:
    backgroundColor: "{colors.gauge-cobalt}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "16px 32px"
    typography: "{typography.label}"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
    typography: "{typography.label}"
    height: "44px"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "44px"
  input-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    typography: "{typography.body}"
    height: "44px"
  card-default:
    backgroundColor: "{colors.paper-warm}"
    rounded: "{rounded.md}"
    padding: "24px"
  badge-go:
    backgroundColor: "{colors.signal-go-soft}"
    textColor: "{colors.signal-go-strong}"
    rounded: "999px"
    padding: "4px 10px"
    typography: "{typography.caption}"
  badge-watch:
    backgroundColor: "{colors.signal-watch-soft}"
    textColor: "{colors.signal-watch-strong}"
    rounded: "999px"
    padding: "4px 10px"
    typography: "{typography.caption}"
  badge-stop:
    backgroundColor: "{colors.signal-stop-soft}"
    textColor: "{colors.signal-stop-strong}"
    rounded: "999px"
    padding: "4px 10px"
    typography: "{typography.caption}"
  nav-item-active:
    backgroundColor: "{colors.gauge-cobalt-soft}"
    textColor: "{colors.gauge-cobalt-strong}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

# Design System: CNC Endmill Management

## 1. Overview

**Creative North Star: "The Quiet Instrument"**

이 시스템은 도구가 자신을 드러내지 않는다는 한 문장에 종속됩니다. 측정자가 마이크로미터를 다룰 때 마이크로미터를 인식하지 않듯, 작업자는 이 인터페이스를 인식하지 않고 데이터를 다뤄야 합니다. Bloomberg Terminal의 정보 밀도, Linear의 절제된 인터랙션, 그리고 1970년대 Mazak 공작기계 매뉴얼의 정확성이 교차하는 지점입니다. 데이터(공구 교체 이력, 재고 카운트, 800대 장비 상태)가 주인공이고, 인터페이스는 그 데이터가 정확하고 신속하게 도달할 수 있는 통로일 뿐입니다.

이 시스템은 명시적으로 거부합니다: AI가 생성한 SaaS 템플릿 대시보드(4-카드 히어로 메트릭, 그라데이션 액센트, "Welcome back!" 인사), Bootstrap admin 템플릿(AdminLTE/Tabler 스타일의 무한 카드 격자), Material Design 3의 그림자 종속 카드와 FAB 버튼, 그리고 1990년대 ERP UI의 트리 메뉴와 겹친 창. 화려함이 제거되고 정확성만 남는 자리.

**Key Characteristics:**
- 단일 산세리프(Pretendard)가 헤딩·본문·라벨·데이터를 모두 담당. 디스플레이/본문 페어링 없음.
- 색은 ≤10% 표면에만 — 80% 이상이 paper/divider/ink로 채워진 캔버스.
- 그림자 거의 없음. 깊이는 1px divider와 미묘한 surface 차이로 표현.
- 모든 숫자 tabular. 자릿수 흔들림은 디자인 실패.
- 스마트폰 360px 폭에서 먼저 작동. 데스크톱은 그리드 확장.
- 한국어 어절은 절대 중간에서 끊지 않음. `word-break: keep-all` 전역 강제.

## 2. Colors

The Quiet Instrument 팔레트는 측정실의 분위기 — 백색 표면 위에 흑잉크와 코발트, 거기에 작은 신호색 — 으로 구성됩니다. 색은 도구가 아니라 *상태 신호*입니다.

### Primary

- **Gauge Cobalt** (`#1e3a8a` / `oklch(0.36 0.15 264)`): 1차 액션 버튼, 활성 내비게이션, 선택 상태. 한 화면 표면의 10% 이하만 차지. 회사 브랜드 정체성과 정합되지만, 화려한 액센트가 아니라 *권위 있는 침묵*으로 기능. Stripe Dashboard의 indigo와 같은 자리.
- **Gauge Cobalt Strong** (`#1e40af`): hover/pressed 상태. 정지 상태보다 한 단계 진해짐 — 사용자가 누르고 있음을 확인하는 정도로만.
- **Gauge Cobalt Soft** (`#dbeafe`): 활성 nav 배경, 선택 row tint, focus glow. 매우 옅은 indigo — 작업자가 "여기 있구나"를 *느끼지만 의식하지는 않는* 정도.

### Neutral

- **Paper** (`#fdfdfe` / `oklch(0.99 0.003 264)`): 베이스 표면. 순백 `#fff` 사용 금지 — 미세한 indigo undercast로 cobalt 계열과 정합. 모든 페이지의 배경.
- **Paper Warm** (`#f8f9fb`): 카드 표면. paper 위에 0.5단계 짙음. 그림자 없이도 카드를 구별시킴.
- **Divider** (`#e6e8ee`): 1px border, table row separator, 카드 윤곽선. 시스템의 *구조선*. 그림자보다 이걸로 깊이를 표현.
- **Ink** (`#1a2236`): 주 텍스트. 순흑 `#000` 금지 — indigo 계열과 정합되는 짙은 청회색. 헤딩·본문·중요 데이터.
- **Ink Soft** (`#475569`): 보조 텍스트, 라벨, 메타데이터. 본문보다 한 단계 약함.
- **Ink Mute** (`#94a3b8`): placeholder, disabled, helper text. 가장 약한 텍스트 톤 — 그러나 WCAG AA(4.5:1)는 paper 배경에서 통과.

### Tertiary — Status Signals (각 3단계)

- **Signal Go** (`#10b981` / `oklch(0.62 0.16 152)`): 정상 상태의 canonical 녹색. 점 아이콘 + "정상" 라벨과 항상 함께.
- **Signal Go Soft** (`#d1fae5`): 정상 배지 배경.
- **Signal Go Strong** (`#047857`): 정상 배지 텍스트 (signal-go-soft 위에서 7:1 명도비).
- **Signal Watch** (`#f59e0b`): 경고 상태의 호박색. 삼각형 아이콘 + "경고" 라벨과 함께.
- **Signal Watch Soft** (`#fef3c7`): 경고 배지 배경.
- **Signal Watch Strong** (`#b45309`): 경고 배지 텍스트.
- **Signal Stop** (`#ef4444`): 위험 상태의 빨강. 사각형 아이콘 + "위험" 라벨과 함께.
- **Signal Stop Soft** (`#fee2e2`): 위험 배지 배경.
- **Signal Stop Strong** (`#b91c1c`): 위험 배지 텍스트.

### Named Rules

**The One Voice Rule.** Gauge Cobalt는 한 화면의 10%를 넘지 않는다. 그 희소성이 신뢰의 근거다. 카드 헤더, 표 헤더, body 텍스트는 모두 ink/ink-soft. cobalt는 1차 액션·활성 nav·선택 상태에만.

**The Tinted Neutral Rule.** 시스템에 `#000`과 `#fff`은 존재하지 않는다. 모든 neutral은 cobalt 계열로 미세하게(chroma 0.003-0.01) tint되어 있다. 이걸 어기면 시스템 정합이 무너진다.

**The Triple-Encoding Rule.** 상태 정보(정상/경고/위험)는 절대 색만으로 전달하지 않는다. 색 + 형태(점/삼각형/사각형) + 라벨("정상"/"경고"/"위험") 삼중 인코딩이 의무. 한국 남성 적록색약 5-8% 대응이자, 이중 검증 도그마.

## 3. Typography

**Display Font:** Pretendard Variable (with `-apple-system, BlinkMacSystemFont, system-ui, sans-serif` fallback)
**Body Font:** Pretendard Variable (단일 패밀리가 모든 역할 담당)
**Mono Font:** JetBrains Mono (with `Menlo, Consolas, monospace` fallback) — 식별자(C001, T-24, PA1)와 데이터 표 전용

**Character:** Pretendard는 한국어와 라틴 확장(베트남어 디아크리틱 포함)이 동일한 시각 무게로 정합되도록 설계되었습니다. 가변(Variable) 폰트라 weight 전환이 자연스럽고, BYOD 환경에서도 self-host로 안정 로딩됩니다. 단일 패밀리가 헤딩·본문·라벨·데이터를 모두 담당 — display/body 페어링이 없는 것은 *디자인 결정*입니다 (product 레지스터 도그마).

### Hierarchy

- **Display** (600, 30px / 1.875rem, line-height 1.2, letter-spacing −0.01em): 보고서 표지·로그인 환영문 등 단일 등장 헤딩. 일반 페이지에서는 거의 등장하지 않음.
- **Headline** (600, 24px / 1.5rem, line-height 1.3, letter-spacing −0.005em): 페이지 H1 ("교체 실적", "재고 관리"). 페이지당 한 번만.
- **Title** (600, 18px / 1.125rem, line-height 1.4): 섹션 헤더, 카드 타이틀, 다이얼로그 제목. *24px이 아니다*.
- **Body** (400, 16px / 1rem, line-height 1.6): 모든 본문, 폼 입력 텍스트, 카드 콘텐츠. **16px이 절대 하한**. 14px로 줄어들지 않음.
- **Label** (500, 14px / 0.875rem, line-height 1.5): 폼 라벨, 버튼 텍스트, 보조 메타데이터, 표 헤더.
- **Caption** (400, 12px / 0.75rem, line-height 1.5, letter-spacing 0.01em): 타임스탬프, 헬퍼 텍스트, 상태 배지. 가장 작은 텍스트 — 그 이하로 내려가지 않음.
- **Mono** (500, 14px, line-height 1.5): 식별자(C001, T-24), 표 안의 숫자가 아닌 코드, 시스템 로그.

### Named Rules

**The Single Family Rule.** 디스플레이/본문 페어링은 brand register의 사치다. The Quiet Instrument는 단일 Pretendard로 모든 역할을 처리한다. 다른 산세리프를 추가하지 않는다.

**The Tabular Numbers Rule.** 모든 수치(재고 카운트, 비용, 시간, 작업자 ID, 공구 잔여 수명)는 `font-variant-numeric: tabular-nums` 적용. 표·카드·다이얼로그 어디서든 자릿수 흔들림 0. 1,234가 1,235로 변할 때 1만 흔들리고 나머지는 고정되어야 함.

**The Korean Word-Break Rule.** 전역 `word-break: keep-all`. 한국어는 어절(공백 단위)에서만 끊는다. 어절 중간에서 끊기면 *디자인 실패*다. 비상시 `overflow-wrap: anywhere`는 URL·코드 토큰에만 한정.

**The 16px Floor Rule.** 본문 폰트는 16px 아래로 내려가지 않는다. 모바일 자동 줌 방지 + 가독성. 14px은 라벨·캡션 전용이며, 주요 정보를 14px에 두면 그 정보의 우선순위가 잘못된 것이다.

**The Mixed Token Wrap Rule.** "PA1 모델", "T-24 위치", "C001 장비" 같은 한글+영숫자 합성은 `<span style="white-space: nowrap">`으로 감싸 한 토큰으로 보호한다. 컴포넌트 레벨 패턴 (`<NoBreak>` 컴포넌트) 필수.

**The Vietnamese Diacritic Protection Rule.** 베트남어 본문은 line-height 1.7 이상. 1.5는 `đ`, `ầ`, `ề` 위쪽 마커가 잘리는 위험.

## 4. Elevation

The Quiet Instrument는 **기본 평면(flat-by-default)** 입니다. 깊이는 그림자가 아니라 **divider(1px) + paper/paper-warm 표면 차이**로 표현됩니다. 그림자는 *도구를 드러내는* 시각 잡음이라, 정지 상태에서는 거의 사용하지 않습니다. 예외는 진정한 오버레이(다이얼로그, 드롭다운, 툴팁) — 이때만 그림자가 *물리적 거리*를 표현합니다.

### Shadow Vocabulary

- **Popover** (`box-shadow: 0 4px 12px rgba(26, 34, 54, 0.10), 0 0 0 1px #e6e8ee`): 드롭다운, 툴팁, 콤보박스. 그림자보다 1px ring이 윤곽 결정.
- **Modal** (`box-shadow: 0 16px 48px rgba(26, 34, 54, 0.18)`): 다이얼로그·풀스크린 모달. 진정한 z 레이어 진입을 알림.
- **Hover Lift** (`box-shadow: 0 1px 3px rgba(26, 34, 54, 0.08)`): 카드·버튼 호버 시. 매우 미묘하게, 깜박이지 않을 정도로만.

### Named Rules

**The Flat-By-Default Rule.** 표면은 정지 상태에서 평면이다. 그림자는 상태 변화(hover, focus)나 진정한 오버레이(modal, popover)의 *물리적 응답*으로만 등장한다. 카드를 "더 잘 보이게" 그림자를 추가하는 행위는 시스템에 대한 배신이다.

**The 1px Structure Rule.** 깊이는 1px divider로 표현한다. 그림자는 평면 위 부유물에만, divider는 평면 안 구획에. 두 개를 섞지 않는다.

## 5. Components

### Buttons

- **Shape:** 4px 라디우스 (`{rounded.sm}`). 둥근 정도가 정확히 측정된 calibration의 미감. 8px 이상 라운드는 SaaS 클리셰.
- **Primary:** `gauge-cobalt` 채움 + `paper` 텍스트, 높이 48px (모바일 안전 터치), 패딩 12px 24px, label 타입(14px / 500). hover 시 `gauge-cobalt-strong` 채움. focus 시 2px ring `gauge-cobalt-soft` (offset 2px).
- **Primary Action (1차 액션):** 모바일에서 화면 하단 고정 위치 1차 버튼. 높이 56px, 패딩 16px 32px. 한 화면에 정확히 0개 또는 1개만 등장.
- **Secondary:** `paper` 채움 + 1px `divider` 보더 + `ink` 텍스트, 높이 44px. hover 시 `paper-warm` 채움.
- **Ghost:** 보더 없음, `ink-soft` 텍스트. 보조 액션 (취소, 닫기). hover 시 `paper-warm` 채움.
- **Destructive:** `signal-stop` 채움 + `paper` 텍스트. 삭제·되돌리기 불가 액션 전용. 확인 다이얼로그와 함께 등장.
- **Text Wrapping:** `whitespace: nowrap` 강제. 한국어 라벨이 짧은 동사("기록", "확인", "저장", "취소") 사용. 길어지면 아이콘으로 대체.

### Inputs / Fields

- **Style:** 1px `divider` 보더, `paper` 배경, 4px 라디우스, 패딩 12px 14px, 높이 44px (`label`이 위에 별도 줄로 배치, 좌우 분할 폼 금지).
- **Body 텍스트 16px** (모바일 자동 줌 방지). placeholder는 `ink-mute`.
- **Focus:** 보더가 2px `gauge-cobalt`로 굵어짐 (라디우스는 유지). focus glow 박스 그림자 없음 — 보더 굵기로만 응답.
- **Error:** 보더 2px `signal-stop`, helper 텍스트 `signal-stop-strong` (12px caption). 아이콘(!) 삼각형 동반.
- **Disabled:** 배경 `paper-warm`, 텍스트 `ink-mute`, `cursor: not-allowed`.

### Cards / Containers

- **Corner Style:** 6px 라디우스 (`{rounded.md}`).
- **Background:** `paper-warm` (paper 위에서 한 단계 짙음 — 그림자 없이 구별).
- **Border:** 1px `divider`. 다른 카드와의 경계 분명.
- **Shadow Strategy:** 정지 상태 그림자 없음. 호버 시 `Hover Lift` 만 (미묘하게).
- **Internal Padding:** 모바일 16px / 데스크톱 24px (`{spacing.md}` / `{spacing.lg}` 반응형).
- **CardTitle:** **18px / 600 weight** (Title 토큰). *24px가 아니다*. 카드 타이틀은 본문보다 한 단계 강하지만 페이지 헤딩보다는 약하다.

### Chips / Status Badges

- **Style:** 999px 라운드 (rounded-full), 패딩 4px 10px, 12px caption / 500 weight.
- **Triple Encoding (필수):** 색 + 형태(아이콘) + 라벨 — 단일 색만 절대 안 됨.
- **Go (정상):** 배경 `signal-go-soft`, 텍스트 `signal-go-strong`, 점(•) 아이콘, 라벨 "정상".
- **Watch (경고):** 배경 `signal-watch-soft`, 텍스트 `signal-watch-strong`, 삼각형(▲) 아이콘, 라벨 "경고".
- **Stop (위험):** 배경 `signal-stop-soft`, 텍스트 `signal-stop-strong`, 사각형(■) 아이콘, 라벨 "위험".

### Navigation

- **Desktop (≥ 1024px):** 좌측 사이드바, 폭 280px, `paper-warm` 배경, 1px right divider. 단일 컬럼 nav 항목 리스트.
- **Mobile (< 1024px):** 화면 하단 고정 탭 바. 높이 56px + safe-area-inset-bottom. 4-5개 탭 (대시보드 / 교체 / 재고 / 보고서 / 더보기).
- **Active 상태:** `gauge-cobalt-soft` 배경 + `gauge-cobalt-strong` 텍스트. 4px 라디우스.
- **Touch target:** 모바일 56×56px, 데스크톱 40×40px (좁은 사이드바 폭에 맞춤).
- **Typography:** label (14px / 500). 라벨이 한 줄을 넘지 않게 짧은 단어 사용.

### Tables → Mobile Card Lists

- **Desktop (≥ 768px):** 표준 표. 헤더 `label` 14px / 500 weight, 행 `body` 16px tabular-nums, 행 구분 1px `divider`. 호버 시 행 배경 `paper-warm`. 줄무늬 안 함.
- **Mobile (< 768px):** **표가 카드 리스트로 변신.** 한 행 = 한 카드. 주키(예: 장비번호 C001) 18px title 위치, 그 아래 라벨:값 페어를 12px caption 라벨 + 16px body 값. 가로 스크롤 절대 금지.
- **DataTable 컴포넌트:** viewport 분기로 두 모드를 자동 전환.

### Forms (Mobile-first)

- 모든 폼 필드는 위에서 아래로 1열 배치. 좌우 분할 (`grid-cols-2`) 모바일 금지.
- 라벨 위, 입력 아래, 헬퍼 텍스트 그 아래.
- 1차 액션은 폼 하단 고정 영역 (sticky bottom + safe-area-inset-bottom).
- 키보드 올라올 때 활성 입력이 보이도록 `scroll-margin-top: 24vh` 설정.

### Bottom Action Bar (Signature Mobile Component)

모바일에서 1차 액션을 화면 하단에 고정하는 패턴. 이 시스템의 *시그니처*입니다.

- 화면 하단 고정 (`position: fixed; bottom: 0`).
- 배경 `paper`, 1px top divider, 패딩 16px + safe-area-inset-bottom.
- 내부에 56px 높이 `button-primary-action` 1개 또는 secondary + primary 2개 배치.
- 콘텐츠 영역에 `padding-bottom: calc(56px + 32px + safe-area)`로 가림 방지.

## 6. Do's and Don'ts

### Do:

- **Do** Gauge Cobalt를 화면 표면 ≤10%에만 사용한다. 1차 액션, 활성 nav, 선택 상태에 한정.
- **Do** 모든 neutral을 cobalt 계열로 미세하게 tint된 paper/divider/ink로 사용한다. `#fff`, `#000` 절대 금지.
- **Do** 한국어 텍스트에 `word-break: keep-all` 전역 적용. `<NoBreak>` 컴포넌트로 "PA1 모델", "T-24 위치" 같은 혼합 토큰 보호.
- **Do** 모든 수치에 `font-variant-numeric: tabular-nums`. 표·카드·다이얼로그 어디든.
- **Do** 본문 16px 하한 유지. 작아질 정보는 *지워질* 정보다.
- **Do** 상태(정상/경고/위험)는 색 + 아이콘 + 라벨 삼중 인코딩.
- **Do** 모바일 폼에서 라벨 위·입력 아래 1열 배치, 1차 액션은 화면 하단 고정.
- **Do** 모바일 표는 카드 리스트로 변환. 가로 스크롤 0.
- **Do** 모든 인터랙티브 요소에 default/hover/focus/active/disabled/loading 6 상태를 정의.

### Don't:

- **Don't** AI가 생성한 SaaS 템플릿 대시보드를 만든다 — 4-카드 히어로 메트릭, 그라데이션 액센트, 샘플 라인차트, "Welcome back, [Name]!" 인사. PRODUCT.md의 1순위 안티 패턴.
- **Don't** Bootstrap admin 템플릿(AdminLTE/Tabler) 스타일 — 고채도 primary, 아이콘+제목+숫자 카드의 무한 격자.
- **Don't** Material Design 3 그림자 종속 카드와 FAB 버튼.
- **Don't** 사이드 스트라이프 보더(1px 초과의 `border-left`/`border-right` 액센트). 카드·알림·콜아웃에 절대 금지.
- **Don't** 그라데이션 텍스트(`background-clip: text` + gradient). 단색만 사용, 강조는 weight나 size로.
- **Don't** 글래스모피즘(blur + translucent) 디폴트로 사용. 매우 드물게 한정된 목적이거나 아예 0.
- **Don't** 동일한 카드의 반복 격자 — 시각 피로의 원흉.
- **Don't** 모달이 첫 번째 생각이 되는 패턴. 인라인·점진적 노출을 먼저 시도.
- **Don't** em dash(`—`, `--`)를 UI 카피에 사용. 쉼표·콜론·세미콜론·괄호로 대체.
- **Don't** 카드 타이틀에 24px (`text-2xl`) 사용. 18px Title 토큰을 사용.
- **Don't** 본문이나 핵심 데이터에 14px 사용. Body 16px 하한.
- **Don't** 한국어 텍스트의 어절 중간이 줄바꿈된다. `word-break: keep-all` 누락 = 디자인 실패.
- **Don't** 데스크톱 Shadcn Dialog와 globals.css의 `.mobile-modal-*` 두 시스템을 혼용. 단일 다이얼로그 컴포넌트로 통합 (반응형 분기 내장).
- **Don't** 표를 모바일에서 가로 스크롤로 처리. 카드 리스트로 변환.
- **Don't** 1차 액션을 화면 우상단에 두는 데스크톱 패턴을 모바일에 그대로 가져온다. 엄지 영역(하단 60%)에 배치.
- **Don't** 모션을 장식으로 사용. 모션은 상태 변화의 *응답*으로만, 150-250ms ease-out-quart.
- **Don't** 원시 hex `#10b981`을 컴포넌트에 직접 박는다. `signal-go` 토큰을 통해 참조.
