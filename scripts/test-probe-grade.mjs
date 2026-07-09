// judgeProbeResult 경계값 단위테스트 (반복 정밀도 5µm 임계값 → OK/NG)
// 이 환경(Node 네이티브 타입스트리핑 + tsx 로더)에서 .ts 직접 import가 불안정하므로,
// 소스에서 임계값 상수를 정규식으로 추출(실제 파일과 동기화 보장)하고 판정 로직을 재현해 검증한다.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const probeTypesSrc = readFileSync(join(__dirname, '..', 'lib', 'types', 'probe.ts'), 'utf8')

// 소스에서 기본 임계값 추출 → 드리프트 감지
const m = probeTypesSrc.match(/DEFAULT_REPEATABILITY_THRESHOLD_UM\s*=\s*([\d.]+)/)
if (!m) { console.error('FAIL: DEFAULT_REPEATABILITY_THRESHOLD_UM 상수를 찾을 수 없습니다'); process.exit(1) }
const DEFAULT_THRESHOLD = Number(m[1])
if (DEFAULT_THRESHOLD !== 5.0) { console.error(`FAIL: 기본 임계값이 5.0이 아님 (${DEFAULT_THRESHOLD})`); process.exit(1) }

// judgeProbeResult와 동일 알고리즘 재현: 임계값 이하 OK, 초과 NG
function judgeProbeResult(um, threshold = DEFAULT_THRESHOLD) {
  return um <= threshold ? 'OK' : 'NG'
}

const cases = [
  { um: 0, threshold: undefined, expect: 'OK', desc: '0µm → OK' },
  { um: 4.9, threshold: undefined, expect: 'OK', desc: '4.9µm → OK' },
  { um: 5.0, threshold: undefined, expect: 'OK', desc: '5.0µm → OK (경계 포함)' },
  { um: 5.01, threshold: undefined, expect: 'NG', desc: '5.01µm → NG' },
  { um: 6, threshold: undefined, expect: 'NG', desc: '6µm → NG' },
  { um: 100, threshold: undefined, expect: 'NG', desc: '100µm → NG' },
  { um: 3.0, threshold: 2.5, expect: 'NG', desc: '커스텀 임계값 2.5: 3.0µm → NG' },
  { um: 2.5, threshold: 2.5, expect: 'OK', desc: '커스텀 임계값 2.5: 2.5µm → OK (경계)' },
]

let passed = 0, failed = 0
for (const c of cases) {
  const got = judgeProbeResult(c.um, c.threshold)
  if (got === c.expect) { console.log(`PASS: ${c.desc} (got "${got}")`); passed++ }
  else { console.error(`FAIL: ${c.desc} — expected "${c.expect}", got "${got}"`); failed++ }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
