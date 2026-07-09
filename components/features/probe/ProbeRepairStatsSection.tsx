'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useFactory } from '../../../lib/hooks/useFactory'

interface RepairStats {
  monthly: { month: string; count: number }[]
  byFailureType: { failureType: string; count: number }[]
  byModel: { model: string; count: number }[]
  byEquipment: { equipmentId: string; equipmentNumber: number; count: number }[]
}

function equipmentLabel(equipmentNumber: number): string {
  return `C${String(equipmentNumber).padStart(3, '0')}`
}

interface DistributionCardProps {
  title: string
  rows: { label: string; count: number }[]
}

// 수치가 적은 분포(고장유형/모델/장비)는 차트 라이브러리 없이 비율 바로 표현한다
function DistributionCard({ title, rows }: DistributionCardProps) {
  const max = Math.max(1, ...rows.map(r => r.count))
  return (
    <div className="rounded-md border border-divider bg-paper-warm p-4">
      <h3 className="mb-3 text-sm font-semibold text-secondary-700">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-secondary-400">—</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.label} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate" title={r.label}>{r.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-secondary-100">
                <div
                  className="h-full rounded bg-primary-600"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-medium">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ProbeRepairStatsSection() {
  const { t } = useTranslation()
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id

  const { data: stats } = useQuery({
    queryKey: ['probe-repair-stats', factoryId],
    enabled: !!factoryId,
    staleTime: 60000,
    queryFn: async (): Promise<RepairStats> => {
      const res = await fetch(`/api/probes/repairs/stats?factoryId=${factoryId}&months=12`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'repair stats fetch failed')
      return json.data as RepairStats
    }
  })

  if (!stats) return null

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">{t('probe.repairsStatsTitle')}</h2>

      <div className="rounded-md border border-divider bg-paper-warm p-4">
        <h3 className="mb-3 text-sm font-semibold text-secondary-700">{t('probe.statsMonthly')}</h3>
        {stats.monthly.length === 0 ? (
          <p className="text-xs text-secondary-400">{t('probe.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} width={32} />
              <Tooltip />
              <Bar dataKey="count" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DistributionCard
          title={t('probe.statsByFailureType')}
          rows={stats.byFailureType.map(r => ({
            label: t(`probe.failureType_${r.failureType}`), count: r.count
          }))}
        />
        <DistributionCard
          title={t('probe.statsByModel')}
          rows={stats.byModel.map(r => ({ label: r.model, count: r.count }))}
        />
        <DistributionCard
          title={t('probe.statsByEquipment')}
          rows={stats.byEquipment.map(r => ({
            label: equipmentLabel(r.equipmentNumber), count: r.count
          }))}
        />
      </div>
    </section>
  )
}
