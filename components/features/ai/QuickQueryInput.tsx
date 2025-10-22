'use client'

/**
 * QuickQueryInput Component
 * 빠른 자연어 질문 입력 컴포넌트
 */

import { useState } from 'react'
import { useTranslations } from '@/lib/hooks/useTranslations'
import { useNaturalLanguageQuery, type ChatHistoryItem } from '@/lib/hooks/useAI'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Send, Sparkles, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

interface QuickQueryInputProps {
  onResult?: (result: any) => void
  onReset?: () => void
  className?: string
  chatHistory?: ChatHistoryItem[]
}

export function QuickQueryInput({ onResult, onReset, className, chatHistory = [] }: QuickQueryInputProps) {
  const { t } = useTranslations()
  const [question, setQuestion] = useState('')
  const queryMutation = useNaturalLanguageQuery()

  // 예시 질문들
  const exampleQuestions = [
    t('aiInsights.exampleQ1'),
    t('aiInsights.exampleQ2'),
    t('aiInsights.exampleQ3'),
    t('aiInsights.exampleQ4'),
    t('aiInsights.exampleQ5'),
  ]

  const handleSubmit = async () => {
    console.log('[QuickQueryInput] handleSubmit 호출됨')
    console.log('[QuickQueryInput] question:', question)
    console.log('[QuickQueryInput] chatHistory length:', chatHistory.length)

    if (!question.trim()) {
      toast.error('질문을 입력하세요.')
      return
    }

    try {
      console.log('[QuickQueryInput] API 호출 시작:', { question, chatHistoryLength: chatHistory.length })

      const result = await queryMutation.mutateAsync({
        question,
        chatHistory
      })

      console.log('[QuickQueryInput] API 응답 받음:', result)

      // 성공 시 콜백 호출
      if (onResult) {
        onResult(result)
      }

      // 입력 필드 초기화
      setQuestion('')

      // 캐시 여부 표시
      if (result.cached) {
        toast.success('캐시된 결과입니다 ⚡')
      }
    } catch (error: any) {
      console.error('[QuickQueryInput] API 에러:', error)
      toast.error(error.message || t('aiInsights.queryError'))
    }
  }

  const handleExampleClick = (example: string) => {
    setQuestion(example)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter 또는 Cmd+Enter로 전송
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardContent className="pt-6">
          {/* 질문 입력 */}
          <div className="space-y-4">
            <div className="relative">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('aiInsights.questionPlaceholder')}
                className="min-h-[120px] pr-12 resize-none"
                disabled={queryMutation.isPending}
              />
              <div className="absolute bottom-4 right-4">
                <Button
                  onClick={() => {
                    console.log('[QuickQueryInput] 전송 버튼 클릭됨')
                    handleSubmit()
                  }}
                  disabled={!question.trim() || queryMutation.isPending}
                  size="icon"
                  className="rounded-full"
                >
                  {queryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 예시 질문 버튼들 */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                {t('aiInsights.exampleQuestions')}
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleClick(example)}
                    disabled={queryMutation.isPending}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>

            {/* 힌트 및 새로운 질문 시작 버튼 */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Ctrl + Enter를 눌러 질문 전송
              </p>
              {onReset && (
                <Button
                  onClick={onReset}
                  size="sm"
                  className="gap-2 bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                  새로운 질문 시작
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
