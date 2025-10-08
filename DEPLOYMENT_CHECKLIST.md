# 배포 체크리스트

프로덕션 배포 전에 반드시 확인해야 할 항목들입니다.

## 배포 전 준비 (Pre-Deployment)

### 코드 품질
- [ ] TypeScript 컴파일 오류 없음 (`npm run build`)
- [ ] ESLint 경고/오류 해결 (`npm run lint`)
- [ ] console.log 제거 (프로덕션 코드)
- [ ] 주석 처리된 코드 정리
- [ ] 사용하지 않는 import 제거

### 환경 변수
- [ ] `.env.local`이 `.gitignore`에 포함됨
- [ ] `.env.production.example` 파일 최신 상태
- [ ] Vercel에 필수 환경 변수 설정 완료:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NODE_ENV=production`

### 데이터베이스 (Supabase)
- [ ] 프로덕션 Supabase 프로젝트 생성
- [ ] 모든 테이블 생성 완료
- [ ] RLS (Row Level Security) 정책 활성화
- [ ] 인덱스 최적화 확인
- [ ] 백업 설정 활성화
- [ ] 마이그레이션 실행 완료

### 보안
- [ ] TEMP_AUTH 변수 제거 (프로덕션)
- [ ] API 라우트 권한 검증 확인
- [ ] CORS 설정 확인
- [ ] 민감한 정보 하드코딩 제거
- [ ] Service Role Key 절대 클라이언트 노출 안됨

### 성능 최적화
- [ ] 이미지 최적화 (Next.js Image 컴포넌트 사용)
- [ ] 불필요한 dependencies 제거
- [ ] 번들 크기 확인 (`npm run build` 출력)
- [ ] React Query 캐싱 전략 확인
- [ ] API 응답 시간 최적화

### Git & GitHub
- [ ] 모든 변경사항 커밋
- [ ] 의미 있는 커밋 메시지
- [ ] `main` 브랜치가 최신 상태
- [ ] 민감한 파일이 Git에 포함되지 않음
- [ ] README.md 최신 상태

## Vercel 설정

### 프로젝트 설정
- [ ] GitHub 저장소 연동 완료
- [ ] Framework: Next.js 선택
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm install`

### 환경 변수 설정
- [ ] Production 환경에 모든 변수 설정
- [ ] 변수 값 정확성 확인 (복사/붙여넣기 오류 주의)
- [ ] NEXT_PUBLIC_ 접두사 확인

### 도메인 설정
- [ ] 기본 도메인 확인 (.vercel.app)
- [ ] 커스텀 도메인 설정 (선택사항)
- [ ] SSL 인증서 자동 발급 확인

### 배포 옵션
- [ ] Auto Deployments 활성화
- [ ] Production Branch: `main` 설정
- [ ] Preview Deployments 설정 (선택사항)

## 배포 후 검증 (Post-Deployment)

### 기능 테스트
- [ ] 홈페이지 정상 로딩
- [ ] 로그인 기능 작동
- [ ] 대시보드 데이터 로딩
- [ ] 설비 관리 CRUD
- [ ] 엔드밀 관리 CRUD
- [ ] 교체 실적 등록
- [ ] 재고 관리 (입고/출고)
- [ ] CAM 시트 조회
- [ ] 보고서 생성
- [ ] 사용자 관리

### API 연결
- [ ] Supabase 연결 정상
- [ ] 실시간 구독 작동
- [ ] API 응답 시간 정상
- [ ] 오류 로그 확인

### 성능 확인
- [ ] Lighthouse 점수 확인 (90+ 목표)
- [ ] 페이지 로딩 속도 확인 (3초 이내)
- [ ] 모바일 반응형 확인
- [ ] 브라우저 호환성 테스트

### 보안 검증
- [ ] HTTPS 연결 확인
- [ ] 보안 헤더 적용 확인
- [ ] 인증되지 않은 접근 차단 확인
- [ ] RLS 정책 작동 확인

### 모니터링
- [ ] Vercel Analytics 활성화
- [ ] Error tracking 설정
- [ ] 로그 수집 확인
- [ ] 알림 설정 (선택사항)

## 롤백 계획

문제 발생 시:
- [ ] 이전 배포 버전 확인
- [ ] Vercel Dashboard에서 즉시 롤백 가능
- [ ] 데이터베이스 백업 확인
- [ ] 비상 연락망 준비

## 사용자 안내

- [ ] 서비스 점검 공지 (필요 시)
- [ ] 새 URL 안내
- [ ] 사용자 매뉴얼 업데이트
- [ ] FAQ 업데이트

## 추가 고려사항

### 스케일링
- [ ] Vercel 요금제 확인
- [ ] Supabase 요금제 확인
- [ ] 트래픽 예상치 검토
- [ ] 캐싱 전략 수립

### 백업 및 복구
- [ ] 데이터베이스 백업 주기 설정
- [ ] 복구 절차 문서화
- [ ] 재해 복구 계획 수립

### 유지보수
- [ ] 정기 업데이트 일정 수립
- [ ] 보안 패치 모니터링
- [ ] 의존성 업데이트 계획

## 완료 서명

- 배포 담당자: ________________
- 배포 일시: ________________
- 검증 완료: ________________

---

## 긴급 연락처

- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- 프로젝트 담당자: ________________
