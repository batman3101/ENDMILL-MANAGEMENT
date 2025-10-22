'use client'

/**
 * InsightCard Component
 * AI 인사이트 카드 컴포넌트
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  TrendingUp,
  Info,
  Eye,
  BookmarkPlus,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/lib/hooks/useTranslations'

export interface Insight {
  title: string
  summary: string
  priority: 'high' | 'medium' | 'low'
  category: string
  data?: any
}

interface InsightCardProps {
  insight: Insight
  onViewDetails?: () => void
  onSave?: () => void
  onShare?: () => void
  className?: string
}

// 우선순위별 색상
const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
}

// 우선순위별 아이콘
const priorityIcons = {
  high: AlertTriangle,
  medium: TrendingUp,
  low: Info,
}

// 카테고리별 색상
const categoryColors: Record<string, string> = {
  파손: 'bg-red-50 text-red-700 border-red-200',
  재고: 'bg-orange-50 text-orange-700 border-orange-200',
  비용: 'bg-green-50 text-green-700 border-green-200',
  효율성: 'bg-blue-50 text-blue-700 border-blue-200',
  유지보수: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function InsightCard({
  insight,
  onViewDetails,
  onSave,
  onShare,
  className,
}: InsightCardProps) {
  const { t } = useTranslations()
  const PriorityIcon = priorityIcons[insight.priority]

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* 우선순위 및 카테고리 */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  'flex items-center gap-1',
                  priorityColors[insight.priority]
                )}
              >
                <PriorityIcon className="h-3 w-3" />
                {t(`aiInsights.${insight.priority}`)}
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  categoryColors[insight.category] ||
                    'bg-gray-50 text-gray-700 border-gray-200'
                )}
              >
                {t(`aiInsights.${insight.category}`) || insight.category}
              </Badge>
            </div>

            {/* 제목 */}
            <CardTitle className="text-lg leading-tight">
              {insight.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 요약 */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {insight.summary}
        </p>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('aiInsights.viewDetails')}
            </Button>
          )}

          {onSave && (
            <Button variant="ghost" size="sm" onClick={onSave}>
              <BookmarkPlus className="h-4 w-4" />
            </Button>
          )}

          {onShare && (
            <Button variant="ghost" size="sm" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Insight 리스트 컴포넌트
 */
interface InsightListProps {
  insights: Insight[]
  onViewDetails?: (insight: Insight) => void
  onSave?: (insight: Insight) => void
  onShare?: (insight: Insight) => void
  className?: string
}

export function InsightList({
  insights,
  onViewDetails,
  onSave,
  onShare,
  className,
}: InsightListProps) {
  const { t } = useTranslations()

  if (insights.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('aiInsights.noInsights')}</p>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {insights.map((insight, index) => (
        <InsightCard
          key={index}
          insight={insight}
          onViewDetails={onViewDetails ? () => onViewDetails(insight) : undefined}
          onSave={onSave ? () => onSave(insight) : undefined}
          onShare={onShare ? () => onShare(insight) : undefined}
        />
      ))}
    </div>
  )
}
