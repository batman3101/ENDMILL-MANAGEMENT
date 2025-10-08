# Vercel 환경 변수 설정 가이드

## 방법 1: 배포 중 설정 (첫 배포 시)

### Step 1: 프로젝트 Import
1. Vercel Dashboard (https://vercel.com/dashboard) 접속
2. **"Add New..." > "Project"** 클릭
3. GitHub 저장소 선택 후 **"Import"** 클릭

### Step 2: 환경 변수 입력
Configure Project 화면에서:

1. **"Environment Variables"** 섹션 펼치기
2. 각 변수를 하나씩 추가:

```
┌─────────────────────────────────────────────────────────┐
│ Environment Variables                                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Key                                                       │
│ ┌───────────────────────────────────────────────────┐   │
│ │ NEXT_PUBLIC_SUPABASE_URL                          │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ Value                                                     │
│ ┌───────────────────────────────────────────────────┐   │
│ │ https://xxxxx.supabase.co                         │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ Environment: ☑ Production  ☐ Preview  ☐ Development     │
│                                                           │
│ [Add Another]                                             │
└─────────────────────────────────────────────────────────┘
```

3. **"Add Another"** 버튼 클릭하여 나머지 변수 추가

4. 총 3개 변수 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. **"Deploy"** 버튼 클릭

---

## 방법 2: 배포 후 설정 (기존 프로젝트)

### Step 1: 프로젝트 Settings 접속
1. Vercel Dashboard에서 **프로젝트 선택**
2. 상단 메뉴에서 **"Settings"** 탭 클릭
3. 왼쪽 사이드바에서 **"Environment Variables"** 클릭

### Step 2: 환경 변수 추가

#### 화면 구성:
```
┌──────────────────────────────────────────────────────────────┐
│ Settings > Environment Variables                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Environment Variables are encrypted at rest and cannot be   │
│  viewed in plaintext after being set.                        │
│                                                               │
│  [+ Add New] ← 이 버튼 클릭                                    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ No environment variables found                         │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### 변수 추가 팝업:
```
┌─────────────────────────────────────────────────────┐
│ Add Environment Variable                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Key *                                                │
│ ┌──────────────────────────────────────────────┐   │
│ │ NEXT_PUBLIC_SUPABASE_URL                     │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ Value *                                              │
│ ┌──────────────────────────────────────────────┐   │
│ │ https://xxxxx.supabase.co                    │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ Environment *                                        │
│ ☑ Production                                         │
│ ☐ Preview                                            │
│ ☐ Development                                        │
│                                                      │
│              [Cancel]  [Add Variable]                │
└─────────────────────────────────────────────────────┘
```

### Step 3: 각 변수 입력

#### 1번 변수: Supabase URL
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://your-project.supabase.co`
- **Environment**: ☑ Production
- **"Add Variable"** 클릭

#### 2번 변수: Supabase Anon Key
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...` (긴 JWT 토큰)
- **Environment**: ☑ Production
- **"Add Variable"** 클릭

#### 3번 변수: Service Role Key
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...` (긴 JWT 토큰)
- **Environment**: ☑ Production
- **"Add Variable"** 클릭

### Step 4: 변수 저장 후 재배포

환경 변수 추가 후 화면:
```
┌──────────────────────────────────────────────────────────────┐
│ Environment Variables                                         │
├──────────────────────────────────────────────────────────────┤
│  [+ Add New]                                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Key                              │ Environment  │ Actions│ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ NEXT_PUBLIC_SUPABASE_URL        │ Production   │ [Edit] │ │
│  │ NEXT_PUBLIC_SUPABASE_ANON_KEY   │ Production   │ [Edit] │ │
│  │ SUPABASE_SERVICE_ROLE_KEY       │ Production   │ [Edit] │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**중요:** 환경 변수를 추가한 후 프로젝트를 **재배포**해야 적용됩니다!

재배포 방법:
1. **"Deployments"** 탭으로 이동
2. 최신 배포 옆 **"⋯" 메뉴** 클릭
3. **"Redeploy"** 선택
4. **"Redeploy"** 버튼 클릭

---

## 방법 3: Vercel CLI 사용

### CLI 설치 및 로그인
```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 프로젝트 연결
vercel link
```

### 환경 변수 추가
```bash
# Production 환경에 변수 추가
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# 입력창에 값 입력: https://xxxxx.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# 입력창에 값 입력: eyJhbGc...

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# 입력창에 값 입력: eyJhbGc...
```

### 환경 변수 확인
```bash
# 모든 환경 변수 목록 보기
vercel env ls

# 특정 변수 값 확인 (보안상 일부만 표시됨)
vercel env pull
```

---

## Supabase에서 값 가져오기

### Supabase Dashboard에서 키 확인:

1. **https://supabase.com/dashboard** 접속
2. 프로젝트 선택
3. **Settings (⚙️)** 클릭
4. **API** 메뉴 선택

```
┌─────────────────────────────────────────────────────┐
│ Project API                                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Project URL                                          │
│ ┌──────────────────────────────────────────────┐   │
│ │ https://xxxxx.supabase.co            [Copy]  │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ API Keys                                             │
│                                                      │
│ anon public                                          │
│ ┌──────────────────────────────────────────────┐   │
│ │ eyJhbGciOiJIUzI1NiIs...          [Copy]     │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ service_role secret ⚠️                               │
│ ┌──────────────────────────────────────────────┐   │
│ │ eyJhbGciOiJIUzI1NiIs...          [Copy]     │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ ⚠️ Never share your service_role key publicly       │
└─────────────────────────────────────────────────────┘
```

### 복사할 값:
1. **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
2. **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

---

## 환경별 설정 차이

### Production (프로덕션)
- `main` 브랜치 배포 시 사용
- 실제 서비스용 환경
- ☑ Production 체크

### Preview (프리뷰)
- Pull Request나 다른 브랜치 배포 시 사용
- 테스트용 환경
- ☐ Preview 체크 (선택사항)

### Development (개발)
- 로컬 개발 환경
- `vercel dev` 명령어 실행 시 사용
- ☐ Development 체크 (일반적으로 불필요)

**권장 설정:** Production만 체크 ✅

---

## 주의사항

### 1. 변수명 정확성
- **대소문자 구분**: `NEXT_PUBLIC_SUPABASE_URL` (O) vs `next_public_supabase_url` (X)
- **언더스코어**: `_` 빠뜨리지 않기
- **접두사**: `NEXT_PUBLIC_` 정확히 입력

### 2. 값 복사 시
- 앞뒤 공백 제거
- 전체 값 복사 (JWT는 매우 김)
- 따옴표 없이 값만 입력

### 3. 보안
- `service_role` 키는 절대 공개 금지
- GitHub에 커밋 금지
- 팀원과 공유 시 안전한 방법 사용

### 4. 재배포 필수
- 환경 변수 추가/수정 후 반드시 **Redeploy** 실행
- 기존 배포는 새 변수를 인식하지 못함

---

## 환경 변수 테스트

배포 후 작동 확인:

### 브라우저 콘솔에서 확인
```javascript
// F12 > Console
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// 출력: https://xxxxx.supabase.co

// ⚠️ 다음은 undefined (클라이언트에 노출 안됨)
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)
// 출력: undefined (정상)
```

### 서버 로그에서 확인
Vercel Dashboard > Deployments > Functions > Logs에서 확인

---

## 문제 해결

### 변수가 적용되지 않을 때
1. **재배포 확인**: Redeploy 실행했는지 확인
2. **변수명 확인**: 대소문자, 철자 정확한지 확인
3. **Environment 선택**: Production 체크 확인
4. **캐시 삭제**: 브라우저 캐시 삭제 후 재시도

### "Environment variable not found" 오류
- Vercel Dashboard에서 변수 추가 확인
- `NEXT_PUBLIC_` 접두사 확인
- 재배포 실행

### Supabase 연결 실패
- URL 형식 확인: `https://`로 시작하는지
- 키 값 전체 복사되었는지 확인
- Supabase 프로젝트가 활성화 상태인지 확인

---

## 추가 팁

### 환경 변수 백업
```bash
# 로컬에 환경 변수 저장 (Git에 커밋 금지!)
vercel env pull .env.local
```

### 일괄 설정 (vercel.json 사용)
```json
{
  "env": {
    "NODE_ENV": "production"
  }
}
```
단, 민감한 정보는 Dashboard에서 직접 설정 권장

### 여러 환경 동시 설정
Preview와 Production에 같은 값 사용:
- ☑ Production
- ☑ Preview
양쪽 모두 체크

---

## 도움말

- Vercel 공식 문서: https://vercel.com/docs/concepts/projects/environment-variables
- Supabase 공식 문서: https://supabase.com/docs/guides/api
- 지원 요청: https://vercel.com/support
