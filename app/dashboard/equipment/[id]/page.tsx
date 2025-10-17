'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { clientLogger } from '@/lib/utils/logger'
import PageLoadingIndicator from '@/components/shared/PageLoadingIndicator'

interface ToolPosition {
  id: string
  positionNumber: number
  currentLife: number | null
  totalLife: number
  installDate: string | null
  status: string
  usagePercentage: number | null
  endmill: {
    id: string
    code: string
    name: string
    categoryCode: string
    categoryName: string
    standardLife: number
    unitCost: number
  } | null
}

interface EquipmentDetail {
  id: string
  equipmentNumber: string
  modelCode: string
  currentModel: string
  process: string
  location: string
  status: string
  toolPositionCount: number
  createdAt: string
  updatedAt: string
  toolPositions: ToolPosition[]
  stats: {
    totalPositions: number
    usedPositions: number
    emptyPositions: number
    usagePercentage: number
  }
}

export default function EquipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useTranslation()
  const equipmentId = params.id as string

  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 설비 데이터 로드
  const fetchEquipment = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
      }
      const response = await fetch(`/api/equipment/${equipmentId}`)

      if (!response.ok) {
        throw new Error('설비 데이터를 불러오는데 실패했습니다.')
      }

      const result = await response.json()

      if (result.success) {
        setEquipment(result.data)
      } else {
        throw new Error(result.error || '데이터 로드 실패')
      }
    } catch (err) {
      clientLogger.error('설비 상세 조회 에러:', err)
      if (isInitialLoad) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    if (equipmentId) {
      fetchEquipment(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId])

  // 실시간 업데이트 (30초마다)
  useEffect(() => {
    if (!equipmentId) return

    const interval = setInterval(() => {
      fetchEquipment(false)
    }, 30000) // 30초

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentId])

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoadingIndicator
          message={t('equipment.loadingEquipmentInfo')}
          subMessage={t('equipment.pleaseWaitAMoment')}
          size="lg"
        />
      </div>
    )
  }

  // 에러 상태
  if (error || !equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('equipment.cannotLoadEquipmentInfo')}</h3>
          <p className="text-gray-500 mb-4">{error || t('equipment.equipmentNotFound')}</p>
          <button
            onClick={() => router.push('/dashboard/equipment')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            ← {t('equipment.backToEquipmentList')}
          </button>
        </div>
      </div>
    )
  }

  // 상태별 배지 색상
  const getStatusBadge = (status: string) => {
    switch (status) {
      case '가동중':
        return 'bg-green-100 text-green-800'
      case '점검중':
        return 'bg-red-100 text-red-800'
      case '셋업중':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '가동중':
        return '🟢'
      case '점검중':
        return '🔧'
      case '셋업중':
        return '⚙️'
      default:
        return '❓'
    }
  }

  // 상태 텍스트 번역
  const getStatusText = (status: string) => {
    switch (status) {
      case '가동중':
        return t('equipment.operating')
      case '점검중':
        return t('equipment.maintenance')
      case '셋업중':
        return t('equipment.setup')
      default:
        return status
    }
  }

  // 수명 상태별 배지 색상 (낮은 수명 사용률 = 비효율)
  const getLifeBadge = (percentage: number | null) => {
    if (percentage === null) return 'bg-gray-100 text-gray-500'   // 데이터 없음
    if (percentage <= 40) return 'bg-red-100 text-red-800'        // 개선필요
    if (percentage <= 60) return 'bg-orange-100 text-orange-800'  // 경고
    if (percentage <= 80) return 'bg-yellow-100 text-yellow-800'  // 주의
    return 'bg-green-100 text-green-800'                          // 정상
  }

  // 수명 상태 텍스트
  const getLifeStatus = (percentage: number | null) => {
    if (percentage === null) return t('common.noData')
    if (percentage <= 40) return t('equipment.needsImprovement')
    if (percentage <= 60) return t('equipment.warning')
    if (percentage <= 80) return t('equipment.caution')
    return t('equipment.normal')
  }

  // CAM Sheet에 정의된 모든 툴 포지션 표시 (T번호 순서대로)
  const allPositions = equipment.toolPositions.sort((a, b) => a.positionNumber - b.positionNumber)

  // 교체 실적이 있는 포지션과 없는 포지션 구분 (통계용)
  const positionsWithData = allPositions.filter(tp => tp.status === 'in_use')
  const positionsNoData = allPositions.filter(tp => tp.status === 'no_data')

  // 설비 번호 표시용 포맷팅 (C001, C002 등)
  const formattedEquipmentNumber = equipment.equipmentNumber.toString().startsWith('C')
    ? equipment.equipmentNumber
    : `C${equipment.equipmentNumber.toString().padStart(3, '0')}`

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-600">
        <button
          onClick={() => router.push('/dashboard')}
          className="hover:text-blue-600 transition-colors"
        >
          🏠 {t('navigation.dashboard')}
        </button>
        <span className="mx-2">›</span>
        <button
          onClick={() => router.push('/dashboard/equipment')}
          className="hover:text-blue-600 transition-colors"
        >
          🏭 {t('navigation.equipment')}
        </button>
        <span className="mx-2">›</span>
        <span className="text-gray-900 font-medium">{formattedEquipmentNumber} {t('equipment.detailView')}</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard/equipment')}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 hover:text-gray-900 font-medium"
            title={t('equipment.backButton')}
          >
            <span className="text-xl mr-2">⬅️</span>
            {t('equipment.backButton')}
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {formattedEquipmentNumber} {t('equipment.detailView')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {equipment.currentModel} / {equipment.process} / {equipment.location}
            </p>
          </div>
        </div>

        {/* 상태 배지 */}
        <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(equipment.status)}`}>
          <span className="mr-1">{getStatusIcon(equipment.status)}</span>
          {getStatusText(equipment.status)}
        </span>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🔧
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('equipment.totalPositions')}</p>
              <p className="text-xl font-bold text-gray-900">{equipment.stats.totalPositions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              ✅
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('equipment.withChangeRecords')}</p>
              <p className="text-xl font-bold text-green-600">{equipment.stats.usedPositions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              ⚠️
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('equipment.noChangeRecords')}</p>
              <p className="text-xl font-bold text-orange-600">{equipment.stats.emptyPositions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              📊
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('equipment.dataRegistrationRate')}</p>
              <p className="text-xl font-bold text-purple-600">{equipment.stats.usagePercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 설비 정보 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">🏭 {t('equipment.basicInfo')}</h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('equipment.equipmentNumber')}</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{formattedEquipmentNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('equipment.currentProductionModel')}</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{equipment.currentModel}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('equipment.process')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{equipment.process}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('equipment.location')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{equipment.location}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('equipment.status')}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(equipment.status)}`}>
                  <span className="mr-1">{getStatusIcon(equipment.status)}</span>
                  {getStatusText(equipment.status)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('equipment.toolPositionCountLabel')}</dt>
              <dd className="mt-1 text-sm text-gray-900">{equipment.toolPositionCount}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('common.createdAt')}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(equipment.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('common.updatedAt')}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(equipment.updatedAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* CAM Sheet 기준 전체 앤드밀 목록 */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            🔩 {t('equipment.camSheetEndmillList')} ({allPositions.length}{t('equipment.count')})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('equipment.camSheetFullList')} ({t('equipment.changeRecords')}: {positionsWithData.length}{t('equipment.count')}, {t('equipment.notRegistered')}: {positionsNoData.length}{t('equipment.count')})
          </p>
        </div>

        {allPositions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-medium">{t('equipment.noCamSheetData')}</p>
            <p className="text-sm mt-1">{t('equipment.registerCamSheet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('equipment.position')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('equipment.endmillCode')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('equipment.endmillName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('equipment.category')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('equipment.installDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('equipment.lifeUsageRate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('equipment.state')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-12 h-8 bg-blue-100 text-blue-800 text-sm font-bold rounded-md">
                        T{position.positionNumber.toString().padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/dashboard/endmill-detail/${position.endmill?.code}`)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {position.endmill?.code || '-'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate">
                        {position.endmill?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800">
                        {position.endmill?.categoryName || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {position.installDate ? new Date(position.installDate).toLocaleDateString('ko-KR') : (
                        <span className="text-gray-400">{t('common.noData')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {position.usagePercentage !== null && position.currentLife !== null ? (
                        <>
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  position.usagePercentage <= 40
                                    ? 'bg-red-500'
                                    : position.usagePercentage <= 60
                                    ? 'bg-orange-500'
                                    : position.usagePercentage <= 80
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${position.usagePercentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {position.usagePercentage}%
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {position.currentLife} / {position.totalLife}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">
                          {t('common.noData')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getLifeBadge(position.usagePercentage)}`}>
                        {getLifeStatus(position.usagePercentage)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
