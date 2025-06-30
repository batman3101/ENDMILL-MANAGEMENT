'use client'

import { useState, useEffect } from 'react'
import { useToast } from '../../../components/shared/Toast'
import { useCAMSheets, useToolChangeAutoComplete } from '../../../lib/hooks/useCAMSheets'

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
  },
  {
    id: '3',
    changeDate: '2024-01-26 18:45',
    equipmentNumber: 'C156',
    productionModel: 'PA-002',
    process: 'CNC1',
    tNumber: 8,
    endmillCode: 'AT003',
    endmillName: 'T-CUT 8mm 3날',
    changedBy: '이작업자',
    changeReason: 'Tool Life 종료',
    toolLife: 2720,
    createdAt: '2024-01-26T18:45:00'
  }
]

export default function ToolChangesPage() {
  const { showSuccess, showError, showWarning } = useToast()
  const { getAvailableModels, getAvailableProcesses } = useCAMSheets()
  const { autoFillEndmillInfo } = useToolChangeAutoComplete()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ToolChange | null>(null)
  const [toolChanges, setToolChanges] = useState<ToolChange[]>(sampleData)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [availableProcesses, setAvailableProcesses] = useState<string[]>([])
  const [isManualEndmillInput, setIsManualEndmillInput] = useState(false)
  const [isEditManualEndmillInput, setIsEditManualEndmillInput] = useState(false)
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
    actualToolLife: 0,
    changeReason: ''
  })

  // CAM SHEET에서 사용 가능한 모델과 공정 목록 로드
  useEffect(() => {
    setAvailableModels(getAvailableModels())
    setAvailableProcesses(getAvailableProcesses())
  }, [])

  // 생산 모델, 공정, T번호가 변경될 때 앤드밀 정보 자동 입력 (추가 폼)
  useEffect(() => {
    if (formData.productionModel && formData.process && formData.tNumber) {
      const endmillInfo = autoFillEndmillInfo(formData.productionModel, formData.process, formData.tNumber)
      
      if (endmillInfo) {
        setFormData(prev => ({
          ...prev,
          endmillCode: endmillInfo.endmillCode,
          endmillName: endmillInfo.endmillName
        }))
        setIsManualEndmillInput(false)
      } else {
        // CAM SHEET에서 찾을 수 없는 경우 빈 값으로 초기화
        if (!isManualEndmillInput) {
          setFormData(prev => ({
            ...prev,
            endmillCode: '',
            endmillName: ''
          }))
        }
      }
    }
  }, [formData.productionModel, formData.process, formData.tNumber, isManualEndmillInput])

  // 생산 모델, 공정, T번호가 변경될 때 앤드밀 정보 자동 입력 (수정 모달)
  useEffect(() => {
    if (editingItem && editingItem.productionModel && editingItem.process && editingItem.tNumber) {
      const endmillInfo = autoFillEndmillInfo(editingItem.productionModel, editingItem.process, editingItem.tNumber)
      
      if (endmillInfo) {
        setEditingItem(prev => prev ? ({
          ...prev,
          endmillCode: endmillInfo.endmillCode,
          endmillName: endmillInfo.endmillName
        }) : null)
        setIsEditManualEndmillInput(false)
      } else {
        // CAM SHEET에서 찾을 수 없는 경우 수동 입력 모드가 아니면 빈 값으로 초기화
        if (!isEditManualEndmillInput && editingItem) {
          setEditingItem(prev => prev ? ({
            ...prev,
            endmillCode: '',
            endmillName: ''
          }) : null)
        }
      }
    }
  }, [editingItem?.productionModel, editingItem?.process, editingItem?.tNumber, isEditManualEndmillInput])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newToolChange: ToolChange = {
      id: Date.now().toString(),
      changeDate: getCurrentDateTime(), // 저장 시점의 현재 시간으로 업데이트
      equipmentNumber: formData.equipmentNumber,
      productionModel: formData.productionModel,
      process: formData.process,
      tNumber: formData.tNumber,
      endmillCode: formData.endmillCode,
      endmillName: formData.endmillName,
      changedBy: '작업자', // 기본값으로 설정
      changeReason: formData.changeReason,
      toolLife: formData.actualToolLife, // 실제 Tool life 값 사용
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
      actualToolLife: 0,
      changeReason: ''
    })
    setIsManualEndmillInput(false)
  }

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'Tool Life 종료':
        return 'bg-blue-100 text-blue-800'
      case '파손':
        return 'bg-red-100 text-red-800'
      case '마모':
        return 'bg-yellow-100 text-yellow-800'
      case '모델 변경':
        return 'bg-purple-100 text-purple-800'
      case '예방':
        return 'bg-green-100 text-green-800'
      case '기타':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getToolLifeStatus = (toolLife: number) => {
    if (toolLife < 1000) return { color: 'text-red-600', status: '짧음' }
    if (toolLife < 2000) return { color: 'text-yellow-600', status: '보통' }
    return { color: 'text-green-600', status: '양호' }
  }

  // 수정 모달 열기
  const handleEdit = (item: ToolChange) => {
    setEditingItem(item)
    setIsEditManualEndmillInput(false) // 수동 입력 모드 초기화
    setShowEditModal(true)
  }

  // 수정 내용 저장
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    const updatedChanges = toolChanges.map(change => 
      change.id === editingItem.id ? editingItem : change
    )
    
    setToolChanges(updatedChanges)
    setShowEditModal(false)
    setEditingItem(null)
    setIsEditManualEndmillInput(false) // 수동 입력 모드 초기화
    
    showSuccess(
      '교체 실적 수정 완료',
      `${editingItem.equipmentNumber} T${editingItem.tNumber.toString().padStart(2, '0')} 교체 실적이 수정되었습니다.`
    )
  }

  // 수정 모달 닫기
  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingItem(null)
    setIsEditManualEndmillInput(false) // 수동 입력 모드 초기화
  }

  // 삭제 처리
  const handleDelete = (item: ToolChange) => {
    showWarning(
      '교체 실적 삭제',
      `${item.equipmentNumber} T${item.tNumber.toString().padStart(2, '0')} 교체 실적을 삭제하시겠습니까?`
    )
    
    // 2초 후 자동 삭제 (실제로는 사용자 확인 모달을 구현하는 것이 좋음)
    setTimeout(() => {
      const updatedChanges = toolChanges.filter(change => change.id !== item.id)
      setToolChanges(updatedChanges)
      showSuccess('삭제 완료', '교체 실적이 성공적으로 삭제되었습니다.')
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🔄
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">오늘 교체</p>
              <p className="text-xl font-bold text-blue-600">{toolChanges.filter(tc => tc.changeDate.startsWith(getTodayDate())).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              ⏱️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Tool Life 종료</p>
              <p className="text-xl font-bold text-green-600">
                {toolChanges.filter(tc => tc.changeReason === 'Tool Life 종료').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              💥
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">파손</p>
              <p className="text-xl font-bold text-red-600">
                {toolChanges.filter(tc => tc.changeReason === '파손').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              ⚠️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">마모</p>
              <p className="text-xl font-bold text-yellow-600">
                {toolChanges.filter(tc => tc.changeReason === '마모').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              🔄
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">모델 변경</p>
              <p className="text-xl font-bold text-purple-600">
                {toolChanges.filter(tc => tc.changeReason === '모델 변경').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
              🛡️
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">예방</p>
              <p className="text-xl font-bold text-orange-600">
                {toolChanges.filter(tc => tc.changeReason === '예방').length}
              </p>
            </div>
          </div>
        </div>

        {(() => {
          // 오늘 교체 데이터만 필터링
          const todayChanges = toolChanges.filter(tc => tc.changeDate.startsWith(getTodayDate()))
          
          // 모델별 교체 수량 계산
          const modelCounts = todayChanges.reduce((acc: Record<string, number>, tc) => {
            acc[tc.productionModel] = (acc[tc.productionModel] || 0) + 1
            return acc
          }, {})
          
          // 가장 많은 교체가 발생한 모델 찾기
          const topModel = Object.entries(modelCounts).length > 0 
            ? Object.entries(modelCounts).reduce((a, b) => a[1] > b[1] ? a : b)
            : ['없음', 0]
          
          return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  🏭
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">오늘 최다 교체 모델</p>
                  <p className="text-lg font-bold text-indigo-600">{topModel[0]}</p>
                  <p className="text-xs text-gray-500">{topModel[1]}건</p>
                </div>
              </div>
            </div>
          )
        })()}

        {(() => {
          // 오늘 교체 데이터만 필터링
          const todayChanges = toolChanges.filter(tc => tc.changeDate.startsWith(getTodayDate()))
          
          // 공정별 교체 수량 계산
          const processCounts = todayChanges.reduce((acc: Record<string, number>, tc) => {
            acc[tc.process] = (acc[tc.process] || 0) + 1
            return acc
          }, {})
          
          // 가장 많은 교체가 발생한 공정 찾기
          const topProcess = Object.entries(processCounts).length > 0 
            ? Object.entries(processCounts).reduce((a, b) => a[1] > b[1] ? a : b)
            : ['없음', 0]
          
          return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                  ⚙️
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">오늘 최다 교체 공정</p>
                  <p className="text-lg font-bold text-teal-600">{topProcess[0]}</p>
                  <p className="text-xs text-gray-500">{topProcess[1]}건</p>
                </div>
              </div>
            </div>
          )
        })()}
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
                <select
                  value={formData.productionModel}
                  onChange={(e) => setFormData({...formData, productionModel: e.target.value})}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">모델 선택</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">등록된 CAM SHEET의 모델들</p>
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
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isManualEndmillInput ? "앤드밀 코드 입력" : "모델, 공정, T번호 선택 시 자동 입력"}
                    value={formData.endmillCode}
                    onChange={(e) => isManualEndmillInput && setFormData({...formData, endmillCode: e.target.value})}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                      isManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                    }`}
                    readOnly={!isManualEndmillInput}
                    required
                  />
                  {!formData.endmillCode && formData.productionModel && formData.process && formData.tNumber && (
                    <button
                      type="button"
                      onClick={() => setIsManualEndmillInput(true)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      수동입력
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {isManualEndmillInput ? "수동으로 입력해주세요" : "CAM SHEET에서 자동으로 입력됩니다"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 이름</label>
                <input
                  type="text"
                  placeholder={isManualEndmillInput ? "앤드밀 이름 입력" : "모델, 공정, T번호 선택 시 자동 입력"}
                  value={formData.endmillName}
                  onChange={(e) => isManualEndmillInput && setFormData({...formData, endmillName: e.target.value})}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                    isManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                  }`}
                  readOnly={!isManualEndmillInput}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isManualEndmillInput ? "수동으로 입력해주세요" : "CAM SHEET에서 자동으로 입력됩니다"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">실제 Tool life</label>
                <input
                  type="number"
                  placeholder="2500"
                  value={formData.actualToolLife}
                  onChange={(e) => setFormData({...formData, actualToolLife: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="10000"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">교체된 앤드밀의 실제 사용 횟수</p>
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
                  <option value="모델 변경">모델 변경</option>
                  <option value="예방">예방</option>
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
              placeholder="설비번호, 앤드밀 코드 검색..."
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
              <option value="모델 변경">모델 변경</option>
              <option value="예방">예방</option>
              <option value="기타">기타</option>
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
                      <button 
                        onClick={() => handleEdit(change)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        수정
                      </button>
                      <button 
                        onClick={() => handleDelete(change)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수정 모달 */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">교체 실적 수정</h3>
                <button 
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveEdit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">교체일자</label>
                    <input
                      type="text"
                      value={editingItem.changeDate}
                      onChange={(e) => setEditingItem({...editingItem, changeDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">설비번호</label>
                    <input
                      type="text"
                      value={editingItem.equipmentNumber}
                      onChange={(e) => setEditingItem({...editingItem, equipmentNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      pattern="C[0-9]{3}"
                      title="C001-C800 형식으로 입력해주세요"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">생산 모델</label>
                    <select
                      value={editingItem.productionModel}
                      onChange={(e) => setEditingItem({...editingItem, productionModel: e.target.value})}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">모델 선택</option>
                      {availableModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">등록된 CAM SHEET의 모델들</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">공정</label>
                    <select
                      value={editingItem.process}
                      onChange={(e) => setEditingItem({...editingItem, process: e.target.value})}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="CNC1">CNC1</option>
                      <option value="CNC2">CNC2</option>
                      <option value="CNC2-1">CNC2-1</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">T번호</label>
                    <select
                      value={editingItem.tNumber}
                      onChange={(e) => setEditingItem({...editingItem, tNumber: parseInt(e.target.value)})}
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
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={isEditManualEndmillInput ? "앤드밀 코드 입력" : "모델, 공정, T번호 선택 시 자동 입력"}
                        value={editingItem.endmillCode}
                        onChange={(e) => isEditManualEndmillInput && setEditingItem({...editingItem, endmillCode: e.target.value})}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                          isEditManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                        }`}
                        readOnly={!isEditManualEndmillInput}
                        required
                      />
                      {!editingItem.endmillCode && editingItem.productionModel && editingItem.process && editingItem.tNumber && (
                        <button
                          type="button"
                          onClick={() => setIsEditManualEndmillInput(true)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          수동입력
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {isEditManualEndmillInput ? "수동으로 입력해주세요" : "CAM SHEET에서 자동으로 입력됩니다"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">앤드밀 이름</label>
                    <input
                      type="text"
                      placeholder={isEditManualEndmillInput ? "앤드밀 이름 입력" : "모델, 공정, T번호 선택 시 자동 입력"}
                      value={editingItem.endmillName}
                      onChange={(e) => isEditManualEndmillInput && setEditingItem({...editingItem, endmillName: e.target.value})}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none ${
                        isEditManualEndmillInput ? 'focus:ring-2 focus:ring-blue-500' : 'bg-gray-50'
                      }`}
                      readOnly={!isEditManualEndmillInput}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {isEditManualEndmillInput ? "수동으로 입력해주세요" : "CAM SHEET에서 자동으로 입력됩니다"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">교체자</label>
                    <input
                      type="text"
                      value={editingItem.changedBy}
                      onChange={(e) => setEditingItem({...editingItem, changedBy: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tool Life</label>
                    <input
                      type="number"
                      value={editingItem.toolLife || 0}
                      onChange={(e) => setEditingItem({...editingItem, toolLife: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="10000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">교체사유</label>
                    <select
                      value={editingItem.changeReason}
                      onChange={(e) => setEditingItem({...editingItem, changeReason: e.target.value})}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Tool Life 종료">Tool Life 종료</option>
                      <option value="파손">파손</option>
                      <option value="마모">마모</option>
                      <option value="모델 변경">모델 변경</option>
                      <option value="예방">예방</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                  <button 
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 