import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { cookies } from 'next/headers';

// API 라우트용 클라이언트 (쿠키에서 세션을 읽어서 사용자 인증 처리)
export const createAuthClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }

  const cookieStore = await cookies();

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  });
};
