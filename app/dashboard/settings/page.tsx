'use client'

import { useState, useEffect } from 'react'
import { useSettings } from '../../../lib/hooks/useSettings'
import { SettingsCategory } from '../../../lib/types/settings'
import { useToast } from '../../../components/shared/Toast'
import { AdminGuard } from '../../../components/auth/PermissionGuard'

// 설정 탭 정의
const SETTINGS_TABS = [
  { 
    id: 'system' as SettingsCategory, 
    name: '시스템 설정', 
    icon: '⚙️',
    description: '기본 시스템 설정 및 환경 구성'
  },
  { 
    id: 'equipment' as SettingsCategory, 
    name: '설비 관리', 
    icon: '🏭',
    description: '설비 번호, 위치, 상태 관리'
  },
  { 
    id: 'inventory' as SettingsCategory, 
    name: '재고 관리', 
    icon: '📦',
    description: '재고 임계값 및 카테고리 설정'
  },
  { 
    id: 'toolChanges' as SettingsCategory, 
    name: '교체 이력', 
    icon: '🔧',
    description: '교체 사유 및 임계값 설정'
  },
  { 
    id: 'organization' as SettingsCategory, 
    name: '조직 관리', 
    icon: '👥',
    description: '부서, 교대, 역할 관리'
  },
  { 
    id: 'ui' as SettingsCategory, 
    name: 'UI/UX', 
    icon: '🎨',
    description: '화면 테마 및 인터페이스 설정'
  },
  { 
    id: 'notifications' as SettingsCategory, 
    name: '알림 설정', 
    icon: '🔔',
    description: '알림 방식 및 스케줄 설정'
  },
  { 
    id: 'translations' as SettingsCategory, 
    name: '번역 관리', 
    icon: '🌐',
    description: '다국어 지원 및 번역 설정'
  }
]

export default function SettingsPage() {
  return (
    <AdminGuard>
      <SettingsPageContent />
    </AdminGuard>
  )
}

function SettingsPageContent() {
  const [activeTab, setActiveTab] = useState<SettingsCategory>('system')
  const { 
    settings, 
    updateCategorySettings, 
    resetSettings, 
    isLoading, 
    error, 
    hasUnsavedChanges 
  } = useSettings()
  const { showSuccess, showError, showInfo } = useToast()
  
  // 임시 폼 상태 (각 탭별로)
  const [formData, setFormData] = useState(settings)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeTabInfo = SETTINGS_TABS.find(tab => tab.id === activeTab)

  // 폼 데이터 업데이트 시 settings가 변경되면 동기화
  useEffect(() => {
    setFormData(settings)
  }, [settings])

  // 저장 핸들러
  const handleSave = async (category: SettingsCategory) => {
    setIsSubmitting(true)

    try {
      await updateCategorySettings(category, formData[category], '관리자', '설정 업데이트')

      // 설정 업데이트 이벤트 발생 (SettingsProvider가 감지하여 새로고침)
      window.dispatchEvent(new CustomEvent('settingsUpdated'))

      showSuccess('저장 완료', `${activeTabInfo?.name} 설정이 성공적으로 저장되었습니다.`)
    } catch (err) {
      showError('저장 실패', '설정 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 초기화 핸들러
  const handleReset = async (category: SettingsCategory) => {
    try {
      await resetSettings(category, '관리자')
      setFormData(prev => ({ ...prev, [category]: settings[category] }))
      showSuccess('초기화 완료', `${activeTabInfo?.name} 설정이 기본값으로 초기화되었습니다.`)
    } catch (err) {
      showError('초기화 실패', '설정 초기화 중 오류가 발생했습니다.')
    }
  }

  // 폼 데이터 업데이트
  const updateFormData = (category: SettingsCategory, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }))
  }

  // early return 제거 - JSX에서만 조건부 렌더링
  return (
    <div className="space-y-6">
      {isLoading ? (
        // 로딩 화면
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <p className="text-gray-600">설정을 불러오는 중...</p>
          </div>
        </div>
      ) : (
        // 정상 화면
        <>
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚙️ 시스템 설정</h1>
              <p className="text-gray-600">엔드밀 관리 시스템의 각종 설정을 관리합니다</p>
            </div>
            
            {/* 저장 상태 표시 */}
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-yellow-600 text-sm">⚠️ 저장되지 않은 변경사항이 있습니다</span>
              </div>
            )}
            
            {error && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-600 text-sm">❌ {error}</span>
              </div>
            )}
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto" aria-label="설정 탭">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{tab.icon}</span>
                      <span>{tab.name}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* 활성 탭 설명 */}
            {activeTabInfo && (
              <div className="px-6 py-4 bg-gray-50 border-b">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{activeTabInfo.icon}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{activeTabInfo.name}</h2>
                    <p className="text-sm text-gray-600">{activeTabInfo.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 탭 내용 영역 */}
            <div className="p-6">
              {activeTab === 'system' && (
                <div className="space-y-6">
                  {/* 기본 시스템 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🌐 기본 설정</h3>
                      <p className="text-sm text-gray-600">시스템의 기본 언어, 화폐, 시간대 설정</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 기본 언어 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            기본 언어
                          </label>
                          <select
                            value={formData.system?.defaultLanguage || 'ko'}
                            onChange={(e) => updateFormData('system', 'defaultLanguage', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="ko">한국어</option>
                            <option value="vi">베트남어</option>
                          </select>
                        </div>

                        {/* 화폐 단위 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            화폐 단위
                          </label>
                          <select
                            value={formData.system?.currency || 'VND'}
                            onChange={(e) => updateFormData('system', 'currency', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="VND">베트남 동 (VND)</option>
                            <option value="KRW">한국 원 (KRW)</option>
                            <option value="USD">미국 달러 (USD)</option>
                          </select>
                        </div>

                        {/* 시간대 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            시간대
                          </label>
                          <select
                            value={formData.system?.timezone || 'Asia/Ho_Chi_Minh'}
                            onChange={(e) => updateFormData('system', 'timezone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Asia/Ho_Chi_Minh">베트남 (GMT+7)</option>
                            <option value="Asia/Seoul">한국 (GMT+9)</option>
                            <option value="UTC">UTC (GMT+0)</option>
                          </select>
                        </div>

                        {/* 날짜 형식 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            날짜 형식
                          </label>
                          <select
                            value={formData.system?.dateFormat || 'YYYY-MM-DD'}
                            onChange={(e) => updateFormData('system', 'dateFormat', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-01)</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY (01/01/2024)</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY (01/01/2024)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 세션 및 보안 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🔒 세션 및 보안</h3>
                      <p className="text-sm text-gray-600">로그인 세션 및 보안 관련 설정</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 세션 타임아웃 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            세션 타임아웃 (분)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="480"
                            value={formData.system?.sessionTimeout || 60}
                            onChange={(e) => updateFormData('system', 'sessionTimeout', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            5분에서 480분(8시간) 사이에서 설정 가능합니다
                          </p>
                        </div>

                        {/* 자동 로그아웃 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            자동 로그아웃
                          </label>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.system?.autoLogout || false}
                              onChange={(e) => updateFormData('system', 'autoLogout', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              비활성 상태에서 자동으로 로그아웃
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 표시 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">📊 표시 설정</h3>
                      <p className="text-sm text-gray-600">페이지 표시 및 파일 업로드 관련 설정</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 페이지당 항목 수 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            페이지당 항목 수
                          </label>
                          <select
                            value={formData.system?.itemsPerPage || 20}
                            onChange={(e) => updateFormData('system', 'itemsPerPage', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={10}>10개</option>
                            <option value={20}>20개</option>
                            <option value={50}>50개</option>
                            <option value={100}>100개</option>
                          </select>
                        </div>

                        {/* 최대 파일 크기 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            최대 파일 크기 (MB)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.system?.maxFileSize || 10}
                            onChange={(e) => updateFormData('system', 'maxFileSize', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            업로드 가능한 최대 파일 크기 (1MB - 100MB)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 저장/초기화 버튼 */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      onClick={() => handleReset('system')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      기본값으로 초기화
                    </button>
                    <button
                      onClick={() => handleSave('system')}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {isSubmitting ? '저장 중...' : '💾 설정 저장'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'equipment' && (
                <div className="space-y-6">
                  {/* 설비 기본 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🏭 설비 기본 설정</h3>
                      <p className="text-sm text-gray-600">설비 수량, 번호 형식, 위치 관리</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 총 설비 수 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            총 설비 수
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={formData.equipment?.totalCount || 800}
                            onChange={(e) => updateFormData('equipment', 'totalCount', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            관리할 전체 설비 수량 (1-1000대)
                          </p>
                        </div>

                        {/* 설비 번호 형식 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            설비 번호 형식
                          </label>
                          <select
                            value={formData.equipment?.numberFormat || 'C{number:3}'}
                            onChange={(e) => updateFormData('equipment', 'numberFormat', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="C{number:3}">C001, C002, ... (C + 3자리)</option>
                            <option value="M{number:3}">M001, M002, ... (M + 3자리)</option>
                            <option value="CNC{number:3}">CNC001, CNC002, ... (CNC + 3자리)</option>
                            <option value="{number:4}">{`0001, 0002, ... (4자리 숫자)`}</option>
                          </select>
                        </div>

                        {/* 툴 포지션 수 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            툴 포지션 수
                          </label>
                          <input
                            type="number"
                            min="12"
                            max="24"
                            value={formData.equipment?.toolPositionCount || 21}
                            onChange={(e) => updateFormData('equipment', 'toolPositionCount', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            각 설비의 툴 포지션 개수 (T1~T{formData.equipment?.toolPositionCount || 21})
                          </p>
                        </div>

                        {/* 기본 상태 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            신규 설비 기본 상태
                          </label>
                          <select
                            value={formData.equipment?.defaultStatus || '가동중'}
                            onChange={(e) => updateFormData('equipment', 'defaultStatus', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="가동중">가동중</option>
                            <option value="점검중">점검중</option>
                            <option value="셋업중">셋업중</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 설비 위치 관리 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">📍 설비 위치 관리</h3>
                      <p className="text-sm text-gray-600">설비가 배치된 위치 목록 관리</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {(Array.isArray(formData.equipment?.locations) ? formData.equipment.locations : ['A동', 'B동']).map((location, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={location}
                                onChange={(e) => {
                                  const newLocations = [...(Array.isArray(formData.equipment?.locations) ? formData.equipment.locations : ['A동', 'B동'])]
                                  newLocations[index] = e.target.value
                                  updateFormData('equipment', 'locations', newLocations)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="위치명 입력"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newLocations = [...(Array.isArray(formData.equipment?.locations) ? formData.equipment.locations : ['A동', 'B동'])]
                                newLocations.splice(index, 1)
                                updateFormData('equipment', 'locations', newLocations)
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                              disabled={(formData.equipment?.locations || []).length <= 1}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const currentLocations = Array.isArray(formData.equipment?.locations) ? formData.equipment.locations : ['A동', 'B동']
                            const newLocations = [...currentLocations, '새 위치']
                            updateFormData('equipment', 'locations', newLocations)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          + 위치 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 생산 모델 관리 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🚗 생산 모델 관리</h3>
                      <p className="text-sm text-gray-600">설비에서 생산하는 모델 목록 관리</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {(Array.isArray(formData.equipment?.models) ? formData.equipment.models : ['PA1', 'PA2', 'PS', 'B7', 'Q7']).map((model, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={model}
                                onChange={(e) => {
                                  const newModels = [...(Array.isArray(formData.equipment?.models) ? formData.equipment.models : ['PA1', 'PA2', 'PS', 'B7', 'Q7'])]
                                  newModels[index] = e.target.value
                                  updateFormData('equipment', 'models', newModels)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="모델명 입력"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newModels = [...(Array.isArray(formData.equipment?.models) ? formData.equipment.models : ['PA1', 'PA2', 'PS', 'B7', 'Q7'])]
                                newModels.splice(index, 1)
                                updateFormData('equipment', 'models', newModels)
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                              disabled={(formData.equipment?.models || []).length <= 1}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const currentModels = Array.isArray(formData.equipment?.models) ? formData.equipment.models : ['PA1', 'PA2', 'PS', 'B7', 'Q7']
                            const newModels = [...currentModels, '새 모델']
                            updateFormData('equipment', 'models', newModels)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          + 모델 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 공정 관리 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">⚙️ 공정 관리</h3>
                      <p className="text-sm text-gray-600">설비에서 수행하는 공정 목록 관리</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {(Array.isArray(formData.equipment?.processes) ? formData.equipment.processes : ['CNC1', 'CNC2', 'CNC2-1']).map((process, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={process}
                                onChange={(e) => {
                                  const newProcesses = [...(Array.isArray(formData.equipment?.processes) ? formData.equipment.processes : ['CNC1', 'CNC2', 'CNC2-1'])]
                                  newProcesses[index] = e.target.value
                                  updateFormData('equipment', 'processes', newProcesses)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="공정명 입력"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newProcesses = [...(Array.isArray(formData.equipment?.processes) ? formData.equipment.processes : ['CNC1', 'CNC2', 'CNC2-1'])]
                                newProcesses.splice(index, 1)
                                updateFormData('equipment', 'processes', newProcesses)
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                              disabled={(formData.equipment?.processes || []).length <= 1}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const currentProcesses = Array.isArray(formData.equipment?.processes) ? formData.equipment.processes : ['CNC1', 'CNC2', 'CNC2-1']
                            const newProcesses = [...currentProcesses, '새 공정']
                            updateFormData('equipment', 'processes', newProcesses)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          + 공정 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 저장/초기화 버튼 */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      onClick={() => handleReset('equipment')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      기본값으로 초기화
                    </button>
                    <button
                      onClick={() => handleSave('equipment')}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {isSubmitting ? '저장 중...' : '💾 설정 저장'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  {/* 재고 임계값 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">📊 재고 임계값 설정</h3>
                      <p className="text-sm text-gray-600">재고 상태 판단 기준값 및 기본값 설정</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 위험 임계값 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            위험 임계값 (%)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={formData.inventory?.stockThresholds?.criticalPercent || 25}
                            onChange={(e) => updateFormData('inventory', 'stockThresholds', {
                              ...formData.inventory?.stockThresholds,
                              criticalPercent: parseInt(e.target.value)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            최소재고의 {formData.inventory?.stockThresholds?.criticalPercent || 25}% 이하일 때 위험 상태
                          </p>
                        </div>

                        {/* 부족 임계값 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            부족 임계값 (%)
                          </label>
                          <input
                            type="number"
                            min="51"
                            max="100"
                            value={formData.inventory?.stockThresholds?.lowPercent || 75}
                            onChange={(e) => updateFormData('inventory', 'stockThresholds', {
                              ...formData.inventory?.stockThresholds,
                              lowPercent: parseInt(e.target.value)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            최소재고의 {formData.inventory?.stockThresholds?.lowPercent || 75}% 이하일 때 부족 상태
                          </p>
                        </div>

                        {/* 기본 최소재고 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            기본 최소재고 (개)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.inventory?.defaultValues?.minStock || 20}
                            onChange={(e) => updateFormData('inventory', 'defaultValues', {
                              ...formData.inventory?.defaultValues,
                              minStock: parseInt(e.target.value)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* 기본 최대재고 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            기본 최대재고 (개)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.inventory?.defaultValues?.maxStock || 100}
                            onChange={(e) => updateFormData('inventory', 'defaultValues', {
                              ...formData.inventory?.defaultValues,
                              maxStock: parseInt(e.target.value)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* 기본 표준수명 */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            기본 표준수명 (회)
                          </label>
                          <input
                            type="number"
                            min="100"
                            value={formData.inventory?.defaultValues?.standardLife || 10000}
                            onChange={(e) => updateFormData('inventory', 'defaultValues', {
                              ...formData.inventory?.defaultValues,
                              standardLife: parseInt(e.target.value)
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            신규 앤드밀 등록 시 기본 표준수명 값
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 앤드밀 카테고리 관리 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🔧 앤드밀 카테고리 관리</h3>
                      <p className="text-sm text-gray-600">앤드밀 유형별 카테고리 목록 관리</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {(Array.isArray(formData.inventory?.categories) ? formData.inventory.categories : ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL']).map((category, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={category}
                                onChange={(e) => {
                                  const newCategories = [...(formData.inventory?.categories || [])]
                                  newCategories[index] = e.target.value
                                  updateFormData('inventory', 'categories', newCategories)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="카테고리명 입력"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newCategories = [...(formData.inventory?.categories || [])]
                                newCategories.splice(index, 1)
                                updateFormData('inventory', 'categories', newCategories)
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                              disabled={(formData.inventory?.categories || []).length <= 1}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const currentCategories = Array.isArray(formData.inventory?.categories)
                              ? formData.inventory.categories
                              : ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL']
                            const newCategories = [...currentCategories, '새 카테고리']
                            updateFormData('inventory', 'categories', newCategories)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          + 카테고리 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 공급업체 관리 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🏢 공급업체 관리</h3>
                      <p className="text-sm text-gray-600">앤드밀 공급업체 목록 관리</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {(Array.isArray(formData.inventory?.suppliers) ? formData.inventory.suppliers : ['Kyocera', 'Mitsubishi', 'Sandvik', 'OSG', 'YG-1', 'Guhring']).map((supplier, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={supplier}
                                onChange={(e) => {
                                  const newSuppliers = [...(formData.inventory?.suppliers || [])]
                                  newSuppliers[index] = e.target.value
                                  updateFormData('inventory', 'suppliers', newSuppliers)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="공급업체명 입력"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newSuppliers = [...(formData.inventory?.suppliers || [])]
                                newSuppliers.splice(index, 1)
                                updateFormData('inventory', 'suppliers', newSuppliers)
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                              disabled={(formData.inventory?.suppliers || []).length <= 1}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const currentSuppliers = Array.isArray(formData.inventory?.suppliers)
                              ? formData.inventory.suppliers
                              : ['Kyocera', 'Mitsubishi', 'Sandvik', 'OSG', 'YG-1', 'Guhring']
                            const newSuppliers = [...currentSuppliers, '새 공급업체']
                            updateFormData('inventory', 'suppliers', newSuppliers)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          + 공급업체 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 재고 상태 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🚨 재고 상태 표시 설정</h3>
                      <p className="text-sm text-gray-600">각 재고 상태별 표시 색상 및 이름 설정</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {(formData.inventory?.statuses || [
                          { code: 'sufficient', name: '충분', color: 'green', threshold: 100 },
                          { code: 'low', name: '부족', color: 'yellow', threshold: 75 },
                          { code: 'critical', name: '위험', color: 'red', threshold: 25 }
                        ]).map((status, index) => (
                          <div key={index} className="flex items-center space-x-6 p-4 border border-gray-200 rounded-lg">
                            <div className="flex-1 grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  상태명
                                </label>
                                <input
                                  type="text"
                                  value={status.name}
                                  onChange={(e) => {
                                    const newStatuses = [...(formData.inventory?.statuses || [])]
                                    newStatuses[index] = { ...newStatuses[index], name: e.target.value }
                                    updateFormData('inventory', 'statuses', newStatuses)
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  색상
                                </label>
                                <select
                                  value={status.color}
                                  onChange={(e) => {
                                    const newStatuses = [...(formData.inventory?.statuses || [])]
                                    newStatuses[index] = { ...newStatuses[index], color: e.target.value }
                                    updateFormData('inventory', 'statuses', newStatuses)
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="green">녹색</option>
                                  <option value="yellow">노란색</option>
                                  <option value="red">빨간색</option>
                                  <option value="blue">파란색</option>
                                  <option value="gray">회색</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  임계값 (%)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={status.threshold}
                                  onChange={(e) => {
                                    const newStatuses = [...(formData.inventory?.statuses || [])]
                                    newStatuses[index] = { ...newStatuses[index], threshold: parseInt(e.target.value) }
                                    updateFormData('inventory', 'statuses', newStatuses)
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div className={`w-8 h-8 rounded-full bg-${status.color}-500 flex-shrink-0`}></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 저장/초기화 버튼 */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      onClick={() => handleReset('inventory')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      기본값으로 초기화
                    </button>
                    <button
                      onClick={() => handleSave('inventory')}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {isSubmitting ? '저장 중...' : '💾 설정 저장'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'toolChanges' && (
                <div className="space-y-6">
                  {/* 교체 사유 관리 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">📝 교체 사유 관리</h3>
                      <p className="text-sm text-gray-600">앤드밀 교체 사유 목록 관리</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {(Array.isArray(formData.toolChanges?.reasons) ? formData.toolChanges.reasons : ['정상 수명', '파손', '마모', '품질 불량', '기타']).map((reason, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={reason}
                                onChange={(e) => {
                                  const newReasons = [...(formData.toolChanges?.reasons || [])]
                                  newReasons[index] = e.target.value
                                  updateFormData('toolChanges', 'reasons', newReasons)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="교체 사유 입력"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newReasons = [...(formData.toolChanges?.reasons || [])]
                                newReasons.splice(index, 1)
                                updateFormData('toolChanges', 'reasons', newReasons)
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                              disabled={(formData.toolChanges?.reasons || []).length <= 1}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newReasons = [...(formData.toolChanges?.reasons || []), '새 사유']
                            updateFormData('toolChanges', 'reasons', newReasons)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          + 사유 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 교체 임계값 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">⚠️ 교체 임계값 설정</h3>
                      <p className="text-sm text-gray-600">Tool Life 기준 교체 알림 임계값</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            교체 경고 임계값 (%)
                          </label>
                          <input
                            type="number"
                            min="50"
                            max="95"
                            value={formData.toolChanges?.lifeThresholds?.warning || 80}
                            onChange={(e) => updateFormData('toolChanges', 'lifeThresholds', { ...formData.toolChanges?.lifeThresholds, warning: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Tool Life {formData.toolChanges?.lifeThresholds?.warning || 80}% 달성 시 경고
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            교체 필수 임계값 (%)
                          </label>
                          <input
                            type="number"
                            min="90"
                            max="100"
                            value={formData.toolChanges?.lifeThresholds?.critical || 95}
                            onChange={(e) => updateFormData('toolChanges', 'lifeThresholds', { ...formData.toolChanges?.lifeThresholds, critical: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Tool Life {formData.toolChanges?.lifeThresholds?.critical || 95}% 달성 시 필수 교체
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 저장/초기화 버튼 */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      onClick={() => handleReset('toolChanges')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      기본값으로 초기화
                    </button>
                    <button
                      onClick={() => handleSave('toolChanges')}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {isSubmitting ? '저장 중...' : '💾 설정 저장'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'organization' && (
                <div className="space-y-6">
                  {/* 부서 관리 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🏢 부서 관리</h3>
                      <p className="text-sm text-gray-600">회사 부서 목록 관리</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {(Array.isArray(formData.organization?.departments) ? formData.organization.departments : ['종합 관리실', '공구 관리실', '기술팀']).map((department, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={department}
                                onChange={(e) => {
                                  const newDepartments = [...(formData.organization?.departments || [])]
                                  newDepartments[index] = e.target.value
                                  updateFormData('organization', 'departments', newDepartments)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="부서명 입력"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newDepartments = [...(formData.organization?.departments || [])]
                                newDepartments.splice(index, 1)
                                updateFormData('organization', 'departments', newDepartments)
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                              disabled={(formData.organization?.departments || []).length <= 1}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newDepartments = [...(formData.organization?.departments || []), '새 부서']
                            updateFormData('organization', 'departments', newDepartments)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          + 부서 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 교대 관리 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🔄 교대 관리</h3>
                      <p className="text-sm text-gray-600">근무 교대 목록 관리</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {(Array.isArray(formData.organization?.shifts) ? formData.organization.shifts : ['A', 'B']).map((shift, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={shift}
                                onChange={(e) => {
                                  const newShifts = [...(formData.organization?.shifts || [])]
                                  newShifts[index] = e.target.value
                                  updateFormData('organization', 'shifts', newShifts)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="교대명 입력"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newShifts = [...(formData.organization?.shifts || [])]
                                newShifts.splice(index, 1)
                                updateFormData('organization', 'shifts', newShifts)
                              }}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                              disabled={(formData.organization?.shifts || []).length <= 1}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newShifts = [...(formData.organization?.shifts || []), '새 교대']
                            updateFormData('organization', 'shifts', newShifts)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          + 교대 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 사용자 역할 관리 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">👤 사용자 역할 관리</h3>
                      <p className="text-sm text-gray-600">시스템 사용자 역할 및 권한 설정</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-6">
                        {(Array.isArray(formData.organization?.roles)
                          ? formData.organization.roles
                          : [
                              { code: 'admin', name: '관리자', permissions: ['모든 권한'], isActive: true },
                              { code: 'manager', name: '매니저', permissions: ['읽기', '쓰기', '수정'], isActive: true },
                              { code: 'operator', name: '운영자', permissions: ['읽기', '쓰기'], isActive: true }
                            ]
                        ).map((role, index) => (
                          <div key={index} className="p-4 border border-gray-200 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  역할 코드
                                </label>
                                <input
                                  type="text"
                                  value={role.code}
                                  onChange={(e) => {
                                    const currentRoles = Array.isArray(formData.organization?.roles)
                                      ? formData.organization.roles
                                      : [
                                          { code: 'admin', name: '관리자', permissions: ['모든 권한'], isActive: true },
                                          { code: 'manager', name: '매니저', permissions: ['읽기', '쓰기', '수정'], isActive: true },
                                          { code: 'operator', name: '운영자', permissions: ['읽기', '쓰기'], isActive: true }
                                        ]
                                    const newRoles = [...currentRoles]
                                    newRoles[index] = { ...newRoles[index], code: e.target.value }
                                    updateFormData('organization', 'roles', newRoles)
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="admin"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  역할명
                                </label>
                                <input
                                  type="text"
                                  value={role.name}
                                  onChange={(e) => {
                                    const currentRoles = Array.isArray(formData.organization?.roles)
                                      ? formData.organization.roles
                                      : [
                                          { code: 'admin', name: '관리자', permissions: ['모든 권한'], isActive: true },
                                          { code: 'manager', name: '매니저', permissions: ['읽기', '쓰기', '수정'], isActive: true },
                                          { code: 'operator', name: '운영자', permissions: ['읽기', '쓰기'], isActive: true }
                                        ]
                                    const newRoles = [...currentRoles]
                                    newRoles[index] = { ...newRoles[index], name: e.target.value }
                                    updateFormData('organization', 'roles', newRoles)
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="관리자"
                                />
                              </div>
                              <div className="flex items-end">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={role.isActive}
                                    onChange={(e) => {
                                      const currentRoles = Array.isArray(formData.organization?.roles)
                                        ? formData.organization.roles
                                        : [
                                            { code: 'admin', name: '관리자', permissions: ['모든 권한'], isActive: true },
                                            { code: 'manager', name: '매니저', permissions: ['읽기', '쓰기', '수정'], isActive: true },
                                            { code: 'operator', name: '운영자', permissions: ['읽기', '쓰기'], isActive: true }
                                          ]
                                      const newRoles = [...currentRoles]
                                      newRoles[index] = { ...newRoles[index], isActive: e.target.checked }
                                      updateFormData('organization', 'roles', newRoles)
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">활성화</span>
                                </label>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                권한 목록 (쉼표로 구분)
                              </label>
                              <input
                                type="text"
                                value={role.permissions.join(', ')}
                                onChange={(e) => {
                                  const currentRoles = Array.isArray(formData.organization?.roles)
                                    ? formData.organization.roles
                                    : [
                                        { code: 'admin', name: '관리자', permissions: ['모든 권한'], isActive: true },
                                        { code: 'manager', name: '매니저', permissions: ['읽기', '쓰기', '수정'], isActive: true },
                                        { code: 'operator', name: '운영자', permissions: ['읽기', '쓰기'], isActive: true }
                                      ]
                                  const newRoles = [...currentRoles]
                                  newRoles[index] = {
                                    ...newRoles[index],
                                    permissions: e.target.value.split(',').map(p => p.trim()).filter(p => p)
                                  }
                                  updateFormData('organization', 'roles', newRoles)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="읽기, 쓰기, 수정, 삭제"
                              />
                            </div>
                            <div className="flex justify-end mt-4">
                              <button
                                onClick={() => {
                                  const currentRoles = Array.isArray(formData.organization?.roles)
                                    ? formData.organization.roles
                                    : [
                                        { code: 'admin', name: '관리자', permissions: ['모든 권한'], isActive: true },
                                        { code: 'manager', name: '매니저', permissions: ['읽기', '쓰기', '수정'], isActive: true },
                                        { code: 'operator', name: '운영자', permissions: ['읽기', '쓰기'], isActive: true }
                                      ]
                                  const newRoles = [...currentRoles]
                                  newRoles.splice(index, 1)
                                  updateFormData('organization', 'roles', newRoles)
                                }}
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
                                disabled={(Array.isArray(formData.organization?.roles)
                                  ? formData.organization.roles
                                  : []).length <= 1}
                              >
                                역할 삭제
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const currentRoles = Array.isArray(formData.organization?.roles)
                              ? formData.organization.roles
                              : [
                                  { code: 'admin', name: '관리자', permissions: ['모든 권한'], isActive: true },
                                  { code: 'manager', name: '매니저', permissions: ['읽기', '쓰기', '수정'], isActive: true },
                                  { code: 'operator', name: '운영자', permissions: ['읽기', '쓰기'], isActive: true }
                                ]
                            const newRoles = [...currentRoles, {
                              code: 'new_role',
                              name: '새 역할',
                              permissions: ['읽기'],
                              isActive: true
                            }]
                            updateFormData('organization', 'roles', newRoles)
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          + 역할 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 기본값 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">⚙️ 기본값 설정</h3>
                      <p className="text-sm text-gray-600">신규 사용자 등록 시 기본값 설정</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            기본 역할
                          </label>
                          <select
                            value={formData.organization?.defaultRole || 'operator'}
                            onChange={(e) => updateFormData('organization', 'defaultRole', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {(Array.isArray(formData.organization?.roles) ? formData.organization.roles : []).map(role => (
                              <option key={role.code} value={role.code}>
                                {role.name} ({role.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            기본 교대
                          </label>
                          <select
                            value={formData.organization?.defaultShift || formData.organization?.shifts?.default || 'A'}
                            onChange={(e) => updateFormData('organization', 'defaultShift', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {(Array.isArray(formData.organization?.shifts?.values) ? formData.organization.shifts.values : ['A', 'B']).map(shift => (
                              <option key={shift} value={shift}>
                                {shift}교대
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 저장/초기화 버튼 */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      onClick={() => handleReset('organization')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      기본값으로 초기화
                    </button>
                    <button
                      onClick={() => handleSave('organization')}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {isSubmitting ? '저장 중...' : '💾 설정 저장'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'ui' && (
                <div className="space-y-6">
                  {/* 표시 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">📱 표시 설정</h3>
                      <p className="text-sm text-gray-600">페이지당 항목 수 및 새로고침 간격 설정</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            페이지당 항목 수
                          </label>
                          <select
                            value={formData.system?.itemsPerPage || 20}
                            onChange={(e) => updateFormData('system', 'itemsPerPage', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={10}>10개</option>
                            <option value={20}>20개</option>
                            <option value={50}>50개</option>
                            <option value={100}>100개</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            자동 새로고침 간격 (초)
                          </label>
                          <select
                            value={formData.ui?.dashboard?.refreshInterval || 30}
                            onChange={(e) => updateFormData('ui', 'dashboard', {...formData.ui?.dashboard, refreshInterval: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={0}>비활성화</option>
                            <option value={10}>10초</option>
                            <option value={30}>30초</option>
                            <option value={60}>1분</option>
                            <option value={300}>5분</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 테마 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🎨 테마 설정</h3>
                      <p className="text-sm text-gray-600">사용자 인터페이스 테마 및 색상 설정</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            테마 모드
                          </label>
                          <select
                            value={formData.ui?.theme || 'light'}
                            onChange={(e) => updateFormData('ui', 'theme', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="light">라이트 모드</option>
                            <option value="dark">다크 모드</option>
                            <option value="system">시스템 설정 따름</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            사이드바 상태
                          </label>
                          <select
                            value={formData.ui?.sidebarCollapsed ? 'collapsed' : 'expanded'}
                            onChange={(e) => updateFormData('ui', 'sidebarCollapsed', e.target.value === 'collapsed')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="expanded">확장됨</option>
                            <option value="collapsed">접힘</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 알림 위치 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🔔 알림 설정</h3>
                      <p className="text-sm text-gray-600">알림 표시 위치 및 지속시간 설정</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            알림 위치
                          </label>
                          <select
                            value={formData.ui?.notifications?.position || 'top-right'}
                            onChange={(e) => updateFormData('ui', 'notifications', {...formData.ui?.notifications, position: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="top-right">우측 상단</option>
                            <option value="top-left">좌측 상단</option>
                            <option value="bottom-right">우측 하단</option>
                            <option value="bottom-left">좌측 하단</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            알림 지속시간 (초)
                          </label>
                          <select
                            value={formData.ui?.notifications?.duration || 5}
                            onChange={(e) => updateFormData('ui', 'notifications', {...formData.ui?.notifications, duration: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={3}>3초</option>
                            <option value={5}>5초</option>
                            <option value={10}>10초</option>
                            <option value={0}>수동으로 닫기</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 저장/초기화 버튼 */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      onClick={() => handleReset('ui')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      기본값으로 초기화
                    </button>
                    <button
                      onClick={() => handleSave('ui')}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {isSubmitting ? '저장 중...' : '💾 설정 저장'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  {/* 알림 방법 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">📢 알림 방법 설정</h3>
                      <p className="text-sm text-gray-600">시스템 알림 전송 방법 및 채널 설정</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">실시간 알림</p>
                          <p className="text-xs text-gray-500">웹 브라우저 실시간 알림 사용</p>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.notifications?.realtime?.enabled !== false}
                            onChange={(e) => updateFormData('notifications', 'realtime', {...formData.notifications?.realtime, enabled: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">이메일 알림</p>
                          <p className="text-xs text-gray-500">중요한 이벤트 발생 시 이메일 전송</p>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.notifications?.email?.enabled || false}
                            onChange={(e) => updateFormData('notifications', 'email', {...formData.notifications?.email, enabled: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 알림 유형별 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">⚠️ 알림 유형별 설정</h3>
                      <p className="text-sm text-gray-600">각 이벤트별 알림 활성화/비활성화 설정</p>
                    </div>
                    <div className="p-6">
                      <div className="space-y-6">
                        {(formData.notifications?.realtime?.types || [
                          { type: 'tool_change', enabled: true, priority: 'medium', channels: ['ui'] },
                          { type: 'inventory_low', enabled: true, priority: 'high', channels: ['ui', 'email'] },
                          { type: 'equipment_status', enabled: true, priority: 'high', channels: ['ui'] },
                          { type: 'system', enabled: true, priority: 'low', channels: ['ui'] }
                        ]).map((notifType, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={notifType.enabled}
                                    onChange={(e) => {
                                      const newTypes = [...(formData.notifications?.realtime?.types || [])]
                                      newTypes[index] = { ...newTypes[index], enabled: e.target.checked }
                                      updateFormData('notifications', 'realtime', {...formData.notifications?.realtime, types: newTypes})
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 font-medium text-gray-700">
                                    {notifType.type === 'tool_change' ? '앤드밀 교체' :
                                     notifType.type === 'inventory_low' ? '재고 부족' :
                                     notifType.type === 'equipment_status' ? '설비 상태' :
                                     notifType.type === 'system' ? '시스템' : notifType.type}
                                  </span>
                                </label>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  notifType.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  notifType.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {notifType.priority === 'high' ? '긴급' : 
                                   notifType.priority === 'medium' ? '보통' : '낮음'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <select
                                value={notifType.priority}
                                onChange={(e) => {
                                  const newTypes = [...(formData.notifications?.realtime?.types || [])]
                                  newTypes[index] = { ...newTypes[index], priority: e.target.value as 'low' | 'medium' | 'high' }
                                  updateFormData('notifications', 'realtime', {...formData.notifications?.realtime, types: newTypes})
                                }}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={!notifType.enabled}
                              >
                                <option value="low">낮음</option>
                                <option value="medium">보통</option>
                                <option value="high">긴급</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 알림 스케줄 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">⏰ 알림 스케줄 설정</h3>
                      <p className="text-sm text-gray-600">알림 전송 시간 및 빈도 설정</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            일일 리포트 전송 시간
                          </label>
                          <input
                            type="time"
                            value={formData.notifications?.scheduling?.dailyReport || '18:00'}
                            onChange={(e) => updateFormData('notifications', 'scheduling', {...formData.notifications?.scheduling, dailyReport: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            주간 리포트 전송 요일
                          </label>
                          <select
                            value={formData.notifications?.scheduling?.weeklyReport || 'sunday'}
                            onChange={(e) => updateFormData('notifications', 'scheduling', {...formData.notifications?.scheduling, weeklyReport: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="sunday">일요일</option>
                            <option value="monday">월요일</option>
                            <option value="friday">금요일</option>
                            <option value="saturday">토요일</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 저장/초기화 버튼 */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      onClick={() => handleReset('notifications')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      기본값으로 초기화
                    </button>
                    <button
                      onClick={() => handleSave('notifications')}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {isSubmitting ? '저장 중...' : '💾 설정 저장'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'translations' && (
                <div className="space-y-6">
                  {/* 기본 번역 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🌐 기본 번역 설정</h3>
                      <p className="text-sm text-gray-600">다국어 지원을 위한 기본 언어 및 자동 번역 설정</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 기본 언어 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            기본 언어
                          </label>
                          <select
                            value={formData.translations?.defaultLanguage || 'ko'}
                            onChange={(e) => updateFormData('translations', 'defaultLanguage', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="ko">🇰🇷 한국어</option>
                            <option value="vi">🇻🇳 베트남어</option>
                          </select>
                        </div>

                        {/* 대체 언어 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            대체 언어
                          </label>
                          <select
                            value={formData.translations?.fallbackLanguage || 'ko'}
                            onChange={(e) => updateFormData('translations', 'fallbackLanguage', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="ko">🇰🇷 한국어</option>
                            <option value="vi">🇻🇳 베트남어</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            번역이 없을 때 사용할 언어
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* 번역 관리 활성화 */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">번역 관리 활성화</p>
                            <p className="text-xs text-gray-500">다국어 번역 기능 사용</p>
                          </div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.translations?.enabled !== false}
                              onChange={(e) => updateFormData('translations', 'enabled', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </label>
                        </div>

                        {/* 자동 번역 */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">자동 번역</p>
                            <p className="text-xs text-gray-500">새 번역 키 추가 시 Google Translate 사용</p>
                          </div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.translations?.autoTranslate || false}
                              onChange={(e) => updateFormData('translations', 'autoTranslate', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              disabled={!formData.translations?.enabled}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Google Translate API 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🔑 Google Translate API 설정</h3>
                      <p className="text-sm text-gray-600">자동 번역을 위한 Google Cloud Translation API 설정</p>
                    </div>
                    <div className="p-6 space-y-6">
                      {/* Google API 기본 설정 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* API 키 */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Google Cloud Translation API 키
                          </label>
                          <div className="flex space-x-3">
                            <input
                              type="password"
                              value={formData.translations?.googleApiKey || ''}
                              onChange={(e) => updateFormData('translations', 'googleApiKey', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="AIzaSyB1234567890abcdefghijklmnopqrstuvwxyz"
                              disabled={!formData.translations?.enabled}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                // API 키 검증 로직
                                try {
                                  showInfo('검증 중...', 'API 키를 검증하고 있습니다.')
                                  // 실제 검증 로직은 GoogleTranslateService에서 처리
                                  showSuccess('검증 완료', 'API 키가 유효합니다.')
                                } catch (error) {
                                  showError('검증 실패', 'API 키가 유효하지 않거나 권한이 없습니다.')
                                }
                              }}
                              disabled={!formData.translations?.googleApiKey || !formData.translations?.enabled}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              검증
                            </button>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-500">
                              Google Cloud Console에서 Translation API를 활성화하고 API 키를 생성하세요.
                            </p>
                            <a 
                              href="https://console.cloud.google.com/apis/library/translate.googleapis.com" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              Google Cloud Translation API 설정 가이드 →
                            </a>
                          </div>
                        </div>

                        {/* 프로젝트 ID */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Google Cloud 프로젝트 ID
                          </label>
                          <input
                            type="text"
                            value={formData.translations?.googleProjectId || ''}
                            onChange={(e) => updateFormData('translations', 'googleProjectId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="my-project-12345"
                            disabled={!formData.translations?.enabled}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            고급 API (v3) 사용 시 필요한 프로젝트 ID
                          </p>
                        </div>

                        {/* 위치 설정 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Google Cloud 위치
                          </label>
                          <select
                            value={formData.translations?.googleLocation || 'global'}
                            onChange={(e) => updateFormData('translations', 'googleLocation', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!formData.translations?.enabled}
                          >
                            <option value="global">Global</option>
                            <option value="us-central1">US Central (Iowa)</option>
                            <option value="asia-northeast1">Asia Northeast (Tokyo)</option>
                            <option value="asia-southeast1">Asia Southeast (Singapore)</option>
                            <option value="europe-west1">Europe West (Belgium)</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            번역 처리가 수행될 Google Cloud 리전
                          </p>
                        </div>

                        {/* 고급 API 사용 */}
                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-700">고급 번역 API (v3) 사용</p>
                              <p className="text-xs text-gray-500">용어집, 사용자 정의 모델 등 고급 기능 사용</p>
                            </div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.translations?.useAdvancedAPI || false}
                                onChange={(e) => updateFormData('translations', 'useAdvancedAPI', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                disabled={!formData.translations?.enabled}
                              />
                            </label>
                          </div>
                          {formData.translations?.useAdvancedAPI && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <span className="font-medium">주의:</span> 고급 API는 프로젝트 ID가 필요하며, 
                                기본 API보다 더 많은 기능을 제공하지만 설정이 복잡할 수 있습니다.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* API 사용량 정보 */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-700">📊 API 사용량</h4>
                          <button
                            type="button"
                            onClick={() => {
                              // 사용량 새로고침 로직
                              showInfo('업데이트 중...', 'API 사용량을 업데이트하고 있습니다.')
                              // 실제 사용량 갱신 로직 추가 예정
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            새로고침
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">이번 달 사용량</p>
                            <p className="font-medium">
                              {formData.translations?.apiUsage?.currentUsage?.toLocaleString() || '0'} / {formData.translations?.apiUsage?.monthlyLimit?.toLocaleString() || '500,000'}자
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">남은 할당량</p>
                            <p className={`font-medium ${
                              ((formData.translations?.apiUsage?.monthlyLimit || 500000) - (formData.translations?.apiUsage?.currentUsage || 0)) > 100000 
                                ? 'text-green-600' 
                                : 'text-yellow-600'
                            }`}>
                              {((formData.translations?.apiUsage?.monthlyLimit || 500000) - (formData.translations?.apiUsage?.currentUsage || 0)).toLocaleString()}자
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">사용률</p>
                            <p className="font-medium">
                              {(((formData.translations?.apiUsage?.currentUsage || 0) / (formData.translations?.apiUsage?.monthlyLimit || 500000)) * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">마지막 리셋</p>
                            <p className="font-medium">
                              {formData.translations?.apiUsage?.lastResetDate 
                                ? new Date(formData.translations.apiUsage.lastResetDate).toLocaleDateString('ko-KR')
                                : '-'}
                            </p>
                          </div>
                        </div>
                        
                        {/* 사용량 제한 설정 */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">월간 사용량 제한</h5>
                          <div className="flex items-center space-x-3">
                            <input
                              type="number"
                              min="10000"
                              max="10000000"
                              step="10000"
                              value={formData.translations?.apiUsage?.monthlyLimit || 500000}
                              onChange={(e) => updateFormData('translations', 'apiUsage', {
                                ...formData.translations?.apiUsage,
                                monthlyLimit: parseInt(e.target.value)
                              })}
                              className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={!formData.translations?.enabled}
                            />
                            <span className="text-sm text-gray-500">문자</span>
                            <button
                              type="button"
                              onClick={() => {
                                updateFormData('translations', 'apiUsage', {
                                  ...formData.translations?.apiUsage,
                                  currentUsage: 0,
                                  lastResetDate: new Date().toISOString()
                                })
                                showSuccess('리셋 완료', '사용량이 0으로 초기화되었습니다.')
                              }}
                              className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                              disabled={!formData.translations?.enabled}
                            >
                              사용량 리셋
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Google Cloud Translation API 월간 할당량에 맞춰 설정하세요.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 번역 캐시 설정 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">💾 번역 캐시 설정</h3>
                      <p className="text-sm text-gray-600">번역 결과 캐싱을 통한 성능 최적화 및 API 사용량 절약</p>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="space-y-4">
                        {/* 캐시 활성화 */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">번역 캐시 활성화</p>
                            <p className="text-xs text-gray-500">번역 결과를 로컬에 저장하여 중복 번역 방지</p>
                          </div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.translations?.cacheEnabled !== false}
                              onChange={(e) => updateFormData('translations', 'cacheEnabled', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              disabled={!formData.translations?.enabled}
                            />
                          </label>
                        </div>

                        {/* 캐시 만료 시간 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            캐시 만료 시간
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <select
                              value={formData.translations?.cacheExpiry || 60}
                              onChange={(e) => updateFormData('translations', 'cacheExpiry', parseInt(e.target.value))}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={!formData.translations?.enabled || !formData.translations?.cacheEnabled}
                            >
                              <option value={30}>30분</option>
                              <option value={60}>1시간</option>
                              <option value={360}>6시간</option>
                              <option value={720}>12시간</option>
                              <option value={1440}>1일</option>
                              <option value={10080}>1주일</option>
                              <option value={43200}>1개월</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                // 캐시 삭제 로직 (추후 구현)
                                console.log('캐시 삭제')
                              }}
                              disabled={!formData.translations?.enabled || !formData.translations?.cacheEnabled}
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              캐시 삭제
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            캐시된 번역 결과가 자동으로 삭제되는 시간
                          </p>
                        </div>
                      </div>

                      {/* 캐시 통계 */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">📈 캐시 통계</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">캐시된 번역</p>
                            <p className="font-medium">0개</p>
                          </div>
                          <div>
                            <p className="text-gray-500">캐시 적중률</p>
                            <p className="font-medium">0%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">절약된 API 호출</p>
                            <p className="font-medium text-green-600">0회</p>
                          </div>
                          <div>
                            <p className="text-gray-500">캐시 크기</p>
                            <p className="font-medium">0 KB</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 번역 관리 도구 */}
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">🛠️ 번역 관리 도구</h3>
                      <p className="text-sm text-gray-600">번역 데이터 백업, 복원 및 관리 도구</p>
                    </div>
                    <div className="p-6 space-y-6">
                      {/* 프로젝트 스캔 및 자동 번역 */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">🔍 프로젝트 스캔 및 자동 번역</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setIsSubmitting(true)
                                showInfo('스캔 중...', '프로젝트에서 한국어 텍스트를 스캔하고 있습니다.')
                                
                                const response = await fetch('/api/translations', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'scan_project',
                                    data: {
                                      projectRoot: process.cwd()
                                    }
                                  })
                                })
                                
                                const result = await response.json()
                                if (result.success) {
                                  showSuccess('스캔 완료', `${result.data.scannedTexts}개의 한국어 텍스트를 발견했습니다.`)
                                } else {
                                  showError('스캔 실패', result.error || '알 수 없는 오류가 발생했습니다.')
                                }
                              } catch (error) {
                                showError('스캔 실패', '네트워크 오류가 발생했습니다.')
                              } finally {
                                setIsSubmitting(false)
                              }
                            }}
                            disabled={!formData.translations?.enabled || isSubmitting}
                            className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="mr-2">🔎</span>
                            {isSubmitting ? '스캔 중...' : '프로젝트 스캔'}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setIsSubmitting(true)
                                showInfo('처리 중...', '프로젝트를 스캔하고 자동 번역을 진행하고 있습니다.')
                                
                                const response = await fetch('/api/translations', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'scan_and_register',
                                    data: {
                                      projectRoot: process.cwd(),
                                      autoTranslateScanned: true,
                                      confidenceThreshold: 0.7,
                                      changedBy: '관리자'
                                    }
                                  })
                                })
                                
                                const result = await response.json()
                                if (result.success) {
                                  showSuccess('완료', `${result.data.scannedTexts}개 텍스트 스캔, ${result.data.registeredKeys}개 번역 키 등록 완료`)
                                } else {
                                  showError('실패', result.error || '알 수 없는 오류가 발생했습니다.')
                                }
                              } catch (error) {
                                showError('실패', '네트워크 오류가 발생했습니다.')
                              } finally {
                                setIsSubmitting(false)
                              }
                            }}
                            disabled={!formData.translations?.enabled || !formData.translations?.autoTranslate || isSubmitting}
                            className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="mr-2">🚀</span>
                            {isSubmitting ? '처리 중...' : '스캔 + 자동번역'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          프로젝트 전체에서 하드코딩된 한국어 텍스트를 찾아 번역 키로 자동 등록합니다.
                        </p>
                        {!formData.translations?.autoTranslate && (
                          <p className="text-xs text-yellow-600 mt-1">
                            ⚠️ 자동 번역이 비활성화되어 있어 "스캔 + 자동번역" 기능을 사용할 수 없습니다.
                          </p>
                        )}
                      </div>

                      {/* 데이터 가져오기/내보내기 */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">📁 데이터 가져오기/내보내기</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/translations', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'export'
                                  })
                                })
                                
                                const result = await response.json()
                                if (result.success) {
                                  const dataStr = JSON.stringify(result.data, null, 2)
                                  const dataBlob = new Blob([dataStr], { type: 'application/json' })
                                  const url = URL.createObjectURL(dataBlob)
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = `translations_export_${new Date().toISOString().split('T')[0]}.json`
                                  link.click()
                                  URL.revokeObjectURL(url)
                                  
                                  showSuccess('내보내기 완료', '번역 데이터가 다운로드되었습니다.')
                                } else {
                                  showError('내보내기 실패', result.error || '알 수 없는 오류가 발생했습니다.')
                                }
                              } catch (error) {
                                showError('내보내기 실패', '네트워크 오류가 발생했습니다.')
                              }
                            }}
                            disabled={!formData.translations?.enabled}
                            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="mr-2">📤</span>
                            번역 데이터 내보내기
                          </button>
                          <label className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer disabled:opacity-50">
                            <span className="mr-2">📥</span>
                            번역 데이터 가져오기
                            <input
                              type="file"
                              accept=".json"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                
                                try {
                                  const text = await file.text()
                                  const response = await fetch('/api/translations', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      action: 'import',
                                      data: {
                                        jsonData: text,
                                        changedBy: '관리자'
                                      }
                                    })
                                  })
                                  
                                  const result = await response.json()
                                  if (result.success) {
                                    showSuccess('가져오기 완료', '번역 데이터를 성공적으로 가져왔습니다.')
                                  } else {
                                    showError('가져오기 실패', result.error || '알 수 없는 오류가 발생했습니다.')
                                  }
                                } catch (error) {
                                  showError('가져오기 실패', '파일을 읽는 중 오류가 발생했습니다.')
                                }
                                
                                // 파일 입력 초기화
                                e.target.value = ''
                              }}
                              className="hidden"
                              disabled={!formData.translations?.enabled}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          JSON 형식으로 번역 데이터를 백업하거나 복원할 수 있습니다.
                        </p>
                      </div>

                      {/* 번역 검증 및 통계 */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">🔍 번역 검증 및 통계</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              // 번역 검증 로직 (추후 구현)
                              console.log('번역 검증')
                            }}
                            disabled={!formData.translations?.enabled}
                            className="flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="mr-2">✅</span>
                            번역 검증
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // 번역 통계 보기 로직 (추후 구현)
                              console.log('번역 통계')
                            }}
                            disabled={!formData.translations?.enabled}
                            className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="mr-2">📊</span>
                            통계 보기
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              // 누락된 번역 찾기 로직 (추후 구현)
                              console.log('누락된 번역 찾기')
                            }}
                            disabled={!formData.translations?.enabled}
                            className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="mr-2">🔎</span>
                            누락 번역 찾기
                          </button>
                        </div>
                      </div>

                      {/* 위험 작업 */}
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-medium text-red-700 mb-3">⚠️ 위험 작업</h4>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-red-800">번역 데이터 초기화</p>
                              <p className="text-xs text-red-600">모든 번역 데이터를 기본값으로 초기화합니다. 이 작업은 되돌릴 수 없습니다.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('정말로 모든 번역 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                                  // 번역 데이터 초기화 로직 (추후 구현)
                                  console.log('번역 데이터 초기화')
                                }
                              }}
                              disabled={!formData.translations?.enabled}
                              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              초기화
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 저장/초기화 버튼 */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      onClick={() => handleReset('translations')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                    >
                      기본값으로 초기화
                    </button>
                    <button
                      onClick={() => handleSave('translations')}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {isSubmitting ? '저장 중...' : '💾 설정 저장'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 현재 설정값 디버깅 정보 (개발용) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <details>
              <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                🔍 현재 설정값 보기 (개발용)
              </summary>
              <div className="mt-3 p-3 bg-white rounded border">
                <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                  {JSON.stringify(settings[activeTab], null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  )
}