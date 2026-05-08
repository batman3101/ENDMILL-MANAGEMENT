'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Bell,
  Boxes,
  Cpu,
  Factory,
  Globe2,
  Info,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Monitor,
  Palette,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Sliders,
  Tags,
  Truck,
  Wrench,
  X,
} from 'lucide-react'
import { useSettings } from '../../../lib/hooks/useSettings'
import { SettingsCategory } from '../../../lib/types/settings'
import { useToast } from '../../../components/shared/Toast'
import { AdminGuard } from '../../../components/auth/PermissionGuard'
import { clientLogger } from '../../../lib/utils/logger'

// === Types ===

interface EndmillCategoryRecord {
  id: string
  code: string
  name_ko: string
  name_vi?: string
  description?: string | null
}

interface SupplierRecord {
  id: string
  code: string
  name: string
  quality_rating?: number | null
  is_active?: boolean
}

const TAB_DEFS: Array<{
  id: SettingsCategory
  Icon: typeof Cpu
  labelKey: string
}> = [
  { id: 'system', Icon: Cpu, labelKey: 'settings.tabs.system' },
  { id: 'equipment', Icon: Factory, labelKey: 'settings.tabs.equipment' },
  { id: 'inventory', Icon: Boxes, labelKey: 'settings.tabs.inventory' },
  { id: 'toolChanges', Icon: Wrench, labelKey: 'settings.tabs.toolChanges' },
  { id: 'ui', Icon: Palette, labelKey: 'settings.tabs.ui' },
]

const DEFAULT_LOCATIONS = ['A동', 'B동']
const DEFAULT_MODELS = ['PA1', 'PA2', 'PS', 'B7', 'Q7']
const DEFAULT_PROCESSES = ['CNC1', 'CNC2', 'CNC2-1']
const DEFAULT_REASONS = ['정상 수명', '파손', '마모', '품질 불량', '기타']

export default function SettingsPage() {
  return (
    <AdminGuard>
      <SettingsPageContent />
    </AdminGuard>
  )
}

function SettingsPageContent() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsCategory>('system')
  const {
    settings,
    updateCategorySettings,
    resetSettings,
    isLoading,
    error,
    hasUnsavedChanges,
  } = useSettings()
  const { showSuccess, showError } = useToast()

  const [formData, setFormData] = useState(settings || null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 엔드밀 카테고리
  const [endmillCategories, setEndmillCategories] = useState<EndmillCategoryRecord[]>([])
  const [isCategoryLoading, setIsCategoryLoading] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [modalCategoryData, setModalCategoryData] = useState<EndmillCategoryRecord | null>(null)
  const [categoryCode, setCategoryCode] = useState('')
  const [categoryName, setCategoryName] = useState('')

  // 공급업체
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [isSupplierLoading, setIsSupplierLoading] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [modalSupplierMode, setModalSupplierMode] = useState<'add' | 'edit'>('add')
  const [modalSupplierData, setModalSupplierData] = useState<SupplierRecord | null>(null)
  const [supplierCode, setSupplierCode] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [supplierQualityRating, setSupplierQualityRating] = useState('8')

  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchEndmillCategories()
      fetchSuppliers()
    }
  }, [activeTab])

  const fetchEndmillCategories = async () => {
    try {
      setIsCategoryLoading(true)
      const response = await fetch('/api/endmill-categories')
      const result = await response.json()
      if (result.success) {
        setEndmillCategories(result.data || [])
      }
    } catch (err) {
      clientLogger.error('카테고리 조회 오류:', err)
    } finally {
      setIsCategoryLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      setIsSupplierLoading(true)
      const response = await fetch('/api/suppliers?includeInactive=true')
      const result = await response.json()
      if (result.success) {
        setSuppliers(result.data || [])
      }
    } catch (err) {
      clientLogger.error('공급업체 조회 오류:', err)
    } finally {
      setIsSupplierLoading(false)
    }
  }

  const handleAddCategory = () => {
    setModalMode('add')
    setCategoryCode('')
    setCategoryName('')
    setModalCategoryData(null)
    setShowCategoryModal(true)
  }

  const handleSubmitAddCategory = async () => {
    if (!categoryCode.trim() || !categoryName.trim()) {
      showError(t('common.validationError'), t('settings.modals.categoryCodeNameRequired'))
      return
    }
    try {
      setIsCategoryLoading(true)
      const response = await fetch('/api/endmill-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: categoryCode.trim().toUpperCase(),
          name_ko: categoryName.trim(),
          name_vi: categoryName.trim(),
          description: `${categoryName.trim()} 엔드밀`,
        }),
      })
      const result = await response.json()
      if (result.success) {
        showSuccess(t('common.addSuccess'), t('settings.modals.categoryAddSuccess'))
        await fetchEndmillCategories()
        setShowCategoryModal(false)
      } else {
        showError(t('common.addFailed'), result.error || t('settings.modals.categoryAddFailed'))
      }
    } catch (err) {
      clientLogger.error('카테고리 추가 오류:', err)
      showError(t('common.addFailed'), t('settings.modals.categoryAddFailed'))
    } finally {
      setIsCategoryLoading(false)
    }
  }

  const handleUpdateCategory = (category: EndmillCategoryRecord) => {
    setModalMode('edit')
    setCategoryCode(category.code)
    setCategoryName(category.name_ko)
    setModalCategoryData(category)
    setShowCategoryModal(true)
  }

  const handleSubmitUpdateCategory = async () => {
    if (!categoryName.trim()) {
      showError(t('common.validationError'), t('settings.modals.categoryNameRequired'))
      return
    }
    if (!modalCategoryData) return
    try {
      setIsCategoryLoading(true)
      const response = await fetch('/api/endmill-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modalCategoryData.id,
          name_ko: categoryName.trim(),
          name_vi: categoryName.trim(),
        }),
      })
      const result = await response.json()
      if (result.success) {
        showSuccess(t('common.updateSuccess'), t('settings.modals.categoryUpdateSuccess'))
        await fetchEndmillCategories()
        setShowCategoryModal(false)
      } else {
        showError(t('common.updateFailed'), result.error || t('settings.modals.categoryUpdateFailed'))
      }
    } catch (err) {
      clientLogger.error('카테고리 수정 오류:', err)
      showError(t('common.updateFailed'), t('settings.modals.categoryUpdateFailed'))
    } finally {
      setIsCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async (category: EndmillCategoryRecord) => {
    if (!confirm(t('settings.modals.categoryDeleteConfirm', { name: category.name_ko }))) {
      return
    }
    try {
      setIsCategoryLoading(true)
      const response = await fetch(`/api/endmill-categories?id=${category.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        showSuccess(t('common.deleteSuccess'), t('settings.modals.categoryDeleteSuccess'))
        await fetchEndmillCategories()
      } else {
        showError(t('common.deleteFailed'), result.error || t('settings.modals.categoryDeleteFailed'))
      }
    } catch (err) {
      clientLogger.error('카테고리 삭제 오류:', err)
      showError(t('common.deleteFailed'), t('settings.modals.categoryDeleteFailed'))
    } finally {
      setIsCategoryLoading(false)
    }
  }

  const handleAddSupplier = () => {
    setModalSupplierMode('add')
    setSupplierCode('')
    setSupplierName('')
    setSupplierQualityRating('8')
    setModalSupplierData(null)
    setShowSupplierModal(true)
  }

  const handleSubmitAddSupplier = async () => {
    if (!supplierCode.trim() || !supplierName.trim()) {
      showError(t('common.validationError'), t('settings.modals.supplierCodeNameRequired'))
      return
    }
    try {
      setIsSupplierLoading(true)
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: supplierCode.trim().toUpperCase(),
          name: supplierName.trim(),
          quality_rating: parseInt(supplierQualityRating) || 8,
          is_active: true,
        }),
      })
      const result = await response.json()
      if (result.success) {
        showSuccess(t('common.addSuccess'), t('settings.modals.supplierAddSuccess'))
        await fetchSuppliers()
        setShowSupplierModal(false)
      } else {
        showError(t('common.addFailed'), result.error || t('settings.modals.supplierAddFailed'))
      }
    } catch (err) {
      clientLogger.error('공급업체 추가 오류:', err)
      showError(t('common.addFailed'), t('settings.modals.supplierAddFailed'))
    } finally {
      setIsSupplierLoading(false)
    }
  }

  const handleUpdateSupplier = (supplier: SupplierRecord) => {
    setModalSupplierMode('edit')
    setSupplierCode(supplier.code)
    setSupplierName(supplier.name)
    setSupplierQualityRating(supplier.quality_rating?.toString() || '8')
    setModalSupplierData(supplier)
    setShowSupplierModal(true)
  }

  const handleSubmitUpdateSupplier = async () => {
    if (!supplierName.trim()) {
      showError(t('common.validationError'), t('settings.modals.supplierNameRequired'))
      return
    }
    if (!modalSupplierData) return
    try {
      setIsSupplierLoading(true)
      const response = await fetch(`/api/suppliers?id=${modalSupplierData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supplierName.trim(),
          quality_rating: parseInt(supplierQualityRating) || 8,
        }),
      })
      const result = await response.json()
      if (result.success) {
        showSuccess(t('common.updateSuccess'), t('settings.modals.supplierUpdateSuccess'))
        await fetchSuppliers()
        setShowSupplierModal(false)
      } else {
        showError(t('common.updateFailed'), result.error || t('settings.modals.supplierUpdateFailed'))
      }
    } catch (err) {
      clientLogger.error('공급업체 수정 오류:', err)
      showError(t('common.updateFailed'), t('settings.modals.supplierUpdateFailed'))
    } finally {
      setIsSupplierLoading(false)
    }
  }

  const handleDeleteSupplier = async (supplier: SupplierRecord) => {
    if (!confirm(t('settings.modals.supplierDeleteConfirm', { name: supplier.name }))) {
      return
    }
    try {
      setIsSupplierLoading(true)
      const response = await fetch(`/api/suppliers?id=${supplier.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        showSuccess(t('common.deleteSuccess'), t('settings.modals.supplierDeleteSuccess'))
        await fetchSuppliers()
      } else {
        showError(t('common.deleteFailed'), result.error || t('settings.modals.supplierDeleteFailed'))
      }
    } catch (err) {
      clientLogger.error('공급업체 삭제 오류:', err)
      showError(t('common.deleteFailed'), t('settings.modals.supplierDeleteFailed'))
    } finally {
      setIsSupplierLoading(false)
    }
  }

  const handleSave = async (category: SettingsCategory) => {
    if (!formData) {
      showError(t('settings.savedFailed'), t('settings.notLoaded'))
      return
    }
    setIsSubmitting(true)
    try {
      await updateCategorySettings(
        category,
        formData[category],
        '관리자',
        t('settings.updateReason'),
      )
      window.dispatchEvent(new CustomEvent('settingsUpdated'))
      showSuccess(t('settings.saveComplete'), t('settings.saveSuccess'))
    } catch {
      showError(t('settings.saveFailed'), t('settings.saveErrorDesc'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async (category: SettingsCategory) => {
    try {
      await resetSettings(category, '관리자')
      setFormData((prev) => {
        if (!prev || !settings) return prev
        return { ...prev, [category]: settings[category] }
      })
      showSuccess(t('settings.resetComplete'), t('settings.resetSuccess'))
    } catch {
      showError(t('settings.resetFailed'), t('settings.resetErrorDesc'))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFormData = (category: SettingsCategory, field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [field]: value,
        },
      }
    })
  }

  return (
    <div className="space-y-4">
      {isLoading || !formData ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Loader2
              className="mx-auto mb-4 h-8 w-8 animate-spin text-gauge-cobalt-strong"
              aria-hidden="true"
            />
            <p className="text-label text-ink-soft">{t('settings.settingsLoading')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* 상태 알림 (저장되지 않은 변경 / 에러) */}
          {(hasUnsavedChanges || error) && (
            <div className="flex flex-wrap items-center gap-2">
              {hasUnsavedChanges && (
                <div className="inline-flex items-center gap-2 rounded-sm border border-divider bg-signal-watch-soft px-3 py-2">
                  <AlertTriangle
                    className="h-4 w-4 text-signal-watch-strong"
                    aria-hidden="true"
                  />
                  <span className="text-caption text-signal-watch-strong">
                    {t('settings.unsavedChanges')}
                  </span>
                </div>
              )}
              {error && (
                <div className="inline-flex items-center gap-2 rounded-sm border border-divider bg-signal-stop-soft px-3 py-2">
                  <ShieldAlert
                    className="h-4 w-4 text-signal-stop-strong"
                    aria-hidden="true"
                  />
                  <span className="text-caption text-signal-stop-strong">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* 탭 네비 + 본문 — 카드 컨테이너 */}
          <div className="overflow-hidden rounded-md border border-divider bg-paper-warm">
            <div className="border-b border-divider">
              <nav
                className="-mb-px flex overflow-x-auto px-2 sm:px-4"
                aria-label={t('settings.tabsAriaLabel')}
              >
                {TAB_DEFS.map((tab) => (
                  <TabButton
                    key={tab.id}
                    Icon={tab.Icon}
                    label={t(tab.labelKey)}
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
              </nav>
            </div>

            <div className="p-4 sm:p-6">
              {activeTab === 'system' && (
                <SystemTab
                  formData={formData}
                  updateFormData={updateFormData}
                  onSave={() => handleSave('system')}
                  onReset={() => handleReset('system')}
                  isSubmitting={isSubmitting}
                />
              )}
              {activeTab === 'equipment' && (
                <EquipmentTab
                  formData={formData}
                  updateFormData={updateFormData}
                  onSave={() => handleSave('equipment')}
                  onReset={() => handleReset('equipment')}
                  isSubmitting={isSubmitting}
                />
              )}
              {activeTab === 'inventory' && (
                <InventoryTab
                  formData={formData}
                  updateFormData={updateFormData}
                  onSave={() => handleSave('inventory')}
                  onReset={() => handleReset('inventory')}
                  isSubmitting={isSubmitting}
                  endmillCategories={endmillCategories}
                  isCategoryLoading={isCategoryLoading}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  suppliers={suppliers}
                  isSupplierLoading={isSupplierLoading}
                  onAddSupplier={handleAddSupplier}
                  onUpdateSupplier={handleUpdateSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                />
              )}
              {activeTab === 'toolChanges' && (
                <ToolChangesTab
                  formData={formData}
                  updateFormData={updateFormData}
                  onSave={() => handleSave('toolChanges')}
                  onReset={() => handleReset('toolChanges')}
                  isSubmitting={isSubmitting}
                />
              )}
              {activeTab === 'ui' && (
                <UiTab
                  formData={formData}
                  updateFormData={updateFormData}
                  onSave={() => handleSave('ui')}
                  onReset={() => handleReset('ui')}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          </div>

          {showCategoryModal && (
            <CategoryModal
              mode={modalMode}
              code={categoryCode}
              name={categoryName}
              isLoading={isCategoryLoading}
              onCodeChange={setCategoryCode}
              onNameChange={setCategoryName}
              onClose={() => setShowCategoryModal(false)}
              onSubmit={
                modalMode === 'add' ? handleSubmitAddCategory : handleSubmitUpdateCategory
              }
            />
          )}

          {showSupplierModal && (
            <SupplierModal
              mode={modalSupplierMode}
              code={supplierCode}
              name={supplierName}
              qualityRating={supplierQualityRating}
              isLoading={isSupplierLoading}
              onCodeChange={setSupplierCode}
              onNameChange={setSupplierName}
              onQualityChange={setSupplierQualityRating}
              onClose={() => setShowSupplierModal(false)}
              onSubmit={
                modalSupplierMode === 'add'
                  ? handleSubmitAddSupplier
                  : handleSubmitUpdateSupplier
              }
            />
          )}

        </>
      )}
    </div>
  )
}

// === 탭 컨테이너 컴포넌트 ===

interface TabContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFormData: (category: SettingsCategory, field: string, value: any) => void
  onSave: () => void
  onReset: () => void
  isSubmitting: boolean
}

function SystemTab({ formData, updateFormData, onSave, onReset, isSubmitting }: TabContentProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <Section
        Icon={Globe2}
        title={t('settings.basicSettings')}
        description={t('settings.basicSettingsDesc')}
      >
        <FieldGrid>
          <Field id="defaultLanguage" label={t('settings.fields.defaultLanguage')}>
            <select
              id="defaultLanguage"
              value={formData.system?.defaultLanguage || 'ko'}
              onChange={(e) => updateFormData('system', 'defaultLanguage', e.target.value)}
              className={inputClass(false)}
            >
              <option value="ko">{t('settings.options.korean')}</option>
              <option value="vi">{t('settings.options.vietnamese')}</option>
            </select>
          </Field>
          <Field id="currency" label={t('settings.fields.currency')}>
            <select
              id="currency"
              value={formData.system?.currency || 'VND'}
              onChange={(e) => updateFormData('system', 'currency', e.target.value)}
              className={inputClass(false)}
            >
              <option value="VND">{t('settings.options.vnd')}</option>
              <option value="KRW">{t('settings.options.krw')}</option>
              <option value="USD">{t('settings.options.usd')}</option>
            </select>
          </Field>
          <Field id="timezone" label={t('settings.fields.timezone')}>
            <select
              id="timezone"
              value={formData.system?.timezone || 'Asia/Ho_Chi_Minh'}
              onChange={(e) => updateFormData('system', 'timezone', e.target.value)}
              className={inputClass(false)}
            >
              <option value="Asia/Ho_Chi_Minh">{t('settings.options.tzVN')}</option>
              <option value="Asia/Seoul">{t('settings.options.tzKR')}</option>
              <option value="UTC">{t('settings.options.tzUTC')}</option>
            </select>
          </Field>
          <Field id="dateFormat" label={t('settings.fields.dateFormat')}>
            <select
              id="dateFormat"
              value={formData.system?.dateFormat || 'YYYY-MM-DD'}
              onChange={(e) => updateFormData('system', 'dateFormat', e.target.value)}
              className={inputClass(false)}
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-01)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (01/01/2024)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (01/01/2024)</option>
            </select>
          </Field>
        </FieldGrid>
      </Section>

      <Section
        Icon={Lock}
        title={t('settings.sessionSecurity')}
        description={t('settings.sessionSecurityDesc')}
      >
        <FieldGrid>
          <Field
            id="sessionTimeout"
            label={t('settings.fields.sessionTimeout')}
            hint={t('settings.hints.sessionTimeoutRange')}
          >
            <input
              id="sessionTimeout"
              type="number"
              min={5}
              max={480}
              value={formData.system?.sessionTimeout || 60}
              onChange={(e) =>
                updateFormData('system', 'sessionTimeout', parseInt(e.target.value))
              }
              className={inputClass(false)}
            />
          </Field>
          <Field id="autoLogout" label={t('settings.fields.autoLogout')}>
            <label className="inline-flex min-h-touch items-center gap-2">
              <input
                type="checkbox"
                checked={formData.system?.autoLogout || false}
                onChange={(e) => updateFormData('system', 'autoLogout', e.target.checked)}
                className={checkboxClass()}
              />
              <span className="text-label text-ink-soft">
                {t('settings.fields.autoLogoutDesc')}
              </span>
            </label>
          </Field>
        </FieldGrid>
      </Section>

      <Section
        Icon={Monitor}
        title={t('settings.displaySettings')}
        description={t('settings.displaySettingsDesc')}
      >
        <FieldGrid>
          <Field id="itemsPerPage" label={t('settings.fields.itemsPerPage')}>
            <select
              id="itemsPerPage"
              value={formData.system?.itemsPerPage || 20}
              onChange={(e) =>
                updateFormData('system', 'itemsPerPage', parseInt(e.target.value))
              }
              className={inputClass(false)}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </Field>
          <Field
            id="maxFileSize"
            label={t('settings.fields.maxFileSize')}
            hint={t('settings.hints.maxFileSizeRange')}
          >
            <input
              id="maxFileSize"
              type="number"
              min={1}
              max={100}
              value={formData.system?.maxFileSize || 10}
              onChange={(e) =>
                updateFormData('system', 'maxFileSize', parseInt(e.target.value))
              }
              className={inputClass(false)}
            />
          </Field>
        </FieldGrid>
      </Section>

      <ActionRow onSave={onSave} onReset={onReset} isSubmitting={isSubmitting} />
    </div>
  )
}

function EquipmentTab({
  formData,
  updateFormData,
  onSave,
  onReset,
  isSubmitting,
}: TabContentProps) {
  const { t } = useTranslation()
  const locations: string[] = Array.isArray(formData.equipment?.locations)
    ? formData.equipment.locations
    : DEFAULT_LOCATIONS
  const models: string[] = Array.isArray(formData.equipment?.models)
    ? formData.equipment.models
    : DEFAULT_MODELS
  const processes: string[] = Array.isArray(formData.equipment?.processes)
    ? formData.equipment.processes
    : DEFAULT_PROCESSES

  return (
    <div className="space-y-4">
      <Section
        Icon={Factory}
        title={t('settings.equipmentBasic')}
        description={t('settings.equipmentBasicDesc')}
      >
        <FieldGrid>
          <Field
            id="totalCount"
            label={t('settings.fields.totalCount')}
            hint={t('settings.hints.totalCountRange')}
          >
            <input
              id="totalCount"
              type="number"
              min={1}
              max={1000}
              value={formData.equipment?.totalCount || 800}
              onChange={(e) =>
                updateFormData('equipment', 'totalCount', parseInt(e.target.value))
              }
              className={inputClass(false)}
            />
          </Field>
          <Field id="numberFormat" label={t('settings.fields.numberFormat')}>
            <select
              id="numberFormat"
              value={formData.equipment?.numberFormat || 'C{number:3}'}
              onChange={(e) => updateFormData('equipment', 'numberFormat', e.target.value)}
              className={inputClass(false)}
            >
              <option value="C{number:3}">C001, C002, ... (C + 3)</option>
              <option value="M{number:3}">M001, M002, ... (M + 3)</option>
              <option value="CNC{number:3}">CNC001, CNC002, ... (CNC + 3)</option>
              <option value="{number:4}">0001, 0002, ... (4)</option>
            </select>
          </Field>
          <Field
            id="toolPositionCount"
            label={t('settings.fields.toolPositionCount')}
            hint={t('settings.hints.toolPositionCountRange', {
              count: formData.equipment?.toolPositionCount || 21,
            })}
          >
            <input
              id="toolPositionCount"
              type="number"
              min={12}
              max={24}
              value={formData.equipment?.toolPositionCount || 21}
              onChange={(e) =>
                updateFormData('equipment', 'toolPositionCount', parseInt(e.target.value))
              }
              className={inputClass(false)}
            />
          </Field>
          <Field id="defaultStatus" label={t('settings.fields.defaultStatus')}>
            <select
              id="defaultStatus"
              value={formData.equipment?.defaultStatus || '가동중'}
              onChange={(e) => updateFormData('equipment', 'defaultStatus', e.target.value)}
              className={inputClass(false)}
            >
              <option value="가동중">{t('settings.options.statusRunning')}</option>
              <option value="점검중">{t('settings.options.statusInspection')}</option>
              <option value="셋업중">{t('settings.options.statusSetup')}</option>
            </select>
          </Field>
        </FieldGrid>
      </Section>

      <Section
        Icon={MapPin}
        title={t('settings.locationManagement')}
        description={t('settings.locationManagementDesc')}
      >
        <ListEditor
          items={locations}
          fallback={DEFAULT_LOCATIONS}
          placeholder={t('settings.placeholders.locationName')}
          addLabel={t('settings.actions.addLocation')}
          onChange={(next) => updateFormData('equipment', 'locations', next)}
        />
      </Section>

      <Section
        Icon={Layers}
        title={t('settings.modelManagement')}
        description={t('settings.modelManagementDesc')}
      >
        <ListEditor
          items={models}
          fallback={DEFAULT_MODELS}
          placeholder={t('settings.placeholders.modelName')}
          addLabel={t('settings.actions.addModel')}
          onChange={(next) => updateFormData('equipment', 'models', next)}
        />
      </Section>

      <Section
        Icon={Sliders}
        title={t('settings.processManagement')}
        description={t('settings.processManagementDesc')}
      >
        <ListEditor
          items={processes}
          fallback={DEFAULT_PROCESSES}
          placeholder={t('settings.placeholders.processName')}
          addLabel={t('settings.actions.addProcess')}
          onChange={(next) => updateFormData('equipment', 'processes', next)}
        />
      </Section>

      <ActionRow onSave={onSave} onReset={onReset} isSubmitting={isSubmitting} />
    </div>
  )
}

interface InventoryTabProps extends TabContentProps {
  endmillCategories: EndmillCategoryRecord[]
  isCategoryLoading: boolean
  onAddCategory: () => void
  onUpdateCategory: (c: EndmillCategoryRecord) => void
  onDeleteCategory: (c: EndmillCategoryRecord) => void
  suppliers: SupplierRecord[]
  isSupplierLoading: boolean
  onAddSupplier: () => void
  onUpdateSupplier: (s: SupplierRecord) => void
  onDeleteSupplier: (s: SupplierRecord) => void
}

function InventoryTab(props: InventoryTabProps) {
  const { t } = useTranslation()
  const {
    formData,
    updateFormData,
    onSave,
    onReset,
    isSubmitting,
    endmillCategories,
    isCategoryLoading,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
    suppliers,
    isSupplierLoading,
    onAddSupplier,
    onUpdateSupplier,
    onDeleteSupplier,
  } = props

  return (
    <div className="space-y-4">
      <Section
        Icon={Boxes}
        title={t('settings.inventoryThresholds')}
        description={t('settings.inventoryThresholdsDesc')}
      >
        <FieldGrid>
          <Field
            id="criticalPercent"
            label={t('settings.fields.criticalPercent')}
            hint={t('settings.hints.criticalPercent', {
              p: formData.inventory?.stockThresholds?.criticalPercent || 25,
            })}
          >
            <input
              id="criticalPercent"
              type="number"
              min={1}
              max={50}
              value={formData.inventory?.stockThresholds?.criticalPercent || 25}
              onChange={(e) =>
                updateFormData('inventory', 'stockThresholds', {
                  ...formData.inventory?.stockThresholds,
                  criticalPercent: parseInt(e.target.value),
                })
              }
              className={inputClass(false)}
            />
          </Field>
          <Field
            id="lowPercent"
            label={t('settings.fields.lowPercent')}
            hint={t('settings.hints.lowPercent', {
              p: formData.inventory?.stockThresholds?.lowPercent || 75,
            })}
          >
            <input
              id="lowPercent"
              type="number"
              min={51}
              max={100}
              value={formData.inventory?.stockThresholds?.lowPercent || 75}
              onChange={(e) =>
                updateFormData('inventory', 'stockThresholds', {
                  ...formData.inventory?.stockThresholds,
                  lowPercent: parseInt(e.target.value),
                })
              }
              className={inputClass(false)}
            />
          </Field>
          <Field id="defaultMinStock" label={t('settings.fields.defaultMinStock')}>
            <input
              id="defaultMinStock"
              type="number"
              min={1}
              value={formData.inventory?.defaultValues?.minStock || 20}
              onChange={(e) =>
                updateFormData('inventory', 'defaultValues', {
                  ...formData.inventory?.defaultValues,
                  minStock: parseInt(e.target.value),
                })
              }
              className={inputClass(false)}
            />
          </Field>
          <Field id="defaultMaxStock" label={t('settings.fields.defaultMaxStock')}>
            <input
              id="defaultMaxStock"
              type="number"
              min={1}
              value={formData.inventory?.defaultValues?.maxStock || 100}
              onChange={(e) =>
                updateFormData('inventory', 'defaultValues', {
                  ...formData.inventory?.defaultValues,
                  maxStock: parseInt(e.target.value),
                })
              }
              className={inputClass(false)}
            />
          </Field>
          <div className="md:col-span-2">
            <Field
              id="defaultStandardLife"
              label={t('settings.fields.defaultStandardLife')}
              hint={t('settings.hints.defaultStandardLifeDesc')}
            >
              <input
                id="defaultStandardLife"
                type="number"
                min={100}
                value={formData.inventory?.defaultValues?.standardLife || 10000}
                onChange={(e) =>
                  updateFormData('inventory', 'defaultValues', {
                    ...formData.inventory?.defaultValues,
                    standardLife: parseInt(e.target.value),
                  })
                }
                className={inputClass(false)}
              />
            </Field>
          </div>
        </FieldGrid>
      </Section>

      <Section
        Icon={Tags}
        title={t('settings.categoryManagement')}
        description={t('settings.categoryManagementDesc')}
      >
        {isCategoryLoading ? (
          <LoadingRow text={t('settings.misc.loadingCategories')} />
        ) : (
          <div className="space-y-3">
            {endmillCategories.map((category) => (
              <div
                key={category.id}
                className="flex flex-wrap items-center gap-3 rounded-sm border border-divider bg-paper p-3"
              >
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-sm bg-gauge-cobalt-soft px-2 py-0.5 font-mono text-caption font-semibold text-gauge-cobalt-strong">
                    {category.code}
                  </span>
                  <span className="text-label font-medium text-ink">{category.name_ko}</span>
                  {category.description && (
                    <span className="text-caption text-ink-mute">{category.description}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateCategory(category)}
                  disabled={isCategoryLoading}
                  className={secondaryBtnClass()}
                >
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCategory(category)}
                  disabled={isCategoryLoading}
                  className={dangerBtnClass()}
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddCategory}
              disabled={isCategoryLoading}
              className={addRowBtnClass()}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('settings.actions.addCategory')}
            </button>
            <InfoCallout text={t('settings.misc.categoryInstantSave')} />
          </div>
        )}
      </Section>

      <Section
        Icon={Truck}
        title={t('settings.supplierManagement')}
        description={t('settings.supplierManagementDesc')}
      >
        {isSupplierLoading ? (
          <LoadingRow text={t('settings.misc.loadingSuppliers')} />
        ) : (
          <div className="space-y-3">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="flex flex-wrap items-center gap-3 rounded-sm border border-divider bg-paper p-3"
              >
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-sm bg-gauge-cobalt-soft px-2 py-0.5 font-mono text-caption font-semibold text-gauge-cobalt-strong">
                    {supplier.code}
                  </span>
                  <span className="text-label font-medium text-ink">{supplier.name}</span>
                  <span className="text-caption text-ink-mute">
                    {t('settings.misc.qualityRating', { v: supplier.quality_rating ?? 8 })}
                  </span>
                  {!supplier.is_active && (
                    <span className="inline-flex items-center rounded-sm bg-signal-stop-soft px-2 py-0.5 text-caption font-medium text-signal-stop-strong">
                      {t('settings.misc.inactive')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSupplier(supplier)}
                  disabled={isSupplierLoading}
                  className={secondaryBtnClass()}
                >
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSupplier(supplier)}
                  disabled={isSupplierLoading}
                  className={dangerBtnClass()}
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={onAddSupplier}
              disabled={isSupplierLoading}
              className={addRowBtnClass()}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('settings.actions.addSupplier')}
            </button>
            <InfoCallout text={t('settings.misc.supplierInstantSave')} />
          </div>
        )}
      </Section>

      <Section
        Icon={AlertTriangle}
        title={t('settings.statusDisplay')}
        description={t('settings.statusDisplayDesc')}
      >
        <StatusListEditor
          statuses={formData.inventory?.statuses || []}
          onChange={(next) => updateFormData('inventory', 'statuses', next)}
        />
      </Section>

      <ActionRow onSave={onSave} onReset={onReset} isSubmitting={isSubmitting} />
    </div>
  )
}

function ToolChangesTab({
  formData,
  updateFormData,
  onSave,
  onReset,
  isSubmitting,
}: TabContentProps) {
  const { t } = useTranslation()
  const reasons: string[] = Array.isArray(formData.toolChanges?.reasons)
    ? formData.toolChanges.reasons
    : DEFAULT_REASONS

  return (
    <div className="space-y-4">
      <Section
        Icon={Wrench}
        title={t('settings.reasonManagement')}
        description={t('settings.reasonManagementDesc')}
      >
        <ListEditor
          items={reasons}
          fallback={DEFAULT_REASONS}
          placeholder={t('settings.placeholders.reasonName')}
          addLabel={t('settings.actions.addReason')}
          onChange={(next) => updateFormData('toolChanges', 'reasons', next)}
        />
      </Section>

      <Section
        Icon={AlertTriangle}
        title={t('settings.thresholdSettings')}
        description={t('settings.thresholdSettingsDesc')}
      >
        <FieldGrid>
          <Field
            id="warningThreshold"
            label={t('settings.fields.warningThreshold')}
            hint={t('settings.hints.warningThreshold', {
              p: formData.toolChanges?.lifeThresholds?.warning || 80,
            })}
          >
            <input
              id="warningThreshold"
              type="number"
              min={50}
              max={95}
              value={formData.toolChanges?.lifeThresholds?.warning || 80}
              onChange={(e) =>
                updateFormData('toolChanges', 'lifeThresholds', {
                  ...formData.toolChanges?.lifeThresholds,
                  warning: parseInt(e.target.value),
                })
              }
              className={inputClass(false)}
            />
          </Field>
          <Field
            id="criticalThreshold"
            label={t('settings.fields.criticalThreshold')}
            hint={t('settings.hints.criticalThreshold', {
              p: formData.toolChanges?.lifeThresholds?.critical || 95,
            })}
          >
            <input
              id="criticalThreshold"
              type="number"
              min={90}
              max={100}
              value={formData.toolChanges?.lifeThresholds?.critical || 95}
              onChange={(e) =>
                updateFormData('toolChanges', 'lifeThresholds', {
                  ...formData.toolChanges?.lifeThresholds,
                  critical: parseInt(e.target.value),
                })
              }
              className={inputClass(false)}
            />
          </Field>
        </FieldGrid>
      </Section>

      <ActionRow onSave={onSave} onReset={onReset} isSubmitting={isSubmitting} />
    </div>
  )
}

function UiTab({ formData, updateFormData, onSave, onReset, isSubmitting }: TabContentProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <Section
        Icon={Monitor}
        title={t('settings.uiDisplay')}
        description={t('settings.uiDisplayDesc')}
      >
        <FieldGrid>
          <Field id="uiItemsPerPage" label={t('settings.fields.itemsPerPage')}>
            <select
              id="uiItemsPerPage"
              value={formData.system?.itemsPerPage || 20}
              onChange={(e) =>
                updateFormData('system', 'itemsPerPage', parseInt(e.target.value))
              }
              className={inputClass(false)}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </Field>
          <Field id="refreshInterval" label={t('settings.fields.refreshInterval')}>
            <select
              id="refreshInterval"
              value={formData.ui?.dashboard?.refreshInterval || 30}
              onChange={(e) =>
                updateFormData('ui', 'dashboard', {
                  ...formData.ui?.dashboard,
                  refreshInterval: parseInt(e.target.value),
                })
              }
              className={inputClass(false)}
            >
              <option value={0}>{t('settings.options.disabled')}</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
          </Field>
        </FieldGrid>
      </Section>

      <Section
        Icon={Palette}
        title={t('settings.themeSettings')}
        description={t('settings.themeSettingsDesc')}
      >
        <FieldGrid>
          <Field id="theme" label={t('settings.fields.theme')}>
            <select
              id="theme"
              value={formData.ui?.theme || 'light'}
              onChange={(e) => updateFormData('ui', 'theme', e.target.value)}
              className={inputClass(false)}
            >
              <option value="light">{t('settings.options.themeLight')}</option>
              <option value="dark">{t('settings.options.themeDark')}</option>
              <option value="system">{t('settings.options.themeSystem')}</option>
            </select>
          </Field>
          <Field id="sidebarState" label={t('settings.fields.sidebarState')}>
            <select
              id="sidebarState"
              value={formData.ui?.sidebarCollapsed ? 'collapsed' : 'expanded'}
              onChange={(e) =>
                updateFormData('ui', 'sidebarCollapsed', e.target.value === 'collapsed')
              }
              className={inputClass(false)}
            >
              <option value="expanded">{t('settings.options.sidebarExpanded')}</option>
              <option value="collapsed">{t('settings.options.sidebarCollapsed')}</option>
            </select>
          </Field>
        </FieldGrid>
      </Section>

      <Section
        Icon={Bell}
        title={t('settings.uiNotifications')}
        description={t('settings.uiNotificationsDesc')}
      >
        <FieldGrid>
          <Field id="notifPosition" label={t('settings.fields.notifPosition')}>
            <select
              id="notifPosition"
              value={formData.ui?.notifications?.position || 'top-right'}
              onChange={(e) =>
                updateFormData('ui', 'notifications', {
                  ...formData.ui?.notifications,
                  position: e.target.value,
                })
              }
              className={inputClass(false)}
            >
              <option value="top-right">{t('settings.options.posTopRight')}</option>
              <option value="top-left">{t('settings.options.posTopLeft')}</option>
              <option value="bottom-right">{t('settings.options.posBottomRight')}</option>
              <option value="bottom-left">{t('settings.options.posBottomLeft')}</option>
            </select>
          </Field>
          <Field id="notifDuration" label={t('settings.fields.notifDuration')}>
            <select
              id="notifDuration"
              value={formData.ui?.notifications?.duration || 5}
              onChange={(e) =>
                updateFormData('ui', 'notifications', {
                  ...formData.ui?.notifications,
                  duration: parseInt(e.target.value),
                })
              }
              className={inputClass(false)}
            >
              <option value={3}>3s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={0}>{t('settings.options.manual')}</option>
            </select>
          </Field>
        </FieldGrid>
      </Section>

      <ActionRow onSave={onSave} onReset={onReset} isSubmitting={isSubmitting} />
    </div>
  )
}

// === 공용 서브 컴포넌트 ===

interface SectionProps {
  Icon: typeof Cpu
  title: string
  description?: string
  children: React.ReactNode
}

function Section({ Icon, title, description, children }: SectionProps) {
  return (
    <section className="overflow-hidden rounded-md border border-divider bg-paper">
      <header className="flex items-start gap-2 border-b border-divider bg-paper-warm px-4 py-3">
        <Icon
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-gauge-cobalt-strong"
          aria-hidden="true"
        />
        <div>
          <h3 className="text-label font-semibold text-ink">{title}</h3>
          {description && <p className="text-caption text-ink-soft">{description}</p>}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

interface FieldProps {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}

function Field({ id, label, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-caption font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-caption text-ink-mute">{hint}</p>}
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">{children}</div>
}

interface TabButtonProps {
  Icon: typeof Cpu
  label: string
  active: boolean
  onClick: () => void
}

function TabButton({ Icon, label, active, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'inline-flex flex-shrink-0 items-center gap-2 border-b-2 border-gauge-cobalt px-3 py-3 text-label font-semibold text-gauge-cobalt-strong transition-colors no-break'
          : 'inline-flex flex-shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-label font-medium text-ink-soft transition-colors hover:border-divider hover:text-ink no-break'
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  )
}

interface ActionRowProps {
  onSave: () => void
  onReset: () => void
  isSubmitting: boolean
}

function ActionRow({ onSave, onReset, isSubmitting }: ActionRowProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col-reverse justify-end gap-2 border-t border-divider pt-4 sm:flex-row sm:gap-3">
      <button
        type="button"
        onClick={onReset}
        disabled={isSubmitting}
        className="inline-flex min-h-touch items-center justify-center gap-2 rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {t('settings.resetToDefault')}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSubmitting}
        className="inline-flex min-h-touch items-center justify-center gap-2 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4" aria-hidden="true" />
        )}
        {isSubmitting ? t('settings.saving') : t('settings.saveSetting')}
      </button>
    </div>
  )
}

interface ListEditorProps {
  items: string[]
  fallback: string[]
  placeholder: string
  addLabel: string
  onChange: (next: string[]) => void
}

function ListEditor({ items, fallback, placeholder, addLabel, onChange }: ListEditorProps) {
  const { t } = useTranslation()
  const list = items.length > 0 ? items : fallback
  return (
    <div className="space-y-3">
      {list.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...list]
              next[index] = e.target.value
              onChange(next)
            }}
            placeholder={placeholder}
            className={inputClass(false) + ' flex-1'}
          />
          <button
            type="button"
            onClick={() => {
              const next = [...list]
              next.splice(index, 1)
              onChange(next)
            }}
            disabled={list.length <= 1}
            className={dangerBtnClass()}
          >
            {t('common.delete')}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...list, ''])}
        className={addRowBtnClass()}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {addLabel}
      </button>
    </div>
  )
}

interface StatusItem {
  code: string
  name: string
  color: string
  threshold: number
}

function StatusListEditor({
  statuses,
  onChange,
}: {
  statuses: StatusItem[]
  onChange: (next: StatusItem[]) => void
}) {
  const { t } = useTranslation()
  const list: StatusItem[] =
    statuses.length > 0
      ? statuses
      : [
          { code: 'sufficient', name: '충분', color: 'go', threshold: 100 },
          { code: 'low', name: '부족', color: 'watch', threshold: 75 },
          { code: 'critical', name: '위험', color: 'stop', threshold: 25 },
        ]

  const dotClass = (color: string) => {
    switch (color) {
      case 'go':
      case 'green':
        return 'bg-signal-go-strong'
      case 'watch':
      case 'yellow':
        return 'bg-signal-watch-strong'
      case 'stop':
      case 'red':
        return 'bg-signal-stop-strong'
      case 'cobalt':
      case 'blue':
        return 'bg-gauge-cobalt-strong'
      default:
        return 'bg-ink-mute'
    }
  }

  return (
    <div className="space-y-3">
      {list.map((status, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center gap-3 rounded-sm border border-divider bg-paper p-3"
        >
          <div className="flex flex-1 flex-wrap gap-3">
            <Field id={`statusName${index}`} label={t('settings.fields.statusName')}>
              <input
                id={`statusName${index}`}
                type="text"
                value={status.name}
                onChange={(e) => {
                  const next = [...list]
                  next[index] = { ...next[index], name: e.target.value }
                  onChange(next)
                }}
                className={inputClass(false)}
              />
            </Field>
            <Field id={`statusColor${index}`} label={t('settings.fields.statusColor')}>
              <select
                id={`statusColor${index}`}
                value={status.color}
                onChange={(e) => {
                  const next = [...list]
                  next[index] = { ...next[index], color: e.target.value }
                  onChange(next)
                }}
                className={inputClass(false)}
              >
                <option value="go">{t('settings.options.colorGo')}</option>
                <option value="watch">{t('settings.options.colorWatch')}</option>
                <option value="stop">{t('settings.options.colorStop')}</option>
                <option value="cobalt">{t('settings.options.colorCobalt')}</option>
                <option value="neutral">{t('settings.options.colorNeutral')}</option>
              </select>
            </Field>
            <Field id={`statusThreshold${index}`} label={t('settings.fields.statusThreshold')}>
              <input
                id={`statusThreshold${index}`}
                type="number"
                min={0}
                max={100}
                value={status.threshold}
                onChange={(e) => {
                  const next = [...list]
                  next[index] = { ...next[index], threshold: parseInt(e.target.value) }
                  onChange(next)
                }}
                className={inputClass(false)}
              />
            </Field>
          </div>
          <span
            aria-hidden="true"
            className={`h-3 w-3 flex-shrink-0 rounded-full ${dotClass(status.color)}`}
          />
        </div>
      ))}
    </div>
  )
}

function LoadingRow({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <Loader2 className="h-5 w-5 animate-spin text-gauge-cobalt-strong" aria-hidden="true" />
      <span className="text-label text-ink-soft">{text}</span>
    </div>
  )
}

function InfoCallout({ text }: { text: string }) {
  return (
    <div className="rounded-sm border border-divider bg-gauge-cobalt-soft p-3">
      <div className="flex gap-2">
        <Info
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-gauge-cobalt-strong"
          aria-hidden="true"
        />
        <p className="text-caption text-gauge-cobalt-strong">{text}</p>
      </div>
    </div>
  )
}

// === 모달 ===

interface CategoryModalProps {
  mode: 'add' | 'edit'
  code: string
  name: string
  isLoading: boolean
  onCodeChange: (v: string) => void
  onNameChange: (v: string) => void
  onClose: () => void
  onSubmit: () => void
}

function CategoryModal({
  mode,
  code,
  name,
  isLoading,
  onCodeChange,
  onNameChange,
  onClose,
  onSubmit,
}: CategoryModalProps) {
  const { t } = useTranslation()
  return (
    <div
      className="mobile-modal-container"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="mobile-modal-content md:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-modal-header flex items-center justify-between">
          <h3 className="text-title font-semibold text-ink">
            {mode === 'add'
              ? t('settings.modals.addCategoryTitle')
              : t('settings.modals.editCategoryTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label={t('common.close')}
            className="rounded-sm p-1 text-ink-mute transition-colors hover:bg-paper-warm hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-modal-body space-y-4">
          {mode === 'add' ? (
            <Field
              id="catCode"
              label={t('settings.modals.categoryCode')}
              hint={t('settings.modals.uppercaseHint')}
            >
              <input
                id="catCode"
                type="text"
                value={code}
                onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                placeholder={t('settings.modals.categoryCodePlaceholder')}
                disabled={isLoading}
                className={inputClass(false)}
              />
            </Field>
          ) : (
            <Field
              id="catCode"
              label={t('settings.modals.categoryCode')}
              hint={t('settings.modals.codeImmutable')}
            >
              <div className="rounded-sm border border-divider bg-paper-warm px-3 py-2 font-mono text-label text-ink-soft">
                {code}
              </div>
            </Field>
          )}
          <Field
            id="catName"
            label={t('settings.modals.categoryName')}
            hint={t('settings.modals.nameLangHint')}
          >
            <input
              id="catName"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={t('settings.modals.categoryNamePlaceholder')}
              disabled={isLoading}
              className={inputClass(false)}
            />
          </Field>
        </div>

        <div className="mobile-modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLoading
              ? t('settings.modals.processing')
              : mode === 'add'
                ? t('common.add')
                : t('common.edit')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface SupplierModalProps {
  mode: 'add' | 'edit'
  code: string
  name: string
  qualityRating: string
  isLoading: boolean
  onCodeChange: (v: string) => void
  onNameChange: (v: string) => void
  onQualityChange: (v: string) => void
  onClose: () => void
  onSubmit: () => void
}

function SupplierModal({
  mode,
  code,
  name,
  qualityRating,
  isLoading,
  onCodeChange,
  onNameChange,
  onQualityChange,
  onClose,
  onSubmit,
}: SupplierModalProps) {
  const { t } = useTranslation()
  return (
    <div
      className="mobile-modal-container"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="mobile-modal-content md:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-modal-header flex items-center justify-between">
          <h3 className="text-title font-semibold text-ink">
            {mode === 'add'
              ? t('settings.modals.addSupplierTitle')
              : t('settings.modals.editSupplierTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label={t('common.close')}
            className="rounded-sm p-1 text-ink-mute transition-colors hover:bg-paper-warm hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-modal-body space-y-4">
          {mode === 'add' ? (
            <Field
              id="supCode"
              label={t('settings.modals.supplierCode')}
              hint={t('settings.modals.uppercaseHint')}
            >
              <input
                id="supCode"
                type="text"
                value={code}
                onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                placeholder={t('settings.modals.supplierCodePlaceholder')}
                disabled={isLoading}
                className={inputClass(false)}
              />
            </Field>
          ) : (
            <Field
              id="supCode"
              label={t('settings.modals.supplierCode')}
              hint={t('settings.modals.codeImmutable')}
            >
              <div className="rounded-sm border border-divider bg-paper-warm px-3 py-2 font-mono text-label text-ink-soft">
                {code}
              </div>
            </Field>
          )}
          <Field
            id="supName"
            label={t('settings.modals.supplierName')}
            hint={t('settings.modals.nameLangHint')}
          >
            <input
              id="supName"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={t('settings.modals.supplierNamePlaceholder')}
              disabled={isLoading}
              className={inputClass(false)}
            />
          </Field>
          <Field
            id="supQuality"
            label={t('settings.modals.supplierQuality')}
            hint={t('settings.modals.qualityHint')}
          >
            <input
              id="supQuality"
              type="number"
              min={1}
              max={10}
              value={qualityRating}
              onChange={(e) => onQualityChange(e.target.value)}
              disabled={isLoading}
              className={inputClass(false)}
            />
          </Field>
        </div>

        <div className="mobile-modal-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-sm border border-divider bg-paper px-4 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-sm bg-gauge-cobalt px-4 text-label font-medium text-paper transition-colors hover:bg-gauge-cobalt-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isLoading
              ? t('settings.modals.processing')
              : mode === 'add'
                ? t('common.add')
                : t('common.edit')}
          </button>
        </div>
      </div>
    </div>
  )
}

// === 클래스 헬퍼 ===

function inputClass(hasError: boolean): string {
  const base =
    'w-full min-h-touch rounded-sm border bg-paper px-3 py-2 text-label text-ink focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60'
  return hasError
    ? `${base} border-signal-stop-strong focus:border-signal-stop-strong focus:ring-signal-stop-strong`
    : `${base} border-divider focus:border-gauge-cobalt focus:ring-gauge-cobalt`
}

function checkboxClass(): string {
  return 'h-4 w-4 rounded-sm border-divider text-gauge-cobalt-strong focus:ring-gauge-cobalt'
}

function secondaryBtnClass(): string {
  return 'inline-flex min-h-touch items-center gap-1 rounded-sm border border-divider bg-paper px-3 text-label font-medium text-ink transition-colors hover:bg-paper-warm disabled:cursor-not-allowed disabled:opacity-50'
}

function dangerBtnClass(): string {
  return 'inline-flex min-h-touch items-center gap-1 rounded-sm border border-divider bg-paper px-3 text-label font-medium text-signal-stop-strong transition-colors hover:bg-signal-stop-soft disabled:cursor-not-allowed disabled:opacity-50'
}

function addRowBtnClass(): string {
  return 'inline-flex min-h-touch w-full items-center justify-center gap-1 rounded-sm border border-dashed border-divider bg-paper px-3 text-label font-medium text-gauge-cobalt-strong transition-colors hover:bg-gauge-cobalt-soft disabled:cursor-not-allowed disabled:opacity-50'
}
