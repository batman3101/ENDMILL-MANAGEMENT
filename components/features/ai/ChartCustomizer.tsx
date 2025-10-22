'use client'

/**
 * ChartCustomizer Component
 * 차트 타입 및 설정 커스터마이징
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BarChart3, LineChart, PieChart, AreaChart } from 'lucide-react'

export type ChartType = 'bar' | 'line' | 'pie' | 'area'

export interface ChartConfig {
  type: ChartType
  title: string
  dataKey: string
  xAxisKey?: string
  yAxisKey?: string
  colors: string[]
}

interface ChartCustomizerProps {
  config: ChartConfig
  onConfigChange: (config: ChartConfig) => void
  availableKeys?: string[]
  className?: string
}

export function ChartCustomizer({
  config,
  onConfigChange,
  availableKeys = ['value', 'count', 'amount'],
  className,
}: ChartCustomizerProps) {
  const chartTypes: { value: ChartType; label: string; icon: React.ReactNode }[] = [
    { value: 'bar', label: '막대 차트', icon: <BarChart3 className="h-4 w-4" /> },
    { value: 'line', label: '선 그래프', icon: <LineChart className="h-4 w-4" /> },
    { value: 'pie', label: '파이 차트', icon: <PieChart className="h-4 w-4" /> },
    { value: 'area', label: '영역 차트', icon: <AreaChart className="h-4 w-4" /> },
  ]

  const colorPalettes = [
    { name: '기본', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] },
    { name: '파스텔', colors: ['#93c5fd', '#86efac', '#fde68a', '#fca5a5', '#c4b5fd'] },
    { name: '어두움', colors: ['#1e3a8a', '#065f46', '#92400e', '#7f1d1d', '#4c1d95'] },
  ]

  const [selectedPalette, setSelectedPalette] = useState(0)

  const handlePaletteChange = (index: number) => {
    setSelectedPalette(index)
    onConfigChange({
      ...config,
      colors: colorPalettes[index].colors,
    })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">차트 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 차트 타입 */}
        <div className="space-y-2">
          <Label>차트 타입</Label>
          <div className="grid grid-cols-2 gap-2">
            {chartTypes.map((type) => (
              <Button
                key={type.value}
                variant={config.type === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onConfigChange({ ...config, type: type.value })}
                className="justify-start"
              >
                {type.icon}
                <span className="ml-2">{type.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* 차트 제목 */}
        <div className="space-y-2">
          <Label htmlFor="chartTitle">차트 제목</Label>
          <Input
            id="chartTitle"
            value={config.title}
            onChange={(e) =>
              onConfigChange({ ...config, title: e.target.value })
            }
            placeholder="예: 월별 교체 현황"
          />
        </div>

        {/* 데이터 키 */}
        <div className="space-y-2">
          <Label htmlFor="dataKey">데이터 키</Label>
          <Select
            value={config.dataKey}
            onValueChange={(value) =>
              onConfigChange({ ...config, dataKey: value })
            }
          >
            <SelectTrigger id="dataKey">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* X축 키 (bar, line, area만 해당) */}
        {(config.type === 'bar' || config.type === 'line' || config.type === 'area') && (
          <div className="space-y-2">
            <Label htmlFor="xAxisKey">X축 키</Label>
            <Select
              value={config.xAxisKey || 'name'}
              onValueChange={(value) =>
                onConfigChange({ ...config, xAxisKey: value })
              }
            >
              <SelectTrigger id="xAxisKey">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
                <SelectItem value="name">name</SelectItem>
                <SelectItem value="date">date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 색상 팔레트 */}
        <div className="space-y-2">
          <Label>색상 팔레트</Label>
          <div className="grid grid-cols-3 gap-2">
            {colorPalettes.map((palette, index) => (
              <Button
                key={index}
                variant={selectedPalette === index ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePaletteChange(index)}
                className="flex flex-col items-start p-2 h-auto"
              >
                <span className="text-xs mb-1">{palette.name}</span>
                <div className="flex gap-1">
                  {palette.colors.slice(0, 3).map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* 미리보기 색상 */}
        <div className="space-y-2">
          <Label>선택된 색상</Label>
          <div className="flex gap-2 flex-wrap">
            {config.colors.map((color, index) => (
              <div
                key={index}
                className="w-8 h-8 rounded border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
