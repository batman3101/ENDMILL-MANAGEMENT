'use client'

import { useState, useRef, useEffect } from 'react'

// 설비 상태 타입
type EquipmentStatus = '가동중' | '점검중' | '셋업중'

// 상태 전환 정보 타입
interface StatusTransition {
  status: EquipmentStatus
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}

interface StatusChangeDropdownProps {
  currentStatus: EquipmentStatus
  equipmentId: string
  equipmentNumber: string
  onStatusChange: (equipmentId: string, newStatus: EquipmentStatus) => void
}

export default function StatusChangeDropdown({
  currentStatus,
  equipmentId,
  equipmentNumber,
  onStatusChange
}: StatusChangeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 현재 상태의 스타일을 반환하는 함수 (설비 페이지 배지 색상과 매칭)
  const getCurrentStatusStyle = (status: EquipmentStatus) => {
    switch (status) {
      case '가동중':
        return {
          icon: '🟢',
          color: 'text-green-800',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          hoverColor: 'hover:bg-green-200'
        }
      case '점검중':
        return {
          icon: '🔧',
          color: 'text-red-800',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          hoverColor: 'hover:bg-red-200'
        }
      case '셋업중':
        return {
          icon: '⚙️',
          color: 'text-purple-800',
          bgColor: 'bg-purple-100',
          borderColor: 'border-purple-200',
          hoverColor: 'hover:bg-purple-200'
        }
    }
  }

  // 상태별 전환 가능한 옵션들을 반환하는 함수
  const getAvailableTransitions = (current: EquipmentStatus): StatusTransition[] => {
    const allTransitions: Record<EquipmentStatus, StatusTransition[]> = {
      '가동중': [
        {
          status: '점검중',
          label: '점검 시작',
          icon: '🔧',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          description: '가동을 중단하고 점검 모드로 전환'
        },
        {
          status: '셋업중',
          label: '셋업 시작',
          icon: '⚙️',
          color: 'text-purple-700',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          description: '가동을 중단하고 셋업 모드로 전환'
        }
      ],
      '점검중': [
        {
          status: '가동중',
          label: '가동 재시작',
          icon: '▶️',
          color: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          description: '점검 완료 후 정상 가동으로 복귀'
        },
        {
          status: '셋업중',
          label: '셋업 전환',
          icon: '⚙️',
          color: 'text-purple-700',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          description: '점검에서 셋업 모드로 전환'
        }
      ],
      '셋업중': [
        {
          status: '가동중',
          label: '가동 시작',
          icon: '▶️',
          color: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          description: '셋업 완료 후 정상 가동 시작'
        },
        {
          status: '점검중',
          label: '점검 전환',
          icon: '🔧',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          description: '셋업에서 점검 모드로 전환'
        }
      ]
    }
    
    return allTransitions[current] || []
  }

  // 상태 변경 처리
  const handleStatusChange = (newStatus: EquipmentStatus) => {
    onStatusChange(equipmentId, newStatus)
    setIsOpen(false)
  }

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const currentStyle = getCurrentStatusStyle(currentStatus)
  const availableTransitions = getAvailableTransitions(currentStatus)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 현재 상태 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
          border-2 transition-all duration-200 min-w-[120px] justify-center
          ${currentStyle.bgColor} ${currentStyle.borderColor} ${currentStyle.color} ${currentStyle.hoverColor}
          hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        `}
        type="button"
      >
        <span className="text-base">{currentStyle.icon}</span>
        <span className="flex-1">{currentStatus}</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-base">🏭</span>
              <span className="font-medium">{equipmentNumber}</span>
              <span>상태 변경</span>
            </div>
          </div>
          
          <div className="p-2">
            {availableTransitions.length > 0 ? (
              <div className="space-y-1">
                {availableTransitions.map((transition) => (
                  <button
                    key={transition.status}
                    onClick={() => handleStatusChange(transition.status)}
                    className={`
                      w-full flex items-start gap-3 p-3 text-left rounded-lg border-2
                      transition-all duration-200 group
                      ${transition.bgColor} ${transition.borderColor} ${transition.color}
                      hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]
                    `}
                  >
                    <div className="flex-shrink-0">
                      <span className="text-lg">{transition.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{transition.label}</span>
                        <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded-full">
                          → {transition.status}
                        </span>
                      </div>
                      <p className="text-xs opacity-80 line-clamp-2">
                        {transition.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                현재 상태에서 전환 가능한 옵션이 없습니다.
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>💡</span>
              <span>상태 변경 시 승인 절차가 진행됩니다</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 