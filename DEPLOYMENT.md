# Vercel 배포 가이드

CNC Endmill Management System을 Vercel에 배포하는 방법을 단계별로 설명합니다.

## 사전 준비

### 1. Vercel 계정 생성
- [Vercel](https://vercel.com) 접속
- GitHub 계정으로 로그인

### 2. Supabase 프로젝트 준비
프로덕션용 Supabase 프로젝트가 준비되어 있어야 합니다.

**필요한 정보:**
- Supabase Project URL
- Supabase Anon Key
- Supabase Service Role Key

**확인 방법:**
1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 프로젝트 선택
3. Settings > API 메뉴
4. Project URL, anon key, service_role key 복사

## 배포 단계

### Step 1: GitHub 저장소 준비

```bash
# 1. 변경사항 커밋
git add .
git commit -m "프로덕션 배포 준비"

# 2. GitHub에 Push
git push origin main
```

### Step 2: Vercel 프로젝트 생성

#### 방법 1: Vercel Dashboard 사용

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard
   - "Add New..." > "Project" 클릭

2. **GitHub 저장소 연결**
   - "Import Git Repository" 선택
   - GitHub 저장소 검색 및 선택
   - "Import" 클릭

3. **프로젝트 설정**
   - **Framework Preset**: Next.js 자동 감지
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (자동 설정됨)
   - **Output Directory**: `.next` (자동 설정됨)

#### 방법 2: Vercel CLI 사용

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 프로젝트 배포
vercel

# 프로덕션 배포
vercel --prod
```

### Step 3: 환경 변수 설정

**중요:** 배포 전에 반드시 환경 변수를 설정해야 합니다.

1. **Vercel Dashboard에서 설정**
   - 프로젝트 선택
   - Settings > Environment Variables
   - 다음 변수들을 추가:

```bash
# Supabase 연결 정보
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 환경 설정
NODE_ENV=production
```

2. **Environment 선택**
   - Production: ✅ (체크)
   - Preview: ✅ (선택사항)
   - Development: ❌ (체크 해제)

3. **Save 버튼 클릭**

### Step 4: 배포 실행

환경 변수 설정 후:

1. **Deployments 탭으로 이동**
2. **"Redeploy" 버튼 클릭** (환경 변수 적용을 위해)
3. 배포 로그 확인

또는 Git Push로 자동 배포:
```bash
git push origin main
# Vercel이 자동으로 감지하여 배포 시작
```

### Step 5: 도메인 설정

1. **Settings > Domains** 메뉴
2. 기본 제공 도메인: `your-project.vercel.app`
3. 커스텀 도메인 추가 (선택사항):
   - "Add" 버튼 클릭
   - 도메인 입력 (예: endmill.yourdomain.com)
   - DNS 설정 안내에 따라 CNAME 레코드 추가

## 배포 후 확인 사항

### 1. 기본 기능 테스트
- [ ] 로그인 페이지 접속
- [ ] 관리자 계정으로 로그인
- [ ] 대시보드 데이터 로딩
- [ ] 설비 관리 페이지
- [ ] 교체 실적 기록

### 2. Supabase 연결 확인
```bash
# 브라우저 콘솔에서 확인
# F12 > Console > Network 탭
# API 호출이 정상적으로 이루어지는지 확인
```

### 3. 환경 변수 확인
- Vercel Dashboard > Settings > Environment Variables
- 모든 필수 변수가 설정되어 있는지 확인

## 트러블슈팅

### 빌드 실패 시

**오류: "Module not found"**
```bash
# package.json 확인
# 모든 dependencies가 올바르게 설치되었는지 확인
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

**오류: "Environment variable missing"**
- Vercel Dashboard > Settings > Environment Variables
- 필수 환경 변수 누락 여부 확인
- 변수 추가 후 "Redeploy" 실행

### 런타임 오류 시

**500 Internal Server Error**
1. Vercel Dashboard > Deployments > 해당 배포 클릭
2. "Functions" 탭에서 에러 로그 확인
3. Supabase 연결 정보가 올바른지 확인

**Supabase 연결 실패**
1. Supabase Dashboard > Settings > API
2. Project URL과 Keys가 올바른지 확인
3. Supabase > Settings > Database > Connection pooling 활성화 (권장)

### 성능 최적화

**이미지 최적화**
- Next.js Image 컴포넌트 사용 확인
- 자동 최적화 활성화

**캐싱 설정**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=120' }
        ]
      }
    ]
  }
}
```

## 자동 배포 설정

### Git 브랜치 전략

**Production (main 브랜치)**
- `main` 브랜치에 Push하면 자동으로 프로덕션 배포
- 안정된 코드만 merge

**Preview (develop 브랜치)**
```bash
# develop 브랜치 생성
git checkout -b develop

# Vercel에서 자동으로 Preview 배포 생성
git push origin develop
```

### Vercel 배포 설정

Vercel Dashboard > Settings > Git:
- **Production Branch**: `main`
- **Preview Deployments**: ✅ 활성화
- **Automatic Deployments**: ✅ 활성화

## 모니터링

### Vercel Analytics
1. Settings > Analytics 활성화
2. 웹 성능 지표 확인:
   - Page Load Time
   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)

### 로그 확인
- Vercel Dashboard > Deployments > 배포 선택
- Runtime Logs 탭에서 실시간 로그 확인

## 롤백 방법

문제 발생 시 이전 배포로 즉시 롤백:

1. **Vercel Dashboard > Deployments**
2. 안정된 이전 배포 선택
3. **"Promote to Production"** 클릭
4. 즉시 롤백 완료

## 비용 관리

### Vercel 요금제
- **Hobby (무료)**:
  - 개인 프로젝트
  - 100GB 대역폭/월
  - 무제한 배포

- **Pro ($20/월)**:
  - 팀 협업
  - 1TB 대역폭/월
  - 우선 지원

### Supabase 요금제
- **Free Tier**:
  - 500MB 데이터베이스
  - 1GB 파일 저장소
  - 50MB 실시간 구독

- **Pro ($25/월)**:
  - 8GB 데이터베이스
  - 100GB 파일 저장소
  - 무제한 실시간 구독

## 보안 체크리스트

- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Supabase Service Role Key가 Git에 커밋되지 않았는지 확인
- [ ] Vercel 환경 변수가 올바르게 설정되었는지 확인
- [ ] Supabase RLS (Row Level Security) 정책 활성화 확인
- [ ] HTTPS만 사용하도록 설정 (Vercel 자동 설정)
- [ ] CORS 설정 확인

## 유지보수

### 정기 업데이트
```bash
# 의존성 업데이트
npm update

# 보안 취약점 확인
npm audit

# 보안 취약점 자동 수정
npm audit fix

# 커밋 및 배포
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### 데이터베이스 마이그레이션
1. Supabase Dashboard > Database > Migrations
2. 새 마이그레이션 파일 생성
3. SQL 실행
4. 애플리케이션 재배포

## 추가 리소스

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)

## 지원

배포 관련 문의:
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
