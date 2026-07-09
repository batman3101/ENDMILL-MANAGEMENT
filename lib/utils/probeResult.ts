// Renishaw 프로브 판정: 반복 정밀도(µm) 단일 임계값 → OK/NG
// 5µm 이하 OK / 5µm 초과 NG (임계값은 앱 설정 probe.repeatabilityThreshold에서 조정 가능)
// 클라이언트(검사모드 실시간 표시)와 서버(저장 시 판정) 양쪽에서 동일 함수를 재사용한다.
import { ProbeResult, DEFAULT_REPEATABILITY_THRESHOLD_UM } from '../types/probe'

export interface ProbeResultRules {
  repeatabilityThreshold: number // µm 상한 (이하 OK, 초과 NG)
}

export const DEFAULT_PROBE_RESULT_RULES: ProbeResultRules = {
  repeatabilityThreshold: DEFAULT_REPEATABILITY_THRESHOLD_UM
}

/**
 * 반복 정밀도(µm)를 임계값과 비교해 OK/NG를 판정한다.
 * 임계값 이하(포함)는 OK, 초과는 NG.
 */
export function judgeProbeResult(
  repeatabilityUm: number,
  rules: ProbeResultRules = DEFAULT_PROBE_RESULT_RULES
): ProbeResult {
  return repeatabilityUm <= rules.repeatabilityThreshold ? 'OK' : 'NG'
}
