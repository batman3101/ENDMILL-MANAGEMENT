'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { SystemSettings } from '@/lib/types/settings'

interface SettingsContextType {
  settings: SystemSettings
  isLoading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/settings')
      const result = await response.json()

      if (result.success && result.data) {
        setSettings(result.data)
      } else {
        throw new Error(result.error || 'Failed to load settings')
      }
    } catch (err) {
      console.error('Settings loading error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')

      // Fallback to default settings
      setSettings(getDefaultSettings())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Listen for settings updates from other components
  useEffect(() => {
    const handleSettingsUpdate = () => {
      loadSettings()
    }

    window.addEventListener('settingsUpdated', handleSettingsUpdate)
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate)
  }, [loadSettings])

  const value: SettingsContextType = {
    settings: settings || getDefaultSettings(),
    isLoading,
    error,
    refreshSettings: loadSettings
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useAppSettings must be used within a SettingsProvider')
  }
  return context
}

// Default settings fallback
function getDefaultSettings(): SystemSettings {
  return {
    system: {
      language: 'ko',
      defaultLanguage: 'ko',
      currency: 'VND',
      timezone: { value: 'Asia/Ho_Chi_Minh' },
      dateFormat: 'DD/MM/YYYY',
      date_format: { value: 'DD/MM/YYYY' },
      session_timeout: { value: 480, unit: 'minutes' },
      sessionTimeout: 60,
      autoLogout: false,
      items_per_page: 50,
      itemsPerPage: 30,
      maxFileSize: 10
    },
    equipment: {
      models: [],
      defaultToolPositions: 21,
      maintenanceInterval: 30
    },
    inventory: {
      lowStockThreshold: 10,
      criticalStockThreshold: 5,
      autoReorderEnabled: false,
      reorderQuantity: 50
    },
    toolChange: {
      requireApproval: false,
      approvers: [],
      notifyOnChange: true
    },
    organization: {
      shifts: [],
      departments: [],
      positions: []
    },
    uiux: {
      theme: 'light',
      compactMode: false,
      showNotifications: true
    },
    notifications: {
      email: false,
      push: false,
      inApp: true
    },
    translations: {
      supportedLanguages: ['ko', 'vi'],
      fallbackLanguage: 'ko'
    }
  } as unknown as SystemSettings
}
