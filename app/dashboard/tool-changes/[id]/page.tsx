'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SmartDropdown, type SmartDropdownOption } from '@/components/ui/smart-dropdown'
import { useFactory } from '@/lib/hooks/useFactory'
import { useCAMSheets } from '@/lib/hooks/useCAMSheets'
import { useSettings } from '@/lib/hooks/useSettings'
import { useToast } from '@/components/shared/Toast'
import type { ToolChange } from '@/lib/hooks/useToolChanges'
import { clientLogger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'

const SESSION_CACHE_KEY = (id: string) => `tool-change-edit::${id}`

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

function recordToForm(record: ToolChange): FormState {
  return {
    equipment_number:
      typeof record.equipment_number === 'number'
        ? `C${String(record.equipment_number).padStart(3, '0')}`
        : '',
    production_model: record.production_model || '',
    process: record.process || '',
    t_number: typeof record.t_number === 'number' ? record.t_number : 1,
    endmill_code: record.endmill_code || '',
    endmill_name: record.endmill_name || '',
    tool_life:
      typeof record.tool_life === 'number'
        ? record.tool_life
        : typeof record.old_life_hours === 'number'
        ? record.old_life_hours
        : '',
    change_reason: record.change_reason || record.reason || '',
    changed_by: record.changed_by || record.user_id || '',
  }
}

export default function EditToolChangePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === 'string' ? params.id : ''
  const { currentFactory } = useFactory()
  const { camSheets, getAvailableModels } = useCAMSheets()
  const { settings } = useSettings()
  const { showSuccess, showError } = useToast()

  const [record, setRecord] = useState<ToolChange | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [availableTNumbers, setAvailableTNumbers] = useState<number[]>([])
  const [suggestedToolLife, setSuggestedToolLife] = useState<number | null>(null)
  const [isManualEndmillInput, setIsManualEndmillInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const reasons = settings.toolChanges.reasons
  const processesFromSettings = settings.equipment.processes
  const availableModels = useMemo(() => getAvailableModels, [getAvailableModels])

  // Load record from sessionStorage (handed off from list page)
  useEffect(() => {
    if (!id) return
    try {
      const cached = window.sessionStorage.getItem(SESSION_CACHE_KEY(id))
      if (!cached) {
        setLoadError('편집할 기록을 찾을 수 없습니다. 목록에서 다시 시도해주세요.')
        return
      }
      const parsed = JSON.parse(cached) as ToolChange
      setRecord(parsed)
      setForm(recordToForm(parsed))
    } catch (error) {
      clientLogger.error('Edit record load error:', error)
      setLoadError('기록을 불러오는 중 오류가 발생했습니다.')
    }
  }, [id])

  // Load users
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

  // Compute available T-numbers from CAM Sheet
  useEffect(() => {
    if (!form?.production_model || !form.process) {
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
  }, [form?.production_model, form?.process, camSheets])

  // Auto-fill suggested tool life from CAM Sheet
  useEffect(() => {
    if (isManualEndmillInput) return
    if (!form?.production_model || !form?.process || !form?.t_number) {
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
          setSuggestedToolLife(result.data.endmillInfo.suggestedToolLife || null)
        } else {
          setSuggestedToolLife(null)
        }
      } catch {
        setSuggestedToolLife(null)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [form?.production_model, form?.process, form?.t_number, isManualEndmillInput, currentFactory?.id])

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }, [])

  const isFormValid =
    form !== null &&
    /^C[0-9]{3}$/.test(form.equipment_number.trim()) &&
    form.production_model.length > 0 &&
    form.process.length > 0 &&
    form.t_number > 0 &&
    form.endmill_code.length > 0 &&
    typeof form.tool_life === 'number' &&
    form.tool_life > 0 &&
    form.change_reason.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !record || !isFormValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      const updateData = {
        id: record.id,
        equipment_number: parseInt(form.equipment_number.replace(/^C/, ''), 10) || 0,
        production_model: form.production_model,
        process: form.process,
        t_number: form.t_number,
        endmill_code: form.endmill_code,
        endmill_name: form.endmill_name,
        tool_life: typeof form.tool_life === 'number' ? form.tool_life : 0,
        change_reason: form.change_reason,
        changed_by: form.changed_by || undefined,
      }

      const response = await fetch('/api/tool-changes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '교체 실적 수정에 실패했습니다.')
      }

      try {
        window.sessionStorage.removeItem(SESSION_CACHE_KEY(id))
      } catch {
        // ignore
      }

      showSuccess(
        '수정 완료',
        `${form.equipment_number} T${String(form.t_number).padStart(2, '0')} 수정됨`
      )
      router.push('/dashboard/tool-changes')
    } catch (error) {
      clientLogger.error('교체 실적 수정 오류:', error)
      showError(
        '수정 실패',
        error instanceof Error ? error.message : '교체 실적 수정 중 오류가 발생했습니다.'
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

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col bg-paper">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-divider bg-paper/95 px-3 py-3 backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/tool-changes')}
            aria-label="뒤로"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-title font-semibold text-ink">교체 실적 수정</h1>
        </header>
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center p-4">
          <div className="rounded-md border border-divider bg-paper-warm p-6 text-center">
            <p className="text-body text-ink">{loadError}</p>
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={() => router.push('/dashboard/tool-changes')}
              className="mt-4"
            >
              목록으로 돌아가기
            </Button>
          </div>
        </main>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
      </div>
    )
  }

  const formattedSuggestedToolLife =
    suggestedToolLife !== null ? `${suggestedToolLife.toLocaleString()}회` : '—'

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-divider bg-paper/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/tool-changes')}
          aria-label="뒤로"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-title font-semibold text-ink">교체 실적 수정</h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 pb-32 sm:px-6 lg:px-8"
      >
        <Field label="설비번호" htmlFor="equipment_number" hint="C001 형식">
          <Input
            id="equipment_number"
            type="text"
            value={form.equipment_number}
            onChange={(e) =>
              updateField('equipment_number', e.target.value.toUpperCase())
            }
            pattern="C[0-9]{3}"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="생산모델" htmlFor="production_model">
            <SmartDropdown
              title="생산모델 선택"
              options={modelOptions}
              value={form.production_model}
              onChange={(v) => updateField('production_model', v)}
              placeholder="선택"
              required
            />
          </Field>
          <Field label="공정" htmlFor="process">
            <SmartDropdown
              title="공정 선택"
              options={processOptions}
              value={form.process}
              onChange={(v) => updateField('process', v)}
              placeholder="선택"
              required
            />
          </Field>
        </div>

        <Field label="T번호" htmlFor="t_number">
          <SmartDropdown
            title="T번호 선택"
            options={tNumberOptions}
            value={String(form.t_number)}
            onChange={(v) => updateField('t_number', parseInt(v, 10))}
            placeholder="선택"
            required
          />
        </Field>

        <Field
          label="엔드밀 코드"
          htmlFor="endmill_code"
          hint={isManualEndmillInput ? '수동 입력 모드' : 'CAM Sheet 자동 입력'}
          action={
            <button
              type="button"
              onClick={() => setIsManualEndmillInput((v) => !v)}
              className="text-caption font-medium text-gauge-cobalt transition-colors hover:text-gauge-cobalt-strong"
            >
              {isManualEndmillInput ? '자동 입력' : '수동 입력'}
            </button>
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

        <Field label="엔드밀 이름" htmlFor="endmill_name">
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
          <Field label="적용 Tool Life" htmlFor="suggested_tool_life" hint="CAM Sheet 기준 (참고)">
            <Input
              id="suggested_tool_life"
              type="text"
              value={formattedSuggestedToolLife}
              readOnly
              disabled
              className="bg-paper-warm tabular"
            />
          </Field>

          <Field label="실제 Tool Life" htmlFor="tool_life" hint="회 단위">
            <Input
              id="tool_life"
              type="number"
              inputMode="numeric"
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

        <Field label="교체 사유" htmlFor="change_reason">
          <SmartDropdown
            title="교체 사유 선택"
            options={reasonOptions}
            value={form.change_reason}
            onChange={(v) => updateField('change_reason', v)}
            placeholder="선택"
            required
          />
        </Field>

        <Field label="작업자" htmlFor="changed_by">
          <SmartDropdown
            title="작업자 선택"
            options={userOptions}
            value={form.changed_by}
            onChange={(v) => updateField('changed_by', v)}
            placeholder="선택"
          />
        </Field>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3 pb-safe sm:px-6 lg:px-8">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push('/dashboard/tool-changes')}
            className="flex-1"
          >
            취소
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
                저장
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
        <label htmlFor={htmlFor} className="text-label font-medium text-ink no-break">
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className="text-caption text-ink-soft">{hint}</p>}
    </div>
  )
}
