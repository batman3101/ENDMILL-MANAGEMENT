'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../../../../components/shared/Toast'
import EndmillMasterUploader from '../../../../components/features/EndmillMasterUploader'
import EndmillSupplierPrices from '../../../../components/features/EndmillSupplierPrices'

export default function EndmillDetailPage() {
  const params = useParams()
  const router = useRouter()
  const endmillCode = params.code as string
  const { showSuccess, showError } = useToast()

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
        showError('데이터 오류', '앤드밀 정보를 불러오는데 실패했습니다.')
        setEndmillData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchEndmillData()
  }, [endmillCode, showError])

  // 버튼 핸들러들
  const handleEdit = () => {
    setShowEditModal(true)
  }

  const handleInventoryManagement = () => {
    router.push('/dashboard/inventory')
    showSuccess('재고 관리 페이지로 이동', `${endmillCode} 재고 관리를 위해 재고 관리 페이지로 이동합니다.`)
  }

  const handleSaveEdit = () => {
    // 실제 편집 로직은 나중에 구현
    setShowEditModal(false)
    showSuccess('수정 완료', `${endmillCode} 정보가 성공적으로 수정되었습니다.`)
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
      '마스터 데이터 업데이트 완료',
      `${data.length}개의 데이터가 처리되었습니다. (Supabase 연동 후 실제 기능 구현)`
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
          <p className="text-gray-600">앤드밀 정보를 불러오는 중...</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">앤드밀을 찾을 수 없습니다</h2>
          <p className="text-gray-600">코드 &apos;{endmillCode}&apos;에 해당하는 앤드밀이 없습니다.</p>
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{endmillCode} 상세 정보</h1>
                <p className="text-gray-600">앤드밀 상세 정보 및 성능 분석</p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  📝 수정
                </button>
                <button 
                  onClick={handleExcelUpload}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  📊 엑셀 업로드
                </button>
                <button 
                  onClick={handleInventoryManagement}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📦 재고 관리
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
              <h2 className="text-lg font-semibold text-gray-900 mb-6">📋 기본 정보</h2>

              <div className="grid grid-cols-1 gap-6">
                {/* 기본 식별 정보 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2">식별 정보</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">앤드밀 코드</label>
                      <p className="text-lg font-mono font-bold text-blue-600">{endmillData.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">카테고리</label>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {endmillData.categoryName || endmillData.category}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">앤드밀 이름</label>
                      <p className="text-gray-900">{endmillData.name}</p>
                    </div>
                    {endmillData.qualityGrade && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">품질 등급</label>
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
                    <h3 className="font-medium text-gray-900 border-b pb-2">기술 사양</h3>
                    <div className="space-y-3">
                      {endmillData.diameter && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">직경</label>
                          <p className="text-gray-900">{endmillData.diameter}mm</p>
                        </div>
                      )}
                      {endmillData.flutes && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">날 수</label>
                          <p className="text-gray-900">{endmillData.flutes}날</p>
                        </div>
                      )}
                      {endmillData.coating && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">코팅</label>
                          <p className="text-gray-900">{endmillData.coating}</p>
                        </div>
                      )}
                      {endmillData.material && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">소재</label>
                          <p className="text-gray-900">{endmillData.material}</p>
                        </div>
                      )}
                      {endmillData.tolerance && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">공차</label>
                          <p className="text-gray-900">{endmillData.tolerance}</p>
                        </div>
                      )}
                      {endmillData.helix && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">나선각</label>
                          <p className="text-gray-900">{endmillData.helix}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 성능 지표 */}
                {(endmillData.performanceRating || endmillData.standardLife) && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 border-b pb-2">성능 지표</h3>
                    <div className="space-y-3">
                      {endmillData.performanceRating && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">성능 점수</label>
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
                          <label className="text-sm font-medium text-gray-700">비용 효율성</label>
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
                          <label className="text-sm font-medium text-gray-700">불량률</label>
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
                          <label className="text-sm font-medium text-gray-700">교체 빈도</label>
                          <p className="text-gray-900">{endmillData.replacementFrequency}회/월</p>
                        </div>
                      )}
                      {endmillData.averageLifespan && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">평균 수명</label>
                          <p className="text-gray-900">{endmillData.averageLifespan.toLocaleString()}회</p>
                        </div>
                      )}
                      {endmillData.standardLife && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">표준 수명</label>
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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">태그</label>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-6">📊 성능 분석</h2>

              {/* 재고 현황 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">현재 재고</p>
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
                      <p className="text-sm font-medium text-yellow-700">최소 재고</p>
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
                      <p className="text-sm font-medium text-green-700">사용 중</p>
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
                      <p className="text-sm font-medium text-purple-700">총 사용횟수</p>
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
                  <h3 className="font-medium text-gray-900 mb-4">🚚 공급업체별 정보</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">공급업체</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">단가 (VND)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {endmillData.suppliers.map((supplier: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{supplier.name || supplier.code}</div>
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
                  <h3 className="font-medium text-gray-900 mb-3">🔮 예측 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {endmillData.predictedNextChange && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">다음 교체 예상일</label>
                        <p className="text-lg font-medium text-blue-600">{endmillData.predictedNextChange}</p>
                      </div>
                    )}
                    {endmillData.recommendedStock && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">권장 재고량</label>
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">🚚 공급업체 정보</h2>
                <EndmillSupplierPrices
                  endmillId={endmillData.id}
                  endmillCode={endmillData.code}
                />
            </div>
          )}

          {/* 등록된 CAM Sheet 사양 컨테이너 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 등록된 CAM Sheet 사양</h2>
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
                          <span className="text-gray-600">T번호: </span>
                          <span className="font-medium text-blue-600">T{cam.tNumber?.toString().padStart(2, '0') || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">수명: </span>
                          <span className="font-medium text-gray-900">{cam.toolLife?.toLocaleString() || 'N/A'}회</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">등록된 CAM Sheet 사양이 없습니다</p>
                  </div>
                )}
              </div>
          </div>

          {/* 실시간 사용 현황 테이블 컨테이너 - 전체 너비 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏭 실시간 사용 현황</h2>
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
                            생산모델
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
                            공정
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
                            CAM Tool Life
                            <span className="ml-1">
                              {sortField === 'specToolLife' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </span>
                          </div>
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">실제 평균수명</th>
                        <th
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('equipmentNumber')}
                        >
                          <div className="flex items-center">
                            사용중 설비
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
                                <span className="text-gray-400">데이터 없음</span>
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
                          이전
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          다음
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            총 <span className="font-medium">{sortedCurrentUsage.length}</span>개 중{' '}
                            <span className="font-medium">{startIndex + 1}</span>
                            {' '}~{' '}
                            <span className="font-medium">{Math.min(endIndex, sortedCurrentUsage.length)}</span>
                            {' '}표시
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
                    <p className="text-sm">현재 사용 중인 설비가 없습니다</p>
                  </div>
                )}
              </div>
          </div>

          {/* 최근 교체 이력 컨테이너 - 전체 너비 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 최근 교체 이력</h2>
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
                      교체자: {change.changedBy} | 수명: {change.previousLife?.toLocaleString()}회
                    </div>
                  </div>
                ))}

                {endmillData.recentChanges && endmillData.recentChanges.length > 8 && (
                  <div className="text-center pt-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      전체 이력 보기
                    </button>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* 수정 모달 */}
      {showEditModal && endmillData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">앤드밀 정보 수정 - {endmillData.code}</h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* 기본 정보 섹션 - 수정불가 필드 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">기본 정보</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 코드</label>
                      <input
                        type="text"
                        value={endmillData.code}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                      <input
                        type="text"
                        value={endmillData.categoryName || endmillData.category}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 이름</label>
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
                  <h4 className="text-md font-semibold text-gray-900 mb-4">재고 관리</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">최소 재고</label>
                      <input
                        type="number"
                        defaultValue={endmillData.inventory?.min_stock || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">최대 재고</label>
                      <input
                        type="number"
                        defaultValue={endmillData.inventory?.max_stock || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">권장 재고</label>
                      <input
                        type="number"
                        defaultValue={endmillData.recommendedStock || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  취소
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
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