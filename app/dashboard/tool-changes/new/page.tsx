'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SmartDropdown, type SmartDropdownOption } from '@/components/ui/smart-dropdown'
import { NoBreak } from '@/components/ui/no-break'
import { StickyContextCard } from '@/components/features/tool-changes/sticky-context-card'
import { useAuth } from '@/lib/hooks/useAuth'
import { useFactory } from '@/lib/hooks/useFactory'
import { useCAMSheets } from '@/lib/hooks/useCAMSheets'
import { useSettings } from '@/lib/hooks/useSettings'
import { useToast } from '@/components/shared/Toast'
import { useStickyContext } from '@/lib/hooks/useStickyContext'
import { useTranslations } from '@/lib/hooks/useTranslations'
import { clientLogger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

interface AvailableUser {
  id: string
  name: string
  employee_id: string
}

interface FormState {
  equipment_number: string
  production_model: string
  process: string
  t_number: number
  endmill_code: string
  endmill_name: string
  tool_life: number | ''
  change_reason: string
  changed_by: string
}

const VARIABLE_FIELD_DEFAULTS: Pick<
  FormState,
  't_number' | 'endmill_code' | 'endmill_name' | 'tool_life' | 'change_reason'
> = {
  t_number: 1,
  endmill_code: '',
  endmill_name: '',
  tool_life: '',
  change_reason: '',
}

const STICKY_FIELD_DEFAULTS: Pick<
  FormState,
  'equipment_number' | 'production_model' | 'process' | 'changed_by'
> = {
  equipment_number: '',
  production_model: '',
  process: '',
  changed_by: '',
}

const initialFormState: FormState = {
  ...STICKY_FIELD_DEFAULTS,
  ...VARIABLE_FIELD_DEFAULTS,
}

export default function NewToolChangePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { currentFactory } = useFactory()
  const { camSheets, getAvailableModels } = useCAMSheets()
  const { settings } = useSettings()
  const { showSuccess, showError } = useToast()
  const { t } = useTranslations()
  const {
    context,
    hasContext,
    minutesAgo,
    hydrated: stickyHydrated,
    saveContext,
    clearContext,
  } = useStickyContext(user?.id)

  const [form, setForm] = useState<FormState>(initialFormState)
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [availableTNumbers, setAvailableTNumbers] = useState<number[]>([])
  const [suggestedToolLife, setSuggestedToolLife] = useState<number | null>(null)
  const [isManualEndmillInput, setIsManualEndmillInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [equipmentTouched, setEquipmentTouched] = useState(false)
  const [recordedCount, setRecordedCount] = useState(0)

  const reasons = settings.toolChanges.reasons
  const processesFromSettings = settings.equipment.processes
  const availableModels = useMemo(() => getAvailableModels, [getAvailableModels])

  // Load users list for "작업자" dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/user-profiles', { cache: 'no-store' })
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setAvailableUsers(result.data)
        }
      } catch (error) {
        clientLogger.error('사용자 목록 로드 오류:', error)
      }
    }
    loadUsers()
  }, [])

  // Apply sticky context once after hydration if user hasn't started editing
  useEffect(() => {
    if (!stickyHydrated || !hasContext || !context) return
    setForm((prev) => {
      const isPristine =
        !prev.equipment_number &&
        !prev.production_model &&
        !prev.process &&
        !prev.changed_by
      if (!isPristine) return prev
      return {
        ...prev,
        equipment_number: context.equipment_number,
        production_model: context.production_model,
        process: context.process,
        changed_by: context.changed_by,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickyHydrated, hasContext])

  // Auto-fill model+process from equipment number (only when user actually edits)
  useEffect(() => {
    if (!equipmentTouched) return
    const equipment = form.equipment_number.trim()
    if (!/^C[0-9]{3}$/.test(equipment)) return

    let cancelled = false
    const run = async () => {
      try {
        const factoryParam = currentFactory?.id ? `&factoryId=${currentFactory.id}` : ''
        const response = await fetch(
          `/api/tool-changes/auto-fill?equipmentNumber=${equipment}${factoryParam}`,
          { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
        )
        const result = await response.json()
        if (cancelled) return
        if (result.success && result.data.equipmentInfo) {
          const { model, process } = result.data.equipmentInfo
          setForm((prev) => ({
            ...prev,
            production_model: model || prev.production_model,
            process: process || prev.process,
          }))
        }
      } catch (error) {
        clientLogger.error('설비번호 자동입력 오류:', error)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [form.equipment_number, equipmentTouched, currentFactory?.id])

  // Compute available T-numbers from CAM Sheet
  useEffect(() => {
    if (!form.production_model || !form.process) {
      setAvailableTNumbers([])
      return
    }
    const sheet = camSheets.find(
      (s) => s.model === form.production_model && s.process === form.process
    )
    if (!sheet || !sheet.cam_sheet_endmills) {
      setAvailableTNumbers([])
      return
    }
    const tNumbers: number[] = (sheet.cam_sheet_endmills as Array<{ t_number?: number }>)
      .map((e) => e.t_number)
      .filter((t): t is number => typeof t === 'number')
      .sort((a, b) => a - b)
    setAvailableTNumbers(tNumbers)
    if (tNumbers.length > 0 && !tNumbers.includes(form.t_number)) {
      setForm((prev) => ({ ...prev, t_number: tNumbers[0] }))
    }
  }, [form.production_model, form.process, form.t_number, camSheets])

  // Auto-fill endmill code+name+suggested tool life from CAM Sheet
  useEffect(() => {
    if (isManualEndmillInput) return
    if (!form.production_model || !form.process || !form.t_number) {
      setSuggestedToolLife(null)
      return
    }
    let cancelled = false
    const run = async () => {
      try {
        const factoryParam = currentFactory?.id ? `&factoryId=${currentFactory.id}` : ''
        const response = await fetch(
          `/api/tool-changes/auto-fill?model=${form.production_model}&process=${form.process}&tNumber=${form.t_number}${factoryParam}`,
          { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }
        )
        const result = await response.json()
        if (cancelled) return
        if (result.success && result.data.endmillInfo) {
          const { endmillCode, endmillName, suggestedToolLife: apiTL } = result.data.endmillInfo
          setForm((prev) => ({
            ...prev,
            endmill_code: endmillCode || '',
            endmill_name: endmillName || '',
          }))
          setSuggestedToolLife(apiTL || null)
        } else {
          setSuggestedToolLife(null)
        }
      } catch (error) {
        clientLogger.error('T번호 자동입력 오류:', error)
        setSuggestedToolLife(null)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    form.production_model,
    form.process,
    form.t_number,
    isManualEndmillInput,
    currentFactory?.id,
  ])

  const equipmentValid = /^C[0-9]{3}$/.test(form.equipment_number.trim())
  const isFormValid =
    equipmentValid &&
    form.production_model.length > 0 &&
    form.process.length > 0 &&
    form.t_number > 0 &&
    form.endmill_code.length > 0 &&
    typeof form.tool_life === 'number' &&
    form.tool_life > 0 &&
    form.change_reason.length > 0 &&
    form.changed_by.length > 0

  const recentTNumbers = useMemo(
    () => (context?.equipment_number === form.equipment_number ? [] : []),
    [context, form.equipment_number]
  )

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleEquipmentChange = (raw: string) => {
    const value = raw.toUpperCase()
    setEquipmentTouched(true)
    setForm((prev) => ({ ...prev, equipment_number: value }))
  }

  const handleClearStickyContext = () => {
    clearContext()
    setForm(initialFormState)
    setEquipmentTouched(false)
    setSuggestedToolLife(null)
    setIsManualEndmillInput(false)
  }

  const resetVariableFields = () => {
    setForm((prev) => ({ ...prev, ...VARIABLE_FIELD_DEFAULTS }))
    setSuggestedToolLife(null)
    setIsManualEndmillInput(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      const toolChangeData = {
        equipment_number: parseInt(form.equipment_number.replace(/^C/, ''), 10) || 0,
        production_model: form.production_model,
        process: form.process,
        t_number: form.t_number,
        endmill_code: form.endmill_code,
        endmill_name: form.endmill_name,
        tool_life: typeof form.tool_life === 'number' ? form.tool_life : 0,
        change_reason: form.change_reason,
        changed_by: form.changed_by || undefined,
        factory_id: currentFactory?.id,
      }

      const response = await fetch('/api/tool-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolChangeData),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || t('toolChanges.saveFailedMessage'))
      }

      const replacerName = availableUsers.find((u) => u.id === form.changed_by)?.name
      saveContext({
        equipment_number: form.equipment_number,
        production_model: form.production_model,
        process: form.process,
        changed_by: form.changed_by,
        changed_by_name: replacerName,
      })

      const nextCount = recordedCount + 1
      setRecordedCount(nextCount)
      showSuccess(
        t('toolChanges.recordCompleted'),
        t('toolChanges.recordCompletedMessage', {
          equipment: form.equipment_number,
          tNumber: String(form.t_number).padStart(2, '0'),
          count: nextCount,
        })
      )
      resetVariableFields()
    } catch (error) {
      clientLogger.error('교체 실적 등록 오류:', error)
      showError(
        t('toolChanges.registerFailedTitle'),
        error instanceof Error ? error.message : t('toolChanges.registerErrorMessage')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const modelOptions: SmartDropdownOption[] = useMemo(
    () => availableModels.map((m) => ({ value: m, label: m })),
    [availableModels]
  )
  const processOptions: SmartDropdownOption[] = useMemo(
    () => processesFromSettings.map((p: string) => ({ value: p, label: p })),
    [processesFromSettings]
  )
  const tNumberOptions: SmartDropdownOption[] = useMemo(() => {
    const source = availableTNumbers.length
      ? availableTNumbers
      : Array.from({ length: 24 }, (_, i) => i + 1)
    return source.map((n) => ({
      value: String(n),
      label: `T${String(n).padStart(2, '0')}`,
    }))
  }, [availableTNumbers])
  const reasonOptions: SmartDropdownOption[] = useMemo(
    () => reasons.map((r: string) => ({ value: r, label: r })),
    [reasons]
  )
  const userOptions: SmartDropdownOption[] = useMemo(
    () =>
      availableUsers.map((u) => ({
        value: u.id,
        label: u.name,
        description: u.employee_id,
      })),
    [availableUsers]
  )

  const formattedSuggestedToolLife =
    suggestedToolLife !== null
      ? `${suggestedToolLife.toLocaleString()}${t('toolChanges.toolLifeTimesSuffix')}`
      : '—'

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-divider bg-paper/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/tool-changes')}
          aria-label={t('toolChanges.back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-title font-semibold text-ink">{t('toolChanges.recordTitle')}</h1>
        {recordedCount > 0 && (
          <span className="ml-auto text-caption text-ink-soft tabular">
            {t('toolChanges.thisSession')} <span className="font-semibold text-ink">{recordedCount}</span>{t('toolChanges.cases')}
          </span>
        )}
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 pb-48 sm:px-6 lg:px-8 md:pb-32"
      >
        {hasContext && context && minutesAgo !== null && (
          <StickyContextCard
            context={context}
            minutesAgo={minutesAgo}
            onClear={handleClearStickyContext}
          />
        )}

        <Field label={t('toolChanges.equipmentNumber')} htmlFor="equipment_number" hint={t('toolChanges.equipmentNumberHint')}>
          <Input
            id="equipment_number"
            type="text"
            inputMode="text"
            autoComplete="off"
            placeholder="C001"
            value={form.equipment_number}
            onChange={(e) => handleEquipmentChange(e.target.value)}
            pattern="C[0-9]{3}"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('toolChanges.productionModel')} htmlFor="production_model">
            <SmartDropdown
              title={t('toolChanges.selectProductionModel')}
              options={modelOptions}
              value={form.production_model}
              onChange={(v) => updateField('production_model', v)}
              placeholder={t('toolChanges.selectShort')}
              required
            />
          </Field>
          <Field label={t('toolChanges.process')} htmlFor="process">
            <SmartDropdown
              title={t('toolChanges.selectProcess')}
              options={processOptions}
              value={form.process}
              onChange={(v) => updateField('process', v)}
              placeholder={t('toolChanges.selectShort')}
              required
            />
          </Field>
        </div>

        <Field label={t('toolChanges.tNumber')} htmlFor="t_number">
          <SmartDropdown
            title={t('toolChanges.selectTNumber')}
            options={tNumberOptions}
            value={String(form.t_number)}
            onChange={(v) => updateField('t_number', parseInt(v, 10))}
            placeholder={t('toolChanges.selectShort')}
            recentValues={recentTNumbers}
            required
          />
        </Field>

        <Field
          label={t('toolChanges.endmillCode')}
          htmlFor="endmill_code"
          hint={isManualEndmillInput ? t('toolChanges.manualInputMode') : t('toolChanges.camSheetAutoInputHint')}
          action={
            form.production_model && form.process && form.t_number ? (
              <button
                type="button"
                onClick={() => setIsManualEndmillInput((v) => !v)}
                className="text-caption font-medium text-gauge-cobalt transition-colors hover:text-gauge-cobalt-strong"
              >
                {isManualEndmillInput ? t('toolChanges.autoInputAction') : t('toolChanges.manualInputAction')}
              </button>
            ) : null
          }
        >
          <Input
            id="endmill_code"
            type="text"
            value={form.endmill_code}
            onChange={(e) =>
              isManualEndmillInput && updateField('endmill_code', e.target.value)
            }
            readOnly={!isManualEndmillInput}
            className={cn(!isManualEndmillInput && 'bg-paper-warm')}
            required
          />
        </Field>

        <Field label={t('toolChanges.endmillName')} htmlFor="endmill_name">
          <Input
            id="endmill_name"
            type="text"
            value={form.endmill_name}
            onChange={(e) =>
              isManualEndmillInput && updateField('endmill_name', e.target.value)
            }
            readOnly={!isManualEndmillInput}
            className={cn(!isManualEndmillInput && 'bg-paper-warm')}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('toolChanges.appliedToolLifeShort')} htmlFor="suggested_tool_life" hint={t('toolChanges.camSheetReferenceHint')}>
            <Input
              id="suggested_tool_life"
              type="text"
              value={formattedSuggestedToolLife}
              readOnly
              disabled
              className="bg-paper-warm tabular"
            />
          </Field>

          <Field label={t('toolChanges.actualToolLifeShort')} htmlFor="tool_life" hint={t('toolChanges.timesUnitHint')}>
            <Input
              id="tool_life"
              type="number"
              inputMode="numeric"
              placeholder="2500"
              value={form.tool_life}
              onChange={(e) =>
                updateField(
                  'tool_life',
                  e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0)
                )
              }
              min={0}
              max={100000}
              required
              className="tabular"
            />
          </Field>
        </div>

        <Field label={t('toolChanges.changeReasonLabel')} htmlFor="change_reason">
          <SmartDropdown
            title={t('toolChanges.selectReplaceReason')}
            options={reasonOptions}
            value={form.change_reason}
            onChange={(v) => updateField('change_reason', v)}
            placeholder={t('toolChanges.selectShort')}
            required
          />
        </Field>

        <Field label={t('toolChanges.workerLabel')} htmlFor="changed_by">
          <SmartDropdown
            title={t('toolChanges.selectWorker')}
            options={userOptions}
            value={form.changed_by}
            onChange={(v) => updateField('changed_by', v)}
            placeholder={t('toolChanges.selectShort')}
            required
          />
        </Field>
      </form>

      <div
        className="fixed inset-x-0 z-40 border-t border-divider bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85 md:bottom-0"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push('/dashboard/tool-changes')}
            className="flex-1"
          >
            {t('toolChanges.cancel')}
          </Button>
          <Button
            type="button"
            size="xl"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={!isFormValid || isSubmitting}
            className="flex-[2]"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                <NoBreak>{t('toolChanges.recordButton')}</NoBreak>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}

function Field({ label, htmlFor, hint, action, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-label font-medium text-ink no-break"
        >
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className="text-caption text-ink-soft">{hint}</p>}
    </div>
  )
}
