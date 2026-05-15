type TranslationFunction = (key: string) => string

const REASON_TRANSLATION_KEYS: Record<string, string> = {
  '정기교체': 'toolChanges.regularReplacement',
  '수명완료': 'toolChanges.lifeCompleted',
  '정상 수명': 'toolChanges.lifeCompleted',
  '정상 교체': 'toolChanges.regularReplacement',
  '파손': 'toolChanges.broken',
  '마모': 'toolChanges.wear',
  '예방교체': 'toolChanges.preventive',
  '예발교체': 'toolChanges.preventive',
  '모델변경': 'toolChanges.modelChange',
  '모델교체': 'toolChanges.modelChange',
  '추가SETUP': 'toolChanges.additionalSetup',
  '품질불량': 'toolChanges.qualityDefect',
  '품질테스트': 'toolChanges.qualityDefect',
  '공구테스트': 'toolChanges.toolTest',
  '미지정': 'toolChanges.notSpecified',
  Unknown: 'toolChanges.notSpecified',
  '기타': 'toolChanges.other',
}

export function getToolChangeReasonLabel(reason: string, t: TranslationFunction): string {
  const key = REASON_TRANSLATION_KEYS[reason]
  return key ? t(key) : reason
}
