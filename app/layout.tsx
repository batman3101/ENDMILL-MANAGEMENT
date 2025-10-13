import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '../lib/providers/QueryProvider';
import { I18nProvider } from '../lib/providers/I18nProvider';
import { ToastProvider } from '../components/shared/Toast';
import { AuthProvider } from '../lib/hooks/useAuth';
import { SettingsProvider } from '../lib/providers/SettingsProvider';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: 'CNC 앤드밀 관리 시스템',
    template: '%s | CNC 앤드밀 관리 시스템',
  },
  description: '800대 CNC 설비를 위한 포괄적인 앤드밀 교체 및 재고 관리 플랫폼',
  keywords: ['CNC', '앤드밀', '공구관리', '재고관리', '제조업', '생산관리'],
  authors: [{ name: 'CNC Management Team' }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ),
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
  // icons는 app/icon.png 파일로 자동 설정됨
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

        {/* 파비콘 */}
        <link rel="icon" type="image/png" href="/icons/endmill.png" />
        <link rel="shortcut icon" type="image/png" href="/icons/endmill.png" />
        <link rel="apple-touch-icon" href="/icons/endmill.png" />
      </head>
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900`}>
        {/* 접근성을 위한 스킵 링크 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
        >
          본문으로 건너뛰기
        </a>
        
        <main id="main-content" className="min-h-screen">
          <I18nProvider>
            <ToastProvider>
              <QueryProvider>
                <AuthProvider>
                  <SettingsProvider>
                    {children}
                  </SettingsProvider>
                </AuthProvider>
              </QueryProvider>
            </ToastProvider>
          </I18nProvider>
        </main>
      </body>
    </html>
  );
}