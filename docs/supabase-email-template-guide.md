# Supabase Email Templates 설정 가이드

## 1. Email Templates 메뉴 접속

1. 왼쪽 사이드바에서 **🔐 Authentication** 클릭
2. 상단 탭에서 **Email Templates** 클릭

---

## 2. "Confirm signup" 템플릿 선택

**위치**: Email Templates 페이지의 템플릿 목록

### 템플릿 종류:
- **Confirm signup** ← 이것을 선택!
- Reset Password
- Magic Link
- Change Email Address
- Invite User

**Confirm signup**을 클릭하여 편집 화면으로 이동합니다.

---

## 3. 템플릿 편집

### 현재 템플릿 (문제가 있는 버전):

기본 템플릿은 다음과 같을 수 있습니다:
```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
```

또는:
```html
<p><a href="http://localhost:3000/auth/confirm?token={{ .Token }}">Confirm</a></p>
```

### ⚠️ 문제점:
- `{{ .ConfirmationURL }}`: 오래된 변수명 (deprecated)
- `http://localhost:3000`: 하드코딩된 로컬 URL
- `{{ .Token }}`: 오래된 토큰 방식

---

## 4. 새로운 템플릿으로 교체

### **Subject (제목)**:
```
이메일 주소를 확인해주세요 - CNC Endmill Management
```

### **Body (본문)**:

전체 내용을 삭제하고 아래 템플릿을 복사하여 붙여넣기:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

  <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
    이메일 주소를 확인해주세요
  </h2>

  <p style="font-size: 16px; line-height: 1.6; color: #333;">
    <strong>CNC Endmill Management System</strong>에 가입해주셔서 감사합니다.
  </p>

  <p style="font-size: 14px; line-height: 1.6; color: #555;">
    계정을 활성화하려면 아래 버튼을 클릭하여 이메일 주소를 확인해주세요:
  </p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
       style="background-color: #1e3a8a;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
              font-size: 16px;
              font-weight: bold;">
      ✅ 이메일 확인하기
    </a>
  </div>

  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin-top: 20px;">
    <p style="font-size: 12px; color: #666; margin: 0;">
      <strong>버튼이 작동하지 않나요?</strong><br>
      아래 링크를 복사하여 브라우저 주소창에 붙여넣으세요:
    </p>
    <p style="font-size: 11px; color: #999; word-break: break-all; margin: 10px 0 0 0;">
      {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="font-size: 11px; color: #999; text-align: center;">
    이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.<br>
    이 링크는 24시간 후 만료됩니다.
  </p>

</div>
```

---

## 5. 템플릿 변수 설명

### 사용된 Supabase 변수들:

| 변수 | 설명 | 예시 값 |
|------|------|---------|
| `{{ .SiteURL }}` | URL Configuration에서 설정한 Site URL | `https://endmill-management-v001.vercel.app` |
| `{{ .TokenHash }}` | 이메일 확인용 토큰 해시 (최신 방식) | `abc123...` |
| `{{ .Token }}` | ❌ 사용 금지 (구버전) | - |
| `{{ .ConfirmationURL }}` | ❌ 사용 금지 (구버전) | - |

### ✅ 올바른 URL 구조:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

이렇게 하면:
- **개발 환경**: `http://localhost:3000/auth/confirm?token_hash=...&type=email`
- **프로덕션**: `https://endmill-management-v001.vercel.app/auth/confirm?token_hash=...&type=email`

자동으로 환경에 맞는 URL이 생성됩니다!

---

## 6. 저장 및 테스트

### 저장:
1. 템플릿 편집 완료 후 **Save** 버튼 클릭
2. "Template updated successfully" 메시지 확인

### 테스트:
1. 새로운 사용자 등록
2. 이메일 수신함 확인
3. "✅ 이메일 확인하기" 버튼 클릭
4. 정상적으로 사이트로 리디렉션되는지 확인

---

## 7. 베트남어 버전 (선택사항)

베트남어 사용자가 많다면 베트남어 템플릿도 만들 수 있습니다:

### Subject (베트남어):
```
Xác nhận địa chỉ email - CNC Endmill Management
```

### Body (베트남어):
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">

  <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
    Xác nhận địa chỉ email của bạn
  </h2>

  <p style="font-size: 16px; line-height: 1.6; color: #333;">
    Cảm ơn bạn đã đăng ký <strong>Hệ thống quản lý dụng cụ CNC</strong>.
  </p>

  <p style="font-size: 14px; line-height: 1.6; color: #555;">
    Vui lòng nhấp vào nút bên dưới để xác nhận địa chỉ email và kích hoạt tài khoản:
  </p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
       style="background-color: #1e3a8a;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
              font-size: 16px;
              font-weight: bold;">
      ✅ Xác nhận Email
    </a>
  </div>

  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin-top: 20px;">
    <p style="font-size: 12px; color: #666; margin: 0;">
      <strong>Nút không hoạt động?</strong><br>
      Sao chép liên kết bên dưới và dán vào trình duyệt:
    </p>
    <p style="font-size: 11px; color: #999; word-break: break-all; margin: 10px 0 0 0;">
      {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="font-size: 11px; color: #999; text-align: center;">
    Nếu bạn không yêu cầu email này, vui lòng bỏ qua.<br>
    Liên kết này sẽ hết hạn sau 24 giờ.
  </p>

</div>
```

---

## 📋 체크리스트

- [ ] Authentication → Email Templates 접속
- [ ] "Confirm signup" 템플릿 선택
- [ ] 제목(Subject) 변경
- [ ] 본문(Body) 전체 교체
- [ ] `{{ .SiteURL }}`과 `{{ .TokenHash }}` 변수 확인
- [ ] Save 버튼 클릭
- [ ] 테스트 사용자로 확인 이메일 수신 테스트

---

## ⚠️ 주의사항

### DO's ✅
- 반드시 `{{ .SiteURL }}`과 `{{ .TokenHash }}` 사용
- `type=email` 쿼리 파라미터 포함
- 한국어/베트남어 등 사용자 언어로 작성

### DON'Ts ❌
- `{{ .ConfirmationURL }}` 사용 금지 (deprecated)
- `{{ .Token }}` 사용 금지 (구버전)
- URL에 `localhost` 하드코딩 금지
- 템플릿에서 JavaScript 사용 금지 (보안상 차단됨)

---

## 트러블슈팅

### 이메일이 안 옴
1. Supabase → Authentication → Settings에서 "Enable email confirmations" 켜져 있는지 확인
2. SMTP 설정 확인 (기본값은 Supabase 제공 SMTP 사용)

### 링크 클릭 시 404 오류
1. `app/auth/confirm/route.ts` 파일이 존재하는지 확인
2. Vercel에 배포되었는지 확인
3. URL Configuration의 Redirect URLs에 경로가 추가되었는지 확인

### 링크 클릭 시 여전히 localhost로 이동
1. URL Configuration의 Site URL을 다시 확인
2. 템플릿에 `{{ .SiteURL }}` 변수를 사용하는지 확인
3. Supabase 캐시 문제일 수 있음 - 5분 정도 기다린 후 재시도
