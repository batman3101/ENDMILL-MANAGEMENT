import * as fs from 'fs'
import * as path from 'path'

// TranslationNamespace 타입 정의
type TranslationNamespace = 'common' | 'navigation' | 'dashboard' | 'equipment' | 'endmill' | 'inventory' | 'toolChanges' | 'camSheets' | 'users' | 'settings' | 'reports'

/**
 * 한국어 텍스트 스캔 및 추출 서비스
 * 프로젝트 파일을 스캔하여 하드코딩된 한국어 텍스트를 찾아 번역 키로 등록
 */
export class TextScanService {
  private static instance: TextScanService
  
  // 스캔할 파일 확장자
  private static readonly SCAN_EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx']
  
  // 제외할 디렉토리
  private static readonly EXCLUDE_DIRS = [
    'node_modules', 
    '.next', 
    '.git', 
    'dist', 
    'build',
    'coverage',
    '.cursor'
  ]

  // 한국어 텍스트 패턴 (정규식)
  private static readonly KOREAN_PATTERNS = [
    // 따옴표 안의 한글 텍스트
    /['"`]([^'"`]*[가-힣]+[^'"`]*)['"`]/g,
    // JSX 텍스트 노드의 한글
    />([^<]*[가-힣]+[^<]*)</g,
    // template literal 내의 한글
    /`([^`]*[가-힣]+[^`]*)`/g,
    // title, placeholder, alt 등 속성값의 한글
    /(title|placeholder|alt|aria-label|data-tooltip)=['"`]([^'"`]*[가-힣]+[^'"`]*)['"`]/g
  ]

  // 네임스페이스 매핑 (파일 경로 기반)
  private static readonly NAMESPACE_MAPPING: Record<string, TranslationNamespace> = {
    '/dashboard/page.tsx': 'dashboard',
    '/dashboard/equipment/': 'equipment', 
    '/dashboard/endmill/': 'endmill',
    '/dashboard/inventory/': 'inventory',
    '/dashboard/cam-sheets/': 'camSheets',
    '/dashboard/tool-changes/': 'toolChanges',
    '/dashboard/reports/': 'reports',
    '/dashboard/settings/': 'settings',
    '/dashboard/users/': 'users',
    '/(auth)/': 'common',
    '/layout.tsx': 'navigation',
    '/components/': 'common'
  }

  private constructor() {}

  public static getInstance(): TextScanService {
    if (!TextScanService.instance) {
      TextScanService.instance = new TextScanService()
    }
    return TextScanService.instance
  }

  /**
   * 프로젝트 전체 스캔 시작
   */
  public async scanProject(projectRoot: string): Promise<ScannedTextResult[]> {
    const results: ScannedTextResult[] = []
    
    console.log('🔍 프로젝트 전체 한국어 텍스트 스캔 시작...')
    
    await this.scanDirectory(projectRoot, results)
    
    console.log(`✅ 스캔 완료: ${results.length}개의 한국어 텍스트 발견`)
    
    return this.deduplicate(results)
  }

  /**
   * 특정 디렉토리 스캔
   */
  private async scanDirectory(dirPath: string, results: ScannedTextResult[]): Promise<void> {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        
        if (entry.isDirectory()) {
          // 제외 디렉토리 체크
          if (!TextScanService.EXCLUDE_DIRS.includes(entry.name)) {
            await this.scanDirectory(fullPath, results)
          }
        } else if (entry.isFile()) {
          // 스캔 대상 파일 확장자 체크
          const ext = path.extname(entry.name)
          if (TextScanService.SCAN_EXTENSIONS.includes(ext)) {
            await this.scanFile(fullPath, results)
          }
        }
      }
    } catch (error) {
      console.error(`디렉토리 스캔 오류 (${dirPath}):`, error)
    }
  }

  /**
   * 개별 파일 스캔
   */
  private async scanFile(filePath: string, results: ScannedTextResult[]): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const koreanTexts = this.extractKoreanTexts(content)
      
      if (koreanTexts.length > 0) {
        const namespace = this.determineNamespace(filePath)
        const relativePath = this.getRelativePath(filePath)
        
        for (const text of koreanTexts) {
          results.push({
            text: text.text,
            context: text.context,
            filePath: relativePath,
            lineNumber: text.lineNumber,
            namespace,
            suggestedKey: this.generateKey(text.text),
            confidence: this.calculateConfidence(text.text, text.context)
          })
        }
        
        console.log(`📄 ${relativePath}: ${koreanTexts.length}개 텍스트 발견`)
      }
    } catch (error) {
      console.error(`파일 스캔 오류 (${filePath}):`, error)
    }
  }

  /**
   * 한국어 텍스트 추출
   */
  private extractKoreanTexts(content: string): ExtractedText[] {
    const results: ExtractedText[] = []
    const lines = content.split('\n')
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      const lineNumber = lineIndex + 1
      
      // 주석 및 import 문 제외
      if (this.isIgnoredLine(line)) {
        continue
      }
      
      // 각 패턴별로 매칭
      for (const pattern of TextScanService.KOREAN_PATTERNS) {
        let match
        while ((match = pattern.exec(line)) !== null) {
          const matchedText = match[1] || match[2] || match[0]
          
          if (this.isValidKoreanText(matchedText)) {
            results.push({
              text: matchedText.trim(),
              context: this.determineContext(line, match.index),
              lineNumber,
              columnStart: match.index,
              columnEnd: match.index + match[0].length
            })
          }
        }
        
        // 정규식 상태 초기화
        pattern.lastIndex = 0
      }
    }
    
    return results
  }

  /**
   * 무시할 라인 체크 (주석, import 등)
   */
  private isIgnoredLine(line: string): boolean {
    const trimmed = line.trim()
    return (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export ') ||
      trimmed.includes('console.log') ||
      trimmed.includes('console.error') ||
      trimmed.includes('// TODO') ||
      trimmed.includes('// FIXME')
    )
  }

  /**
   * 유효한 한국어 텍스트인지 검증
   */
  private isValidKoreanText(text: string): boolean {
    const cleaned = text.trim()
    
    // 너무 짧거나 긴 텍스트 제외
    if (cleaned.length < 2 || cleaned.length > 100) {
      return false
    }
    
    // 한글이 포함되어 있는지 확인
    if (!/[가-힣]/.test(cleaned)) {
      return false
    }
    
    // 변수명, 함수명 등 제외
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(cleaned)) {
      return false
    }
    
    // URL, 이메일, 파일 경로 등 제외
    if (/(https?:\/\/|@|\/[a-zA-Z]|\\[a-zA-Z])/.test(cleaned)) {
      return false
    }
    
    // 코드 패턴 제외
    if (/[{}()\[\];:]/.test(cleaned)) {
      return false
    }
    
    return true
  }

  /**
   * 컨텍스트 결정 (JSX, 속성, 문자열 등)
   */
  private determineContext(line: string, matchIndex: number): TextContext {
    const beforeMatch = line.substring(0, matchIndex)
    const afterMatch = line.substring(matchIndex)
    
    // JSX 텍스트 노드
    if (beforeMatch.includes('>') && afterMatch.includes('<')) {
      return 'jsx_text'
    }
    
    // JSX 속성
    if (/(title|placeholder|alt|aria-label)=['"`]/.test(beforeMatch)) {
      return 'jsx_attribute'
    }
    
    // 객체 속성값
    if (/\w+\s*:\s*['"`]/.test(beforeMatch)) {
      return 'object_value'
    }
    
    // 함수 호출 인수
    if (/\w+\s*\(\s*['"`]/.test(beforeMatch)) {
      return 'function_argument'
    }
    
    return 'string_literal'
  }

  /**
   * 파일 경로 기반 네임스페이스 결정
   */
  private determineNamespace(filePath: string): TranslationNamespace {
    const normalizedPath = filePath.replace(/\\/g, '/')
    
    for (const [pathPattern, namespace] of Object.entries(TextScanService.NAMESPACE_MAPPING)) {
      if (normalizedPath.includes(pathPattern)) {
        return namespace
      }
    }
    
    return 'common' // 기본값
  }

  /**
   * 상대 경로 생성
   */
  private getRelativePath(fullPath: string): string {
    // 프로젝트 루트 기준 상대 경로 생성
    return fullPath.replace(process.cwd(), '').replace(/\\/g, '/')
  }

  /**
   * 번역 키 자동 생성
   */
  private generateKey(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^가-힣a-z0-9\s]/g, '') // 특수문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로
      .substring(0, 50) // 최대 50자
  }

  /**
   * 신뢰도 계산 (얼마나 확실한 번역 대상인지)
   */
  private calculateConfidence(text: string, context: TextContext): number {
    let confidence = 0.5 // 기본값
    
    // 컨텍스트별 가중치
    switch (context) {
      case 'jsx_text':
        confidence += 0.3 // UI 텍스트일 가능성 높음
        break
      case 'jsx_attribute':
        confidence += 0.2 // 속성값
        break
      case 'object_value':
        confidence += 0.1
        break
      default:
        break
    }
    
    // 텍스트 길이별 가중치
    if (text.length >= 5 && text.length <= 30) {
      confidence += 0.2 // 적절한 길이
    }
    
    // 완전한 문장인지 체크
    if (/[.!?]$/.test(text)) {
      confidence += 0.1
    }
    
    return Math.min(confidence, 1.0)
  }

  /**
   * 중복 제거
   */
  private deduplicate(results: ScannedTextResult[]): ScannedTextResult[] {
    const unique = new Map<string, ScannedTextResult>()
    
    for (const result of results) {
      const key = `${result.namespace}:${result.text}`
      if (!unique.has(key) || unique.get(key)!.confidence < result.confidence) {
        unique.set(key, result)
      }
    }
    
    return Array.from(unique.values()).sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * 스캔 결과를 번역 키로 자동 등록
   */
  public generateTranslationKeys(scannedResults: ScannedTextResult[]): AutoGeneratedTranslation[] {
    return scannedResults
      .filter(result => result.confidence >= 0.6) // 신뢰도 60% 이상만
      .map(result => ({
        namespace: result.namespace,
        key: result.suggestedKey,
        koreanText: result.text,
        context: result.context,
        sourceFiles: [result.filePath],
        confidence: result.confidence,
        needsReview: result.confidence < 0.8 // 신뢰도 80% 미만은 검토 필요
      }))
  }
}

// 타입 정의
export interface ScannedTextResult {
  text: string
  context: TextContext
  filePath: string
  lineNumber: number
  namespace: TranslationNamespace
  suggestedKey: string
  confidence: number
}

export interface ExtractedText {
  text: string
  context: TextContext
  lineNumber: number
  columnStart: number
  columnEnd: number
}

export type TextContext = 
  | 'jsx_text' 
  | 'jsx_attribute' 
  | 'object_value' 
  | 'function_argument' 
  | 'string_literal'

export interface AutoGeneratedTranslation {
  namespace: TranslationNamespace
  key: string
  koreanText: string
  context: TextContext
  sourceFiles: string[]
  confidence: number
  needsReview: boolean
} 