import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '../lib/providers/QueryProvider';

export const metadata: Metadata = {
  title: {
    default: 'CNC 앤드밀 관리 시스템',
    template: '%s | CNC 앤드밀 관리 시스템',
  },
  description: '800대 CNC 설비를 위한 포괄적인 앤드밀 교체 및 재고 관리 플랫폼',
  keywords: ['CNC', '앤드밀', '공구관리', '재고관리', '제조업', '생산관리'],
  authors: [{ name: 'CNC Management Team' }],
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'CNC 앤드밀 관리 시스템',
    description: '800대 CNC 설비를 위한 포괄적인 앤드밀 교체 및 재고 관리 플랫폼',
    type: 'website',
    locale: 'ko_KR',
  },
  robots: {
    index: false, // 내부 시스템이므로 검색 엔진에 노출 안 함
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // 모바일에서 확대 방지
  themeColor: '#1e3a8a', // 주 색상
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* PWA 지원을 위한 메타 태그 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        {/* 접근성을 위한 스킵 링크 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
        >
          본문으로 건너뛰기
        </a>
        
        <main id="main-content" className="min-h-screen">
          <QueryProvider>
            {children}
          </QueryProvider>
        </main>
        
        {/* Toast 알림을 위한 컨테이너 */}
        <div id="toast-container" />
        
        {/* 로딩 인디케이터를 위한 컨테이너 */}
        <div id="loading-container" />
      </body>
    </html>
  );
} 