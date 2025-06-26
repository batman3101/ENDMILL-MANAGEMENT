import type { Metadata } from 'next';
import { Inter, Noto_Sans_KR } from 'next/font/google';
import './globals.css';

// 폰트 설정 - 성능 최적화를 위해 필요한 서브셋만 로드
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1, // 모바일에서 확대 방지
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  themeColor: '#1e3a8a', // 주 색상
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${notoSansKr.variable}`}>
      <head>
        {/* PWA 지원을 위한 메타 태그 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* 성능 최적화 */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="//fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`font-sans antialiased bg-gray-50 text-gray-900`}>
        {/* 접근성을 위한 스킵 링크 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-md z-50"
        >
          본문으로 건너뛰기
        </a>
        
        <main id="main-content" className="min-h-screen">
          {children}
        </main>
        
        {/* Toast 알림을 위한 컨테이너 */}
        <div id="toast-container" />
        
        {/* 로딩 인디케이터를 위한 컨테이너 */}
        <div id="loading-container" />
      </body>
    </html>
  );
} 