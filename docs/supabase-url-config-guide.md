# Supabase URL Configuration 설정 가이드

## 1. Authentication → URL Configuration 접속

1. 왼쪽 사이드바에서 **🔐 Authentication** 클릭
2. 상단 탭에서 **URL Configuration** 클릭

---

## 2. Site URL 설정

**위치**: "Site URL" 입력 필드

### 입력할 값:
```
https://endmill-management-v001.vercel.app
```

### 설명:
- 이것은 기본 리디렉션 URL입니다
- 이메일 템플릿에서 {{ .SiteURL }}로 참조됩니다
- 프로덕션 도메인을 정확히 입력해야 합니다 (http가 아닌 https)
- 마지막에 슬래시(/) 없이 입력

---

## 3. Redirect URLs 설정

**위치**: "Redirect URLs" 입력 필드 (여러 줄 입력 가능)

### 입력할 값들 (각 줄에 하나씩):
```
https://endmill-management-v001.vercel.app/**
https://endmill-management-v001.vercel.app/auth/confirm
http://localhost:3000/**
http://localhost:3000/auth/confirm
```

### 각 URL 설명:

1. `https://endmill-management-v001.vercel.app/**`
   - 프로덕션 사이트의 모든 경로 허용
   - `**`는 와일드카드로 모든 하위 경로를 의미

2. `https://endmill-management-v001.vercel.app/auth/confirm`
   - 이메일 확인 전용 경로
   - 명시적으로 지정하여 보안 강화

3. `http://localhost:3000/**`
   - 로컬 개발 환경 허용
   - 개발 시 필요

4. `http://localhost:3000/auth/confirm`
   - 로컬 개발 시 이메일 확인 테스트용

---

## 4. 저장하기

1. 모든 값 입력 후 **Save** 버튼 클릭
2. "Successfully updated settings" 메시지 확인

---

## ⚠️ 중요 사항

### DO's ✅
- Site URL은 반드시 `https://`로 시작 (프로덕션)
- 정확한 도메인명 입력 (오타 주의)
- Redirect URLs에 여러 환경 추가 가능 (개발/프로덕션)

### DON'Ts ❌
- Site URL 끝에 슬래시(/) 추가하지 말 것
- `localhost`를 Site URL로 설정하지 말 것 (Redirect URLs에만)
- http와 https 혼동 주의

---

## 5. 설정 확인

설정 후 다음과 같이 표시됩니다:

```
Site URL:
https://endmill-management-v001.vercel.app

Redirect URLs:
https://endmill-management-v001.vercel.app/**
https://endmill-management-v001.vercel.app/auth/confirm
http://localhost:3000/**
http://localhost:3000/auth/confirm
```

---

## 트러블슈팅

### "Invalid URL" 오류
- URL 형식 확인 (http:// 또는 https:// 포함)
- 공백 제거
- 특수문자 확인

### 리디렉션 실패
- Redirect URLs에 정확한 경로가 포함되어 있는지 확인
- 와일드카드(**) 사용 여부 확인
- 브라우저 캐시 삭제 후 재시도
