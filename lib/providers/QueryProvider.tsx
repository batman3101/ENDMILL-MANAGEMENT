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
            // 5분 캐시
            staleTime: 5 * 60 * 1000,
            // 백그라운드에서 자동 재실행
            refetchOnWindowFocus: false,
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