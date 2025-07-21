import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// 하드코딩된 fallback 값들 (환경변수 로드 실패 시 사용)
const FALLBACK_SUPABASE_URL = 'https://npprskxlqbgmbksrnpnr.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHJza3hscWJnbWJrc3JucG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMjQ0MDMsImV4cCI6MjA2NzYwMDQwM30.8ZXH5u2mtv7e4I1YXg5_wjQ2nfPdFwWaAeYmMp6kINg';

// 환경변수를 안전하게 가져오는 함수
const getSupabaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  
  if (!envUrl) {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL 환경변수가 없어서 fallback 값을 사용합니다.');
    return FALLBACK_SUPABASE_URL;
  }
  
  return envUrl;
};

const getSupabaseAnonKey = (): string => {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!envKey) {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 없어서 fallback 값을 사용합니다.');
    return FALLBACK_ANON_KEY;
  }
  
  return envKey;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// 환경변수 상태를 콘솔에 로그
console.log('🔍 Supabase 환경변수 상태:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : '❌ 없음',
  key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '❌ 없음',
  urlLength: supabaseUrl?.length || 0,
  keyLength: supabaseAnonKey?.length || 0,
  source: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'env' : 'fallback',
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'env' : 'fallback'
  }
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 클라이언트 생성 실패: URL 또는 Key가 없습니다');
  throw new Error('❌ Supabase 설정 오류');
}

console.log('✅ Supabase 클라이언트 생성 성공');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 서버사이드용 클라이언트 (서비스 역할 키 사용)
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHJza3hscWJnbWJrc3JucG5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjAyNDQwMywiZXhwIjoyMDY3NjAwNDAzfQ.vx1nqnzIttN3KoCyxVT9UlguJ1cuEOAwpPd3Jaoa4ek';
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}; 