'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useToast } from '../../../../components/shared/Toast'
import ConfirmationModal from '../../../../components/shared/ConfirmationModal'
import { useConfirmation, createSaveConfirmation } from '../../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../../lib/hooks/useSettings'
import { useTranslations } from '../../../../lib/hooks/useTranslations'
import { useFactory } from '../../../../lib/hooks/useFactory'
import { supabase } from '../../../../lib/supabase/client'
import { clientLogger } from '../../../../lib/utils/logger'
import { OutboundHistoryCard } from '../../../../components/features/inventory/outbound-history-card'
// outboundExcelExport is dynamically imported when needed

// 앤드밀 데이터 타입 정의
interface EndmillData {
  code: string
  name: string
  specifications: string
  currentStock: number
  unitPrice: number
  category?: string
  standardLife?: number
}

interface OutboundItem {
  id: string
  endmillCode: string
  endmillName: string
  equipmentNumber: string
  tNumber: number
  quantity: number
  unitPrice: number
  totalValue: number
  processedAt: string
  processedBy: string
  purpose: string
}

export default function OutboundPage() {
  const { t } = useTranslations()
  const { showSuccess, showError, showWarning } = useToast()
  const confirmation = useConfirmation()
  const { currentFactory } = useFactory()
  const [scannedCode, setScannedCode] = useState('')
  const [outboundItems, setOutboundItems] = useState<OutboundItem[]>([])
  const [endmillData, setEndmillData] = useState<EndmillData | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [equipmentNumber, setEquipmentNumber] = useState('')
  const [tNumber, setTNumber] = useState(1)
  const [purpose, setPurpose] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [availableEndmills, setAvailableEndmills] = useState<any[]>([])

  // 기간 필터 상태
  const [period, setPeriod] = useState<'today' | 'lastWeek' | 'thisWeek' | 'thisMonth' | 'custom'>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 검색 및 정렬 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'code' | 'quantity'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // 수정 모달 상태
  const [editingItem, setEditingItem] = useState<OutboundItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // USB QR 스캐너를 위한 input ref 및 타이머
  const codeInputRef = useRef<HTMLInputElement>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const tNumberRange = settings.toolChanges.tNumberRange
  const toolChangesReasons = settings.toolChanges.reasons

  // 교체 사유 번역 맵핑
  const reasonTranslations: Record<string, string> = {
    '수명완료': t('toolChanges.lifeCompleted'),
    '파손': t('toolChanges.broken'),
    '마모': t('toolChanges.wear'),
    '예방교체': t('toolChanges.preventive'),
    '예발교체': t('toolChanges.preventive'), // 오타 케이스 대응
    '모델교체': t('toolChanges.modelChange'),
    '모델변경': t('toolChanges.modelChange'),
    '추가SETUP': t('toolChanges.additionalSetup'),
    '공구테스트': t('toolChanges.toolTest'),
    '기타': t('toolChanges.other'),
  }

  // 앤드밀 마스터 데이터 로드
  const loadAvailableEndmills = async () => {
    try {
      const response = await fetch('/api/endmill')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAvailableEndmills(result.data)
        }
      }
    } catch (error) {
      clientLogger.error('앤드밀 데이터 로드 오류:', error)
    }
  }

  // T번호 자동 입력 기능 (기존 아키텍처 사용)
  const autoFillTNumber = async (equipmentNum: string, endmillCode: string) => {
    if (!equipmentNum || !endmillCode) return

    try {
      // 1단계: 설비번호로 model, process 가져오기
      const equipmentResponse = await fetch(`/api/tool-changes/auto-fill?equipmentNumber=${equipmentNum}`)
      if (equipmentResponse.ok) {
        const equipmentResult = await equipmentResponse.json()
        if (equipmentResult.success && equipmentResult.data.equipmentInfo) {
          const { model, process } = equipmentResult.data.equipmentInfo

          // 2단계: model, process로 CAM sheet 조회해서 엔드밀 코드에 해당하는 T번호 찾기
          // CAM sheet의 모든 T번호를 확인해서 해당 엔드밀 코드와 매칭되는 것 찾기
          for (let tIndex = 1; tIndex <= 24; tIndex++) {
            const endmillResponse = await fetch(`/api/tool-changes/auto-fill?model=${model}&process=${process}&tNumber=${tIndex}`)
            if (endmillResponse.ok) {
              const endmillResult = await endmillResponse.json()
              if (endmillResult.success && endmillResult.data.endmillInfo) {
                const { endmillCode: foundEndmillCode } = endmillResult.data.endmillInfo
                if (foundEndmillCode === endmillCode) {
                  setTNumber(tIndex)
                  showSuccess(t('inventory.tNumberAutoInput'), `T${tIndex.toString().padStart(2, '0')}${t('inventory.tNumberAutoInputSuccess')}`)
                  return
                }
              }
            }
          }
          showWarning(t('inventory.tNumberAutoInputFailed'), t('inventory.tNumberNotFound'))
        }
      }
    } catch (error) {
      clientLogger.error('T번호 자동 입력 오류:', error)
    }
  }

  // 설비번호 변경 핸들러
  const handleEquipmentNumberChange = (value: string) => {
    setEquipmentNumber(value)

    // 엔드밀이 이미 검색되어 있다면 T번호 자동 입력 시도
    if (endmillData && value.trim()) {
      autoFillTNumber(value, endmillData.code)
    }
  }

  // 컴포넌트 마운트 시 출고 내역 불러오기
  useEffect(() => {
    loadAvailableEndmills()
    loadOutboundHistory()

    // Realtime 구독 설정
    const channel = supabase
      .channel('outbound-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_transactions',
          filter: 'transaction_type=eq.outbound'
        },
        (payload) => {
          clientLogger.log('실시간 출고 업데이트:', payload)
          loadOutboundHistory()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFactory?.id])

  const loadOutboundHistory = async () => {
    try {
      const factoryId = currentFactory?.id
      let url = `/api/inventory/outbound?period=${period}${factoryId ? `&factoryId=${factoryId}` : ''}`

      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const formattedItems = result.data.map((item: any) => ({
            id: item.id,
            endmillCode: item.inventory?.endmill_type?.code || item.endmill_type?.code || '',
            endmillName: item.inventory?.endmill_type?.name || item.endmill_type?.name || '',
            equipmentNumber: item.equipment_number || item.notes?.split(' ')?.[0] || '',
            tNumber: item.t_number || 0,
            quantity: item.quantity,
            unitPrice: item.unit_price || 0,
            totalValue: item.total_amount || (item.quantity * (item.unit_price || 0)),
            processedAt: new Date(item.created_at).toLocaleString('ko-KR'),
            processedBy: item.processed_by?.name || '관리자',
            purpose: item.purpose || '예방교체'
          }))
          setOutboundItems(formattedItems)
        }
      }
    } catch (error) {
      clientLogger.error('출고 내역 로드 오류:', error)
    }
  }

  // 페이지 로드 시 input에 자동 포커스
  useEffect(() => {
    if (codeInputRef.current && !endmillData) {
      codeInputRef.current.focus()
    }
  }, [endmillData])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [])

  const handleQRScan = async (code: string) => {
    if (!code.trim()) return

    clientLogger.log('QR 코드 검색 시작:', code)
    setErrorMessage('')

    const searchCode = code.trim().toUpperCase()

    // 앤드밀 마스터 데이터에서 검색 (정확히 일치 또는 부분 일치)
    // 1. 정확히 일치하는 코드 찾기
    let foundEndmill = availableEndmills.find(endmill =>
      endmill.code === searchCode
    )

    // 2. 정확히 일치하는 것이 없으면 코드 끝부분이 일치하는 것을 찾음 (예: "002" -> "AT002")
    if (!foundEndmill) {
      foundEndmill = availableEndmills.find(endmill =>
        endmill.code.endsWith(searchCode)
      )
    }

    // 3. 그래도 없으면 코드에 포함된 것을 찾음
    if (!foundEndmill) {
      foundEndmill = availableEndmills.find(endmill =>
        endmill.code.includes(searchCode)
      )
    }

    if (foundEndmill) {
      // 재고 정보를 별도로 가져오기 (기존 아키텍처 사용)
      try {
        const factoryId = currentFactory?.id
        const inventoryResponse = await fetch(`/api/inventory${factoryId ? `?factoryId=${factoryId}` : ''}`)
        let currentStock = 0

        if (inventoryResponse.ok) {
          const inventoryResult = await inventoryResponse.json()
          if (inventoryResult.success && inventoryResult.data) {
            const inventoryItem = inventoryResult.data.find((item: any) =>
              item.endmill_type?.code === foundEndmill.code
            )
            if (inventoryItem) {
              currentStock = inventoryItem.current_stock || 0
            }
          }
        }

        // 공급업체별 가격 중 최저가 계산
        let lowestPrice = foundEndmill.unitCost || 0
        if (foundEndmill.suppliers && foundEndmill.suppliers.length > 0) {
          const prices = foundEndmill.suppliers.map((supplier: any) => supplier.unitPrice || 0)
          lowestPrice = Math.min(...prices.filter((price: number) => price > 0))
        }

        const endmillInfo: EndmillData = {
          code: foundEndmill.code,
          name: foundEndmill.name || '',
          specifications: foundEndmill.specifications || '',
          currentStock: currentStock,
          unitPrice: lowestPrice,
          category: foundEndmill.categoryName || t('inventory.uncategorized'),
          standardLife: foundEndmill.standardLife || 2000
        }

        setEndmillData(endmillInfo)
        setQuantity(1) // 수량 초기화

        showSuccess(t('inventory.searchComplete'), `${t('inventory.infoLoaded')}: ${foundEndmill.code} (${t('inventory.stock')}: ${currentStock}${t('inventory.pieces')})`)

        // 설비번호가 이미 입력되어 있다면 T번호 자동 입력 시도
        if (equipmentNumber.trim()) {
          autoFillTNumber(equipmentNumber, foundEndmill.code)
        }
      } catch (error) {
        clientLogger.error('재고 정보 조회 오류:', error)
        // 재고 정보를 못 가져와도 기본 정보는 표시
        // 공급업체별 가격 중 최저가 계산 (에러 케이스)
        let lowestPrice = foundEndmill.unitCost || 0
        if (foundEndmill.suppliers && foundEndmill.suppliers.length > 0) {
          const prices = foundEndmill.suppliers.map((supplier: any) => supplier.unitPrice || 0)
          lowestPrice = Math.min(...prices.filter((price: number) => price > 0))
        }

        const endmillInfo: EndmillData = {
          code: foundEndmill.code,
          name: foundEndmill.name || '',
          specifications: foundEndmill.specifications || '',
          currentStock: 0,
          unitPrice: lowestPrice,
          category: foundEndmill.categoryName || t('inventory.uncategorized'),
          standardLife: foundEndmill.standardLife || 2000
        }
        setEndmillData(endmillInfo)
        setQuantity(1)
        showSuccess(t('inventory.searchComplete'), `${t('inventory.infoLoaded')}: ${foundEndmill.code} (${t('inventory.stockInfo')})`)
      }
    } else {
      setEndmillData(null)
      setErrorMessage(`${t('inventory.codeNotFound')} '${code}'`)
    }
  }

  const handleProcessOutbound = async () => {
    if (!endmillData || quantity <= 0) {
      showError(t('inventory.checkInput'), t('inventory.checkOutboundFieldsBasic'))
      return
    }

    // 설비번호가 입력된 경우에만 패턴 검증
    if (equipmentNumber.trim()) {
      const equipmentPattern = /^C[0-9]{3}$/
      if (!equipmentPattern.test(equipmentNumber)) {
        showWarning(t('inventory.equipmentNumberFormat'), t('inventory.equipmentNumberFormatError'))
        return
      }
    }

    // 재고 확인
    if (endmillData.currentStock < quantity) {
      showError(t('inventory.insufficientStock'), `${t('inventory.insufficientStockError')} (${endmillData.currentStock}${t('inventory.pieces')})`)
      return
    }

    const _totalValue = quantity * endmillData.unitPrice

    // 확인 메시지 생성
    let confirmMessage = `${endmillData.code} ${quantity}개 출고`
    if (equipmentNumber.trim()) {
      confirmMessage += ` (${equipmentNumber} T${tNumber.toString().padStart(2, '0')})`
    }
    if (purpose.trim()) {
      confirmMessage += ` - ${purpose}`
    }

    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(confirmMessage)
    )

    if (confirmed) {
      confirmation.setLoading(true)
      setLoading(true)

      try {
        const response = await fetch('/api/inventory/outbound', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endmill_code: endmillData.code,
            equipment_number: equipmentNumber.trim() || null,
            t_number: equipmentNumber.trim() ? tNumber : null,
            quantity: quantity,
            purpose: purpose.trim() || '미리 준비',
            notes: equipmentNumber.trim()
              ? `${t('inventory.outboundNotePrefix')} ${equipmentNumber} T${tNumber.toString().padStart(2, '0')}`
              : '미리 출고 (설비 미지정)',
            factory_id: currentFactory?.id
          })
        })

        const result = await response.json()

        if (response.ok && result.success) {
          // 폼 초기화
          setEndmillData(null)
          setQuantity(1)
          setEquipmentNumber('')
          setTNumber(1)
          setPurpose(toolChangesReasons[0] || '')
          setScannedCode('')
          setErrorMessage('')

          // 출고 내역 새로고침
          await loadOutboundHistory()

          showSuccess(
            t('inventory.outboundProcessComplete'),
            `${endmillData.code} ${quantity}${t('inventory.successfullyOutbound')} ${equipmentNumber} T${tNumber.toString().padStart(2, '0')}${t('inventory.outboundTo')}`
          )
        } else {
          showError(t('inventory.outboundProcessFailed'), result.error || t('inventory.outboundProcessError'))
        }
      } catch (error) {
        clientLogger.error('출고 처리 오류:', error)
        showError(t('inventory.outboundProcessFailed'), t('inventory.outboundProcessError'))
      } finally {
        confirmation.setLoading(false)
        setLoading(false)
      }
    }
  }

  // 향후 사용 예정
  const _handleCancelOutbound = async (transactionId: string) => {
    const confirmed = await confirmation.showConfirmation({
      title: t('inventory.cancelOutbound'),
      message: t('inventory.cancelOutboundConfirm'),
      type: 'warning',
      confirmText: t('common.cancel'),
      cancelText: t('inventory.keep')
    })

    if (confirmed) {
      try {
        const response = await fetch(`/api/inventory/outbound?id=${transactionId}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (response.ok && result.success) {
          await loadOutboundHistory()
          showSuccess(t('inventory.cancelOutboundSuccess'), t('inventory.cancelOutboundSuccessMessage'))
        } else {
          showError(t('inventory.cancelOutboundFailed'), result.error || t('inventory.cancelOutboundError'))
        }
      } catch (error) {
        clientLogger.error('출고 취소 오류:', error)
        showError(t('inventory.cancelOutboundFailed'), t('inventory.cancelOutboundError'))
      }
    }
  }

  // 출고 내역 수정 핸들러
  const handleEditOutbound = (item: OutboundItem) => {
    setEditingItem(item)
    setIsEditModalOpen(true)
  }

  // 출고 내역 수정 저장
  const handleSaveEditOutbound = async () => {
    if (!editingItem) return

    const confirmed = await confirmation.showConfirmation({
      type: 'save',
      title: t('inventory.updateOutbound'),
      message: t('inventory.updateOutboundConfirm'),
      confirmText: t('common.save'),
      cancelText: t('common.cancel')
    })

    if (confirmed) {
      try {
        const response = await fetch(`/api/inventory/outbound/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: editingItem.quantity,
            equipmentNumber: editingItem.equipmentNumber,
            tNumber: editingItem.tNumber,
            purpose: editingItem.purpose
          })
        })

        const result = await response.json()

        if (result.success) {
          showSuccess(t('inventory.updateOutboundSuccess'))
          setIsEditModalOpen(false)
          setEditingItem(null)
          await loadOutboundHistory()
        } else {
          showError(t('inventory.updateOutboundFailed'), result.error)
        }
      } catch (error) {
        clientLogger.error('출고 내역 수정 오류:', error)
        showError(t('inventory.updateOutboundFailed'), String(error))
      }
    }
  }

  // 출고 내역 삭제 핸들러
  const handleDeleteOutbound = async (id: string) => {
    const confirmed = await confirmation.showConfirmation({
      type: 'delete',
      title: t('inventory.deleteOutbound'),
      message: t('inventory.deleteOutboundConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDangerous: true
    })

    if (confirmed) {
      try {
        const response = await fetch(`/api/inventory/outbound/${id}`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (result.success) {
          showSuccess(t('inventory.deleteOutboundSuccess'))
          await loadOutboundHistory()
        } else {
          showError(t('inventory.deleteOutboundFailed'), result.error)
        }
      } catch (error) {
        clientLogger.error('출고 내역 삭제 오류:', error)
        showError(t('inventory.deleteOutboundFailed'), String(error))
      }
    }
  }

  // 총액 계산
  const getTotalValue = () => {
    if (!endmillData) return 0
    return quantity * endmillData.unitPrice
  }

  // 현재 재고의 총 가치 계산
  const getCurrentStockValue = () => {
    if (!endmillData) return 0
    return endmillData.unitPrice * endmillData.currentStock
  }

  // 기간 필터 변경 시 데이터 다시 불러오기
  useEffect(() => {
    loadOutboundHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, startDate, endDate, currentFactory?.id])

  // 검색 및 정렬이 적용된 데이터
  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...outboundItems]

    // 검색 필터 적용
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.endmillCode.toLowerCase().includes(term) ||
          item.endmillName.toLowerCase().includes(term) ||
          item.equipmentNumber.toLowerCase().includes(term) ||
          item.purpose.toLowerCase().includes(term)
      )
    }

    // 정렬 적용
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime()
          break
        case 'code':
          comparison = a.endmillCode.localeCompare(b.endmillCode)
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [outboundItems, searchTerm, sortBy, sortOrder])

  // 페이지네이션 적용
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedItems.slice(startIndex, endIndex)
  }, [filteredAndSortedItems, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage)

  // currentPage clamp — 필터/항목 삭제로 totalPages가 줄어든 경우 마지막 유효 페이지로 이동
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // Excel 다운로드 핸들러
  const handleExcelDownload = async () => {
    try {
      if (filteredAndSortedItems.length === 0) {
        showError(t('inventory.excelDownloadFailed'), t('inventory.noDataToDownload'))
        return
      }

      const periodLabels = {
        today: '오늘',
        lastWeek: '최근일주일',
        thisWeek: '이번주',
        thisMonth: '이번달',
        custom: `${startDate}_${endDate}`
      }

      const { downloadOutboundHistoryExcel } = await import('../../../../lib/utils/outboundExcelExport')
      const filename = await downloadOutboundHistoryExcel(
        filteredAndSortedItems,
        periodLabels[period]
      )

      showSuccess(t('inventory.excelDownloadSuccess'), `${filename}`)
    } catch (error) {
      clientLogger.error('Excel 다운로드 오류:', error)
      showError(t('inventory.excelDownloadFailed'), String(error))
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-base text-ink-soft">{t('inventory.outboundScanDescription')}</p>
        <Link
          href="/dashboard/inventory"
          className="inline-flex min-h-touch items-center justify-center px-4 py-2 bg-paper text-ink text-label font-medium border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:border-gauge-cobalt"
        >
          ← {t('inventory.backToInventory')}
        </Link>
      </div>

      {/* QR 스캔 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-paper-warm p-4 sm:p-6 rounded-md border border-divider">
          <h2 className="text-title font-semibold text-ink mb-4">🔍 {t('inventory.qrScanner')}</h2>

          <div className="border-2 border-dashed border-signal-go rounded-md p-6 sm:p-8 text-center bg-paper">
            <div className="w-16 h-16 mx-auto mb-4 bg-signal-go-soft rounded-md flex items-center justify-center text-3xl">
              📦
            </div>
            <p className="text-base font-medium text-signal-go-strong mb-2">{t('inventory.usbScannerReady')}</p>
            <p className="text-caption text-ink-soft mb-6">{t('inventory.usbScannerGuide')}</p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  ref={codeInputRef}
                  type="text"
                  placeholder={t('inventory.enterCodePlaceholder')}
                  value={scannedCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setScannedCode(value)

                    // 기존 타이머 취소
                    if (scanTimeoutRef.current) {
                      clearTimeout(scanTimeoutRef.current)
                    }

                    // 입력이 있고 3자 이상이면 200ms 후 자동 검색
                    if (value.trim().length >= 3) {
                      scanTimeoutRef.current = setTimeout(async () => {
                        clientLogger.log('자동 검색 실행:', value)
                        await handleQRScan(value)
                        setScannedCode('') // 검색 후 input 초기화
                      }, 200)
                    }
                  }}
                  onKeyDown={async (e) => {
                    // Enter 키로도 즉시 검색 가능
                    if (e.key === 'Enter' && scannedCode.trim()) {
                      // 타이머가 있으면 취소
                      if (scanTimeoutRef.current) {
                        clearTimeout(scanTimeoutRef.current)
                      }
                      await handleQRScan(scannedCode)
                      setScannedCode('') // 검색 후 input 초기화
                    }
                  }}
                  className="flex-1 min-h-touch px-4 py-3 text-base font-mono bg-paper border-2 border-signal-go rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
                  autoFocus
                />
                <button
                  onClick={async () => {
                    if (scannedCode.trim()) {
                      await handleQRScan(scannedCode)
                      setScannedCode('')
                    }
                  }}
                  className="inline-flex min-h-touch items-center justify-center px-6 py-3 bg-signal-go-strong text-paper text-label font-medium rounded-sm transition-colors hover:bg-signal-go disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!scannedCode.trim()}
                >
                  {t('common.search')}
                </button>
              </div>

              {errorMessage && (
                <div className="bg-signal-stop-soft border border-signal-stop rounded-sm p-3" role="alert">
                  <p className="text-base text-signal-stop-strong">{errorMessage}</p>
                </div>
              )}

              <div className="bg-paper-warm border border-divider rounded-sm p-4 text-left">
                <p className="text-caption font-semibold text-ink mb-2">💡 {t('inventory.scannerUsageGuide')}</p>
                <ul className="text-caption text-ink-soft space-y-1 ml-4 list-disc">
                  <li>{t('inventory.scannerStep1')}</li>
                  <li>{t('inventory.scannerStep2')}</li>
                  <li>{t('inventory.scannerStep3')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 출고 정보 입력 */}
        <div className="bg-paper-warm p-4 sm:p-6 rounded-md border border-divider">
          <h2 className="text-title font-semibold text-ink mb-4">📋 {t('inventory.outboundInfo')}</h2>

          {endmillData ? (
            <div className="space-y-4">
              {/* 자동 입력된 앤드밀 정보 */}
              <div className="bg-paper p-4 rounded-md border border-divider">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption font-medium text-ink-soft mb-1">{t('inventory.endmillCodeLabel')}</label>
                    <div className="text-title font-semibold text-signal-go-strong tabular">{endmillData.code}</div>
                  </div>
                  <div>
                    <label className="block text-caption font-medium text-ink-soft mb-1">{t('inventory.category')}</label>
                    <div className="text-base text-ink">{endmillData.category}</div>
                  </div>
                  <div>
                    <label className="block text-caption font-medium text-ink-soft mb-1">{t('inventory.endmillNameLabel')}</label>
                    <div className="text-base font-medium text-ink">{endmillData.name}</div>
                  </div>
                  <div>
                    <label className="block text-caption font-medium text-ink-soft mb-1">{t('inventory.currentStock')}</label>
                    <div className={`text-base font-semibold tabular ${endmillData.currentStock < quantity ? 'text-signal-stop-strong' : 'text-ink'}`}>
                      {endmillData.currentStock}{t('inventory.pieces')}
                    </div>
                    <div className="text-caption text-ink-soft mt-1 tabular">
                      {t('inventory.currentStockValue')}: {getCurrentStockValue().toLocaleString()} VND
                    </div>
                    <div className="text-caption text-ink-mute tabular">
                      ({endmillData.unitPrice.toLocaleString()} VND/{t('inventory.pieces')}, {t('common.avgCount')})
                    </div>
                  </div>
                </div>
              </div>

              {/* 출고 관련 입력 필드들 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label font-medium text-ink-soft mb-2">
                    {t('inventory.equipmentNumber')} <span className="text-caption text-ink-mute">({t('common.optional')})</span>
                  </label>
                  <input
                    type="text"
                    value={equipmentNumber}
                    onChange={(e) => handleEquipmentNumberChange(e.target.value)}
                    className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
                    placeholder={t('inventory.equipmentNumberPlaceholder')}
                    pattern="C[0-9]{3}"
                    title={t('inventory.equipmentNumberFormatError')}
                  />
                  <p className="text-caption text-ink-mute mt-1">{t('inventory.equipmentNumberOptionalHint')}</p>
                </div>

                <div>
                  <label className="block text-label font-medium text-ink-soft mb-2">
                    {t('inventory.tNumber')} <span className="text-caption text-ink-mute">({t('common.optional')})</span>
                  </label>
                  <select
                    value={tNumber}
                    onChange={(e) => setTNumber(parseInt(e.target.value) || 1)}
                    className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!equipmentNumber.trim()}
                  >
                    {Array.from({length: tNumberRange.max - tNumberRange.min + 1}, (_, i) => i + tNumberRange.min).map(num => (
                      <option key={num} value={num}>T{num.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <p className="text-caption text-ink-mute mt-1">{t('inventory.tNumberOptionalHint')}</p>
                </div>

                <div>
                  <label className="block text-label font-medium text-ink-soft mb-2">{t('inventory.outboundQuantity')} {t('inventory.required')}</label>
                  <input
                    type="number"
                    min="1"
                    max={endmillData.currentStock}
                    value={quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      setQuantity(isNaN(value) ? 1 : value)
                    }}
                    className={`w-full min-h-touch px-3 py-2 text-base bg-paper border rounded-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors tabular ${
                      quantity > endmillData.currentStock
                        ? 'border-signal-stop bg-signal-stop-soft focus:border-signal-stop-strong'
                        : 'border-divider focus:border-signal-go-strong'
                    }`}
                    placeholder={t('inventory.enterQuantity')}
                    required
                  />
                  {quantity > endmillData.currentStock && (
                    <p className="text-signal-stop-strong text-caption mt-1" role="alert">{t('inventory.insufficientStock')}! {t('inventory.currentStock')}: {endmillData.currentStock}{t('inventory.pieces')}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-label font-medium text-ink-soft mb-2">
                    {t('inventory.purpose')} <span className="text-caption text-ink-mute">({t('common.optional')})</span>
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
                  >
                    <option value="">{t('inventory.selectPurpose')}</option>
                    {toolChangesReasons.map(reason => (
                      <option key={reason} value={reason}>{reasonTranslations[reason] || reason}</option>
                    ))}
                  </select>
                  <p className="text-caption text-ink-mute mt-1">{t('inventory.purposeOptionalHint')}</p>
                </div>
              </div>

              {/* 총액 표시 */}
              <div className="bg-signal-go-soft p-4 rounded-md border border-signal-go">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-label font-medium text-ink-soft">{t('inventory.totalOutboundAmount')}:</span>
                  <span className="text-headline font-semibold text-signal-go-strong tabular">
                    {getTotalValue().toLocaleString()} VND
                  </span>
                </div>
                <div className="text-caption text-ink-soft mt-1 tabular">
                  {endmillData.unitPrice.toLocaleString()} VND × {quantity}{t('inventory.pieces')} = {getTotalValue().toLocaleString()} VND
                </div>
              </div>

              {/* 출고 처리 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={handleProcessOutbound}
                  className="flex-1 inline-flex min-h-touch items-center justify-center px-4 py-3 bg-signal-go-strong text-paper text-label font-medium rounded-sm transition-colors hover:bg-signal-go disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={quantity <= 0 || quantity > endmillData.currentStock || loading}
                >
                  {loading ? t('common.loading') : `📤 ${t('inventory.processOutbound')}`}
                </button>
                <button
                  onClick={() => {
                    setEndmillData(null)
                    setQuantity(1)
                    setEquipmentNumber('')
                    setTNumber(1)
                    setPurpose(toolChangesReasons[0] || '')
                    setScannedCode('')
                    setErrorMessage('')
                  }}
                  className="inline-flex min-h-touch items-center justify-center px-4 py-3 bg-paper text-ink text-label font-medium border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:border-gauge-cobalt"
                >
                  {t('common.reset')}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-ink-soft">
              <div className="w-16 h-16 mx-auto mb-4 bg-paper rounded-md border border-divider flex items-center justify-center">
                📦
              </div>
              <p className="text-title font-semibold text-ink mb-2">{t('inventory.scanEndmillOutbound')}</p>
              <p className="text-base">{t('inventory.scanOrEnterOutbound')}</p>
              <p className="text-base">{t('inventory.autoLoadOutbound')}</p>
              <p className="text-caption text-gauge-cobalt-strong mt-3 font-medium">💡 {t('inventory.outboundOptionalNote')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 출고 처리 내역 */}
      <div className="space-y-3">
        {/* 헤더와 필터 */}
        <div className="bg-paper-warm p-4 rounded-md border border-divider space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-title font-semibold text-ink">{t('inventory.outboundHistory')}</h2>
            <button
              onClick={handleExcelDownload}
              className="inline-flex min-h-touch items-center justify-center gap-2 px-4 py-2 bg-paper text-ink text-label font-medium border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:border-signal-go disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={filteredAndSortedItems.length === 0}
            >
              📥 <span className="hidden sm:inline">{t('inventory.downloadExcel')}</span>
            </button>
          </div>

          {/* 기간 필터 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-label font-medium text-ink-soft mb-2">
                {t('inventory.periodFilter')}
              </label>
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value as any)
                  setCurrentPage(1)
                }}
                className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
              >
                <option value="today">{t('inventory.periodFilter')} - {t('common.date')}</option>
                <option value="lastWeek">{t('inventory.lastWeek')}</option>
                <option value="thisWeek">{t('inventory.thisWeek')}</option>
                <option value="thisMonth">{t('inventory.thisMonth')}</option>
                <option value="custom">{t('inventory.customPeriod')}</option>
              </select>
            </div>

            {period === 'custom' && (
              <>
                <div>
                  <label className="block text-label font-medium text-ink-soft mb-2">
                    {t('inventory.startDate')}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-label font-medium text-ink-soft mb-2">
                    {t('inventory.endDate')}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      loadOutboundHistory()
                      setCurrentPage(1)
                    }}
                    className="w-full inline-flex min-h-touch items-center justify-center px-4 py-2 bg-signal-go-strong text-paper text-label font-medium rounded-sm transition-colors hover:bg-signal-go"
                  >
                    {t('inventory.apply')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 검색 및 정렬 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
            <div className="md:col-span-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder={t('inventory.searchPlaceholderOutbound')}
                className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
              />
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
              >
                <option value="date">{t('inventory.sortByDate')}</option>
                <option value="code">{t('inventory.sortByCode')}</option>
                <option value="quantity">{t('inventory.sortByQuantity')}</option>
              </select>
            </div>
            <div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
              >
                <option value="desc">{t('inventory.sortDescending')}</option>
                <option value="asc">{t('inventory.sortAscending')}</option>
              </select>
            </div>
          </div>
        </div>

        {filteredAndSortedItems.length === 0 ? (
          <div className="rounded-md border border-divider bg-paper-warm px-4 py-8 text-center text-base text-ink-soft">
            {searchTerm ? t('common.noResults') : t('inventory.noOutboundHistory')}
          </div>
        ) : (
          <>
            {/* 모바일 카드 리스트 (lg 미만) */}
            <div className="lg:hidden space-y-3">
              {paginatedItems.map((item) => (
                <OutboundHistoryCard
                  key={item.id}
                  item={item}
                  onEdit={handleEditOutbound}
                  onDelete={handleDeleteOutbound}
                  purposeLabel={(p) => reasonTranslations[p] || p}
                  editLabel={t('common.edit')}
                  deleteLabel={t('common.delete')}
                />
              ))}
            </div>

            {/* 데스크톱 테이블 (lg 이상) */}
            <div className="hidden lg:block bg-paper-warm rounded-md border border-divider overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-divider">
                  <thead className="bg-paper">
                    <tr>
                      <th className="px-4 py-3 text-left text-caption font-medium text-ink-soft uppercase tracking-wider">{t('inventory.processedTime')}</th>
                      <th className="px-4 py-3 text-left text-caption font-medium text-ink-soft uppercase tracking-wider">{t('inventory.endmillCode')}</th>
                      <th className="px-4 py-3 text-left text-caption font-medium text-ink-soft uppercase tracking-wider">{t('inventory.endmillName')}</th>
                      <th className="px-4 py-3 text-left text-caption font-medium text-ink-soft uppercase tracking-wider">{t('common.quantity')}</th>
                      <th className="px-4 py-3 text-left text-caption font-medium text-ink-soft uppercase tracking-wider">{t('inventory.purpose')}</th>
                      <th className="px-4 py-3 text-left text-caption font-medium text-ink-soft uppercase tracking-wider">{t('inventory.currentStockValue')} (VND)</th>
                      <th className="px-4 py-3 text-left text-caption font-medium text-ink-soft uppercase tracking-wider">{t('inventory.processor')}</th>
                      <th className="px-4 py-3 text-left text-caption font-medium text-ink-soft uppercase tracking-wider">{t('inventory.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-paper-warm divide-y divide-divider">
                    {paginatedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-paper transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-base text-ink-soft tabular">{item.processedAt}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-base font-medium text-ink tabular">{item.endmillCode}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-base text-ink">{item.endmillName}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-base text-ink tabular">{item.quantity}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-base text-ink-soft">{reasonTranslations[item.purpose] || item.purpose || '—'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-base font-semibold text-signal-go-strong tabular">{item.totalValue.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-base text-ink-soft">{item.processedBy}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-label">
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleEditOutbound(item)}
                              className="text-gauge-cobalt-strong font-medium hover:text-gauge-cobalt transition-colors"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => handleDeleteOutbound(item.id)}
                              className="text-signal-stop-strong font-medium hover:text-signal-stop transition-colors"
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 페이지네이션 — 모바일/데스크톱 공통 */}
            {totalPages > 1 && (
              <div className="bg-paper-warm border border-divider rounded-md px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-caption text-ink-soft tabular">
                  {t('inventory.showingEntries', {
                    from: (currentPage - 1) * itemsPerPage + 1,
                    to: Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length),
                    total: filteredAndSortedItems.length
                  })}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex min-h-touch min-w-touch items-center justify-center px-3 text-label font-medium text-ink-soft bg-paper border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink-soft"
                    aria-label={t('toolChanges.previous')}
                  >
                    ‹
                  </button>
                  <span className="text-caption text-ink-soft tabular px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex min-h-touch min-w-touch items-center justify-center px-3 text-label font-medium text-ink-soft bg-paper border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink-soft"
                    aria-label={t('toolChanges.next')}
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 승인 모달 */}
      {confirmation.config && (
        <ConfirmationModal
          isOpen={confirmation.isOpen}
          config={confirmation.config}
          onConfirm={confirmation.handleConfirm}
          onCancel={confirmation.handleCancel}
          loading={confirmation.loading}
        />
      )}

      {/* 수정 모달 */}
      {isEditModalOpen && editingItem && (
        <div className="mobile-modal-container" onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}>
          <div className="mobile-modal-content md:max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="text-title font-semibold text-ink">{t('inventory.editOutbound')}</h3>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}
                className="p-2 text-ink-mute hover:text-ink hover:bg-paper-warm rounded-full transition-colors"
                aria-label={t('common.cancel')}
              >
                ✕
              </button>
            </div>

            <div className="mobile-modal-body space-y-4">
              <div>
                <label className="block text-label font-medium text-ink-soft mb-1">
                  {t('inventory.endmillCode')}
                </label>
                <input
                  type="text"
                  value={editingItem.endmillCode}
                  disabled
                  className="w-full min-h-touch px-3 py-2 text-base bg-paper-warm border border-divider rounded-sm text-ink-soft tabular cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-label font-medium text-ink-soft mb-1">
                  {t('common.quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingItem.quantity}
                  onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors tabular"
                />
              </div>

              <div>
                <label className="block text-label font-medium text-ink-soft mb-1">
                  {t('inventory.purpose')}
                </label>
                <select
                  value={editingItem.purpose}
                  onChange={(e) => setEditingItem({ ...editingItem, purpose: e.target.value })}
                  className="w-full min-h-touch px-3 py-2 text-base bg-paper border border-divider rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-signal-go-strong transition-colors"
                >
                  <option value="">{t('inventory.selectPurpose')}</option>
                  {toolChangesReasons.map(reason => (
                    <option key={reason} value={reason}>{reasonTranslations[reason] || reason}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mobile-modal-footer flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingItem(null)
                }}
                className="w-full sm:w-auto inline-flex min-h-touch items-center justify-center px-4 py-2 bg-paper text-ink text-label font-medium border border-divider rounded-sm transition-colors hover:bg-paper-warm hover:border-gauge-cobalt"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveEditOutbound}
                className="w-full sm:w-auto inline-flex min-h-touch items-center justify-center px-4 py-2 bg-signal-go-strong text-paper text-label font-medium rounded-sm transition-colors hover:bg-signal-go"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}