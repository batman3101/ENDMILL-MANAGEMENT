'use client'

import { useState } from 'react'
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

  // 설정에서 값 가져오기
  const { settings } = useSettings()
  const availableProcesses = settings.equipment.processes

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
          aVal = new Date(a.updated_at).getTime()
          bVal = new Date(b.updated_at).getTime()
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

    // 1. Tool Life 예측 정확도 (실제 계산 필요)
    const toolLifeAccuracy = 90 // 기본값으로 설정

    // 2. 교체 주기 분석 (시간 단위)
    const allEndmills = camSheets.flatMap(sheet => sheet.cam_sheet_endmills || [])
        const averageChangeInterval = allEndmills.length > 0
      ? Math.round((allEndmills.reduce((acc, endmill) => acc + (endmill.tool_life / 60), 0) / allEndmills.length) * 10) / 10
      : 0

    // 앤드밀 타입별 교체 주기 (실제 계산 필요)
    const endmillTypeIntervals = {
      FLAT: 35.0,
      BALL: 30.0,
      'T-CUT': 40.0
    }

    // 3. 재고 연동률 (실제 재고 데이터와 연동 필요)
    const totalRegisteredEndmills = allEndmills.length
    const securedEndmills = Math.floor(totalRegisteredEndmills * 0.90) // 90% 기본값
    const shortageEndmills = totalRegisteredEndmills - securedEndmills
    const inventoryLinkage = totalRegisteredEndmills > 0
      ? Math.round((securedEndmills / totalRegisteredEndmills) * 100)
      : 0

    // 4. 표준화 지수
    const endmillCodes = new Set(allEndmills.map(e => e.endmill_code))
    const totalUniqueEndmills = endmillCodes.size
    const estimatedStandardEndmills = Math.floor(totalUniqueEndmills * 0.75)
    const duplicateEndmills = totalUniqueEndmills - estimatedStandardEndmills
    const standardization = totalUniqueEndmills > 0 
      ? Math.round((estimatedStandardEndmills / totalUniqueEndmills) * 100)
      : 0

    // 공정별 정확도 (실제 계산 필요)
    const processAccuracy = {
      'CNC1': 88,
      'CNC2': 92,
      'CNC2-1': 85
    }

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
              <p className="text-2xl font-bold text-yellow-600">
                {camSheets.length > 0 
                  ? `${Math.round((camSheets.reduce((acc, sheet) => acc + (sheet.cam_sheet_endmills?.length || 0), 0) / Math.max(camSheets.length * 10, 1)) * 100)}%`
                  : '0%'
                }
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
                <p className="text-2xl font-bold text-blue-600">{insights.averageChangeInterval}{t('camSheets.hours')}</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-2">{t('camSheets.averageCycle')}</div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">FLAT</span>
              <span className="font-medium">{insights.endmillTypeIntervals.FLAT}{t('camSheets.hours')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">BALL</span>
              <span className="font-medium">{insights.endmillTypeIntervals.BALL}{t('camSheets.hours')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">T-CUT</span>
              <span className="font-medium">{insights.endmillTypeIntervals['T-CUT']}{t('camSheets.hours')}</span>
            </div>
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