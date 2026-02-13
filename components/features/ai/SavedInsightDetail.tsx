'use client'

/**
 * SavedInsightDetail Component
 * 인사이트 상세 보기 및 편집
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useSavedInsight,
  useUpdateInsight,
  useDeleteInsight,
} from '@/lib/hooks/useAI'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  Download,
  Eye,
  Calendar,
  Globe,
  Lock,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import dynamic from 'next/dynamic'
const InsightEditor = dynamic(() => import('./InsightEditor').then(mod => ({ default: mod.InsightEditor })), { ssr: false })
const ChartPreview = dynamic(() => import('./ChartPreview').then(mod => ({ default: mod.ChartPreview })), { ssr: false })

interface SavedInsightDetailProps {
  insightId: string
  mode?: 'view' | 'edit'
  onBack?: () => void
  onShare?: (id: string) => void
  onExport?: (id: string) => void
  className?: string
}

export function SavedInsightDetail({
  insightId,
  mode: initialMode = 'view',
  onBack,
  onShare,
  onExport,
  className,
}: SavedInsightDetailProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // 데이터 조회
  const { data, isLoading, error } = useSavedInsight(insightId)
  const updateMutation = useUpdateInsight()
  const deleteMutation = useDeleteInsight()

  const insight = data?.insight

  // 핸들러
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.push('/dashboard/ai-insights/saved')
    }
  }

  const handleEdit = () => {
    setMode('edit')
  }

  const handleCancelEdit = () => {
    setMode('view')
  }

  const handleSave = async (title: string, content: string) => {
    try {
      await updateMutation.mutateAsync({
        id: insightId,
        updates: { title, content },
      })
      setMode('view')
    } catch (error: any) {
      alert(error.message || '저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(insightId)
      handleBack()
    } catch (error: any) {
      alert(error.message || '삭제 중 오류가 발생했습니다.')
    }
  }

  const handleShare = () => {
    if (onShare) {
      onShare(insightId)
    }
  }

  const handleExport = () => {
    if (onExport) {
      onExport(insightId)
    }
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // 에러 상태
  if (error || !insight) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">
            {error?.message || '인사이트를 찾을 수 없습니다.'}
          </p>
          <Button onClick={handleBack}>돌아가기</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          목록으로
        </Button>

        <div className="flex gap-2">
          {mode === 'view' ? (
            <>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                수정
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                공유
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                내보내기
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                취소
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 보기 모드 */}
      {mode === 'view' ? (
        <Card>
          <CardHeader>
            <div className="space-y-4">
              {/* 제목 */}
              <CardTitle className="text-2xl">{insight.title}</CardTitle>

              {/* 메타 정보 */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(insight.created_at), 'PPP', { locale: ko })}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  조회 {insight.view_count || 0}회
                </div>
                <div className="flex items-center gap-1">
                  {insight.is_public ? (
                    <>
                      <Globe className="h-4 w-4" />
                      공개
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      비공개
                    </>
                  )}
                </div>
              </div>

              {/* 태그 */}
              {insight.tags && insight.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {insight.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            {/* 내용 */}
            <div className="prose prose-sm max-w-none mb-8">
              {insight.content_type === 'markdown' ? (
                <ReactMarkdown>{insight.content}</ReactMarkdown>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: insight.content }} />
              )}
            </div>

            {/* 차트 */}
            {insight.chart_config && insight.chart_data && (
              <>
                <Separator className="my-8" />
                <ChartPreview
                  config={insight.chart_config}
                  data={insight.chart_data}
                />
              </>
            )}

            {/* 최종 수정 정보 */}
            {insight.updated_at &&
              insight.updated_at !== insight.created_at && (
                <>
                  <Separator className="my-8" />
                  <div className="text-sm text-muted-foreground text-center">
                    최종 수정:{' '}
                    {format(new Date(insight.updated_at), 'PPP p', {
                      locale: ko,
                    })}
                  </div>
                </>
              )}
          </CardContent>
        </Card>
      ) : (
        /* 편집 모드 */
        <InsightEditor
          title={insight.title}
          content={insight.content}
          onSave={handleSave}
          isSaving={updateMutation.isPending}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 인사이트가 영구적으로
              삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
