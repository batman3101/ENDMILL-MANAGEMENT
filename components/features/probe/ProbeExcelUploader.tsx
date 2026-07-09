'use client'

import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../shared/Toast'
import { useFactory } from '../../../lib/hooks/useFactory'
import { useDraggableModal } from '@/lib/hooks/useDraggableModal'
import {
  parseProbeExcel, validateProbeData, downloadProbeTemplate, exportProbeRowsToExcel
} from '../../../lib/utils/probeExcelTemplate'
import { ProbeExcelRow } from '../../../lib/types/probe'

interface ProbeExcelUploaderProps {
  onUploadSuccess: () => void
  onCancel: () => void
}

const REQUEST_CHUNK = 1000 // 서버 Zod 상한과 동일

interface UploadSummary {
  success: string[]
  failed: { asset_number: string; reason: string }[]
  duplicates: string[]
  inspectionsCreated: number
}

export default function ProbeExcelUploader({ onUploadSuccess, onCancel }: ProbeExcelUploaderProps) {
  const { t, i18n } = useTranslation()
  // 현재 UI 언어에 맞춰 템플릿/재다운로드 헤더 언어를 결정 (베트남어면 vi, 그 외 ko)
  const templateLang: 'ko' | 'vi' = i18n.language?.startsWith('vi') ? 'vi' : 'ko'
  const { showSuccess, showError } = useToast()
  const { currentFactory } = useFactory()
  const dragRef = useDraggableModal()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [rows, setRows] = useState<ProbeExcelRow[]>([])
  const [fileName, setFileName] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0) // 0~100
  const [summary, setSummary] = useState<UploadSummary | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showError(t('probe.fileFormatError'), t('probe.excelFileOnly'))
      return
    }
    setFileName(file.name)
    setSummary(null)
    const parsed = await parseProbeExcel(file)
    if (parsed.length === 0) {
      showError(t('probe.noData'), t('probe.excelNoData'))
      return
    }
    const { errors } = validateProbeData(parsed)
    setRows(parsed)
    setValidationErrors(errors)
  }

  const handleUpload = async () => {
    if (!currentFactory?.id) {
      showError(t('probe.noFactory'), t('probe.selectFactoryFirst'))
      return
    }
    if (validationErrors.length > 0 || rows.length === 0) return
    setIsUploading(true)
    setProgress(0)

    const total: UploadSummary = { success: [], failed: [], duplicates: [], inspectionsCreated: 0 }
    const chunks: ProbeExcelRow[][] = []
    for (let i = 0; i < rows.length; i += REQUEST_CHUNK) chunks.push(rows.slice(i, i + REQUEST_CHUNK))

    try {
      for (let i = 0; i < chunks.length; i++) {
        const res = await fetch('/api/probes/bulk-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ factoryId: currentFactory.id, probes: chunks[i] })
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          // 남은 행(현재 청크 포함) 재다운로드 제공 후 중단
          const remaining = chunks.slice(i).flat()
          await exportProbeRowsToExcel(remaining, 'probe_remaining_rows.xlsx', templateLang)
          showError(t('probe.uploadInterrupted'), t('probe.remainingDownloaded'))
          break
        }
        total.success.push(...json.results.success)
        total.failed.push(...json.results.failed)
        total.duplicates.push(...json.results.duplicates)
        total.inspectionsCreated += json.results.inspectionsCreated
        setProgress(Math.round(((i + 1) / chunks.length) * 100))
      }
      setSummary(total)
      if (total.success.length > 0) {
        showSuccess(t('probe.uploadComplete'), `${total.success.length}${t('probe.itemsRegistered')}`)
        onUploadSuccess()
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadFailed = async () => {
    if (!summary) return
    const failedSet = new Set([...summary.failed.map(f => f.asset_number), ...summary.duplicates])
    await exportProbeRowsToExcel(rows.filter(r => failedSet.has(r.asset_number)), 'probe_failed_rows.xlsx', templateLang)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div ref={dragRef} className="w-full max-w-lg rounded-md border border-divider bg-paper-warm p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold">{t('probe.bulkUploadTitle')}</h2>

        <div className="mb-4 flex gap-2">
          <button onClick={() => downloadProbeTemplate(templateLang)} className="min-h-touch rounded border px-3 text-sm">
            {t('probe.downloadTemplate')}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="min-h-touch rounded border px-3 text-sm">
            {t('probe.selectFile')}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
        </div>

        {fileName && <p className="mb-2 text-sm text-secondary-600">{fileName} — {rows.length}{t('probe.rowsParsed')}</p>}

        {validationErrors.length > 0 && (
          <div className="mb-3 max-h-40 overflow-y-auto rounded border border-danger/40 bg-danger/5 p-2 text-xs text-danger">
            {validationErrors.slice(0, 50).map((err, i) => <div key={i}>{err}</div>)}
            {validationErrors.length > 50 && <div>… 외 {validationErrors.length - 50}건</div>}
          </div>
        )}

        {isUploading && (
          <div className="mb-3">
            <div className="h-2 w-full rounded bg-secondary-200">
              <div className="h-2 rounded bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-center text-xs">{progress}%</p>
          </div>
        )}

        {summary && (
          <div className="mb-3 rounded border p-3 text-sm">
            <p>{t('probe.resultSuccess')}: {summary.success.length}</p>
            <p>{t('probe.resultDuplicates')}: {summary.duplicates.length}</p>
            <p>{t('probe.resultFailed')}: {summary.failed.length}</p>
            {(summary.failed.length > 0 || summary.duplicates.length > 0) && (
              <button onClick={handleDownloadFailed} className="mt-2 rounded border px-2 py-1 text-xs">
                {t('probe.downloadFailedRows')}
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="min-h-touch rounded border px-4">{t('common.cancel')}</button>
          <button
            onClick={handleUpload}
            disabled={isUploading || rows.length === 0 || validationErrors.length > 0}
            className="min-h-touch rounded bg-primary px-4 text-white disabled:opacity-50"
          >
            {isUploading ? t('probe.uploading') : t('probe.startUpload')}
          </button>
        </div>
      </div>
    </div>
  )
}
