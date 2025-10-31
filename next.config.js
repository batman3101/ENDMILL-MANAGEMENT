/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint 오류 검사 활성화
    ignoreDuringBuilds: false,
  },
  typescript: {
    // TypeScript 오류 검사 활성화
    ignoreBuildErrors: false,
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  // API 라우트 body size 제한 증가 (이미지 업로드용 - 20MB)
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
    responseLimit: '20mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // 다국어 지원은 App Router에서 별도 처리
  // 성능 최적화
  compress: true,
  poweredByHeader: false,
  generateEtags: false,

  // PWA 및 보안 헤더
  async headers() {
    return [
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;