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
            refetchOnMount: 'always',
            // 재연결 시 자동 새로고침 활성화
            refetchOnReconnect: true,
            // 에러 재시도 설정
            retry: (failureCount, error: any) => {
              // 401 에러는 재시도하지 않음
              if (error?.status === 401) return false;
              // 3번까지 재시도
              return failureCount < 3;
            },
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