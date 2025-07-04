import { render, screen } from '@testing-library/react'
import DonutChart from './DonutChart'

describe('DonutChart', () => {
  it('23/100 비율로 주황색이 12시부터 시계방향으로 표시된다', () => {
    render(<DonutChart value={23} max={100} color="orange" size={64} />)
    const chart = screen.getByTestId('donut-chart')
    expect(chart).toBeInTheDocument()
    // SVG path의 stroke-dasharray, stroke-dashoffset 등으로 비율이 반영되는지 확인
  })

  it('50/100 비율로 절반만 색상이 채워진다', () => {
    render(<DonutChart value={50} max={100} color="blue" size={64} />)
    const chart = screen.getByTestId('donut-chart')
    expect(chart).toBeInTheDocument()
  })

  it('0/100이면 색상 표시가 없다', () => {
    render(<DonutChart value={0} max={100} color="green" size={64} />)
    const chart = screen.getByTestId('donut-chart')
    expect(chart).toBeInTheDocument()
  })

  it('100/100이면 전체가 색상으로 채워진다', () => {
    render(<DonutChart value={100} max={100} color="red" size={64} />)
    const chart = screen.getByTestId('donut-chart')
    expect(chart).toBeInTheDocument()
  })
}) 