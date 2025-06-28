'use client'

import { useState, useMemo } from 'react'

// 앤드밀 인스턴스 타입 정의
interface EndmillInstance {
  id: string
  code: string
  name: string
  category: string
  equipment: string
  location: string
  process: string
  position: string
  currentLife: number
  totalLife: number
  status: 'new' | 'active' | 'warning' | 'critical'
  installDate: string
  lastMaintenance: string
}

// 앤드밀 데이터 생성 함수
const generateEndmillData = (): EndmillInstance[] => {
  const categories = ['FLAT', 'BALL', 'T-CUT', 'C-CUT', 'REAMER', 'DRILL']
  const processes = ['CNC1', 'CNC2', 'CNC2-1']
  const items: EndmillInstance[] = []
  
  // 800대 설비 * 평균 15개 위치 = 약 12,000개 앤드밀
  for (let i = 1; i <= 12000; i++) {
    const equipmentNum = Math.floor((i - 1) / 15) + 1
    const equipment = `C${equipmentNum.toString().padStart(3, '0')}`
    const position = `T${(((i - 1) % 15) + 1).toString().padStart(2, '0')}`
    const category = categories[Math.floor(Math.random() * categories.length)]
    const process = processes[Math.floor(Math.random() * processes.length)]
    
    const totalLife = 1500 + Math.floor(Math.random() * 1500) // 1500-3000
    const currentLife = Math.floor(Math.random() * totalLife)
    
    // 상태 결정
    let status: 'new' | 'active' | 'warning' | 'critical'
    const lifePercentage = (currentLife / totalLife) * 100
    if (lifePercentage < 10) status = 'critical'
    else if (lifePercentage < 30) status = 'warning'
    else if (currentLife === 0) status = 'new'
    else status = 'active'
    
    // 설치일과 마지막 정비일
    const installDate = new Date()
    installDate.setDate(installDate.getDate() - Math.floor(Math.random() * 180))
    
    const lastMaintenance = new Date()
    lastMaintenance.setDate(lastMaintenance.getDate() - Math.floor(Math.random() * 30))
    
    items.push({
      id: i.toString(),
      code: `AT${(Math.floor(Math.random() * 100) + 1).toString().padStart(3, '0')}`,
      name: `${category} ${6 + Math.floor(Math.random() * 15)}mm ${2 + Math.floor(Math.random() * 4)}날`,
      category,
      equipment,
      location: equipmentNum <= 400 ? 'A동' : 'B동',
      process,
      position,
      currentLife,
      totalLife,
      status,
      installDate: installDate.toISOString().split('T')[0],
      lastMaintenance: lastMaintenance.toISOString().split('T')[0]
    })
  }
  
  return items.sort((a, b) => a.equipment.localeCompare(b.equipment) || a.position.localeCompare(b.position))
}

const endmillData = generateEndmillData()

export default function EndmillPage() {
  const [endmills, setEndmills] = useState<EndmillInstance[]>(endmillData)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // 필터링된 앤드밀 목록
  const filteredEndmills = useMemo(() => {
    return endmills.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === '' || item.status === statusFilter
      const matchesType = typeFilter === '' || item.category.toLowerCase() === typeFilter.toLowerCase()
      
      return matchesSearch && matchesStatus && matchesType
    })
  }, [endmills, searchTerm, statusFilter, typeFilter])

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredEndmills.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentEndmills = filteredEndmills.slice(startIndex, endIndex)

  // 필터 상태 변경 시 첫 페이지로 이동
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter])

  // 상태별 통계
  const statusStats = useMemo(() => {
    return {
      total: endmills.length,
      active: endmills.filter(item => item.status === 'active').length,
      warning: endmills.filter(item => item.status === 'warning').length,
      critical: endmills.filter(item => item.status === 'critical').length,
      todayReplaced: Math.floor(Math.random() * 50) + 10 // 임시로 랜덤 값
    }
  }, [endmills])

  // 상태 배지 색상
  const getStatusBadge = (status: EndmillInstance['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: EndmillInstance['status']) => {
    switch (status) {
      case 'new':
        return '신규'
      case 'active':
        return '정상'
      case 'warning':
        return '교체 권장'
      case 'critical':
        return '즉시 교체'
      default:
        return '알 수 없음'
    }
  }

  const getStatusIcon = (status: EndmillInstance['status']) => {
    switch (status) {
      case 'new':
        return '🆕'
      case 'active':
        return '🔧'
      case 'warning':
        return '⚠️'
      case 'critical':
        return '🚨'
      default:
        return '❓'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600">앤드밀별 Tool Life 추적 및 교체 알림 관리</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">총 앤드밀</p>
              <p className="text-2xl font-bold text-gray-900">{statusStats.total.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              🔧
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">사용 중</p>
              <p className="text-2xl font-bold text-green-600">{statusStats.active.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              ✅
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">교체 필요</p>
              <p className="text-2xl font-bold text-yellow-600">
                {(statusStats.warning + statusStats.critical).toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              ⚠️
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">오늘 교체</p>
              <p className="text-2xl font-bold text-blue-600">{statusStats.todayReplaced}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              🔄
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="앤드밀 코드, 설비, 위치 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 상태</option>
            <option value="new">신규</option>
            <option value="active">사용중</option>
            <option value="warning">경고</option>
            <option value="critical">위험</option>
          </select>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 타입</option>
            <option value="FLAT">FLAT</option>
            <option value="BALL">BALL</option>
            <option value="T-CUT">T-CUT</option>
            <option value="C-CUT">C-CUT</option>
            <option value="REAMER">REAMER</option>
            <option value="DRILL">DRILL</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 신규 등록
          </button>
        </div>
        
        {/* 필터 초기화 버튼 */}
        {(searchTerm || statusFilter || typeFilter) && (
          <div className="mt-4">
            <button 
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setTypeFilter('')
                setCurrentPage(1)
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>

      {/* 앤드밀 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            앤드밀 현황 ({filteredEndmills.length}개)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            페이지 {currentPage} / {totalPages} (1페이지당 {itemsPerPage}개)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  앤드밀 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  위치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tool Life
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentEndmills.map((item) => {
                const lifePercentage = Math.round((item.currentLife / item.totalLife) * 100)
                const progressColor = item.status === 'critical' ? 'bg-red-600' : 
                                    item.status === 'warning' ? 'bg-yellow-600' : 
                                    item.status === 'new' ? 'bg-blue-600' : 'bg-green-600'
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                          item.status === 'critical' ? 'bg-red-100' :
                          item.status === 'warning' ? 'bg-yellow-100' :
                          item.status === 'new' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {getStatusIcon(item.status)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.code}</div>
                          <div className="text-sm text-gray-500">{item.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.equipment}</div>
                      <div className="text-sm text-gray-500">{item.process} {item.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${progressColor}`} 
                            style={{width: `${Math.min(lifePercentage, 100)}%`}}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{lifePercentage}%</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.currentLife.toLocaleString()} / {item.totalLife.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 hover:text-blue-800 mr-3">상세</button>
                      {item.status === 'critical' ? (
                        <button className="text-red-600 hover:text-red-800">즉시 교체</button>
                      ) : item.status === 'warning' ? (
                        <button className="text-yellow-600 hover:text-yellow-800">교체 예약</button>
                      ) : (
                        <button className="text-green-600 hover:text-green-800">정비</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
                      </table>
          </div>
          
          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="bg-white px-6 py-3 flex items-center justify-between border-t">
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
                    총 <span className="font-medium">{filteredEndmills.length}</span>개 중{' '}
                    <span className="font-medium">{startIndex + 1}</span>-
                    <span className="font-medium">{Math.min(endIndex, filteredEndmills.length)}</span>개 표시
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
        </div>

        {/* 검색 결과가 없을 때 */}
        {filteredEndmills.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">검색 조건에 맞는 앤드밀이 없습니다.</p>
            <button 
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setTypeFilter('')
                setCurrentPage(1)
              }}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>
    )
  } 