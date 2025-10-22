'use client'

/**
 * AI Insights Page
 * AI 인사이트 메인 페이지
 */

import { useState } from 'react'
import { useTranslations } from '@/lib/hooks/useTranslations'
import { useInsights } from '@/lib/hooks/useAI'
import { QuickQueryInput } from '@/components/features/ai/QuickQueryInput'
import { InsightList } from '@/components/features/ai/InsightCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ChatHistoryItem } from '@/lib/services/naturalLanguageQuery'

export default function AIInsightsPage() {
  const { t } = useTranslations()
  const [queryResult, setQueryResult] = useState<any>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [conversationHistory, setConversationHistory] = useState<Array<{
    question: string
    answer: string
    timestamp: number
  }>>([])

  // 자동 인사이트 조회
  const {
    data: insightsData,
    isLoading,
    isError,
    error,
  } = useInsights()

  return (
    <div className="space-y-6 pb-16">
      {/* 페이지 헤더 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-purple-600" />
              {t('aiInsights.title')}
            </h1>
            <div className="mt-2 space-y-1">
              <p className="text-muted-foreground">
                {t('aiInsights.subtitle')}
              </p>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>• 첫 질문 후 연관된 질문을 이어서 진행 가능합니다.</p>
                <p>• 새로운 인사이트가 필요하면 <span className="font-medium text-purple-600">[새로운 질문 시작]</span> 버튼을 클릭하세요.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 빠른 질문 입력 */}
      <QuickQueryInput
        chatHistory={chatHistory}
        onResult={(result) => {
          setQueryResult(result)

          // 대화 히스토리 업데이트
          setChatHistory(prev => [
            ...prev,
            {
              role: 'user',
              content: result.question,
              timestamp: Date.now()
            },
            {
              role: 'assistant',
              content: result.answer,
              timestamp: Date.now()
            }
          ])

          // 대화 기록 UI용 업데이트
          setConversationHistory(prev => [
            ...prev,
            {
              question: result.question,
              answer: result.answer,
              timestamp: Date.now()
            }
          ])
        }}
        onReset={() => {
          setChatHistory([])
          setConversationHistory([])
          setQueryResult(null)
          setShowAdvanced(false)
        }}
      />

      {/* 대화 히스토리 표시 */}
      {conversationHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            이전 대화 ({conversationHistory.length})
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {conversationHistory.slice(0, -1).map((item, index) => (
              <Card key={index} className="bg-muted/30">
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0">Q{index + 1}</Badge>
                    <p className="text-sm">{item.question}</p>
                  </div>
                  <div className="flex items-start gap-2 pl-6">
                    <Zap className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 쿼리 결과 표시 */}
      {queryResult && (
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {t('aiInsights.answer')}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {queryResult.cached && (
                  <Badge variant="secondary" className="gap-1">
                    <Zap className="h-3 w-3" />
                    {t('aiInsights.cached')}
                  </Badge>
                )}
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {queryResult.responseTimeMs}ms
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    queryResult.safetyScore >= 80
                      ? 'border-green-500 text-green-700'
                      : queryResult.safetyScore >= 60
                      ? 'border-yellow-500 text-yellow-700'
                      : 'border-red-500 text-red-700'
                  }
                >
                  {t('aiInsights.safetyScore')}: {queryResult.safetyScore}/100
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI 답변 */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-foreground leading-relaxed">
                {queryResult.answer}
              </p>
            </div>

            {/* 고급 정보 보기 토글 */}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">
                  {showAdvanced ? '고급 정보 숨기기' : '고급 정보 보기'}
                </span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* SQL & 데이터 탭 (접을 수 있음) */}
            {showAdvanced && (
              <Tabs defaultValue="data" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="data">
                    {t('aiInsights.queryResult')} ({queryResult.data?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="sql">
                    {t('aiInsights.sqlQuery')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="mt-4">
                  <div className="max-h-[400px] overflow-auto rounded-md border">
                    {queryResult.data && queryResult.data.length > 0 ? (
                      <pre className="p-4 text-xs bg-muted/50">
                        {JSON.stringify(queryResult.data, null, 2)}
                      </pre>
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground">
                        {t('common.noData')}
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="sql" className="mt-4">
                  <div className="rounded-md border bg-muted/50">
                    <pre className="p-4 text-xs font-mono overflow-x-auto">
                      {queryResult.sql}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* 자동 인사이트 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              {t('aiInsights.autoInsights')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              자동 인사이트의 갱신은 2시간 마다 이루어집니다
            </p>
          </div>

          {insightsData && (
            <Badge variant="outline" className="gap-2">
              <Clock className="h-3 w-3" />
              {t('aiInsights.last7Days')}
            </Badge>
          )}
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('common.loading')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 에러 상태 */}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {(error as Error)?.message || t('aiInsights.loadError')}
            </AlertDescription>
          </Alert>
        )}

        {/* 인사이트 목록 */}
        {insightsData && (
          <>
            {/* 요약 통계 */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('common.totalChanges')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {insightsData.summary.totalChanges}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('aiInsights.damage')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {insightsData.summary.damageCount}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t('aiInsights.inventory')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">
                    {insightsData.summary.lowStockCount}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 인사이트 카드들 */}
            <InsightList insights={insightsData.insights} />
          </>
        )}
      </div>
    </div>
  )
}
