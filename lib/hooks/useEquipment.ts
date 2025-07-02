'use client'

import { useState, useEffect } from 'react'
import { FileDataManager, Equipment } from '../data/fileDataManager'

// FileDataManager에서 Equipment 타입을 가져옴
export { Equipment } from '../data/fileDataManager'

export interface EquipmentFilter {
  status?: string
  location?: string
  model?: string
}

export interface EquipmentStats {
  total: number
  active: number
  maintenance: number
  setup: number
}

// 로컬 스토리지에서 설비 데이터 로드
const loadEquipmentsFromStorage = (): Equipment[] => {
  try {
    return FileDataManager.getEquipments()
  } catch (error) {
    console.error('설비 데이터 로드 실패:', error)
    return []
  }
}

// 로컬 스토리지에 설비 데이터 저장
const saveEquipmentsToStorage = (equipments: Equipment[]) => {
  try {
    FileDataManager.saveEquipments(equipments)
  } catch (error) {
    console.error('설비 데이터 저장 실패:', error)
  }
}

export const useEquipment = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 초기 데이터 로드
  useEffect(() => {
    try {
      let data = loadEquipmentsFromStorage()
      
      // 설비가 없으면 자동 생성
      if (data.length === 0) {
        data = FileDataManager.generateEquipments(800)
      }
      
      setEquipments(data)
      setLoading(false)
    } catch (err) {
      setError('설비 데이터를 불러오는데 실패했습니다.')
      setLoading(false)
    }
  }, [])

  // 설비 생성
  const createEquipment = (data: Omit<Equipment, 'id' | 'lastMaintenance'>) => {
    const newEquipment: Equipment = {
      ...data,
      id: `eq-${Date.now()}`,
      lastMaintenance: new Date().toISOString().split('T')[0]
    }

    const updatedEquipments = [...equipments, newEquipment]
    setEquipments(updatedEquipments)
    saveEquipmentsToStorage(updatedEquipments)
  }

  // 설비 업데이트
  const updateEquipment = (id: string, data: Partial<Omit<Equipment, 'id'>>) => {
    const updatedEquipments = equipments.map(eq => 
      eq.id === id ? { ...eq, ...data } : eq
    )
    setEquipments(updatedEquipments)
    saveEquipmentsToStorage(updatedEquipments)
  }

  // 설비 삭제
  const deleteEquipment = (id: string) => {
    const updatedEquipments = equipments.filter(eq => eq.id !== id)
    setEquipments(updatedEquipments)
    saveEquipmentsToStorage(updatedEquipments)
  }

  // 필터링된 설비 조회
  const getFilteredEquipments = (filter: EquipmentFilter = {}) => {
    return equipments.filter(eq => {
      if (filter.status && eq.status !== filter.status) return false
      if (filter.location && eq.location !== filter.location) return false
      if (filter.model && eq.currentModel !== filter.model) return false
      return true
    })
  }

  // 설비 통계 계산
  const getEquipmentStats = (filtered?: Equipment[]): EquipmentStats => {
    const data = filtered || equipments
    return {
      total: data.length,
      active: data.filter(eq => eq.status === '가동중').length,
      maintenance: data.filter(eq => eq.status === '점검중').length,
      setup: data.filter(eq => eq.status === '셋업중').length,
    }
  }

  // 사용 가능한 모델 목록
  const getAvailableModels = () => {
    return FileDataManager.getModels()
  }

  // 사용 가능한 공정 목록
  const getAvailableProcesses = () => {
    return FileDataManager.getProcesses()
  }

  // 사용 가능한 위치 목록
  const getAvailableLocations = () => {
    return ['A동', 'B동']
  }

  // 대량 설비 생성 (개발용)
  const generateEquipments = (count: number = 800) => {
    const generated = FileDataManager.generateEquipments(count)
    setEquipments(generated)
    return generated
  }

  return {
    equipments,
    loading,
    error,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    getFilteredEquipments,
    getEquipmentStats,
    getAvailableModels,
    getAvailableProcesses,
    getAvailableLocations,
    generateEquipments
  }
}

// 설비 상태 변경 Hook
export const useEquipmentStatus = () => {
  const { updateEquipment } = useEquipment()

  const changeStatus = (id: string, status: Equipment['status']) => {
    updateEquipment(id, { status })
  }

  const changeModel = (id: string, currentModel: string, process?: string) => {
    updateEquipment(id, { currentModel, ...(process && { process }) })
  }

  const resetToolPositions = (id: string) => {
    updateEquipment(id, { toolPositions: { used: 0, total: 21 } })
  }

  const updateToolPositions = (id: string, used: number) => {
    updateEquipment(id, { toolPositions: { used, total: 21 } })
  }

  return {
    changeStatus,
    changeModel,
    resetToolPositions,
    updateToolPositions
  }
}

// 설비 검색 Hook
export const useEquipmentSearch = () => {
  const { equipments } = useEquipment()

  const searchByNumber = (equipmentNumber: string) => {
    return equipments.find(eq => 
      eq.equipmentNumber.toLowerCase().includes(equipmentNumber.toLowerCase())
    )
  }

  const searchByModel = (model: string) => {
    return equipments.filter(eq => 
      eq.currentModel.toLowerCase().includes(model.toLowerCase())
    )
  }

  const searchByProcess = (process: string) => {
    return equipments.filter(eq => 
      eq.process.toLowerCase().includes(process.toLowerCase())
    )
  }

  return {
    searchByNumber,
    searchByModel,
    searchByProcess
  }
} 