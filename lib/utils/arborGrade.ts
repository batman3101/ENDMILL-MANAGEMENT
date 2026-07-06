import { ArborGrade } from '../types/arbor'

// Samsung CNC 설비 정밀도 점검(홀더) 표준: 등급은 런아웃 단독 기준으로 산정한다.
//   A ≤ 10µm / B ≤ 30µm / C ≤ 50µm / D > 50µm
// (Taper 외관은 등급에 반영하지 않으며, 선택적 관찰 기록으로만 남긴다.)
export interface ArborGradeRules {
  runoutThresholds: { A: number; B: number; C: number } // µm 상한 (이하 포함)
}

export function judgeArborGrade(runoutUm: number, rules: ArborGradeRules): ArborGrade {
  const th = rules.runoutThresholds
  if (runoutUm <= th.A) return 'A'
  if (runoutUm <= th.B) return 'B'
  if (runoutUm <= th.C) return 'C'
  return 'D'
}
