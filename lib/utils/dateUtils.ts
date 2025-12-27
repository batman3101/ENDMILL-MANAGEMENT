/**
 * 공장 근무시간 기준 날짜 유틸리티
 *
 * 베트남 공장 근무시간 기준:
 * - 시간대: UTC+7 (베트남)
 * - 하루 시작: 08:00 (베트남 시간)
 * - 하루 종료: 다음날 08:00 (베트남 시간)
 *
 * 예: 2024-12-27의 범위는
 * - 시작: 2024-12-27 08:00 베트남 = 2024-12-27 01:00 UTC
 * - 종료: 2024-12-28 08:00 베트남 = 2024-12-28 01:00 UTC
 */

// 베트남 시간대 오프셋 (분 단위)
const VIETNAM_OFFSET_MINUTES = 7 * 60 // UTC+7

// 공장 하루 시작 시간 (베트남 시간 기준)
const FACTORY_DAY_START_HOUR = 8 // 08:00

/**
 * 현재 베트남 시간 가져오기
 */
export function getVietnamTime(date: Date = new Date()): Date {
  return new Date(date.getTime() + VIETNAM_OFFSET_MINUTES * 60 * 1000)
}

/**
 * 공장 근무시간 기준으로 "오늘" 날짜 가져오기 (YYYY-MM-DD 형식)
 *
 * 현재 베트남 시간이 08:00 이전이면 전날을 반환
 */
export function getFactoryToday(): string {
  const vietnamTime = getVietnamTime()
  const currentHour = vietnamTime.getUTCHours()

  // 08:00 이전이면 전날로 설정
  if (currentHour < FACTORY_DAY_START_HOUR) {
    vietnamTime.setUTCDate(vietnamTime.getUTCDate() - 1)
  }

  return vietnamTime.toISOString().split('T')[0]
}

/**
 * 공장 근무시간 기준으로 "어제" 날짜 가져오기 (YYYY-MM-DD 형식)
 */
export function getFactoryYesterday(): string {
  const today = getFactoryToday()
  const yesterday = new Date(today + 'T00:00:00Z')
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

/**
 * 특정 날짜의 공장 근무시간 범위 가져오기 (UTC ISO 문자열)
 *
 * @param date - YYYY-MM-DD 형식의 날짜 (없으면 오늘)
 * @returns { start: string, end: string } - UTC ISO 문자열
 */
export function getFactoryDayRange(date?: string): { start: string; end: string } {
  let targetDate: Date

  if (date) {
    targetDate = new Date(date + 'T00:00:00Z')
  } else {
    const today = getFactoryToday()
    targetDate = new Date(today + 'T00:00:00Z')
  }

  // 시작: targetDate 08:00 베트남 시간 = UTC 01:00
  const startDate = new Date(targetDate)
  startDate.setUTCHours(FACTORY_DAY_START_HOUR - VIETNAM_OFFSET_MINUTES / 60, 0, 0, 0)

  // 종료: targetDate+1일 08:00 베트남 시간
  const endDate = new Date(targetDate)
  endDate.setUTCDate(endDate.getUTCDate() + 1)
  endDate.setUTCHours(FACTORY_DAY_START_HOUR - VIETNAM_OFFSET_MINUTES / 60, 0, 0, 0)

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  }
}

/**
 * 특정 날짜가 공장 근무시간 기준 "오늘"인지 확인
 *
 * @param dateString - ISO 문자열 또는 YYYY-MM-DD 형식
 */
export function isFactoryToday(dateString: string): boolean {
  const today = getFactoryToday()
  const { start, end } = getFactoryDayRange(today)

  // dateString이 YYYY-MM-DD 형식이면 시간 정보 추가
  const checkDate = dateString.includes('T')
    ? new Date(dateString)
    : new Date(dateString + 'T00:00:00Z')

  const startDate = new Date(start)
  const endDate = new Date(end)

  return checkDate >= startDate && checkDate < endDate
}

/**
 * created_at 기반으로 공장 근무일 날짜(YYYY-MM-DD) 계산
 *
 * @param createdAt - ISO 문자열
 * @returns YYYY-MM-DD 형식의 공장 근무일 날짜
 */
export function getFactoryDateFromCreatedAt(createdAt: string): string {
  const date = new Date(createdAt)
  const vietnamTime = getVietnamTime(date)
  const hour = vietnamTime.getUTCHours()

  // 08:00 이전이면 전날로 계산
  if (hour < FACTORY_DAY_START_HOUR) {
    vietnamTime.setUTCDate(vietnamTime.getUTCDate() - 1)
  }

  return vietnamTime.toISOString().split('T')[0]
}

/**
 * 기간 필터에 따른 날짜 범위 계산 (공장 시간 기준)
 *
 * @param period - 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom'
 * @param customStart - custom인 경우 시작 날짜 (YYYY-MM-DD)
 * @param customEnd - custom인 경우 종료 날짜 (YYYY-MM-DD)
 */
export function getFactoryPeriodRange(
  period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom',
  customStart?: string,
  customEnd?: string
): { start: string; end: string } {
  const today = getFactoryToday()
  const todayDate = new Date(today + 'T00:00:00Z')

  switch (period) {
    case 'today':
      return getFactoryDayRange(today)

    case 'yesterday': {
      const yesterday = getFactoryYesterday()
      return getFactoryDayRange(yesterday)
    }

    case 'thisWeek': {
      // 이번 주 월요일부터 오늘까지
      const dayOfWeek = todayDate.getUTCDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // 일요일이면 -6, 아니면 1-현재요일
      const monday = new Date(todayDate)
      monday.setUTCDate(monday.getUTCDate() + mondayOffset)

      const { start } = getFactoryDayRange(monday.toISOString().split('T')[0])
      const { end } = getFactoryDayRange(today)
      return { start, end }
    }

    case 'lastWeek': {
      // 지난 주 월요일부터 일요일까지
      const dayOfWeek = todayDate.getUTCDay()
      const lastMondayOffset = dayOfWeek === 0 ? -13 : -6 - dayOfWeek
      const lastMonday = new Date(todayDate)
      lastMonday.setUTCDate(lastMonday.getUTCDate() + lastMondayOffset)

      const lastSunday = new Date(lastMonday)
      lastSunday.setUTCDate(lastSunday.getUTCDate() + 6)

      const { start } = getFactoryDayRange(lastMonday.toISOString().split('T')[0])
      const { end } = getFactoryDayRange(lastSunday.toISOString().split('T')[0])
      return { start, end }
    }

    case 'thisMonth': {
      // 이번 달 1일부터 오늘까지
      const firstDay = new Date(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1)
      const { start } = getFactoryDayRange(firstDay.toISOString().split('T')[0])
      const { end } = getFactoryDayRange(today)
      return { start, end }
    }

    case 'custom': {
      if (!customStart || !customEnd) {
        return getFactoryDayRange(today)
      }
      const { start } = getFactoryDayRange(customStart)
      const { end } = getFactoryDayRange(customEnd)
      return { start, end }
    }

    default:
      return getFactoryDayRange(today)
  }
}

/**
 * 두 날짜 비교 (공장 근무일 기준)
 *
 * @param date1 - ISO 문자열
 * @param date2 - ISO 문자열
 * @returns true if same factory day
 */
export function isSameFactoryDay(date1: string, date2: string): boolean {
  const factoryDate1 = getFactoryDateFromCreatedAt(date1)
  const factoryDate2 = getFactoryDateFromCreatedAt(date2)
  return factoryDate1 === factoryDate2
}
