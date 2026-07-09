'use client'

import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../shared/Toast'
import { useDraggableModal } from '@/lib/hooks/useDraggableModal'
import {
  REPAIR_TYPES, FAILURE_TYPES, RepairType, FailureType, ProbeRepair
} from '../../../lib/types/probe'

// 반환일 + 6개월 클라이언트 미리보기 (실제 값은 DB GENERATED 컬럼이 진실 소스)
function previewWarrantyUntil(returnedAt: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(returnedAt)) return null
  const d = new Date(`${returnedAt}T00:00:00`)
  d.setMonth(d.getMonth() + 6)
  return d.toISOString().slice(0, 10)
}

interface ProbeRepairModalProps {
  probeId: string
  factoryId: string
  // register: 신규 수리 등록 / process: 진행중인 수리 건의 다음 단계(발송 또는 입고 마감) 처리 / edit: 기록 정정
  mode: 'register' | 'process' | 'edit'
  openRepair?: ProbeRepair | null // mode==='process'일 때 필수
  editRepair?: ProbeRepair | null // mode==='edit'일 때 필수
  repairHistory?: ProbeRepair[] // mode==='register'일 때 보증 재수리 후보 탐색용
  onDone: () => void
  onCancel: () => void
}

export default function ProbeRepairModal({
  probeId, factoryId, mode, openRepair, editRepair, repairHistory = [], onDone, onCancel
}: ProbeRepairModalProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const dragRef = useDraggableModal()

  const [repairType, setRepairType] = useState<RepairType>(editRepair?.repair_type ?? 'external')
  const [failureType, setFailureType] = useState<FailureType | ''>(editRepair?.failure_type ?? '')
  const [occurredAt, setOccurredAt] = useState(editRepair?.occurred_at ?? '')
  const [completedAt, setCompletedAt] = useState(editRepair?.completed_at ?? '')
  const [replacedParts, setReplacedParts] = useState(editRepair?.replaced_parts ?? '')
  const [originalRepairId, setOriginalRepairId] = useState('')
  const [notes, setNotes] = useState(editRepair?.notes ?? '')
  const [sentAt, setSentAt] = useState(editRepair?.sent_at ?? '')
  const [returnedAt, setReturnedAt] = useState(editRepair?.returned_at ?? '')
  const [serialAfter, setSerialAfter] = useState('')
  const [saving, setSaving] = useState(false)

  // 보증 내 재수리 연결 후보: 완료된 외주/RBE 건 중 보증 만료일이 발생일 이후인 것
  const warrantyCandidates = useMemo(() => {
    if (mode !== 'register' || repairType === 'internal') return []
    const ref = occurredAt || new Date().toISOString().slice(0, 10)
    return repairHistory.filter(r =>
      r.status === 'completed' && r.repair_type !== 'internal' && r.warranty_until && r.warranty_until >= ref
    )
  }, [mode, repairType, occurredAt, repairHistory])

  const registerValid =
    !!failureType && !!occurredAt &&
    (repairType !== 'internal' || (!!completedAt && replacedParts.trim().length > 0))

  // 승인 워크플로우: reported →(승인)→ approved →(발송)→ sent →(입고)→ completed
  const processStage: 'approve' | 'send' | 'close' | null =
    mode === 'process' && openRepair
      ? (openRepair.status === 'reported' ? 'approve'
        : openRepair.status === 'approved' ? 'send'
        : openRepair.status === 'sent' ? 'close' : null)
      : null

  const processValid =
    processStage === 'approve'
      ? true
      : processStage === 'send'
        ? !!sentAt
        : processStage === 'close'
          ? !!returnedAt && (openRepair?.repair_type !== 'rbe' || serialAfter.trim().length > 0)
          : false

  const submitRegister = async () => {
    if (!registerValid) return
    setSaving(true)
    try {
      const res = await fetch(`/api/probes/${probeId}/repairs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId,
          repair_type: repairType,
          failure_type: failureType,
          occurred_at: occurredAt,
          ...(repairType === 'internal'
            ? { completed_at: completedAt, replaced_parts: replacedParts.trim() }
            : {}),
          ...(repairType !== 'internal' && originalRepairId ? { original_repair_id: originalRepairId } : {}),
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        showError(t('probe.repairFailed'), json.error ?? '')
        return
      }
      showSuccess(t('probe.repairRegisterSuccess'), '')
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const editValid = mode === 'edit' && !!editRepair && !!failureType && !!occurredAt &&
    (editRepair.repair_type !== 'internal' || (!!completedAt && replacedParts.trim().length > 0))

  const submitEdit = async () => {
    if (!editValid || !editRepair) return
    setSaving(true)
    try {
      const res = await fetch(`/api/probes/${probeId}/repairs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId,
          repair_id: editRepair.id,
          action: 'update',
          failure_type: failureType,
          occurred_at: occurredAt,
          notes: notes.trim() || undefined,
          ...(editRepair.repair_type === 'internal'
            ? { completed_at: completedAt, replaced_parts: replacedParts.trim() }
            : {
                ...(editRepair.status !== 'reported' && sentAt ? { sent_at: sentAt } : {}),
                ...(editRepair.status === 'completed' && returnedAt ? { returned_at: returnedAt } : {})
              })
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        showError(t('probe.repairFailed'), json.error ?? '')
        return
      }
      showSuccess(t('probe.repairUpdateSuccess'), '')
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const submitProcess = async () => {
    if (!processValid || !openRepair) return
    setSaving(true)
    try {
      const body = processStage === 'approve'
        ? { factoryId, repair_id: openRepair.id, action: 'approve' }
        : processStage === 'send'
          ? { factoryId, repair_id: openRepair.id, action: 'send', sent_at: sentAt }
          : {
              factoryId, repair_id: openRepair.id, action: 'close', returned_at: returnedAt,
              ...(openRepair.repair_type === 'rbe' ? { serial_after: serialAfter.trim() } : {})
            }
      const res = await fetch(`/api/probes/${probeId}/repairs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        showError(t('probe.repairFailed'), json.error ?? '')
        return
      }
      showSuccess(
        processStage === 'approve' ? t('probe.repairApproveSuccess')
          : processStage === 'send' ? t('probe.repairSendSuccess')
          : t('probe.repairCloseSuccess'), '')
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'register'
    ? t('probe.repairModalTitle')
    : mode === 'edit'
      ? t('probe.repairEditTitle')
      : processStage === 'approve'
        ? t('probe.repairApproveTitle')
        : processStage === 'send'
          ? t('probe.repairSendSubmit')
          : t('probe.repairInboundTitle')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div ref={dragRef} className="w-full max-w-md rounded-md border border-divider bg-paper-warm p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">{title}</h2>

        {mode === 'register' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('probe.repairType')}</label>
              <div className="grid grid-cols-3 gap-2">
                {REPAIR_TYPES.map(rt => (
                  <button key={rt} type="button"
                    onClick={() => setRepairType(rt)}
                    className={`min-h-touch rounded border px-2 py-2 text-sm font-medium
                      ${repairType === rt ? 'border-primary bg-primary-100 text-primary-800' : 'border-divider'}`}>
                    {t(`probe.repairType_${rt}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t('probe.failureType')}</label>
              <select
                value={failureType}
                onChange={e => setFailureType(e.target.value as FailureType)}
                className="min-h-touch w-full rounded border border-divider bg-white pl-3 pr-8"
              >
                <option value="">{t('common.select')}</option>
                {FAILURE_TYPES.map(ft => <option key={ft} value={ft}>{t(`probe.failureType_${ft}`)}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t('probe.occurredAt')}</label>
              <input type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)}
                className="min-h-touch w-full rounded border border-divider px-3" />
            </div>

            {repairType === 'internal' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('probe.completedAt')}</label>
                  <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)}
                    className="min-h-touch w-full rounded border border-divider px-3" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('probe.replacedParts')}</label>
                  <input value={replacedParts} onChange={e => setReplacedParts(e.target.value)}
                    className="min-h-touch w-full rounded border border-divider px-3" />
                </div>
              </>
            )}

            {repairType !== 'internal' && warrantyCandidates.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium">{t('probe.warrantyRepairCandidate')}</label>
                <div className="space-y-1 rounded border border-divider p-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={originalRepairId === ''} onChange={() => setOriginalRepairId('')} />
                    {t('probe.warrantyRepairNone')}
                  </label>
                  {warrantyCandidates.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={originalRepairId === c.id} onChange={() => setOriginalRepairId(c.id)} />
                      {c.occurred_at} → {c.returned_at} ({t(`probe.repairType_${c.repair_type}`)}, ~{c.warranty_until})
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('probe.notes')} <span className="text-xs font-normal text-secondary-400">({t('probe.optional')})</span>
              </label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                className="min-h-touch w-full rounded border border-divider px-3" />
            </div>
          </div>
        )}

        {mode === 'edit' && editRepair && (
          <div className="space-y-3">
            <p className="text-sm text-secondary-500">
              {t(`probe.repairType_${editRepair.repair_type}`)} · {t(`probe.repairStatus_${editRepair.status}`)}
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium">{t('probe.failureType')}</label>
              <select
                value={failureType}
                onChange={e => setFailureType(e.target.value as FailureType)}
                className="min-h-touch w-full rounded border border-divider bg-white pl-3 pr-8"
              >
                <option value="">{t('common.select')}</option>
                {FAILURE_TYPES.map(ft => <option key={ft} value={ft}>{t(`probe.failureType_${ft}`)}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t('probe.occurredAt')}</label>
              <input type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)}
                className="min-h-touch w-full rounded border border-divider px-3" />
            </div>

            {editRepair.repair_type === 'internal' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('probe.completedAt')}</label>
                  <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)}
                    className="min-h-touch w-full rounded border border-divider px-3" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('probe.replacedParts')}</label>
                  <input value={replacedParts} onChange={e => setReplacedParts(e.target.value)}
                    className="min-h-touch w-full rounded border border-divider px-3" />
                </div>
              </>
            )}

            {editRepair.repair_type !== 'internal' && editRepair.status !== 'reported' && (
              <div>
                <label className="mb-1 block text-sm font-medium">{t('probe.sentAt')}</label>
                <input type="date" value={sentAt} onChange={e => setSentAt(e.target.value)}
                  className="min-h-touch w-full rounded border border-divider px-3" />
              </div>
            )}

            {editRepair.repair_type !== 'internal' && editRepair.status === 'completed' && (
              <div>
                <label className="mb-1 block text-sm font-medium">{t('probe.returnedAt')}</label>
                <input type="date" value={returnedAt} onChange={e => setReturnedAt(e.target.value)}
                  className="min-h-touch w-full rounded border border-divider px-3" />
                {returnedAt && previewWarrantyUntil(returnedAt) && (
                  <p className="mt-1 text-xs text-secondary-500">
                    {t('probe.warrantyUntil')}: {previewWarrantyUntil(returnedAt)}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('probe.notes')} <span className="text-xs font-normal text-secondary-400">({t('probe.optional')})</span>
              </label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                className="min-h-touch w-full rounded border border-divider px-3" />
            </div>
          </div>
        )}

        {mode === 'process' && processStage === 'approve' && openRepair && (
          <div className="space-y-2">
            <p className="text-sm text-secondary-600">
              {t(`probe.repairType_${openRepair.repair_type}`)}
              {openRepair.failure_type ? ` · ${t(`probe.failureType_${openRepair.failure_type}`)}` : ''}
              {' · '}{openRepair.occurred_at}
            </p>
            <p className="text-sm text-secondary-500">{t('probe.repairApproveTitle')} → {t('probe.repairStatus_approved')}</p>
          </div>
        )}

        {mode === 'process' && processStage === 'send' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('probe.sentAt')}</label>
              <input type="date" value={sentAt} onChange={e => setSentAt(e.target.value)}
                className="min-h-touch w-full rounded border border-divider px-3" />
            </div>
          </div>
        )}

        {mode === 'process' && processStage === 'close' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('probe.returnedAt')}</label>
              <input type="date" value={returnedAt} onChange={e => setReturnedAt(e.target.value)}
                className="min-h-touch w-full rounded border border-divider px-3" />
            </div>
            {openRepair?.repair_type === 'rbe' && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t('probe.serialAfter')} <span className="text-danger">*</span>
                </label>
                <input value={serialAfter} onChange={e => setSerialAfter(e.target.value)}
                  className="min-h-touch w-full rounded border border-divider px-3 font-mono" />
              </div>
            )}
            {returnedAt && previewWarrantyUntil(returnedAt) && (
              <p className="text-xs text-secondary-500">
                {t('probe.warrantyUntil')}: {previewWarrantyUntil(returnedAt)}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="min-h-touch rounded border px-4">{t('common.cancel')}</button>
          <button
            onClick={mode === 'register' ? submitRegister : mode === 'edit' ? submitEdit : submitProcess}
            disabled={saving || (mode === 'register' ? !registerValid : mode === 'edit' ? !editValid : !processValid)}
            className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50"
          >
            {saving ? t('common.saving') : mode === 'register'
              ? t('probe.repairRegisterSubmit')
              : mode === 'edit'
                ? t('common.save')
                : processStage === 'approve' ? t('probe.repairApproveSubmit')
                  : processStage === 'send' ? t('probe.repairSendSubmit')
                  : t('probe.repairCloseSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}
