"use client"

import { useEffect, useState } from 'react'

interface StatusData {
  totalEquipments: number
  toolPositions: number
  runningEquipments: number
}

export default function LandingStatusCard() {
  const [data, setData] = useState<StatusData>({
    totalEquipments: 0,
    toolPositions: 0,
    runningEquipments: 0
  })

  useEffect(() => {
    let isMounted = true
    Promise.all([
      fetch('/api/equipment').then(res => res.json()),
      fetch('/api/settings').then(res => res.json())
    ]).then(([equipRes, settingsRes]) => {
      if (!isMounted) return
      const equipments = equipRes.data || []
      const toolPositionCount = settingsRes.data?.equipment?.toolPositionCount || 21
      setData({
        totalEquipments: equipments.length,
        toolPositions: equipments.length * toolPositionCount,
        runningEquipments: equipments.filter((e: any) => e.status === '가동중').length
      })
    })
    return () => { isMounted = false }
  }, [])

  return (
    <div className="flex flex-row items-center justify-center space-x-8 py-2">
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-blue-700">{data.totalEquipments.toLocaleString()}</span>
        <span className="text-xs text-gray-500 mt-1">총 CNC 설비</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900">{data.toolPositions.toLocaleString()}</span>
        <span className="text-xs text-gray-500 mt-1">공구 위치</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-green-600">{data.runningEquipments.toLocaleString()}</span>
        <span className="text-xs text-gray-500 mt-1">가동중</span>
      </div>
    </div>
  )
} 