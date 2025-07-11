import { NextRequest, NextResponse } from 'next/server'
import { TranslationManager } from '../../../lib/data/translationManager'
import { GoogleTranslateService } from '../../../lib/services/googleTranslateService'
import { TextScanService, AutoGeneratedTranslation } from '../../../lib/services/textScanService'
import { SupportedLanguage, TranslationNamespace } from '../../../lib/types/translations'

// 헬퍼 함수: 번역 키 등록
async function registerTranslationKeys(
  translationManager: TranslationManager,
  googleTranslateService: GoogleTranslateService,
  translationKeys: AutoGeneratedTranslation[],
  autoTranslate: boolean,
  changedBy: string
): Promise<number> {
  let registeredCount = 0

  for (const key of translationKeys) {
    try {
      // 한국어 텍스트를 기본값으로 등록
      await translationManager.setTranslation(
        key.namespace,
        key.key,
        'ko',
        key.koreanText,
        changedBy
      )
      
      registeredCount++

      // 자동 번역이 활성화된 경우 베트남어로 번역
      if (autoTranslate) {
        try {
          const translateResult = await googleTranslateService.translateText({
            text: key.koreanText,
            sourceLang: 'ko',
            targetLang: 'vi',
            context: key.context
          })

          await translationManager.setTranslation(
            key.namespace,
            key.key,
            'vi',
            translateResult.translatedText,
            `${changedBy}_auto_translate`
          )

          // 사용량 기록
          googleTranslateService.recordUsage(key.koreanText.length)
        } catch (translateError) {
          console.error(`번역 실패 (${key.namespace}:${key.key}):`, translateError)
          // 번역 실패해도 한국어는 등록되었으므로 계속 진행
        }
      }
    } catch (error) {
      console.error(`번역 키 등록 실패 (${key.namespace}:${key.key}):`, error)
    }
  }

  return registeredCount
}

// GET: 번역 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const namespace = searchParams.get('namespace') as TranslationNamespace | null
    const language = searchParams.get('language') as SupportedLanguage | null
    const stats = searchParams.get('stats') === 'true'
    const history = searchParams.get('history') === 'true'
    const validation = searchParams.get('validation') === 'true'

    const translationManager = TranslationManager.getInstance()

    if (stats) {
      // 번역 통계 조회
      const statsData = translationManager.getStats()
      return NextResponse.json({
        success: true,
        data: statsData,
        message: '번역 통계를 조회했습니다.'
      })
    }

    if (history) {
      // 번역 히스토리 조회
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
      const historyData = translationManager.getHistory(limit)
      return NextResponse.json({
        success: true,
        data: historyData,
        message: '번역 히스토리를 조회했습니다.'
      })
    }

    if (validation) {
      // 번역 검증
      const validationResult = translationManager.validateTranslations()
      return NextResponse.json({
        success: true,
        data: validationResult,
        message: '번역 검증이 완료되었습니다.'
      })
    }

    if (namespace) {
      // 네임스페이스별 번역 조회
      const namespaceData = translationManager.getNamespaceTranslations(namespace)
      return NextResponse.json({
        success: true,
        data: { [namespace]: namespaceData },
        message: `${namespace} 네임스페이스 번역을 조회했습니다.`
      })
    }

    // 전체 번역 데이터 조회
    const allTranslations = translationManager.getTranslations()
    return NextResponse.json({
      success: true,
      data: allTranslations,
      message: '전체 번역 데이터를 조회했습니다.'
    })

  } catch (error) {
    console.error('번역 조회 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '번역 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

// POST: 번역 작업 (추가, 자동번역 등)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data, changedBy = 'api' } = body

    const translationManager = TranslationManager.getInstance()
    const googleTranslateService = GoogleTranslateService.getInstance()

    switch (action) {
      case 'add':
        // 번역 추가
        const { namespace, key, language, value } = data
        if (!namespace || !key || !language || !value) {
          return NextResponse.json(
            {
              success: false,
              error: '필수 필드가 누락되었습니다. (namespace, key, language, value)'
            },
            { status: 400 }
          )
        }

        translationManager.setTranslation(namespace, key, language, value, changedBy)
        
        return NextResponse.json({
          success: true,
          message: '번역이 추가되었습니다.'
        })

      case 'auto_translate':
        // 자동 번역
        const { text, sourceLang, targetLang, context } = data
        if (!text || !sourceLang || !targetLang) {
          return NextResponse.json(
            {
              success: false,
              error: '필수 필드가 누락되었습니다. (text, sourceLang, targetLang)'
            },
            { status: 400 }
          )
        }

        const translateResult = await googleTranslateService.translateText({
          text,
          sourceLang,
          targetLang,
          context
        })

        // 사용량 기록
        googleTranslateService.recordUsage(text.length)

        return NextResponse.json({
          success: true,
          data: translateResult,
          message: '자동 번역이 완료되었습니다.'
        })

      case 'auto_translate_batch':
        // 일괄 자동 번역
        const { texts, sourceLang: batchSourceLang, targetLang: batchTargetLang } = data
        if (!texts || !Array.isArray(texts) || !batchSourceLang || !batchTargetLang) {
          return NextResponse.json(
            {
              success: false,
              error: '필수 필드가 누락되었습니다. (texts, sourceLang, targetLang)'
            },
            { status: 400 }
          )
        }

        const batchResults = await googleTranslateService.translateBatch(texts, batchSourceLang, batchTargetLang)

        // 사용량 기록
        const totalCharacters = texts.reduce((sum, text) => sum + text.length, 0)
        googleTranslateService.recordUsage(totalCharacters)

        return NextResponse.json({
          success: true,
          data: batchResults,
          message: `${texts.length}개 텍스트의 일괄 번역이 완료되었습니다.`
        })

      case 'validate_api_key':
        // API 키 검증
        const { apiKey } = data
        if (!apiKey) {
          return NextResponse.json(
            {
              success: false,
              error: 'API 키가 필요합니다.'
            },
            { status: 400 }
          )
        }

        const isValid = await googleTranslateService.validateApiKey(apiKey)
        
        return NextResponse.json({
          success: true,
          data: { isValid },
          message: isValid ? 'API 키가 유효합니다.' : 'API 키가 유효하지 않습니다.'
        })

      case 'check_quota':
        // 사용량 확인
        const quotaInfo = await googleTranslateService.checkQuota()
        
        return NextResponse.json({
          success: true,
          data: quotaInfo,
          message: '사용량 정보를 조회했습니다.'
        })

      case 'import':
        // 번역 데이터 가져오기
        const { jsonData } = data
        if (!jsonData) {
          return NextResponse.json(
            {
              success: false,
              error: '가져올 번역 데이터가 필요합니다.'
            },
            { status: 400 }
          )
        }

        translationManager.importTranslations(jsonData, changedBy)
        
        return NextResponse.json({
          success: true,
          message: '번역 데이터를 가져왔습니다.'
        })

      case 'reset':
        // 번역 데이터 초기화
        translationManager.resetTranslations(changedBy)
        
        return NextResponse.json({
          success: true,
          message: '번역 데이터가 초기화되었습니다.'
        })

      case 'export':
        // 번역 데이터 내보내기
        const exportedData = translationManager.exportTranslations()
        
        return NextResponse.json({
          success: true,
          data: JSON.parse(exportedData),
          message: '번역 데이터를 내보냈습니다.'
        })

      case 'scan_project':
        // 프로젝트 전체 한국어 텍스트 스캔
        const { projectRoot = process.cwd() } = data
        const textScanService = TextScanService.getInstance()
        
        try {
          const scannedResults = await textScanService.scanProject(projectRoot)
          const translationKeys = textScanService.generateTranslationKeys(scannedResults)
          
          return NextResponse.json({
            success: true,
            data: {
              scannedTexts: scannedResults.length,
              translationKeys: translationKeys.length,
              results: scannedResults,
              generatedKeys: translationKeys
            },
            message: `${scannedResults.length}개의 한국어 텍스트를 발견했습니다. ${translationKeys.length}개의 번역 키를 생성했습니다.`
          })
        } catch (error) {
          console.error('프로젝트 스캔 에러:', error)
          return NextResponse.json(
            {
              success: false,
              error: '프로젝트 스캔 중 오류가 발생했습니다.',
              details: error instanceof Error ? error.message : '알 수 없는 오류'
            },
            { status: 500 }
          )
        }

      case 'register_scanned_keys':
        // 스캔된 텍스트를 번역 키로 등록
        const { translationKeys, autoTranslate = false } = data
        if (!translationKeys || !Array.isArray(translationKeys)) {
          return NextResponse.json(
            {
              success: false,
              error: '번역 키 배열이 필요합니다.'
            },
            { status: 400 }
          )
        }

                 try {
           const registeredCount = await registerTranslationKeys(
             translationManager,
             googleTranslateService,
             translationKeys,
             autoTranslate,
             changedBy
           )

          return NextResponse.json({
            success: true,
            data: { registeredCount },
            message: `${registeredCount}개의 번역 키가 등록되었습니다.`
          })
        } catch (error) {
          console.error('번역 키 등록 에러:', error)
          return NextResponse.json(
            {
              success: false,
              error: '번역 키 등록 중 오류가 발생했습니다.',
              details: error instanceof Error ? error.message : '알 수 없는 오류'
            },
            { status: 500 }
          )
        }

      case 'scan_and_register':
        // 프로젝트 스캔 + 번역 키 자동 등록 (원스텝)
        const { 
          projectRoot: scanProjectRoot = process.cwd(), 
          autoTranslateScanned = false,
          confidenceThreshold = 0.7 
        } = data
        
        try {
          const scanService = TextScanService.getInstance()
          const scannedTexts = await scanService.scanProject(scanProjectRoot)
          const generatedKeys = scanService.generateTranslationKeys(scannedTexts)
          
          // 신뢰도 필터링
          const filteredKeys = generatedKeys.filter(key => key.confidence >= confidenceThreshold)
          
                     const registeredCount = await registerTranslationKeys(
             translationManager,
             googleTranslateService,
             filteredKeys,
             autoTranslateScanned,
             changedBy
           )

          return NextResponse.json({
            success: true,
            data: {
              scannedTexts: scannedTexts.length,
              generatedKeys: generatedKeys.length,
              registeredKeys: registeredCount,
              filteredByConfidence: filteredKeys.length
            },
            message: `스캔 완료: ${scannedTexts.length}개 텍스트 발견, ${registeredCount}개 번역 키 등록됨`
          })
        } catch (error) {
          console.error('스캔 및 등록 에러:', error)
          return NextResponse.json(
            {
              success: false,
              error: '스캔 및 등록 중 오류가 발생했습니다.',
              details: error instanceof Error ? error.message : '알 수 없는 오류'
            },
            { status: 500 }
          )
        }

      default:
        return NextResponse.json(
          {
            success: false,
            error: '지원하지 않는 액션입니다.'
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('번역 작업 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '번역 작업 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

// PUT: 번역 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { namespace, key, language, value, changedBy = 'api' } = body

    if (!namespace || !key || !language || value === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: '필수 필드가 누락되었습니다. (namespace, key, language, value)'
        },
        { status: 400 }
      )
    }

    const translationManager = TranslationManager.getInstance()
    translationManager.setTranslation(namespace, key, language, value, changedBy)

    return NextResponse.json({
      success: true,
      message: '번역이 업데이트되었습니다.'
    })

  } catch (error) {
    console.error('번역 업데이트 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '번역 업데이트 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

// DELETE: 번역 삭제 및 히스토리 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const namespace = searchParams.get('namespace') as TranslationNamespace | null
    const key = searchParams.get('key')
    const clearHistory = searchParams.get('clearHistory') === 'true'
    const changedBy = searchParams.get('changedBy') || 'api'

    const translationManager = TranslationManager.getInstance()

    if (clearHistory) {
      // 히스토리 삭제
      translationManager.clearHistory()
      return NextResponse.json({
        success: true,
        message: '번역 히스토리가 삭제되었습니다.'
      })
    }

    if (!namespace || !key) {
      return NextResponse.json(
        {
          success: false,
          error: '네임스페이스와 키가 필요합니다.'
        },
        { status: 400 }
      )
    }

    translationManager.deleteTranslation(namespace, key, changedBy)

    return NextResponse.json({
      success: true,
      message: '번역이 삭제되었습니다.'
    })

  } catch (error) {
    console.error('번역 삭제 에러:', error)
    return NextResponse.json(
      {
        success: false,
        error: '번역 삭제 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
} 