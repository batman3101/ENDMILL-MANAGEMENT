'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  ReportType,
  ReportFilter,
  MonthlyReportData,
  CostAnalysisData,
  ToolLifeAnalysisData,
  PerformanceReportData
} from '../types/reports'
import { clientLogger } from '../utils/logger'

export const useReports = () => {
  const [generatedReport, setGeneratedReport] = useState<any>(null)

  // 월간 리포트 생성
  const generateMonthlyReport = useMutation({
    mutationFn: async (filter: ReportFilter) => {
      const response = await fetch('/api/reports/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate monthly report')
      }

      return response.json()
    },
    onSuccess: (data: MonthlyReportData) => {
      clientLogger.log('✅ 월간 리포트 생성 성공:', data)
      setGeneratedReport(data)
    },
    onError: (error: Error) => {
      clientLogger.error('❌ 월간 리포트 생성 실패:', error)
    }
  })

  // 비용 분석 생성
  const generateCostAnalysis = useMutation({
    mutationFn: async (filter: ReportFilter) => {
      const response = await fetch('/api/reports/cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate cost analysis')
      }

      return response.json()
    },
    onSuccess: (data: CostAnalysisData) => {
      clientLogger.log('✅ 비용 분석 생성 성공:', data)
      setGeneratedReport(data)
    },
    onError: (error: Error) => {
      clientLogger.error('❌ 비용 분석 생성 실패:', error)
    }
  })

  // Tool Life 분석 생성
  const generateToolLifeAnalysis = useMutation({
    mutationFn: async (filter: ReportFilter) => {
      const response = await fetch('/api/reports/tool-life', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate tool life analysis')
      }

      return response.json()
    },
    onSuccess: (data: ToolLifeAnalysisData) => {
      clientLogger.log('✅ Tool Life 분석 생성 성공:', data)
      setGeneratedReport(data)
    },
    onError: (error: Error) => {
      clientLogger.error('❌ Tool Life 분석 생성 실패:', error)
    }
  })

  // 성능 리포트 생성
  const generatePerformanceReport = useMutation({
    mutationFn: async (filter: ReportFilter) => {
      const response = await fetch('/api/reports/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate performance report')
      }

      return response.json()
    },
    onSuccess: (data: PerformanceReportData) => {
      clientLogger.log('✅ 성능 리포트 생성 성공:', data)
      setGeneratedReport(data)
    },
    onError: (error: Error) => {
      clientLogger.error('❌ 성능 리포트 생성 실패:', error)
    }
  })

  // 리포트 타입에 따라 적절한 함수 호출
  const generateReport = async (type: ReportType, filter: ReportFilter) => {
    switch (type) {
      case 'monthly':
        return generateMonthlyReport.mutateAsync(filter)
      case 'cost':
        return generateCostAnalysis.mutateAsync(filter)
      case 'tool-life':
        return generateToolLifeAnalysis.mutateAsync(filter)
      case 'performance':
        return generatePerformanceReport.mutateAsync(filter)
      default:
        throw new Error(`Unknown report type: ${type}`)
    }
  }

  const isGenerating =
    generateMonthlyReport.isPending ||
    generateCostAnalysis.isPending ||
    generateToolLifeAnalysis.isPending ||
    generatePerformanceReport.isPending

  const error =
    generateMonthlyReport.error ||
    generateCostAnalysis.error ||
    generateToolLifeAnalysis.error ||
    generatePerformanceReport.error

  return {
    generateReport,
    generatedReport,
    setGeneratedReport,
    isGenerating,
    error,
    // 개별 mutation 함수들
    generateMonthlyReport: generateMonthlyReport.mutateAsync,
    generateCostAnalysis: generateCostAnalysis.mutateAsync,
    generateToolLifeAnalysis: generateToolLifeAnalysis.mutateAsync,
    generatePerformanceReport: generatePerformanceReport.mutateAsync
  }
}