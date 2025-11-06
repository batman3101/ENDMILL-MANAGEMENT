'use client'

import { useState, useEffect } from 'react'
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
    language: 'ko'
  })
  
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 사용자 정보 로드
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        position: user.position || '',
        shift: user.shift || '',
        language: user.language || 'ko'
      })
    }
  }, [user])

  // 프로필 유효성 검사
  const validateProfile = (data: ProfileFormData): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!data.name.trim()) {
      errors.name = t('profile.nameRequired')
    }

    if (!data.email.trim()) {
      errors.email = t('profile.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = t('profile.invalidEmail')
    }

    return errors
  }

  // 비밀번호 유효성 검사
  const validatePassword = (data: PasswordFormData): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!data.currentPassword) {
      errors.currentPassword = t('profile.currentPasswordRequired')
    }

    if (!data.newPassword) {
      errors.newPassword = t('profile.newPasswordRequired')
    } else if (data.newPassword.length < 8) {
      errors.newPassword = t('profile.passwordTooShort')
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.newPassword)) {
      errors.newPassword = t('profile.passwordComplexity')
    }

    if (data.newPassword !== data.confirmPassword) {
      errors.confirmPassword = t('profile.passwordMismatch')
    }

    return errors
  }

  // 프로필 업데이트
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
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

  // 비밀번호 변경
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
      // 현재 비밀번호 확인
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword
      })
      
      if (signInError) {
        setErrors({ currentPassword: t('profile.currentPasswordIncorrect') })
        return
      }

      // 새 비밀번호로 업데이트
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) {
        showError(t('profile.passwordChangeError'), error.message)
      } else {
        showSuccess(t('common.success'), t('profile.passwordChangeSuccess'))
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
            <p className="text-sm text-gray-600 mt-1">{t('profile.subtitle')}</p>
          </div>
          
          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('profile.personalInfo')}
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('profile.changePassword')}
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('common.name')} *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('auth.email')} *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.department')}
                    </label>
                    <input
                      type="text"
                      id="department"
                      value={profileData.department}
                      onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.position')}
                    </label>
                    <input
                      type="text"
                      id="position"
                      value={profileData.position}
                      onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="shift" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.shift')}
                    </label>
                    <select
                      id="shift"
                      value={profileData.shift}
                      onChange={(e) => setProfileData({ ...profileData, shift: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">{t('profile.selectShift')}</option>
                      <option value="day">{t('profile.dayShift')}</option>
                      <option value="night">{t('profile.nightShift')}</option>
                      <option value="rotating">{t('profile.rotatingShift')}</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.language')}
                    </label>
                    <select
                      id="language"
                      value={profileData.language}
                      onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="ko">{t('profile.korean')}</option>
                      <option value="en">{t('profile.english')}</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        {t('profile.updating')}
                      </>
                    ) : (
                      t('profile.profileUpdate')
                    )}
                  </button>
                </div>
              </form>
            )}
            
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="max-w-md space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.currentPassword')} *
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={passwordLoading}
                    />
                    {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.newPassword')} *
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={passwordLoading}
                      placeholder={t('profile.passwordPlaceholder')}
                    />
                    {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.confirmPassword')} *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={passwordLoading}
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>{t('profile.passwordRequirements')}</strong>
                      </p>
                      <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
                        <li>{t('profile.minLength')}</li>
                        <li>{t('profile.upperLower')}</li>
                        <li>{t('profile.includeNumber')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        {t('profile.changing')}
                      </>
                    ) : (
                      t('profile.changePassword')
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}