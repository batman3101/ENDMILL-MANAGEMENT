import React from 'react'

interface DonutChartProps {
  value: number
  max: number
  color?: string
  size?: number
  children?: React.ReactNode
}

const DonutChart = React.memo(function DonutChart({ value, max, color = '#f97316', size = 64, children }: DonutChartProps) {
  const radius = (size / 2) - 6
  const circumference = 2 * Math.PI * radius
  const percent = Math.max(0, Math.min(1, value / max))
  const dash = circumference * percent
  const offset = circumference * 0.25 // 12시 방향에서 시작

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} data-testid="donut-chart">
      {/* 배경 원 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={10}
      />
      {/* 값 원 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - dash + offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s' }}
      />
      {/* 중앙 텍스트/children */}
      <g>
        <foreignObject x={size * 0.25} y={size * 0.25} width={size * 0.5} height={size * 0.5} style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {children}
          </div>
        </foreignObject>
      </g>
    </svg>
  )
})

export default DonutChart