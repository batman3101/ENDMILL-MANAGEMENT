'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../lib/hooks/useTranslations';

export default function OfflinePage() {
  const { t } = useTranslation();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="text-center max-w-md mx-auto">
        {/* 오프라인 아이콘 */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        {/* 메시지 */}
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          {t('pwa.noConnection')}
        </h1>
        <p className="text-gray-600 mb-2">
          {t('pwa.offlineStatus')}
        </p>
        <p className="text-gray-500 text-sm mb-8">
          {t('pwa.checkConnection')}
        </p>

        {/* 다시 시도 버튼 */}
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <RefreshCw className="w-5 h-5" />
          {t('pwa.retry')}
        </button>

        {/* 추가 정보 */}
        <div className="mt-12 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="font-semibold text-gray-700 mb-2">{t('pwa.offlineGuide')}</h2>
          <ul className="text-sm text-gray-500 space-y-1 text-left">
            <li>• {t('pwa.offlineGuide1')}</li>
            <li>• {t('pwa.offlineGuide2')}</li>
            <li>• {t('pwa.offlineGuide3')}</li>
          </ul>
        </div>

        {/* 앱 정보 */}
        <p className="mt-8 text-xs text-gray-400">
          {t('auth.loginTitle')}
        </p>
      </div>
    </div>
  );
}
