/**
 * SQL Validator
 * Gemini가 생성한 SQL 쿼리의 안전성을 검증
 * SQL Injection 및 악의적인 쿼리 차단
 */

// 허용된 SQL 명령어
const ALLOWED_COMMANDS = ['SELECT']

// 허용된 테이블
const ALLOWED_TABLES = [
  'tool_changes',
  'equipment',
  'endmill_types',
  'endmill_categories',
  'inventory',
  'inventory_transactions',
  'user_profiles',
  'cam_sheets',
  'cam_sheet_endmills',
  'suppliers',
  'endmill_supplier_prices',
  'tool_positions',
  'user_roles',
]

// 금지된 SQL 패턴 (정규식)
const FORBIDDEN_PATTERNS = [
  /DROP\s+TABLE/i,
  /DROP\s+DATABASE/i,
  /DELETE\s+FROM/i,
  /UPDATE\s+\w/i,
  /INSERT\s+INTO/i,
  /TRUNCATE/i,
  /ALTER\s+TABLE/i,
  /CREATE\s+TABLE/i,
  /CREATE\s+DATABASE/i,
  /GRANT\s+/i,
  /REVOKE\s+/i,
  /;.*SELECT/i, // 다중 쿼리 방지
  /;\s*$/i, // 세미콜론으로 끝나는 경우 (다중 쿼리 시도)
  /--/i, // SQL 주석
  /\/\*/i, // 블록 주석 시작
  /xp_cmdshell/i, // SQL Server 명령어 실행
  /exec\s*\(/i, // 동적 SQL 실행
  /execute\s+immediate/i, // Oracle 동적 SQL
]

// 금지된 함수 (위험한 PostgreSQL 함수)
const FORBIDDEN_FUNCTIONS = [
  'pg_sleep',
  'pg_read_file',
  'pg_ls_dir',
  'pg_read_binary_file',
  'pg_stat_file',
  'copy',
  'lo_import',
  'lo_export',
  'dblink',
  'dblink_exec',
]

// 검증 오류 타입
export class SQLValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message)
    this.name = 'SQLValidationError'
  }
}

/**
 * SQL 쿼리에서 테이블명 추출
 */
function extractTableNames(sql: string): string[] {
  const tables: string[] = []

  // FROM 절에서 테이블명 추출
  const fromMatches = Array.from(sql.matchAll(/FROM\s+(\w+)/gi))
  for (const match of fromMatches) {
    tables.push(match[1].toLowerCase())
  }

  // JOIN 절에서 테이블명 추출
  const joinMatches = Array.from(sql.matchAll(/JOIN\s+(\w+)/gi))
  for (const match of joinMatches) {
    tables.push(match[1].toLowerCase())
  }

  return Array.from(new Set(tables)) // 중복 제거
}

/**
 * SQL 쿼리에서 사용된 함수명 추출
 */
function extractFunctionNames(sql: string): string[] {
  const functions: string[] = []

  // 함수 호출 패턴: function_name(
  const functionMatches = Array.from(sql.matchAll(/(\w+)\s*\(/g))
  for (const match of functionMatches) {
    const funcName = match[1].toLowerCase()
    // 집계 함수나 일반 함수가 아닌 경우만 추가
    if (!['count', 'sum', 'avg', 'max', 'min', 'round', 'cast', 'coalesce'].includes(funcName)) {
      functions.push(funcName)
    }
  }

  return Array.from(new Set(functions))
}

/**
 * SQL 쿼리 검증
 *
 * @throws {SQLValidationError} 검증 실패 시
 */
export function validateSQL(sql: string): void {
  if (!sql || typeof sql !== 'string') {
    throw new SQLValidationError(
      'Invalid SQL: Query is empty or not a string',
      'INVALID_INPUT'
    )
  }

  const trimmedSQL = sql.trim()

  // 1. 허용된 명령어 체크
  const firstWord = trimmedSQL.split(/\s+/)[0].toUpperCase()
  if (!ALLOWED_COMMANDS.includes(firstWord)) {
    throw new SQLValidationError(
      `SQL 명령어가 허용되지 않습니다. SELECT 쿼리만 사용 가능합니다.`,
      'FORBIDDEN_COMMAND',
      `Detected command: ${firstWord}`
    )
  }

  // 2. 금지된 패턴 체크
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmedSQL)) {
      throw new SQLValidationError(
        `쿼리에 금지된 패턴이 포함되어 있습니다.`,
        'FORBIDDEN_PATTERN',
        `Pattern: ${pattern.source}`
      )
    }
  }

  // 3. 테이블명 체크
  const tables = extractTableNames(trimmedSQL)
  const unauthorizedTables = tables.filter(
    table => !ALLOWED_TABLES.includes(table)
  )

  if (unauthorizedTables.length > 0) {
    throw new SQLValidationError(
      `허용되지 않은 테이블에 접근하려고 합니다: ${unauthorizedTables.join(', ')}`,
      'UNAUTHORIZED_TABLE',
      `Allowed tables: ${ALLOWED_TABLES.join(', ')}`
    )
  }

  // 4. 금지된 함수 체크
  const functions = extractFunctionNames(trimmedSQL)
  const forbiddenFuncs = functions.filter(func =>
    FORBIDDEN_FUNCTIONS.includes(func)
  )

  if (forbiddenFuncs.length > 0) {
    throw new SQLValidationError(
      `금지된 함수가 사용되었습니다: ${forbiddenFuncs.join(', ')}`,
      'FORBIDDEN_FUNCTION'
    )
  }

  // 5. 쿼리 길이 체크 (DoS 방지)
  if (trimmedSQL.length > 10000) {
    throw new SQLValidationError(
      '쿼리가 너무 깁니다. 최대 10,000자까지 허용됩니다.',
      'QUERY_TOO_LONG'
    )
  }

  // 6. UNION 쿼리 체크 (제한적 허용)
  const unionMatches = trimmedSQL.match(/UNION/gi)
  if (unionMatches && unionMatches.length > 2) {
    throw new SQLValidationError(
      'UNION 쿼리는 최대 2개까지만 허용됩니다.',
      'TOO_MANY_UNIONS'
    )
  }

  // 7. Subquery 깊이 체크
  const openParens = (trimmedSQL.match(/\(/g) || []).length
  const closeParens = (trimmedSQL.match(/\)/g) || []).length

  if (openParens !== closeParens) {
    throw new SQLValidationError(
      '괄호가 올바르게 닫히지 않았습니다.',
      'UNBALANCED_PARENTHESES'
    )
  }

  if (openParens > 10) {
    throw new SQLValidationError(
      '서브쿼리 깊이가 너무 깊습니다. 최대 10단계까지 허용됩니다.',
      'TOO_DEEP_SUBQUERY'
    )
  }

  // 모든 검증 통과
}

/**
 * SQL 쿼리 안전성 점수 (0-100)
 * 높을수록 안전
 */
export function getSafetyScore(sql: string): number {
  let score = 100

  try {
    validateSQL(sql)
  } catch (_error) {
    // 검증 실패하면 0점
    return 0
  }

  // 추가 점수 차감 요인

  // UNION 사용 (-10점)
  if (/UNION/i.test(sql)) {
    score -= 10
  }

  // Subquery 사용 (-5점 per level)
  const subqueryDepth = (sql.match(/\(/g) || []).length
  score -= subqueryDepth * 5

  // LIKE 패턴 사용 (-5점, 성능 이슈)
  if (/LIKE/i.test(sql)) {
    score -= 5
  }

  // 여러 테이블 JOIN (-5점 per join)
  const joinCount = (sql.match(/JOIN/gi) || []).length
  score -= joinCount * 5

  // 집계 함수 사용 (+5점, 분석 쿼리)
  if (/COUNT|SUM|AVG|MAX|MIN/i.test(sql)) {
    score += 5
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * SQL 쿼리 정리 (sanitize)
 * 불필요한 공백, 주석 제거
 */
export function sanitizeSQL(sql: string): string {
  let cleaned = sql

  // 여러 공백을 하나로
  cleaned = cleaned.replace(/\s+/g, ' ')

  // 앞뒤 공백 제거
  cleaned = cleaned.trim()

  // 세미콜론 제거 (다중 쿼리 방지)
  cleaned = cleaned.replace(/;+$/g, '')

  return cleaned
}

/**
 * 안전한 SQL 실행을 위한 래퍼
 */
export async function executeSafeSQL<T = any>(
  sql: string,
  executor: (sql: string) => Promise<T>
): Promise<T> {
  // 1. 정리
  const cleanedSQL = sanitizeSQL(sql)

  // 2. 검증
  validateSQL(cleanedSQL)

  // 3. 안전성 점수 체크
  const safetyScore = getSafetyScore(cleanedSQL)
  if (safetyScore < 50) {
    throw new SQLValidationError(
      `SQL 안전성 점수가 너무 낮습니다: ${safetyScore}/100`,
      'LOW_SAFETY_SCORE'
    )
  }

  // 4. 실행
  try {
    return await executor(cleanedSQL)
  } catch (error: any) {
    // PostgreSQL 에러를 사용자 친화적으로 변환
    if (error.code === '42P01') {
      throw new SQLValidationError(
        '존재하지 않는 테이블입니다.',
        'TABLE_NOT_FOUND',
        error.message
      )
    } else if (error.code === '42703') {
      throw new SQLValidationError(
        '존재하지 않는 컬럼입니다.',
        'COLUMN_NOT_FOUND',
        error.message
      )
    } else {
      throw error
    }
  }
}

export default validateSQL
