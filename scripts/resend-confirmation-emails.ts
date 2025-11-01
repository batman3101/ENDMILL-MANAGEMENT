/**
 * 확인되지 않은 사용자들에게 확인 이메일 재전송 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/resend-confirmation-emails.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase URL 또는 Service Role Key가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resendConfirmationEmails() {
  console.log('🔍 확인되지 않은 사용자 검색 중...\n');

  // Get all users from auth.users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ 사용자 목록 조회 실패:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('ℹ️  등록된 사용자가 없습니다.');
    return;
  }

  console.log(`📊 총 ${users.length}명의 사용자를 찾았습니다.\n`);

  // Display all users with confirmation status
  console.log('📋 사용자 목록:\n');
  users.forEach((user, index) => {
    const status = user.email_confirmed_at ? '✅ 확인됨' : '❌ 미확인';
    const confirmedDate = user.email_confirmed_at
      ? new Date(user.email_confirmed_at).toLocaleString('ko-KR')
      : '-';
    console.log(`   ${index + 1}. ${user.email}`);
    console.log(`      상태: ${status}`);
    console.log(`      확인일시: ${confirmedDate}\n`);
  });

  // Filter unconfirmed users
  const unconfirmedUsers = users.filter(user => !user.email_confirmed_at);

  if (unconfirmedUsers.length === 0) {
    console.log('✅ 모든 사용자의 이메일이 확인되었습니다.');
    return;
  }

  console.log(`📧 ${unconfirmedUsers.length}명의 미확인 사용자에게 이메일 재전송:\n`);

  for (const user of unconfirmedUsers) {
    console.log(`   - ${user.email}`);

    try {
      // Resend confirmation email
      const { error: resendError } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email: user.email!,
      });

      if (resendError) {
        console.error(`     ❌ 재전송 실패: ${resendError.message}`);
      } else {
        console.log(`     ✅ 재전송 완료`);
      }
    } catch (err) {
      console.error(`     ❌ 오류 발생:`, err);
    }
  }

  console.log('\n✅ 확인 이메일 재전송 완료');
}

// Run the script
resendConfirmationEmails()
  .then(() => {
    console.log('\n프로세스 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 치명적 오류:', error);
    process.exit(1);
  });
