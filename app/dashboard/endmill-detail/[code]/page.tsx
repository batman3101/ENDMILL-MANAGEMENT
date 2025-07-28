'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { EndmillDetailInfo } from '../../../../lib/types/endmill'
import { useInventorySearch } from '../../../../lib/hooks/useInventory'
import { useToast } from '../../../../components/shared/Toast'
import EndmillMasterUploader from '../../../../components/features/EndmillMasterUploader'

export default function EndmillDetailPage() {
  const params = useParams()
  const router = useRouter()
  const endmillCode = params.code as string
  const { showSuccess, showError, showWarning } = useToast()
  const { searchByCode } = useInventorySearch()
  
  const [endmillData, setEndmillData] = useState<EndmillDetailInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExcelUploader, setShowExcelUploader] = useState(false)

  useEffect(() => {
    // 실제 데이터 로딩
    const timer = setTimeout(() => {
      const foundEndmills = searchByCode(endmillCode)
      const foundEndmill = foundEndmills[0] // 첫 번째 매치된 아이템 사용
      
      if (foundEndmill) {
        // specifications JSONB에서 상세 정보 추출
        const specs = foundEndmill.endmill_types?.specifications || {}
        
        // 실제 데이터베이스 구조에 맞는 형태로 변환
        const data: EndmillDetailInfo = {
          code: foundEndmill.endmill_types?.code || endmillCode,
          name: foundEndmill.endmill_types?.description_ko || foundEndmill.endmill_types?.description_vi || '',
          category: foundEndmill.endmill_types?.endmill_categories?.code || '',
          specifications: foundEndmill.endmill_types?.specifications ? JSON.stringify(foundEndmill.endmill_types.specifications) : '',
          diameter: specs.diameter || 0,
          flutes: specs.flutes || 0,
          coating: specs.coating || '',
          material: specs.material || '',
          tolerance: specs.tolerance || '',
          helix: specs.helix_angle || specs.helix || '',
          qualityGrade: 'A', // 기본값
          currentStock: foundEndmill.current_stock || 0,
          minStock: foundEndmill.min_stock || 0,
          maxStock: foundEndmill.max_stock || 0,
          unitPrice: foundEndmill.endmill_types?.unit_cost || 0,
          standardLife: foundEndmill.endmill_types?.standard_life || 0,
          stockStatus: (foundEndmill.current_stock || 0) <= (foundEndmill.min_stock || 0) ? 'critical' : 
                      (foundEndmill.current_stock || 0) <= (foundEndmill.min_stock || 0) * 1.5 ? 'low' : 'sufficient',
          supplier: '기본 공급업체', // 기본값
          // 가짜 데이터 (실제로는 별도 테이블에서 가져와야 함)
          totalUsageCount: 1250,
          averageLifespan: foundEndmill.endmill_types?.standard_life || 2000,
          lastUsedDate: new Date().toISOString(),
          replacementFrequency: 4.2,
          defectRate: 1.8,
          performanceRating: 85,
          costEfficiency: 78,
          suppliers: [
            {
              supplierName: '베트남 공급업체 A',
              unitPrice: foundEndmill.endmill_types?.unit_cost || 125000,
              currentStock: foundEndmill.current_stock || 0,
              minOrderQuantity: 50,
              leadTime: 14,
              stockStatus: (foundEndmill.current_stock || 0) <= (foundEndmill.min_stock || 0) ? 'critical' : 'sufficient',
              lastOrderDate: '2024-11-15',
              averageDeliveryTime: 12,
              qualityRating: 4.2,
              isPreferred: true
            }
          ],
          equipmentUsage: [
            {
              equipmentNumber: 'C001',
              process: 'CNC1',
              tNumber: 1,
              installDate: '2024-12-01',
              currentLife: 850,
              totalLife: 2000,
              usageStatus: 'active',
              lastMaintenanceDate: '2024-11-20'
            }
          ],
          recentChanges: [
            {
              id: '1',
              changeDate: '2024-12-15',
              equipmentNumber: 'C001',
              tNumber: 1,
              changeReason: '정기 교체',
              previousLife: 1950,
              changedBy: 'system'
            }
          ],
          predictedNextChange: '2024-12-25',
          recommendedStock: Math.ceil((foundEndmill.min_stock || 0) * 1.5),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          tags: ['고성능', 'CNC 전용', '표준']
        }
        setEndmillData(data)
      } else {
        setEndmillData(null)
      }
      setLoading(false)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [endmillCode, searchByCode])

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
    const foundEndmills = searchByCode(endmillCode)
    if (foundEndmills.length > 0) {
      // 데이터 새로고침 로직 (실제로는 React Query의 invalidate 사용)
      window.location.reload()
    }
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
          <p className="text-gray-600">코드 '{endmillCode}'에 해당하는 앤드밀이 없습니다.</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 좌측 - 주요 정보 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 기본 정보 섹션 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">📋 기본 정보</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 기본 식별 정보 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2">식별 정보</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">앤드밀 코드</label>
                      <p className="text-lg font-mono font-bold text-blue-600">{endmillData.code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Type</label>
                      <p className="text-gray-900">{endmillData.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">카테고리</label>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {endmillData.category}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">앤드밀 이름</label>
                      <p className="text-gray-900">{endmillData.specifications}</p>
                    </div>
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
                  </div>
                </div>

                {/* 기술 사양 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2">기술 사양</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">직경</label>
                      <p className="text-gray-900">{endmillData.diameter}mm</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">날 수</label>
                      <p className="text-gray-900">{endmillData.flutes}날</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">코팅</label>
                      <p className="text-gray-900">{endmillData.coating}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">소재</label>
                      <p className="text-gray-900">{endmillData.material}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">공차</label>
                      <p className="text-gray-900">{endmillData.tolerance}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">나선각</label>
                      <p className="text-gray-900">{endmillData.helix}</p>
                    </div>
                  </div>
                </div>

                {/* 성능 지표 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 border-b pb-2">성능 지표</h3>
                  <div className="space-y-3">
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
                    <div>
                      <label className="text-sm font-medium text-gray-700">교체 빈도</label>
                      <p className="text-gray-900">{endmillData.replacementFrequency}회/월</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">평균 수명</label>
                      <p className="text-gray-900">{endmillData.averageLifespan.toLocaleString()}회</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">표준 수명</label>
                      <p className="text-gray-900">{endmillData.standardLife.toLocaleString()}회</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 태그 */}
              <div className="mt-6 pt-6 border-t">
                <label className="text-sm font-medium text-gray-700 mb-2 block">태그</label>
                <div className="flex flex-wrap gap-2">
                  {endmillData.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 성능 분석 섹션 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">📊 성능 분석</h2>
              
              {/* 재고 현황 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">현재 재고</p>
                      <p className="text-2xl font-bold text-blue-900">{endmillData.currentStock}</p>
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
                      <p className="text-2xl font-bold text-yellow-900">{endmillData.minStock}</p>
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
                      <p className="text-2xl font-bold text-green-900">{endmillData.equipmentUsage.length}</p>
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
                      <p className="text-2xl font-bold text-purple-900">{endmillData.totalUsageCount}</p>
                    </div>
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      📈
                    </div>
                  </div>
                </div>
              </div>

              {/* 공급업체별 정보 */}
              <div className="mb-8">
                <h3 className="font-medium text-gray-900 mb-4">🚚 공급업체별 정보</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">공급업체</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">단가 (VND)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">재고</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">최소주문량</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">리드타임</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">품질평가</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">선호도</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {endmillData.suppliers.map((supplier, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{supplier.supplierName}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{supplier.unitPrice.toLocaleString()}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{supplier.currentStock}개</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{supplier.minOrderQuantity}개</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{supplier.leadTime}일</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex space-x-1">
                                {Array.from({length: 5}, (_, i) => (
                                  <span 
                                    key={i} 
                                    className={i < Math.floor(supplier.qualityRating) ? 'text-yellow-400' : 'text-gray-300'}
                                  >
                                    ⭐
                                  </span>
                                ))}
                              </div>
                              <span className="ml-2 text-sm text-gray-600">
                                {supplier.qualityRating.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {supplier.isPreferred ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                선호
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                일반
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 예측 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">🔮 예측 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">다음 교체 예상일</label>
                    <p className="text-lg font-medium text-blue-600">{endmillData.predictedNextChange}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">권장 재고량</label>
                    <p className="text-lg font-medium text-green-600">{endmillData.recommendedStock}개</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측 - 사이드바 */}
          <div className="space-y-8">
            {/* 현재 사용 현황 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏭 현재 사용 현황</h2>
              <div className="space-y-4">
                {endmillData.equipmentUsage.slice(0, 5).map((usage, index) => {
                  const lifePercentage = Math.round((usage.currentLife / usage.totalLife) * 100)
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'critical': return 'bg-red-100 text-red-800'
                      case 'warning': return 'bg-yellow-100 text-yellow-800'
                      case 'new': return 'bg-blue-100 text-blue-800'
                      default: return 'bg-green-100 text-green-800'
                    }
                  }
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{usage.equipmentNumber}</span>
                          <span className="text-sm text-gray-600">T{usage.tNumber.toString().padStart(2, '0')}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(usage.usageStatus)}`}>
                          {usage.usageStatus === 'critical' ? '위험' :
                           usage.usageStatus === 'warning' ? '경고' :
                           usage.usageStatus === 'new' ? '신규' : '정상'}
                        </span>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Tool Life</span>
                          <span>{lifePercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              usage.usageStatus === 'critical' ? 'bg-red-600' :
                              usage.usageStatus === 'warning' ? 'bg-yellow-600' :
                              usage.usageStatus === 'new' ? 'bg-blue-600' : 'bg-green-600'
                            }`}
                            style={{width: `${Math.min(lifePercentage, 100)}%`}}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>공정: {usage.process}</div>
                        <div>설치일: {usage.installDate}        </div>
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
                {/* 기본 정보 섹션 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">기본 정보</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 코드</label>
                      <input
                        type="text"
                        value={endmillData.code}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                      <select
                        defaultValue={endmillData.category}
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="FLAT">FLAT</option>
                        <option value="BALL">BALL</option>
                        <option value="T-CUT">T-CUT</option>
                        <option value="C-CUT">C-CUT</option>
                        <option value="REAMER">REAMER</option>
                        <option value="DRILL">DRILL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <input
                        type="text"
                        defaultValue={endmillData.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">직경 (mm)</label>
                      <input
                        type="number"
                        defaultValue={endmillData.diameter}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">날 수</label>
                      <input
                        type="number"
                        defaultValue={endmillData.flutes}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">코팅</label>
                      <input
                        type="text"
                        defaultValue={endmillData.coating}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 재고 관리 섹션 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">재고 관리</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">최소 재고</label>
                      <input
                        type="number"
                        defaultValue={endmillData.minStock}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">최대 재고</label>
                      <input
                        type="number"
                        defaultValue={endmillData.maxStock}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">권장 재고</label>
                      <input
                        type="number"
                        defaultValue={endmillData.recommendedStock}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 사양 정보 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">상세 사양</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 이름</label>
                      <input
                        type="text"
                        defaultValue={endmillData.specifications}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">소재</label>
                        <input
                          type="text"
                          defaultValue={endmillData.material}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">공차</label>
                        <input
                          type="text"
                          defaultValue={endmillData.tolerance}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
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
})}
                
                {endmillData.equipmentUsage.length > 5 && (
                  <div className="text-center">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      +{endmillData.equipmentUsage.length - 5}개 더 보기
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* 최근 교체 이력 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 최근 교체 이력</h2>
              <div className="space-y-3">
                {endmillData.recentChanges.slice(0, 8).map((change, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{change.equipmentNumber}</span>
                      <span className="text-xs text-gray-500">{change.changeDate}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      T{change.tNumber.toString().padStart(2, '0')} - {change.changeReason}
                    </div>
                    <div className="text-xs text-gray-500">
                      교체자: {change.changedBy} | 수명: {change.previousLife.toLocaleString()}회
                    </div>
                  </div>
                ))}
                
                {endmillData.recentChanges.length > 8 && (
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
      </div>
    </div>
  )
}