import { render, screen, waitFor } from '@testing-library/react'
import LandingStatusCard from './LandingStatusCard'

// API mocking 라이브러리 사용 (예: msw, jest-fetch-mock 등)
// 여기서는 간단히 fetch를 mock 처리

describe('LandingStatusCard', () => {
  beforeAll(() => {
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/equipment')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              { id: '1', status: '가동중' },
              { id: '2', status: '점검중' },
              { id: '3', status: '가동중' }
            ]
          })
        })
      }
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { equipment: { toolPositionCount: 21 } }
          })
        })
      }
      return Promise.reject(new Error('Unknown API'))
    }) as any
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it('설비 수, 공구 위치 수, 가동 설비 수를 올바르게 표시한다', async () => {
    render(<LandingStatusCard />)

    // 설비 수: 3, 공구 위치 수: 3*21=63, 가동 설비 수: 2
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('63')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })
}) 