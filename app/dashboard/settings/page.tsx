'use client'

import { useState, useEffect } from 'react'
import { useSettings } from '../../../lib/hooks/useSettings'
import { SettingsCategory } from '../../../lib/types/settings'
import { useToast } from '../../../components/shared/Toast'

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
  }
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsCategory>('system')
  const { 
    settings, 
    updateCategorySettings, 
    resetSettings, 
    isLoading, 
    error, 
    hasUnsavedChanges 
  } = useSettings()
  const { showSuccess, showError } = useToast()
  
  // 임시 폼 상태 (각 탭별로)
  const [formData, setFormData] = useState(settings)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <p className="text-gray-600">설정을 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

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

  return (
    <div className="space-y-6">
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
                    {(formData.equipment?.locations || ['A동', 'B동']).map((location, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={location}
                            onChange={(e) => {
                              const newLocations = [...(formData.equipment?.locations || [])]
                              newLocations[index] = e.target.value
                              updateFormData('equipment', 'locations', newLocations)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="위치명 입력"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newLocations = [...(formData.equipment?.locations || [])]
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
                        const newLocations = [...(formData.equipment?.locations || []), '새 위치']
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
                    {(formData.equipment?.models || ['PA1', 'PA2', 'PS', 'B7', 'Q7']).map((model, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={model}
                            onChange={(e) => {
                              const newModels = [...(formData.equipment?.models || [])]
                              newModels[index] = e.target.value
                              updateFormData('equipment', 'models', newModels)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="모델명 입력"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newModels = [...(formData.equipment?.models || [])]
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
                        const newModels = [...(formData.equipment?.models || []), '새 모델']
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
                    {(formData.equipment?.processes || ['CNC1', 'CNC2', 'CNC2-1']).map((process, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={process}
                            onChange={(e) => {
                              const newProcesses = [...(formData.equipment?.processes || [])]
                              newProcesses[index] = e.target.value
                              updateFormData('equipment', 'processes', newProcesses)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="공정명 입력"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newProcesses = [...(formData.equipment?.processes || [])]
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
                        const newProcesses = [...(formData.equipment?.processes || []), '새 공정']
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
                    {(formData.inventory?.categories || ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL']).map((category, index) => (
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
                        const newCategories = [...(formData.inventory?.categories || []), '새 카테고리']
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
                    {(formData.inventory?.suppliers || ['Kyocera', 'Mitsubishi', 'Sandvik', 'OSG', 'YG-1', 'Guhring']).map((supplier, index) => (
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
                        const newSuppliers = [...(formData.inventory?.suppliers || []), '새 공급업체']
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
                    {(formData.toolChanges?.reasons || ['정상 수명', '파손', '마모', '품질 불량', '기타']).map((reason, index) => (
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
                        value={formData.toolChanges?.warningThreshold || 80}
                        onChange={(e) => updateFormData('toolChanges', 'warningThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Tool Life {formData.toolChanges?.warningThreshold || 80}% 달성 시 경고
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
                        value={formData.toolChanges?.criticalThreshold || 95}
                        onChange={(e) => updateFormData('toolChanges', 'criticalThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Tool Life {formData.toolChanges?.criticalThreshold || 95}% 달성 시 필수 교체
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
                    {(formData.organization?.departments || ['종합 관리실', '공구 관리실', '기술팀']).map((department, index) => (
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
                    {(formData.organization?.shifts || ['A', 'B']).map((shift, index) => (
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
                    {(formData.organization?.roles || [
                      { code: 'admin', name: '관리자', permissions: ['모든 권한'], isActive: true },
                      { code: 'manager', name: '매니저', permissions: ['읽기', '쓰기', '수정'], isActive: true },
                      { code: 'operator', name: '운영자', permissions: ['읽기', '쓰기'], isActive: true }
                    ]).map((role, index) => (
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
                                const newRoles = [...(formData.organization?.roles || [])]
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
                                const newRoles = [...(formData.organization?.roles || [])]
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
                                  const newRoles = [...(formData.organization?.roles || [])]
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
                              const newRoles = [...(formData.organization?.roles || [])]
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
                              const newRoles = [...(formData.organization?.roles || [])]
                              newRoles.splice(index, 1)
                              updateFormData('organization', 'roles', newRoles)
                            }}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600"
                            disabled={(formData.organization?.roles || []).length <= 1}
                          >
                            역할 삭제
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newRoles = [...(formData.organization?.roles || []), {
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
                        {(formData.organization?.roles || []).map(role => (
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
                        value={formData.organization?.defaultShift || 'A'}
                        onChange={(e) => updateFormData('organization', 'defaultShift', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {(formData.organization?.shifts || []).map(shift => (
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
                        value={formData.ui?.itemsPerPage || 20}
                        onChange={(e) => updateFormData('ui', 'itemsPerPage', parseInt(e.target.value))}
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
                        value={formData.ui?.refreshInterval || 30}
                        onChange={(e) => updateFormData('ui', 'refreshInterval', parseInt(e.target.value))}
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
                        메인 색상
                      </label>
                      <select
                        value={formData.ui?.primaryColor || 'blue'}
                        onChange={(e) => updateFormData('ui', 'primaryColor', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="blue">파란색</option>
                        <option value="green">녹색</option>
                        <option value="purple">보라색</option>
                        <option value="orange">주황색</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 기타 UI 설정 */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">⚙️ 기타 UI 설정</h3>
                  <p className="text-sm text-gray-600">사용성 개선을 위한 기타 설정</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">애니메이션 효과</p>
                      <p className="text-xs text-gray-500">페이지 전환 시 애니메이션 효과 사용</p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.ui?.animations !== false}
                        onChange={(e) => updateFormData('ui', 'animations', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">사운드 효과</p>
                      <p className="text-xs text-gray-500">알림 및 액션에 대한 사운드 효과</p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.ui?.sounds || false}
                        onChange={(e) => updateFormData('ui', 'sounds', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">확대/축소 지원</p>
                      <p className="text-xs text-gray-500">브라우저 확대/축소 최적화</p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.ui?.zoomSupport !== false}
                        onChange={(e) => updateFormData('ui', 'zoomSupport', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </label>
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
                      <p className="text-sm font-medium text-gray-700">브라우저 알림</p>
                      <p className="text-xs text-gray-500">웹 브라우저 푸시 알림 사용</p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.notifications?.browserNotifications !== false}
                        onChange={(e) => updateFormData('notifications', 'browserNotifications', e.target.checked)}
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
                        checked={formData.notifications?.emailNotifications || false}
                        onChange={(e) => updateFormData('notifications', 'emailNotifications', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">SMS 알림</p>
                      <p className="text-xs text-gray-500">긴급 상황 발생 시 SMS 전송</p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.notifications?.smsNotifications || false}
                        onChange={(e) => updateFormData('notifications', 'smsNotifications', e.target.checked)}
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
                    {(formData.notifications?.types || [
                      { type: 'tool_change_warning', name: '앤드밀 교체 경고', enabled: true, urgency: 'medium' },
                      { type: 'tool_change_critical', name: '앤드밀 교체 필수', enabled: true, urgency: 'high' },
                      { type: 'inventory_low', name: '재고 부족', enabled: true, urgency: 'medium' },
                      { type: 'inventory_critical', name: '재고 위험', enabled: true, urgency: 'high' },
                      { type: 'equipment_error', name: '설비 오류', enabled: true, urgency: 'high' },
                      { type: 'system_maintenance', name: '시스템 점검', enabled: true, urgency: 'low' }
                    ]).map((notifType, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={notifType.enabled}
                                onChange={(e) => {
                                  const newTypes = [...(formData.notifications?.types || [])]
                                  newTypes[index] = { ...newTypes[index], enabled: e.target.checked }
                                  updateFormData('notifications', 'types', newTypes)
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 font-medium text-gray-700">{notifType.name}</span>
                            </label>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              notifType.urgency === 'high' ? 'bg-red-100 text-red-800' :
                              notifType.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {notifType.urgency === 'high' ? '긴급' : 
                               notifType.urgency === 'medium' ? '보통' : '낮음'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <select
                            value={notifType.urgency}
                            onChange={(e) => {
                              const newTypes = [...(formData.notifications?.types || [])]
                              newTypes[index] = { ...newTypes[index], urgency: e.target.value }
                              updateFormData('notifications', 'types', newTypes)
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
                        value={formData.notifications?.dailyReportTime || '18:00'}
                        onChange={(e) => updateFormData('notifications', 'dailyReportTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        알림 검사 간격 (분)
                      </label>
                      <select
                        value={formData.notifications?.checkInterval || 5}
                        onChange={(e) => updateFormData('notifications', 'checkInterval', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={1}>1분</option>
                        <option value={5}>5분</option>
                        <option value={10}>10분</option>
                        <option value={30}>30분</option>
                        <option value={60}>1시간</option>
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
    </div>
  )
} 