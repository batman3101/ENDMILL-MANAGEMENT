'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCAMSheets, type CAMSheet, type EndmillInfo } from '../../../lib/hooks/useCAMSheets'
import CAMSheetForm from '../../../components/features/CAMSheetForm'
import ExcelUploader from '../../../components/features/ExcelUploader'
import { useToast } from '../../../components/shared/Toast'
import ConfirmationModal from '../../../components/shared/ConfirmationModal'
import { useConfirmation, createDeleteConfirmation, createSaveConfirmation } from '../../../lib/hooks/useConfirmation'
import { useSettings } from '../../../lib/hooks/useSettings'
import SortableTableHeader from '../../../components/shared/SortableTableHeader'

export default function CAMSheetsPage() {
  const { t } = useTranslation()
  const {
    camSheets,
    loading,
    error,
    createCAMSheet,
    createCAMSheetsBatch,
    updateCAMSheet,
    deleteCAMSheet
  } = useCAMSheets()
  const { showSuccess, showError, showWarning } = useToast()
  const confirmation = useConfirmation()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showExcelUploader, setShowExcelUploader] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState<CAMSheet | null>(null)
  const [editingSheet, setEditingSheet] = useState<CAMSheet | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [processFilter, setProcessFilter] = useState('')
  const [sortField, setSortField] = useState<'model' | 'process' | 'cam_version' | 'endmillCount' | 'updated_at'>('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [toolChanges, setToolChanges] = useState<any[]>([])
  const [inventoryData, setInventoryData] = useState<any[]>([])

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const availableProcesses = settings.equipment.processes

  // 교체 실적 데이터 가져오기
  useEffect(() => {
    const fetchToolChanges = async () => {
      try {
        const response = await fetch('/api/tool-changes')
        if (response.ok) {
          const result = await response.json()
          console.log('교체 실적 데이터:', result)
          setToolChanges(result.data || [])
        }
      } catch (error) {
        console.error('교체 실적 데이터 로드 실패:', error)
      }
    }
    fetchToolChanges()
  }, [])

  // 재고 데이터 가져오기
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/inventory')
        if (response.ok) {
          const result = await response.json()
          console.log('재고 데이터:', result)
          setInventoryData(result.data || result.inventory || [])
        }
      } catch (error) {
        console.error('재고 데이터 로드 실패:', error)
      }
    }
    fetchInventory()
  }, [])

  // 필터링 및 정렬된 CAM Sheet 목록
  const filteredSheets = camSheets
    .filter(sheet => {
      const matchesSearch = searchTerm === '' ||
        sheet.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.cam_version.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesModel = modelFilter === '' || sheet.model === modelFilter
      const matchesProcess = processFilter === '' || sheet.process === processFilter

      return matchesSearch && matchesModel && matchesProcess
    })
    .sort((a, b) => {
      let aVal: any
      let bVal: any

      switch(sortField) {
        case 'model':
          aVal = a.model
          bVal = b.model
          break
        case 'process':
          aVal = a.process
          bVal = b.process
          break
        case 'cam_version':
          aVal = a.cam_version
          bVal = b.cam_version
          break
        case 'endmillCount':
          aVal = (a.cam_sheet_endmills || a.endmills || []).length
          bVal = (b.cam_sheet_endmills || b.endmills || []).length
          break
        case 'updated_at':
          aVal = a.updated_at ? new Date(a.updated_at).getTime() : 0
          bVal = b.updated_at ? new Date(b.updated_at).getTime() : 0
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

  // 인사이트 데이터 계산
  const calculateInsights = () => {
    console.log('=== 인사이트 계산 시작 ===')
    console.log('CAM Sheets 개수:', camSheets.length)
    console.log('교체 실적 개수:', toolChanges.length)
    console.log('재고 데이터 개수:', inventoryData.length)

    if (camSheets.length === 0) {
      return {
        toolLifeAccuracy: 0,
        averageChangeInterval: 0,
        inventoryLinkage: 0,
        standardization: 0,
        processAccuracy: {
          'CNC1': 0,
          'CNC2': 0,
          'CNC2-1': 0
        },
        endmillTypeIntervals: {
          FLAT: 0,
          BALL: 0,
          'T-CUT': 0
        },
        inventoryStatus: { secured: 0, shortage: 0 },
        standardizationDetails: { standard: 0, duplicate: 0 }
      }
    }

    const allEndmills = camSheets.flatMap(sheet => sheet.cam_sheet_endmills || [])
    console.log('=== CAM Sheet 앤드밀 정보 ===')
    console.log('CAM Sheet 등록 앤드밀 개수:', allEndmills.length)
    console.log('CAM Sheet 앤드밀 샘플:', allEndmills.slice(0, 3).map(e => ({
      code: e.endmill_code,
      name: e.endmill_name,
      toolLife: e.tool_life
    })))

    // 1. Tool Life 예측 정확도 (실제 교체 실적 데이터 기반)
    let toolLifeAccuracy = 0
    let processAccuracy: { [key: string]: number } = {
      'CNC1': 0,
      'CNC2': 0,
      'CNC2-1': 0
    }

    console.log('=== Tool Life 예측 정확도 계산 ===')
    console.log('교체 실적 데이터 개수:', toolChanges.length)
    console.log('CAM Sheet 앤드밀 개수:', allEndmills.length)

    if (toolChanges.length > 0 && allEndmills.length > 0) {
      // 전체 정확도 계산
      const validChanges = toolChanges.filter(change => change.tool_life && change.tool_life > 0)
      console.log('유효한 교체 실적 개수:', validChanges.length)
      console.log('교체 실적 샘플:', validChanges.slice(0, 3).map(c => ({
        code: c.endmill_code,
        name: c.endmill_name,
        toolLife: c.tool_life,
        process: c.process
      })))

      if (validChanges.length > 0) {
        let matchCount = 0
        let notMatchedCount = 0
        const totalAccuracy = validChanges.reduce((sum, change) => {
          // 해당 앤드밀의 CAM Sheet 설정 Tool Life 찾기
          const camEndmill = allEndmills.find(e => e.endmill_code === change.endmill_code)
          if (camEndmill && camEndmill.tool_life && camEndmill.tool_life > 0 && change.tool_life) {
            matchCount++
            const accuracy = Math.min((change.tool_life / camEndmill.tool_life) * 100, 100)
            console.log(`✓ 매칭: ${change.endmill_code}, 실제: ${change.tool_life}회, 설정: ${camEndmill.tool_life}회, 정확도: ${accuracy.toFixed(1)}%`)
            return sum + accuracy
          } else {
            notMatchedCount++
            console.log(`✗ 매칭 실패: ${change.endmill_code} (CAM Sheet에 없음)`)
          }
          return sum
        }, 0)
        console.log('매칭 성공:', matchCount, '/ 매칭 실패:', notMatchedCount)
        console.log('총 정확도:', totalAccuracy)
        toolLifeAccuracy = matchCount > 0 ? Math.round(totalAccuracy / matchCount) : 0
        console.log('최종 Tool Life 정확도:', toolLifeAccuracy + '%')
      }

      // 공정별 정확도 계산
      const processes = ['CNC1', 'CNC2', 'CNC2-1']
      processes.forEach(process => {
        const processChanges = validChanges.filter(change => change.process === process)
        if (processChanges.length > 0) {
          const processTotal = processChanges.reduce((sum, change) => {
            const camEndmill = allEndmills.find(e => e.endmill_code === change.endmill_code)
            if (camEndmill && camEndmill.tool_life && camEndmill.tool_life > 0 && change.tool_life) {
              const accuracy = Math.min((change.tool_life / camEndmill.tool_life) * 100, 100)
              return sum + accuracy
            }
            return sum
          }, 0)
          processAccuracy[process] = Math.round(processTotal / processChanges.length)
        }
      })
    }

    // 2. 교체 주기 분석 (수량 단위)
    let averageChangeInterval = 0
    let endmillTypeIntervals: { [key: string]: number } = {}

    console.log('=== 교체 주기 분석 ===')
    if (toolChanges.length > 0) {
      // 전체 평균 교체 주기 (수량 기준)
      const validLifes = toolChanges
        .filter(change => change.tool_life && change.tool_life > 0)
        .map(change => change.tool_life)

      console.log('유효한 Tool Life 개수:', validLifes.length)
      if (validLifes.length > 0) {
        const total = validLifes.reduce((sum, life) => sum + life, 0)
        averageChangeInterval = Math.round(total / validLifes.length)
        console.log('전체 평균 교체 주기:', averageChangeInterval + '회')
      }

      // 앤드밀 타입별 평균 교체 주기 (실제 데이터에서 동적으로 추출)
      const typeGroups: { [key: string]: number[] } = {}

      toolChanges.forEach(change => {
        if (change.endmill_name && change.tool_life > 0) {
          // 앤드밀 이름에서 타입 추출 (예: "D8×18R FLAT EM" -> "FLAT")
          let detectedType = 'OTHER'

          // 주요 타입 키워드 검사
          const typeKeywords = ['FLAT', 'BALL', 'T-CUT', 'RADIUS', 'CORNER', 'TAPER', 'DRILL', 'CHAMFER']
          for (const keyword of typeKeywords) {
            if (change.endmill_name.toUpperCase().includes(keyword)) {
              detectedType = keyword
              break
            }
          }

          if (!typeGroups[detectedType]) {
            typeGroups[detectedType] = []
          }
          typeGroups[detectedType].push(change.tool_life)
        }
      })

      // 각 타입별 평균 계산
      Object.entries(typeGroups).forEach(([type, lifes]) => {
        if (lifes.length > 0) {
          const typeAvg = lifes.reduce((sum, life) => sum + life, 0) / lifes.length
          endmillTypeIntervals[type] = Math.round(typeAvg)
          console.log(`${type} 평균 교체 주기: ${endmillTypeIntervals[type]}회 (데이터: ${lifes.length}건)`)
        }
      })
    } else {
      console.log('교체 실적 데이터가 없습니다.')
    }

    // 3. 재고 연동률 (실제 Supabase 재고 데이터 기반)
    const totalRegisteredEndmills = allEndmills.length
    let securedEndmills = 0
    let shortageEndmills = 0
    let inventoryLinkage = 0

    console.log('=== 재고 연동률 계산 ===')
    console.log('재고 데이터 개수:', inventoryData.length)
    console.log('재고 데이터 샘플:', inventoryData.slice(0, 2).map(i => ({
      code: i.endmill_type?.code,
      name: i.endmill_type?.name_ko,
      currentStock: i.current_stock,
      minStock: i.min_stock
    })))

    if (totalRegisteredEndmills > 0 && inventoryData.length > 0) {
      // CAM Sheet에 등록된 각 앤드밀 코드별로 재고 확인
      const uniqueEndmillCodes = new Set(allEndmills.map(e => e.endmill_code))
      console.log('고유 앤드밀 코드 개수:', uniqueEndmillCodes.size)
      console.log('앤드밀 코드 목록:', Array.from(uniqueEndmillCodes))

      uniqueEndmillCodes.forEach(code => {
        // 재고에서 해당 앤드밀 코드 찾기 (endmill_type.code로 접근)
        const inventoryItem = inventoryData.find(item =>
          item.endmill_type && item.endmill_type.code === code
        )

        if (inventoryItem) {
          const currentStock = inventoryItem.current_stock || 0
          const minStock = inventoryItem.min_stock || 0
          const status = currentStock >= minStock ? '✓ 확보' : '✗ 부족'
          console.log(`${status}: ${code}, 현재: ${currentStock}개, 최소: ${minStock}개`)

          // 재고가 최소 재고 이상이면 확보된 것으로 간주
          if (currentStock >= minStock) {
            securedEndmills++
          } else {
            shortageEndmills++
          }
        } else {
          console.log(`✗ 재고 데이터 없음: ${code}`)
          // 재고 데이터가 없으면 부족으로 간주
          shortageEndmills++
        }
      })

      console.log('재고 확보:', securedEndmills, '/ 재고 부족:', shortageEndmills)
      inventoryLinkage = Math.round((securedEndmills / uniqueEndmillCodes.size) * 100)
      console.log('최종 재고 연동률:', inventoryLinkage + '%')
    }

    // 4. 표준화 지수
    const endmillCodes = new Set(allEndmills.map(e => e.endmill_code))
    const totalUniqueEndmills = endmillCodes.size
    const estimatedStandardEndmills = Math.floor(totalUniqueEndmills * 0.75)
    const duplicateEndmills = totalUniqueEndmills - estimatedStandardEndmills
    const standardization = totalUniqueEndmills > 0
      ? Math.round((estimatedStandardEndmills / totalUniqueEndmills) * 100)
      : 0

    return {
      toolLifeAccuracy,
      averageChangeInterval,
      inventoryLinkage,
      standardization,
      processAccuracy,
      endmillTypeIntervals,
      inventoryStatus: { secured: securedEndmills, shortage: shortageEndmills },
      standardizationDetails: { standard: estimatedStandardEndmills, duplicate: duplicateEndmills }
    }
  }

  const insights = calculateInsights()
  const processKeys = Object.keys(insights.processAccuracy) as (keyof typeof insights.processAccuracy)[]
  const bestProcessKey = processKeys.length > 0 
    ? processKeys.reduce((a, b) => 
        insights.processAccuracy[a] > insights.processAccuracy[b] ? a : b
      )
    : 'CNC1'
  const bestProcess = [bestProcessKey, insights.processAccuracy[bestProcessKey] || 0]

  // 정렬 처리
  const handleSort = (field: 'model' | 'process' | 'cam_version' | 'endmillCount' | 'updated_at') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // CAM Sheet 생성 처리
  const handleCreateCAMSheet = async (data: any) => {
    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(`${data.model} - ${data.process} CAM Sheet`)
    )
    
    if (confirmed) {
      createCAMSheet(data)
      setShowAddForm(false)
      showSuccess('CAM Sheet 생성 완료', '새로운 CAM Sheet가 성공적으로 생성되었습니다.')
    }
  }

  // 엑셀 데이터 일괄 등록 처리
  const handleBulkImport = async (camSheets: Omit<CAMSheet, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const confirmed = await confirmation.showConfirmation({
      type: 'create',
      title: '엑셀 일괄 등록 확인',
      message: `${camSheets.length}개의 CAM Sheet를 일괄 등록하시겠습니까?`,
      confirmText: '일괄 등록',
      cancelText: '취소'
    })
    
    if (confirmed) {
      confirmation.setLoading(true)
      try {
        // 일괄 생성 API 호출
        createCAMSheetsBatch({
          batch: true,
          data: camSheets.map(sheet => ({
            model: sheet.model,
            process: sheet.process,
            cam_version: sheet.cam_version,
            version_date: sheet.version_date,
            endmills: sheet.cam_sheet_endmills || []
          }))
        })
        setShowExcelUploader(false)
        showSuccess(
          '엑셀 일괄 등록 완료', 
          `${camSheets.length}개의 CAM Sheet가 성공적으로 등록되었습니다.`
        )
      } catch (error) {
        showError('일괄 등록 실패', '일괄 등록 중 오류가 발생했습니다.')
      } finally {
        confirmation.setLoading(false)
      }
    }
  }

  // CAM Sheet 수정 처리
  const handleUpdateCAMSheet = async (data: any) => {
    if (!editingSheet) return

    const confirmed = await confirmation.showConfirmation(
      createSaveConfirmation(`${data.model} - ${data.process} CAM Sheet 수정`)
    )

    if (confirmed) {
      updateCAMSheet({
        id: editingSheet.id,
        model: data.model,
        process: data.process,
        cam_version: data.camVersion || data.cam_version,
        version_date: data.versionDate || data.version_date,
        endmills: data.endmills
      })
      setEditingSheet(null)
      showSuccess('수정 완료', 'CAM Sheet가 성공적으로 수정되었습니다.')
    }
  }

  // CAM Sheet 삭제
  const handleDelete = async (id: string) => {
    const targetSheet = camSheets.find(sheet => sheet.id === id)
    if (!targetSheet) return

    const confirmed = await confirmation.showConfirmation(
      createDeleteConfirmation(`${targetSheet.model} - ${targetSheet.process} CAM Sheet`)
    )

    if (confirmed) {
      deleteCAMSheet(id)
      showSuccess('삭제 완료', 'CAM Sheet가 성공적으로 삭제되었습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">{t('camSheets.loading')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* 기본 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              📋
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('camSheets.totalSheets')}</p>
              <p className="text-2xl font-bold text-gray-900">{camSheets.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              🏭
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('camSheets.registeredModel')}</p>
              <p className="text-2xl font-bold text-green-600">
                {new Set(camSheets.map(s => s.model)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              🔧
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('camSheets.registeredEndmills')}</p>
              <p className="text-2xl font-bold text-purple-600">
                {camSheets.reduce((total, sheet) => total + (sheet.cam_sheet_endmills?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              ⚡
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('camSheets.efficiencyIndex')}</p>
              <p className={`text-2xl font-bold ${(() => {
                // 효율성 지수 계산: (실제 평균 사용 횟수 / CAM Sheet 설정 Tool Life) × 100
                if (toolChanges.length === 0 || camSheets.length === 0) return 'text-gray-400'

                // CAM Sheet에 등록된 모든 앤드밀의 평균 Tool Life
                const allEndmills = camSheets.flatMap(sheet => sheet.cam_sheet_endmills || [])
                const avgExpectedToolLife = allEndmills.length > 0
                  ? allEndmills.reduce((sum, e) => sum + (e.tool_life || 0), 0) / allEndmills.length
                  : 0

                // 실제 교체 실적의 평균 Tool Life
                const actualToolLifes = toolChanges
                  .filter(change => change.tool_life && change.tool_life > 0)
                  .map(change => change.tool_life)
                const avgActualToolLife = actualToolLifes.length > 0
                  ? actualToolLifes.reduce((sum, life) => sum + life, 0) / actualToolLifes.length
                  : 0

                const efficiency = avgExpectedToolLife > 0
                  ? Math.round((avgActualToolLife / avgExpectedToolLife) * 100)
                  : 0

                if (efficiency >= 80) return 'text-green-600'
                if (efficiency >= 50) return 'text-yellow-600'
                return 'text-red-600'
              })()}`}>
                {(() => {
                  if (toolChanges.length === 0 || camSheets.length === 0) return '0%'

                  const allEndmills = camSheets.flatMap(sheet => sheet.cam_sheet_endmills || [])
                  const avgExpectedToolLife = allEndmills.length > 0
                    ? allEndmills.reduce((sum, e) => sum + (e.tool_life || 0), 0) / allEndmills.length
                    : 0

                  const actualToolLifes = toolChanges
                    .filter(change => change.tool_life && change.tool_life > 0)
                    .map(change => change.tool_life)
                  const avgActualToolLife = actualToolLifes.length > 0
                    ? actualToolLifes.reduce((sum, life) => sum + life, 0) / actualToolLifes.length
                    : 0

                  const efficiency = avgExpectedToolLife > 0
                    ? Math.round((avgActualToolLife / avgExpectedToolLife) * 100)
                    : 0

                  return `${efficiency}%`
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 인사이트 분석 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 1. Tool Life 예측 정확도 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                🎯
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('camSheets.toolLifeAccuracy')}</p>
                <p className="text-2xl font-bold text-emerald-600">{insights.toolLifeAccuracy}%</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">{t('camSheets.camVsActual')}</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-emerald-600 h-2 rounded-full" style={{width: `${insights.toolLifeAccuracy}%`}}></div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {t('camSheets.mostAccurate')}: {bestProcess[0]} ({bestProcess[1]}%)
          </div>
        </div>

        {/* 2. 교체 주기 분석 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                📊
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('camSheets.replacementCycle')}</p>
                <p className="text-2xl font-bold text-blue-600">{insights.averageChangeInterval.toLocaleString()}{t('camSheets.times')}</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">{t('camSheets.averageCycle')}</div>
          <div className="space-y-1">
            {(() => {
              // 앤드밀 타입별 교체 주기를 내림차순 정렬 (많은 순서대로)
              const sortedTypes = Object.entries(insights.endmillTypeIntervals)
                .filter(([_, interval]) => interval > 0) // 0인 항목 제외
                .sort(([_, a], [__, b]) => b - a) // 교체 주기 내림차순

              // 데이터가 없으면 기본 메시지
              if (sortedTypes.length === 0) {
                return (
                  <div className="text-xs text-gray-400 text-center py-2">
                    {t('common.noData')}
                  </div>
                )
              }

              // 상위 3개만 표시
              return sortedTypes.slice(0, 3).map(([type, interval]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="text-gray-600">{type}</span>
                  <span className="font-medium">{interval.toLocaleString()}{t('camSheets.times')}</span>
                </div>
              ))
            })()}
          </div>
        </div>

        {/* 3. 재고 연동률 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                🔗
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('camSheets.inventoryLink')}</p>
                <p className="text-2xl font-bold text-orange-600">{insights.inventoryLinkage}%</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">{t('camSheets.registeredEndmill')}</div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">{t('camSheets.secured')}</span>
              <span className="font-medium text-green-600">{insights.inventoryStatus.secured}{t('camSheets.items')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">{t('camSheets.shortage')}</span>
              <span className="font-medium text-red-600">{insights.inventoryStatus.shortage}{t('camSheets.items')}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-amber-600">
            ⚠️ {t('camSheets.riskLevel')}: {insights.inventoryLinkage >= 90 ? t('camSheets.low') : insights.inventoryLinkage >= 80 ? t('camSheets.medium') : t('camSheets.high')}
          </div>
        </div>

        {/* 4. 표준화 지수 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                📐
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('camSheets.standardization')}</p>
                <p className="text-2xl font-bold text-indigo-600">{insights.standardization}%</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">{t('camSheets.endmillStandardization')}</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-indigo-600 h-2 rounded-full" style={{width: `${insights.standardization}%`}}></div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">{t('camSheets.standardType')}</span>
              <span className="font-medium">{insights.standardizationDetails.standard}{t('camSheets.items')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">{t('camSheets.duplicateType')}</span>
              <span className="font-medium text-yellow-600">{insights.standardizationDetails.duplicate}{t('camSheets.items')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1">
            <input
              type="text"
              placeholder={t('camSheets.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('camSheets.allModel')}</option>
              {Array.from(new Set(camSheets.map(s => s.model))).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <select
              value={processFilter}
              onChange={(e) => setProcessFilter(e.target.value)}
              className="px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('camSheets.allProcess')}</option>
              {availableProcesses.map(process => (
                <option key={process} value={process}>{process}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExcelUploader(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              📁 {t('camSheets.bulkRegister')}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + {t('camSheets.individualRegister')}
            </button>
          </div>
        </div>
      </div>

      {/* CAM Sheet 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('camSheets.sheetList')}</h2>
          <div className="text-sm text-gray-500">
            {t('camSheets.totalCount')} {filteredSheets.length}{t('camSheets.items')}
            {sortField && (
              <span className="ml-2 text-blue-600">
                ({
                  sortField === 'model' ? t('camSheets.model') :
                  sortField === 'process' ? t('camSheets.process') :
                  sortField === 'cam_version' ? t('camSheets.version') :
                  sortField === 'endmillCount' ? t('camSheets.endmillCount') :
                  t('camSheets.lastModified')
                } {sortOrder === 'asc' ? t('camSheets.sortAscending') : t('camSheets.sortDescending')})
              </span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableTableHeader
                  label={t('camSheets.model')}
                  field="model"
                  currentSortField={sortField}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('camSheets.process')}
                  field="process"
                  currentSortField={sortField}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('camSheets.version')}
                  field="cam_version"
                  currentSortField={sortField}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('camSheets.endmillCount')}
                  field="endmillCount"
                  currentSortField={sortField}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label={t('camSheets.lastModified')}
                  field="updated_at"
                  currentSortField={sortField}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('camSheets.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSheets.map((sheet) => (
                <tr key={sheet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sheet.model}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{sheet.process}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{sheet.cam_version}</div>
                      <div className="text-sm text-gray-500">{sheet.version_date}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{(sheet.cam_sheet_endmills || []).length}{t('camSheets.items')}</div>
                    <div className="text-sm text-gray-500">
                      {(sheet.cam_sheet_endmills || []).length > 0 ?
                        `T${Math.min(...(sheet.cam_sheet_endmills || []).map((e: EndmillInfo) => e.t_number))}-T${Math.max(...(sheet.cam_sheet_endmills || []).map((e: EndmillInfo) => e.t_number))}` :
                        '-'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sheet.updated_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedSheet(sheet)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      {t('camSheets.detail')}
                    </button>
                    <button
                      onClick={() => setEditingSheet(sheet)}
                      className="text-green-600 hover:text-green-800 mr-3"
                    >
                      {t('camSheets.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(sheet.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      {t('camSheets.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CAM Sheet 상세 모달 */}
      {selectedSheet && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{t('camSheets.camSheetDetail')} - {selectedSheet.model}</h3>
                <button
                  onClick={() => setSelectedSheet(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('camSheets.model')}</label>
                  <p className="text-lg font-semibold">{selectedSheet.model}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('camSheets.process')}</label>
                  <p className="text-lg font-semibold">{selectedSheet.process}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('camSheets.version')}</label>
                  <p className="text-lg font-semibold">{selectedSheet.cam_version}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('camSheets.versionDate')}</label>
                  <p className="text-lg font-semibold">{selectedSheet.version_date}</p>
                </div>
              </div>

              <h4 className="text-lg font-semibold mb-4">{t('camSheets.registered')}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.tNumber')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.endmillCode')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.endmillName')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.usageStatus')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('camSheets.toolLife')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(selectedSheet.cam_sheet_endmills || []).map((endmill: EndmillInfo) => (
                      <tr key={endmill.t_number} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium">T{endmill.t_number.toString().padStart(2, '0')}</td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            onClick={() => {
                              // 엔드밀 관리 페이지로 이동하면서 해당 엔드밀 검색
                              const url = `/dashboard/endmill?search=${encodeURIComponent(endmill.endmill_code)}`
                              window.location.href = url
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {endmill.endmill_code}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-sm">{endmill.endmill_name}</td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {t('camSheets.active')}
                            </span>
                            <span className="text-xs text-gray-500">
                              {t('camSheets.currentModel')}: {selectedSheet.model}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className="font-medium text-green-600">
                            {endmill.tool_life.toLocaleString()}{t('camSheets.times')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 업로더 */}
      {showExcelUploader && (
        <ExcelUploader
          onDataParsed={handleBulkImport}
          onClose={() => setShowExcelUploader(false)}
        />
      )}

      {/* CAM Sheet 등록 폼 */}
      {showAddForm && (
        <CAMSheetForm
          onSubmit={handleCreateCAMSheet}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* CAM Sheet 수정 폼 */}
      {editingSheet && (
        <CAMSheetForm
          onSubmit={handleUpdateCAMSheet}
          onCancel={() => setEditingSheet(null)}
          initialData={{
            model: editingSheet.model,
            process: editingSheet.process,
            camVersion: editingSheet.cam_version,
            versionDate: editingSheet.version_date,
            endmills: (editingSheet.cam_sheet_endmills || editingSheet.endmills || []).map((endmill: any) => ({
              tNumber: endmill.t_number,
              endmillCode: endmill.endmill_code,
              endmillName: endmill.endmill_name,
              specifications: endmill.specifications || '',
              toolLife: endmill.tool_life
            }))
          }}
        />
      )}

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
    </div>
  )
}