import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// 환경 변수 검증 및 안전한 에러 처리
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// URL 형식 검증
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith('https://') && url.includes('.supabase.co');
  } catch {
    return false;
  }
};

// 키 형식 검증 (기본적인 패턴 체크)
const isValidKey = (key: string): boolean => {
  return key.length > 20 && /^[A-Za-z0-9._-]+$/.test(key);
};

if (!supabaseUrl || !supabaseAnonKey || !isValidUrl(supabaseUrl) || !isValidKey(supabaseAnonKey)) {
  // 프로덕션에서는 상세한 에러 정보를 노출하지 않음
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorMessage = isDevelopment 
    ? 'Supabase configuration is missing or invalid. Check your environment variables.'
    : 'Database connection configuration error. Please contact support.';
  
  throw new Error(errorMessage);
}

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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey || !isValidKey(serviceRoleKey)) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment 
      ? 'Supabase service role key is missing or invalid.'
      : 'Server configuration error. Please contact support.';
    
    throw new Error(errorMessage);
  }

  return createClient<Database>(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}; 