'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../../../../components/shared/Toast'
import { useTranslations } from '../../../../lib/hooks/useTranslations'
import dynamic from 'next/dynamic'
const EndmillMasterUploader = dynamic(() => import('../../../../components/features/EndmillMasterUploader'), { ssr: false })
import EndmillSupplierPrices from '../../../../components/features/EndmillSupplierPrices'

export default function EndmillDetailPage() {
  const params = useParams()
  const router = useRouter()
  const endmillCode = params.code as string
  const { showSuccess, showError } = useToast()
  const { t } = useTranslations()

  const [endmillData, setEndmillData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExcelUploader, setShowExcelUploader] = useState(false)

  // 실시간 사용 현황 테이블 정렬 및 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<'equipmentModel' | 'equipmentProcess' | 'specToolLife' | 'equipmentNumber'>('equipmentNumber')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const itemsPerPage = 10

  useEffect(() => {
    const fetchEndmillData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/endmill?code=${endmillCode}`)
        const result = await response.json()

        if (result.success && result.data.length > 0) {
          setEndmillData(result.data[0])
        } else {
          setEndmillData(null)
        }
      } catch (error) {
        console.error('앤드밀 데이터 로딩 오류:', error)
        showError(t('endmill.dataLoadError'), t('endmill.dataLoadErrorMessage'))
        setEndmillData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchEndmillData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endmillCode])

  // 버튼 핸들러들
  const handleEdit = () => {
    setShowEditModal(true)
  }

  const handleInventoryManagement = () => {
    router.push('/dashboard/inventory')
    showSuccess(t('endmill.inventoryNavigateSuccess'), `${endmillCode} ${t('endmill.inventoryNavigateMessage')}`)
  }

  const handleSaveEdit = () => {
    // 실제 편집 로직은 나중에 구현
    setShowEditModal(false)
    showSuccess(t('endmill.editCompleteTitle'), `${endmillCode} ${t('endmill.editCompleteMessage')}`)
  }

  // 정렬 토글 함수
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // 정렬된 사용 현황 데이터
  const sortedCurrentUsage = useMemo(() => {
    if (!endmillData?.currentUsage) return []

    const sorted = [...endmillData.currentUsage].sort((a: any, b: any) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // 숫자 필드는 숫자로 비교
      if (sortField === 'specToolLife') {
        aValue = aValue || 0
        bValue = bValue || 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [endmillData?.currentUsage, sortField, sortOrder])

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedCurrentUsage.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentUsageItems = sortedCurrentUsage.slice(startIndex, endIndex)

  // 정렬이 변경되면 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [sortField, sortOrder])

  const handleExcelUpload = () => {
    setShowExcelUploader(true)
  }

  const handleMasterDataUpdate = (data: any[]) => {
    // 실제 구현에서는 API를 통해 업데이트를 수행해야 함
    showSuccess(
      t('endmill.masterDataUpdateComplete'),
      `${data.length}${t('endmill.masterDataUpdateMessage')}`
    )

    setShowExcelUploader(false)

    // 현재 앤드밀 정보 새로고침
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🔧</span>
          </div>
          <p className="text-gray-600">{t('endmill.loadingInfo')}</p>
        </div>
      </div>
    )
  }

  if (!endmillData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('endmill.notFound')}</h2>
          <p className="text-gray-600">{t('common.code')} &apos;{endmillCode}&apos;{t('endmill.notFoundMessage')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard/endmill')}
                  className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 hover:text-gray-900 font-medium"
                  title={t('equipment.backButton')}
                >
                  <span className="text-xl mr-2">⬅️</span>
                  {t('equipment.backButton')}
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{endmillCode} {t('endmill.detailTitle')}</h1>
                  <p className="text-gray-600">{t('endmill.detailSubtitle')}</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  📝 {t('endmill.editButton')}
                </button>
                <button
                  onClick={handleExcelUpload}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  📊 {t('endmill.excelUploadButton')}
                </button>
                <button
                  onClick={handleInventoryManagement}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📦 {t('endmill.inventoryManageButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 기본 정보 컨테이너 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">📋 {t('endmill.basicInfoSection')}</h2>

              <div className="grid grid-cols-1 gap-6">
                {/* 기본 식별 정보 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2">{t('endmill.identificationInfo')}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('endmill.endmillCode')}</label>
                      <p className="text-lg font-mono font-bold text-blue-600">{endmillData.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('endmill.category')}</label>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {endmillData.categoryName || endmillData.category}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('endmill.endmillName')}</label>
                      <p className="text-gray-900">{endmillData.name}</p>
                    </div>
                    {endmillData.qualityGrade && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('endmill.qualityGrade')}</label>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          endmillData.qualityGrade === 'A+' ? 'bg-green-100 text-green-800' :
                          endmillData.qualityGrade === 'A' ? 'bg-green-100 text-green-700' :
                          endmillData.qualityGrade === 'B+' ? 'bg-yellow-100 text-yellow-800' :
                          endmillData.qualityGrade === 'B' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {endmillData.qualityGrade}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 기술 사양 */}
                {(endmillData.diameter || endmillData.flutes || endmillData.coating) && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 border-b pb-2">{t('endmill.technicalSpecs')}</h3>
                    <div className="space-y-3">
                      {endmillData.diameter && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.diameter')}</label>
                          <p className="text-gray-900">{endmillData.diameter}mm</p>
                        </div>
                      )}
                      {endmillData.flutes && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.flutes')}</label>
                          <p className="text-gray-900">{endmillData.flutes}날</p>
                        </div>
                      )}
                      {endmillData.coating && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.coating')}</label>
                          <p className="text-gray-900">{endmillData.coating}</p>
                        </div>
                      )}
                      {endmillData.material && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.material')}</label>
                          <p className="text-gray-900">{endmillData.material}</p>
                        </div>
                      )}
                      {endmillData.tolerance && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.tolerance')}</label>
                          <p className="text-gray-900">{endmillData.tolerance}</p>
                        </div>
                      )}
                      {endmillData.helix && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.helix')}</label>
                          <p className="text-gray-900">{endmillData.helix}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 성능 지표 */}
                {(endmillData.performanceRating || endmillData.standardLife) && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 border-b pb-2">{t('endmill.performanceMetrics')}</h3>
                    <div className="space-y-3">
                      {endmillData.performanceRating && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.performanceRating')}</label>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  endmillData.performanceRating >= 90 ? 'bg-green-600' :
                                  endmillData.performanceRating >= 80 ? 'bg-blue-600' :
                                  endmillData.performanceRating >= 70 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                }`}
                                style={{width: `${endmillData.performanceRating}%`}}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{endmillData.performanceRating}</span>
                          </div>
                        </div>
                      )}
                      {endmillData.costEfficiency && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.costEfficiency')}</label>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-blue-600"
                                style={{width: `${endmillData.costEfficiency}%`}}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{endmillData.costEfficiency}</span>
                          </div>
                        </div>
                      )}
                      {endmillData.defectRate !== undefined && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.defectRate')}</label>
                          <p className={`text-sm font-medium ${
                            endmillData.defectRate < 1 ? 'text-green-600' :
                            endmillData.defectRate < 3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {endmillData.defectRate.toFixed(2)}%
                          </p>
                        </div>
                      )}
                      {endmillData.replacementFrequency && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.replacementFrequency')}</label>
                          <p className="text-gray-900">{endmillData.replacementFrequency}회/월</p>
                        </div>
                      )}
                      {endmillData.averageLifespan && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.averageLifespan')}</label>
                          <p className="text-gray-900">{endmillData.averageLifespan.toLocaleString()}회</p>
                        </div>
                      )}
                      {endmillData.standardLife && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">{t('endmill.standardLife')}</label>
                          <p className="text-gray-900">{endmillData.standardLife.toLocaleString()}회</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 태그 */}
              {endmillData.tags && endmillData.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('endmill.tags')}</label>
                  <div className="flex flex-wrap gap-2">
                    {endmillData.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* 성능 분석 컨테이너 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">📊 {t('endmill.performanceSection')}</h2>

              {/* 재고 현황 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">{t('endmill.currentStock')}</p>
                      <p className="text-2xl font-bold text-blue-900">{endmillData.inventory?.current_stock || 0}</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      📦
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700">{t('endmill.minStock')}</p>
                      <p className="text-2xl font-bold text-yellow-900">{endmillData.inventory?.min_stock || 0}</p>
                    </div>
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      ⚠️
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">{t('endmill.inUseCount')}</p>
                      <p className="text-2xl font-bold text-green-900">{endmillData.currentUsage?.length || 0}</p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      🏭
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">{t('endmill.totalUsageCount')}</p>
                      <p className="text-2xl font-bold text-purple-900">{endmillData.totalUsageCount || 0}</p>
                    </div>
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      📈
                    </div>
                  </div>
                </div>
              </div>

              {/* 공급업체별 정보 */}
              {endmillData.suppliers && endmillData.suppliers.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-medium text-gray-900 mb-4">🚚 {t('endmill.supplierInfoTable')}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('endmill.supplierName')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('endmill.unitPrice')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {endmillData.suppliers.map((supplier: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{supplier.code || supplier.name}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-gray-900">{supplier.unitPrice?.toLocaleString() || 0}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 예측 정보 */}
              {(endmillData.predictedNextChange || endmillData.recommendedStock) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">🔮 {t('endmill.predictionInfo')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {endmillData.predictedNextChange && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('endmill.nextChangeDate')}</label>
                        <p className="text-lg font-medium text-blue-600">{endmillData.predictedNextChange}</p>
                      </div>
                    )}
                    {endmillData.recommendedStock && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('endmill.recommendedStockLabel')}</label>
                        <p className="text-lg font-medium text-green-600">{endmillData.recommendedStock}개</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>

          {/* 공급업체 정보 컨테이너 */}
          {endmillData && endmillData.id && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">🚚 {t('endmill.supplierInfoSection')}</h2>
                <EndmillSupplierPrices
                  endmillId={endmillData.id}
                  endmillCode={endmillData.code}
                />
            </div>
          )}

          {/* 등록된 CAM Sheet 사양 컨테이너 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 {t('endmill.camSheetSection')}</h2>
              <div className="space-y-3">
                {endmillData.camSheets && endmillData.camSheets.length > 0 ? (
                  endmillData.camSheets.map((cam: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-gray-900">{cam.model}</span>
                          <span className="mx-2 text-gray-400">·</span>
                          <span className="text-sm text-gray-600">{cam.process}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">{t('endmill.camTNumber')}: </span>
                          <span className="font-medium text-blue-600">T{cam.tNumber?.toString().padStart(2, '0') || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t('endmill.camToolLife')}: </span>
                          <span className="font-medium text-gray-900">{cam.toolLife?.toLocaleString() || 'N/A'}회</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">{t('endmill.noCAMSheets')}</p>
                  </div>
                )}
              </div>
          </div>

          {/* 실시간 사용 현황 테이블 컨테이너 - 전체 너비 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏭 {t('endmill.realtimeUsageSection')}</h2>
              <div className="overflow-x-auto">
                {sortedCurrentUsage && sortedCurrentUsage.length > 0 ? (
                  <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('equipmentModel')}
                        >
                          <div className="flex items-center">
                            {t('endmill.equipmentModel')}
                            <span className="ml-1">
                              {sortField === 'equipmentModel' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </span>
                          </div>
                        </th>
                        <th
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('equipmentProcess')}
                        >
                          <div className="flex items-center">
                            {t('endmill.equipmentProcess')}
                            <span className="ml-1">
                              {sortField === 'equipmentProcess' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </span>
                          </div>
                        </th>
                        <th
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('specToolLife')}
                        >
                          <div className="flex items-center">
                            {t('endmill.camToolLifeLabel')}
                            <span className="ml-1">
                              {sortField === 'specToolLife' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </span>
                          </div>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('endmill.actualAverageLife')}</th>
                        <th
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('equipmentNumber')}
                        >
                          <div className="flex items-center">
                            {t('endmill.usedEquipmentLabel')}
                            <span className="ml-1">
                              {sortField === 'equipmentNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentUsageItems.map((usage: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">{usage.equipmentModel || 'N/A'}</span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{usage.equipmentProcess || 'N/A'}</span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-blue-600">
                              {usage.specToolLife ? `${usage.specToolLife.toLocaleString()}회` : 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {usage.averageActualLife ? `${usage.averageActualLife.toLocaleString()}회` : (
                                <span className="text-gray-400">{t('endmill.noDataAvailable')}</span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {usage.equipmentNumber?.toString().startsWith('C')
                                  ? usage.equipmentNumber
                                  : `C${usage.equipmentNumber?.toString().padStart(3, '0')}`}
                              </span>
                              <span className="text-xs text-gray-500">T{usage.positionNumber?.toString().padStart(2, '0')}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="bg-white px-6 py-3 flex items-center justify-between border-t mt-4">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('endmill.previous')}
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('endmill.next')}
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            {t('endmill.total')} <span className="font-medium">{sortedCurrentUsage.length}</span>{t('endmill.of')}{' '}
                            <span className="font-medium">{startIndex + 1}</span>
                            {' '}~{' '}
                            <span className="font-medium">{Math.min(endIndex, sortedCurrentUsage.length)}</span>
                            {' '}{t('endmill.display')}
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ‹
                            </button>

                            {/* 페이지 번호들 */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    currentPage === pageNum
                                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}

                            <button
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ›
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🔧</span>
                    </div>
                    <p className="text-sm">{t('endmill.noEquipmentInUse')}</p>
                  </div>
                )}
              </div>
          </div>

          {/* 최근 교체 이력 컨테이너 - 전체 너비 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 {t('endmill.recentChangesSection')}</h2>
              <div className="space-y-3">
                {endmillData.recentChanges && endmillData.recentChanges.slice(0, 8).map((change: any, index: number) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{change.equipmentNumber}</span>
                      <span className="text-xs text-gray-500">{change.changeDate}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      T{change.tNumber?.toString().padStart(2, '0')} - {change.changeReason}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('endmill.changedBy')}: {change.changedBy} | {t('endmill.previousLifeLabel')}: {change.previousLife?.toLocaleString()}회
                    </div>
                  </div>
                ))}

                {endmillData.recentChanges && endmillData.recentChanges.length > 8 && (
                  <div className="text-center pt-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      {t('endmill.viewAllHistory')}
                    </button>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* 수정 모달 */}
      {showEditModal && endmillData && (
        <div className="mobile-modal-container" onClick={() => setShowEditModal(false)}>
          <div className="mobile-modal-content md:max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-lg font-medium">{t('endmill.editInfoTitle')} {endmillData.code}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="mobile-modal-body">
              <div className="space-y-6">
                {/* 기본 정보 섹션 - 수정불가 필드 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">{t('endmill.basicInfoEdit')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('endmill.endmillCode')}</label>
                      <input
                        type="text"
                        value={endmillData.code}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('endmill.category')}</label>
                      <input
                        type="text"
                        value={endmillData.categoryName || endmillData.category}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('endmill.endmillName')}</label>
                      <input
                        type="text"
                        value={endmillData.name || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* 재고 관리 섹션 - 수정 가능 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">{t('endmill.inventoryManagement')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('endmill.minStock')}</label>
                      <input
                        type="number"
                        defaultValue={endmillData.inventory?.min_stock || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('inventory.maxStockLabel')}</label>
                      <input
                        type="number"
                        defaultValue={endmillData.inventory?.max_stock || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('endmill.recommendedStock')}</label>
                      <input
                        type="number"
                        defaultValue={endmillData.recommendedStock || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* 버튼 */}
            <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                {t('endmill.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('inventory.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 업로더 */}
      {showExcelUploader && (
        <EndmillMasterUploader
          onDataParsed={handleMasterDataUpdate}
          onClose={() => setShowExcelUploader(false)}
        />
      )}
    </div>
  )
}