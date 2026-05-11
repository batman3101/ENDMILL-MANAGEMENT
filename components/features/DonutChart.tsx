import React from 'react'

interface DonutChartProps {
  value: number
  max: number
  color?: string
  size?: number
  children?: React.ReactNode
}

const DonutChart = React.memo(function DonutChart({ value, max, color = '#f97316', size = 64, children }: DonutChartProps) {
  const strokeWidth = 10
  const radius = (size / 2) - strokeWidth / 2 - 2
  const circumference = 2 * Math.PI * radius
  // value/max를 [0,1]로 clamp. max <= 0 이면 0%로 안전 폴백.
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const dash = circumference * ratio
  const gap = circumference - dash
  const center = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} data-testid="donut-chart">
      {/* 배경 원 */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      {/* 값 원 — 12시(상단) 시작, 시계 방향 채움.
          SVG circle은 3시 방향에서 시작하므로 -90도 회전으로 12시 정렬.
          strokeDasharray="dash gap" 형식이 정확한 채움 비율을 보장. */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={0}
        strokeLinecap={ratio >= 1 ? 'butt' : 'round'}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dasharray 0.5s' }}
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
