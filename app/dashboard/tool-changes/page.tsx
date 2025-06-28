'use client'

import { useState } from 'react'
import { useToast } from '../../../components/shared/Toast'

// 교체 실적 데이터 타입
interface ToolChange {
  id: string
  changeDate: string
  equipmentNumber: string
  productionModel: string
  process: string
  tNumber: number
  endmillCode: string
  endmillName: string
  changedBy: string
  changeReason: string
  toolLife?: number
  createdAt: string
}

// 샘플 데이터
const sampleData: ToolChange[] = [
  {
    id: '1',
    changeDate: '2024-01-26 14:30',
    equipmentNumber: 'C001',
    productionModel: 'PA-001',
    process: 'CNC2',
    tNumber: 15,
    endmillCode: 'AT001',
    endmillName: 'FLAT 12mm 4날',
    changedBy: '김작업자',
    changeReason: 'Tool Life 종료',
    toolLife: 2350,
    createdAt: '2024-01-26T14:30:00'
  },
  {
    id: '2',
    changeDate: '2024-01-26 16:15',
    equipmentNumber: 'C042',
    productionModel: 'PB-025',
    process: 'CNC2-1',
    tNumber: 3,
    endmillCode: 'AT002',
    endmillName: 'BALL 6mm 2날',
    changedBy: '박기사',
    changeReason: '파손',
    toolLife: 1850,
    createdAt: '2024-01-26T16:15:00'
  }
]

export default function ToolChangesPage() {
  const { showSuccess, showError } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [toolChanges, setToolChanges] = useState<ToolChange[]>(sampleData)
  const getCurrentDateTime = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  }

  const getTodayDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    changeDate: getCurrentDateTime(),
    equipmentNumber: '',
    productionModel: '',
    process: '',
    tNumber: 1,
    endmillCode: '',
    endmillName: '',
    changedBy: '',
    changeReason: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newToolChange: ToolChange = {
      id: Date.now().toString(),
      ...formData,
      changeDate: getCurrentDateTime(), // 저장 시점의 현재 시간으로 업데이트
      toolLife: Math.floor(Math.random() * 1000) + 1500, // 임시 Tool Life
      createdAt: new Date().toISOString()
    }
    
    setToolChanges([newToolChange, ...toolChanges])
    setShowAddForm(false)
    
    showSuccess(
      '교체 실적 등록 완료',
      `${formData.equipmentNumber} T${formData.tNumber.toString().padStart(2, '0')} 교체 실적이 등록되었습니다.`
    )
    
    // 폼 초기화
    setFormData({
      changeDate: getCurrentDateTime(),
      equipmentNumber: '',
      productionModel: '',
      process: '',
      tNumber: 1,
      endmillCode: '',
      endmillName: '',
      changedBy: '',
      changeReason: ''
    })
  }

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'Tool Life 종료':
        return 'bg-blue-100 text-blue-800'
      case '파손':
        return 'bg-red-100 text-red-800'
      case '마모':
        return 'bg-yellow-100 text-yellow-800'
      case '예방교체':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getToolLifeStatus = (toolLife: number) => {
    if (toolLife < 1000) return { color: 'text-red-600', status: '짧음' }
    if (toolLife < 2000) return { color: 'text-yellow-600', status: '보통' }
    return { color: 'text-green-600', status: '양호' }
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🔄
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">오늘 교체</p>
              <p className="text-2xl font-bold text-gray-900">{toolChanges.filter(tc => tc.changeDate.startsWith(getTodayDate())).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              ⏱️
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">평균 Tool Life</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(toolChanges.reduce((acc, tc) => acc + (tc.toolLife || 0), 0) / toolChanges.length)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              ⚠️
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">파손 교체</p>
              <p className="text-2xl font-bold text-red-600">
                {toolChanges.filter(tc => tc.changeReason === '파손').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              📊
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">총 교체</p>
              <p className="text-2xl font-bold text-purple-600">{toolChanges.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 교체 실적 입력 폼 */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">새 교체 실적 입력</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">교체일자</label>
                <input
                  type="text"
                  value={formData.changeDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">자동으로 현재 날짜/시간이 입력됩니다</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">설비번호</label>
                <input
                  type="text"
                  placeholder="C001"
                  value={formData.equipmentNumber}
                  onChange={(e) => setFormData({...formData, equipmentNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  pattern="C[0-9]{3}"
                  title="C001-C800 형식으로 입력해주세요"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">생산 모델</label>
                <input
                  type="text"
                  placeholder="PA-001"
                  value={formData.productionModel}
                  onChange={(e) => setFormData({...formData, productionModel: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">공정</label>
                <select
                  value={formData.process}
                  onChange={(e) => setFormData({...formData, process: e.target.value})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">공정 선택</option>
                  <option value="CNC1">CNC1</option>
                  <option value="CNC2">CNC2</option>
                  <option value="CNC2-1">CNC2-1</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">T번호</label>
                <select
                  value={formData.tNumber}
                  onChange={(e) => setFormData({...formData, tNumber: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {Array.from({length: 21}, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>T{num.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 코드</label>
                <input
                  type="text"
                  placeholder="AT001"
                  value={formData.endmillCode}
                  onChange={(e) => setFormData({...formData, endmillCode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 이름</label>
                <input
                  type="text"
                  placeholder="FLAT 12mm 4날"
                  value={formData.endmillName}
                  onChange={(e) => setFormData({...formData, endmillName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">교체자</label>
                <input
                  type="text"
                  placeholder="김작업자"
                  value={formData.changedBy}
                  onChange={(e) => setFormData({...formData, changedBy: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">교체사유</label>
                <select
                  value={formData.changeReason}
                  onChange={(e) => setFormData({...formData, changeReason: e.target.value})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">사유 선택</option>
                  <option value="Tool Life 종료">Tool Life 종료</option>
                  <option value="파손">파손</option>
                  <option value="마모">마모</option>
                  <option value="예방교체">예방교체</option>
                  <option value="제품변경">제품변경</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 버튼 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1">
            <input
              type="text"
              placeholder="설비번호, 앤드밀 코드, 교체자 검색..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">모든 공정</option>
              <option value="CNC1">CNC1</option>
              <option value="CNC2">CNC2</option>
              <option value="CNC2-1">CNC2-1</option>
            </select>
            <select className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">모든 사유</option>
              <option value="Tool Life 종료">Tool Life 종료</option>
              <option value="파손">파손</option>
              <option value="마모">마모</option>
              <option value="예방교체">예방교체</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + 교체 기록 추가
          </button>
        </div>
      </div>

      {/* 교체 실적 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">교체 실적 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  교체일시
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설비번호
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생산모델
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  공정
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  T번호
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  앤드밀 코드
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  앤드밀 이름
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  교체자
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  교체사유
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tool Life
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {toolChanges.map((change) => {
                const toolLifeStatus = getToolLifeStatus(change.toolLife || 0)
                return (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{change.changeDate}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{change.equipmentNumber}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{change.productionModel}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{change.process}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">T{change.tNumber.toString().padStart(2, '0')}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{change.endmillCode}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{change.endmillName}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{change.changedBy}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReasonBadge(change.changeReason)}`}>
                        {change.changeReason}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${toolLifeStatus.color}`}>
                        {change.toolLife?.toLocaleString()}회
                      </div>
                      <div className="text-xs text-gray-500">{toolLifeStatus.status}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 hover:text-blue-800 mr-3">상세</button>
                      <button className="text-gray-600 hover:text-gray-800">수정</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 