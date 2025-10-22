/**
 * Generate Chart Image Utility
 * Recharts를 이미지로 변환
 */

/**
 * 차트 요소를 Canvas로 변환하고 PNG 이미지 생성
 */
export async function generateChartImage(
  chartElement: HTMLElement
): Promise<string> {
  try {
    // SVG 요소 찾기
    const svgElement = chartElement.querySelector('svg')
    if (!svgElement) {
      throw new Error('차트 SVG 요소를 찾을 수 없습니다.')
    }

    // SVG를 문자열로 변환
    const svgData = new XMLSerializer().serializeToString(svgElement)

    // SVG를 Base64로 인코딩
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)))
    const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`

    // Canvas 생성
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context를 생성할 수 없습니다.')
    }

    // SVG 크기 가져오기
    const svgRect = svgElement.getBoundingClientRect()
    canvas.width = svgRect.width
    canvas.height = svgRect.height

    // 이미지 로드 및 Canvas에 그리기
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        const pngDataUrl = canvas.toDataURL('image/png')
        resolve(pngDataUrl)
      }
      img.onerror = () => {
        reject(new Error('이미지 로드 실패'))
      }
      img.src = svgDataUrl
    })
  } catch (error: any) {
    console.error('차트 이미지 생성 오류:', error)
    throw new Error('차트 이미지 생성 중 오류가 발생했습니다.')
  }
}

/**
 * Base64 이미지를 Blob으로 변환
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
  const byteString = atob(base64.split(',')[1])
  const arrayBuffer = new ArrayBuffer(byteString.length)
  const uint8Array = new Uint8Array(arrayBuffer)

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i)
  }

  return new Blob([arrayBuffer], { type: mimeType })
}

/**
 * 차트 이미지 다운로드
 */
export async function downloadChartImage(
  chartElement: HTMLElement,
  fileName: string = 'chart.png'
): Promise<void> {
  try {
    const imageDataUrl = await generateChartImage(chartElement)

    // 다운로드 링크 생성
    const link = document.createElement('a')
    link.href = imageDataUrl
    link.download = fileName
    link.click()
  } catch (error: any) {
    console.error('차트 다운로드 오류:', error)
    throw new Error('차트 다운로드 중 오류가 발생했습니다.')
  }
}

// 캐시 객체 (동일 차트 재사용)
const chartImageCache = new Map<string, string>()

/**
 * 캐시된 차트 이미지 가져오기
 */
export async function getCachedChartImage(
  chartElement: HTMLElement,
  cacheKey: string
): Promise<string> {
  // 캐시 확인
  if (chartImageCache.has(cacheKey)) {
    return chartImageCache.get(cacheKey)!
  }

  // 이미지 생성
  const imageDataUrl = await generateChartImage(chartElement)

  // 캐시 저장 (최대 10개)
  if (chartImageCache.size >= 10) {
    const firstKey = chartImageCache.keys().next().value as string
    chartImageCache.delete(firstKey)
  }
  chartImageCache.set(cacheKey, imageDataUrl)

  return imageDataUrl
}

/**
 * 캐시 초기화
 */
export function clearChartImageCache(): void {
  chartImageCache.clear()
}
