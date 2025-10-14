import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { NextRequest } from 'next/server';

// API 라우트용 클라이언트 (NextRequest에서 쿠키를 직접 읽어서 사용자 인증 처리)
export const createAuthClient = (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }

  // NextRequest에서 쿠키 헤더 직접 추출
  const cookieHeader = request.headers.get('cookie') || '';

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        cookie: cookieHeader
      }
    }
  });
};
