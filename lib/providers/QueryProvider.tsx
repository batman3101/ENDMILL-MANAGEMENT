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
            // 기본 캐시 시간: 5분
            staleTime: 5 * 60 * 1000,
            // 캐시 유지 시간: 10분 (메모리 효율성)
            gcTime: 10 * 60 * 1000,
            // 백그라운드에서 자동 재실행 비활성화 (수동 새로고침 권장)
            refetchOnWindowFocus: false,
            // 마운트 시 자동 재실행 비활성화 (성능 최적화)
            refetchOnMount: false,
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