'use client'

/**
 * ChartPreview Component
 * Recharts를 사용한 차트 렌더링
 */

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig } from './ChartCustomizer'

interface ChartPreviewProps {
  config: ChartConfig
  data: any[]
  className?: string
}

export function ChartPreview({ config, data, className }: ChartPreviewProps) {
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">데이터가 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xAxisKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={config.dataKey} fill={config.colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xAxisKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={config.dataKey}
                stroke={config.colors[0]}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                dataKey={config.dataKey}
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={config.colors[index % config.colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={config.xAxisKey || 'name'} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey={config.dataKey}
                stroke={config.colors[0]}
                fill={config.colors[0]}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      default:
        return <div>지원하지 않는 차트 타입입니다</div>
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{config.title || '차트 미리보기'}</CardTitle>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  )
}
