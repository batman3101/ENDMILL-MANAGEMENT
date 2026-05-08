'use client'

import { useState, useEffect } from 'react'
import { Info, Loader2 } from 'lucide-react'
import { useAuth } from '../../../lib/hooks/useAuth'
import { createBrowserClient } from '@/lib/supabase/client'
import { useToast } from '../../../components/shared/Toast'
import { PermissionGuard } from '../../../components/auth/PermissionGuard'
import { useTranslation } from 'react-i18next'
import { clientLogger } from '@/lib/utils/logger'

interface ProfileFormData {
  name: string
  email: string
  department: string
  position: string
  shift: string
  language: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const { user, refreshSession } = useAuth()
  const { showSuccess, showError } = useToast()
  const supabase = createBrowserClient()
  const { t } = useTranslation()

  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: '',
    email: '',
    department: '',
    position: '',
    shift: '',
    language: 'ko',
  })

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        position: user.position || '',
        shift: user.shift || '',
        language: user.language || 'ko',
      })
    }
  }, [user])

  const validateProfile = (data: ProfileFormData): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!data.name.trim()) errs.name = t('profile.nameRequired')
    if (!data.email.trim()) {
      errs.email = t('profile.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errs.email = t('profile.invalidEmail')
    }
    return errs
  }

  const validatePassword = (data: PasswordFormData): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!data.currentPassword) errs.currentPassword = t('profile.currentPasswordRequired')
    if (!data.newPassword) {
      errs.newPassword = t('profile.newPasswordRequired')
    } else if (data.newPassword.length < 8) {
      errs.newPassword = t('profile.passwordTooShort')
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.newPassword)) {
      errs.newPassword = t('profile.passwordComplexity')
    }
    if (data.newPassword !== data.confirmPassword) {
      errs.confirmPassword = t('profile.passwordMismatch')
    }
    return errs
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validateProfile(profileData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setLoading(true)
    setErrors({})
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })
      const result = await response.json()
      if (!response.ok) {
        showError(t('profile.profileUpdateError'), result.error || t('profile.profileUpdateError'))
      } else {
        showSuccess(t('common.updateSuccess'), t('profile.profileUpdateSuccess'))
        await refreshSession()
      }
    } catch (error) {
      clientLogger.error('프로필 업데이트 오류:', error)
      showError(t('profile.profileUpdateError'), t('profile.profileUpdateError'))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validatePassword(passwordData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setPasswordLoading(true)
    setErrors({})
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword,
      })
      if (signInError) {
        setErrors({ currentPassword: t('profile.currentPasswordIncorrect') })
        return
      }
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })
      if (error) {
        showError(t('profile.passwordChangeError'), error.message)
      } else {
        showSuccess(t('common.success'), t('profile.passwordChangeSuccess'))
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (error) {
      clientLogger.error('비밀번호 변경 오류:', error)
      showError(t('profile.passwordChangeError'), t('profile.passwordChangeError'))
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <PermissionGuard>
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-md border border-divider bg-paper-warm">
          {/* 탭 네비 — 사이드바 메뉴 + sticky 헤더가 페이지 타이틀을 운반하므로 본문 24px 헤딩+subtitle 제거 */}
          <div className="border-b border-divider">
            <nav className="-mb-px flex gap-2 px-4 sm:px-6">
              <TabButton
                active={activeTab === 'profile'}
                onClick={() => setActiveTab('profile')}
                label={t('profile.personalInfo')}
              />
              <TabButton
                active={activeTab === 'password'}
                onClick={() => setActiveTab('password')}
                label={t('profile.changePassword')}
              />
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                  <Field
                    id="name"
                    label={t('common.name')}
                    required
                    error={errors.name}
                  >
                    <input
                      type="text"
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className={inputClass(!!errors.name)}
                      disabled={loading}
                    />
                  </Field>

                  <Field
                    id="email"
                    label={t('auth.email')}
                    required
                    error={errors.email}
                  >
                    <input
                      type="email"
                      id="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className={inputClass(!!errors.email)}
                      disabled={loading}
                    />
                  </Field>

                  <Field id="department" label={t('profile.department')}>
                    <input
                      type="text"
                      id="department"
                      value={profileData.department}
                      onChange={(e) =>
                        setProfileData({ ...profileData, department: e.target.value })
                      }
                      className={inputClass(false)}
                      disabled={loading}
                    />
                  </Field>

                  <Field id="position" label={t('profile.position')}>
                    <input
                      type="text"
                      id="position"
                      value={profileData.position}
                      onChange={(e) =>
                        setProfileData({ ...profileData, position: e.target.value })
                      }
                      className={inputClass(false)}
                      disabled={loading}
                    />
                  </Field>

                  <Field id="shift" label={t('profile.shift')}>
                    <select
                      id="shift"
                      value={profileData.shift}
                      onChange={(e) => setProfileData({ ...profileData, shift: e.target.value })}
                      className={inputClass(false)}
                      disabled={loading}
                    >
                      <option value="">{t('profile.selectShift')}</option>
                      <option value="day">{t('profile.dayShift')}</option>
                      <option value="night">{t('profile.nightShift')}</option>
                      <option value="rotating">{t('profile.rotatingShift')}</option>
                    </select>
                  </Field>

                  <Field id="language" label={t('profile.language')}>
                    <select
                      id="language"
                      value={profileData.language}
                      onChange={(e) =>
                        setProfileData({ ...profileData, language: e.target.value })
                      }
                      className={inputClass(false)}
                      disabled={loading}
                    >
                      <option value="ko">{t('profile.korean')}</option>
                      <option value="vi">{t('profile.vietnamese')}</option>
                    </select>
                  </Field>
                </div>

                <div className="flex justify-end">
                  <PrimaryButton type="submit" disabled={loading} loading={loading}>
                    {loading ? t('profile.updating') : t('profile.profileUpdate')}
                  </PrimaryButton>
                </div>
              </form>
            )}

            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="max-w-md space-y-4">
                  <Field
                    id="currentPassword"
                    label={t('profile.currentPassword')}
                    required
                    error={errors.currentPassword}
                  >
                    <input
                      type="password"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className={inputClass(!!errors.currentPassword)}
                      disabled={passwordLoading}
                    />
                  </Field>

                  <Field
                    id="newPassword"
                    label={t('profile.newPassword')}
                    required
                    error={errors.newPassword}
                  >
                    <input
                      type="password"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className={inputClass(!!errors.newPassword)}
                      disabled={passwordLoading}
                      placeholder={t('profile.passwordPlaceholder')}
                    />
                  </Field>

                  <Field
                    id="confirmPassword"
                    label={t('profile.confirmPassword')}
                    required
                    error={errors.confirmPassword}
                  >
                    <input
                      type="password"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className={inputClass(!!errors.confirmPassword)}
                      disabled={passwordLoading}
                    />
                  </Field>
                </div>

                {/* 비밀번호 안내 — info 칩 */}
                <div className="rounded-sm border border-divider bg-gauge-cobalt-soft p-3">
                  <div className="flex gap-2">
                    <Info
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-gauge-cobalt-strong"
                      aria-hidden="true"
                    />
                    <div className="text-caption">
                      <p className="font-semibold text-gauge-cobalt-strong">
                        {t('profile.passwordRequirements')}
                      </p>
                      <ul className="mt-1 list-inside list-disc text-ink-soft">
                        <li>{t('profile.minLength')}</li>
                        <li>{t('profile.upperLower')}</li>
                        <li>{t('profile.includeNumber')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <PrimaryButton
                    type="submit"
                    disabled={passwordLoading}
                    loading={passwordLoading}
                  >
                    {passwordLoading ? t('profile.changing') : t('profile.changePassword')}
                  </PrimaryButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}

// === 서브 컴포넌트 ===

function inputClass(hasError: boolean): string {
  const base =
    'w-full min-h-touch rounded-sm border bg-paper px-3 py-2 text-label text-ink focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60'
  return hasError
    ? `${base} border-signal-stop-strong focus:border-signal-stop-strong focus:ring-signal-stop-strong`
    : `${base} border-divider focus:border-gauge-cobalt focus:ring-gauge-cobalt`
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  label: string
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'border-b-2 border-gauge-cobalt px-3 py-3 text-label font-semibold text-gauge-cobalt-strong transition-colors no-break'
          : 'border-b-2 border-transparent px-3 py-3 text-label font-medium text-ink-soft transition-colors hover:border-divider hover:text-ink no-break'
      }
    >
      {label}
    </button>
  )
}

interface FieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-caption font-medium text-ink-soft">
        {label}
        {required && <span className="ml-0.5 text-signal-stop-strong">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-caption text-signal-stop-strong">{error}</p>}
    </div>
  )
}

interface PrimaryButtonProps {
  type?: 'submit' | 'button'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
}

function PrimaryButton({ type = 'button', disabled, loading, children }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="inline-flex min-h-touch items-center gap-2 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
