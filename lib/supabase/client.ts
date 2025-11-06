import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import { Database } from '../types/database';
import { logger } from '../utils/logger';

// 환경변수를 안전하게 가져오는 함수
const getSupabaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  if (!envUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다. ' +
      '.env.local 파일을 확인하세요.'
    );
  }

  return envUrl;
};

const getSupabaseAnonKey = (): string => {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!envKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. ' +
      '.env.local 파일을 확인하세요.'
    );
  }

  return envKey;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// 개발 환경에서만 환경변수 상태 로그 (민감한 정보 제외)
logger.log('🔍 Supabase 연결 확인:', {
  url: supabaseUrl ? '✅ 설정됨' : '❌ 없음',
  key: supabaseAnonKey ? '✅ 설정됨' : '❌ 없음',
});

// 레거시 클라이언트 (기존 코드와의 호환성 유지)
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

// @supabase/ssr을 사용한 브라우저 클라이언트 (권장)
// Client Component에서 사용
export const createBrowserClient = () => {
  return createSSRBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};

// 서버사이드용 클라이언트 (서비스 역할 키 사용 - 관리자 작업용)
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. ' +
      '이 키는 서버사이드에서만 사용되며, .env.local 파일에 설정해야 합니다.'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
