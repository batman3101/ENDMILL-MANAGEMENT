'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { clientLogger } from '@/lib/utils/logger'

interface SystemSetting {
  id: string
  category: string
  key: string
  value: any
  description: string | null
  updated_at: string | null
}

export default function SystemSettingsPage() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>(null)

  // system_admin 권한 확인
  const canManageSettings = hasPermission('settings', 'update')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (data.success) {
        setSettings(data.settings || [])
      }
    } catch (error) {
      clientLogger.error('설정 조회 오류:', error)
      alert('설정을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (setting: SystemSetting) => {
    setEditingId(setting.id)
    setEditValue(setting.value)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValue(null)
  }

  const handleSave = async (setting: SystemSetting) => {
    if (!canManageSettings) {
      alert('설정을 변경할 권한이 없습니다.')
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: setting.category,
          key: setting.key,
          value: editValue
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('설정이 성공적으로 업데이트되었습니다.')
        await fetchSettings()
        setEditingId(null)
        setEditValue(null)
      } else {
        alert(data.error || '설정 업데이트에 실패했습니다.')
      }
    } catch (error) {
      clientLogger.error('설정 업데이트 오류:', error)
      alert('설정 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderValueInput = (setting: SystemSetting, isEditing: boolean) => {
    const value = isEditing ? editValue : setting.value

    // 숫자 타입
    if (typeof setting.value === 'number') {
      return isEditing ? (
        <input
          type="number"
          value={value}
          onChange={(e) => setEditValue(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <span className="text-gray-900 font-medium">{value}</span>
      )
    }

    // 불리언 타입
    if (typeof setting.value === 'boolean') {
      return isEditing ? (
        <select
          value={value ? 'true' : 'false'}
          onChange={(e) => setEditValue(e.target.value === 'true')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="true">활성화</option>
          <option value="false">비활성화</option>
        </select>
      ) : (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? '활성화' : '비활성화'}
        </span>
      )
    }

    // 문자열 타입
    return isEditing ? (
      <input
        type="text"
        value={value}
        onChange={(e) => setEditValue(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    ) : (
      <span className="text-gray-900 font-medium">{value}</span>
    )
  }

  if (!canManageSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">접근 권한 없음</h2>
          <p className="text-gray-600">시스템 설정을 관리할 권한이 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.systemSettings')}</h1>
          <p className="text-sm text-gray-600 mt-1">시스템 전역 설정을 관리합니다.</p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">설정을 불러오는 중...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    키
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    값
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    설명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마지막 수정
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settings.map((setting) => {
                  const isEditing = editingId === setting.id
                  return (
                    <tr key={setting.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {setting.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm text-gray-900">{setting.key}</code>
                      </td>
                      <td className="px-6 py-4">
                        {renderValueInput(setting, isEditing)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {setting.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {setting.updated_at
                          ? new Date(setting.updated_at).toLocaleString('ko-KR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleSave(setting)}
                              disabled={isSaving}
                              className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={isSaving}
                              className="text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(setting)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            수정
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {settings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">등록된 시스템 설정이 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
