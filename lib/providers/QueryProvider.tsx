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
            // 실시간 데이터 우선: 항상 최신 데이터 fetch
            staleTime: 0,
            // 캐시 유지 시간: 5분 (메모리 효율성)
            gcTime: 5 * 60 * 1000,
            // 윈도우 포커스 시 자동 새로고침 활성화
            refetchOnWindowFocus: true,
            // 컴포넌트 마운트 시 자동 새로고침 활성화
            refetchOnMount: true,
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