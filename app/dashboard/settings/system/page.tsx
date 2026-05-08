'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, RefreshCw } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { clientLogger } from '@/lib/utils/logger'

type SettingValue = string | number | boolean | null

interface SystemSetting {
  id: string
  category: string
  key: string
  value: SettingValue
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
  const [editValue, setEditValue] = useState<SettingValue>(null)

  const canManageSettings = hasPermission('settings', 'update')

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (data.success) {
        setSettings(data.settings || [])
      }
    } catch (error) {
      clientLogger.error('설정 조회 오류:', error)
      alert(t('settings.system.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

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
      alert(t('settings.system.noPermission'))
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
          value: editValue,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(t('settings.system.updateSuccess'))
        await fetchSettings()
        setEditingId(null)
        setEditValue(null)
      } else {
        alert(data.error || t('settings.system.updateError'))
      }
    } catch (error) {
      clientLogger.error('설정 업데이트 오류:', error)
      alert(t('settings.system.updateError'))
    } finally {
      setIsSaving(false)
    }
  }

  const renderValueInput = (setting: SystemSetting, isEditing: boolean) => {
    const value = isEditing ? editValue : setting.value

    if (typeof setting.value === 'number') {
      return isEditing ? (
        <input
          type="number"
          value={value as number}
          onChange={(e) => setEditValue(Number(e.target.value))}
          className="w-full min-h-touch rounded-sm border border-divider bg-paper px-3 py-2 text-label text-ink focus:border-gauge-cobalt focus:outline-none focus:ring-1 focus:ring-gauge-cobalt"
        />
      ) : (
        <span className="text-label font-medium text-ink">{value as number}</span>
      )
    }

    if (typeof setting.value === 'boolean') {
      return isEditing ? (
        <select
          value={value ? 'true' : 'false'}
          onChange={(e) => setEditValue(e.target.value === 'true')}
          className="w-full min-h-touch rounded-sm border border-divider bg-paper px-3 py-2 text-label text-ink focus:border-gauge-cobalt focus:outline-none focus:ring-1 focus:ring-gauge-cobalt"
        >
          <option value="true">{t('settings.system.enabled')}</option>
          <option value="false">{t('settings.system.disabled')}</option>
        </select>
      ) : (
        <span
          className={
            value
              ? 'inline-flex items-center rounded-sm bg-signal-go-soft px-2 py-0.5 text-caption font-medium text-signal-go-strong'
              : 'inline-flex items-center rounded-sm bg-paper-warm px-2 py-0.5 text-caption font-medium text-ink-soft'
          }
        >
          {value ? t('settings.system.enabled') : t('settings.system.disabled')}
        </span>
      )
    }

    return isEditing ? (
      <input
        type="text"
        value={(value as string) ?? ''}
        onChange={(e) => setEditValue(e.target.value)}
        className="w-full min-h-touch rounded-sm border border-divider bg-paper px-3 py-2 text-label text-ink focus:border-gauge-cobalt focus:outline-none focus:ring-1 focus:ring-gauge-cobalt"
      />
    ) : (
      <span className="text-label font-medium text-ink">{value as string}</span>
    )
  }

  if (!canManageSettings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h2 className="text-title font-semibold text-ink">
            {t('settings.system.accessDeniedTitle')}
          </h2>
          <p className="mt-1 text-label text-ink-soft">
            {t('settings.system.accessDeniedDesc')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="inline-flex min-h-touch items-center gap-2 rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          )}
          {isLoading ? t('settings.system.refreshing') : t('settings.system.refresh')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Loader2
              className="mx-auto mb-4 h-8 w-8 animate-spin text-gauge-cobalt-strong"
              aria-hidden="true"
            />
            <p className="text-label text-ink-soft">{t('settings.system.loading')}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-divider bg-paper-warm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-divider">
              <thead className="bg-paper-warm">
                <tr>
                  <Th>{t('settings.system.colCategory')}</Th>
                  <Th>{t('settings.system.colKey')}</Th>
                  <Th>{t('settings.system.colValue')}</Th>
                  <Th>{t('settings.system.colDescription')}</Th>
                  <Th>{t('settings.system.colUpdatedAt')}</Th>
                  <Th align="right">{t('settings.system.colAction')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider bg-paper">
                {settings.map((setting) => {
                  const isEditing = editingId === setting.id
                  return (
                    <tr
                      key={setting.id}
                      className={isEditing ? 'bg-gauge-cobalt-soft' : 'hover:bg-paper-warm'}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center rounded-sm bg-paper-warm px-2 py-0.5 text-caption font-medium text-ink-soft">
                          {setting.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <code className="text-caption text-ink">{setting.key}</code>
                      </td>
                      <td className="px-4 py-3">{renderValueInput(setting, isEditing)}</td>
                      <td className="px-4 py-3 text-label text-ink-soft">
                        {setting.description || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-caption text-ink-mute">
                        {setting.updated_at
                          ? new Date(setting.updated_at).toLocaleString('ko-KR')
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-label font-medium">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleSave(setting)}
                              disabled={isSaving}
                              className="text-signal-go-strong hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t('common.save')}
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={isSaving}
                              className="text-ink-soft hover:text-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(setting)}
                            className="text-gauge-cobalt-strong hover:underline"
                          >
                            {t('common.edit')}
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
            <div className="py-12 text-center">
              <p className="text-label text-ink-mute">{t('settings.system.empty')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ThProps {
  children: React.ReactNode
  align?: 'left' | 'right'
}

function Th({ children, align = 'left' }: ThProps) {
  return (
    <th
      scope="col"
      className={
        align === 'right'
          ? 'px-4 py-3 text-right text-caption font-medium uppercase tracking-wider text-ink-soft'
          : 'px-4 py-3 text-left text-caption font-medium uppercase tracking-wider text-ink-soft'
      }
    >
      {children}
    </th>
  )
}
