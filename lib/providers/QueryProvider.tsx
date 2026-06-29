'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 캐시된 데이터를 1분간 fresh로 유지 (불필요한 refetch 방지)
            staleTime: 60 * 1000,
            // 캐시 유지 시간: 10분 (메모리 효율성)
            gcTime: 10 * 60 * 1000,
            // 윈도우 포커스 시 자동 새로고침 비활성화 (Supabase Realtime이 처리)
            refetchOnWindowFocus: false,
            // 컴포넌트 마운트 시 stale 데이터만 새로고침
            refetchOnMount: true,
            // 재연결 시 자동 새로고침 활성화
            refetchOnReconnect: true,
            // 에러 재시도 설정 (장애 시 재시도 폭주 방지)
            retry: (failureCount, error: any) => {
              // 인증 실패(401/403)는 재시도하지 않음
              const status = error?.status ?? error?.statusCode;
              if (status === 401 || status === 403) return false;
              // 최대 1회만 재시도 (과거 3회 → DB 장애 시 요청 4배 증폭의 원인)
              return failureCount < 1;
            },
            // 지수 백오프 + 지터: 다수 클라이언트의 동시 재시도(thundering herd)를 분산
            retryDelay: (attemptIndex) =>
              Math.min(2000 * 2 ** attemptIndex, 30000) + Math.floor(Math.random() * 1000),
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 DevTools 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
} 