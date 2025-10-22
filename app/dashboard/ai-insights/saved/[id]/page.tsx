/**
 * Insight Detail Page
 * 인사이트 상세 페이지
 */

'use client'

import { useState } from 'react'
import { SavedInsightDetail } from '@/components/features/ai/SavedInsightDetail'
import { ShareInsightDialog } from '@/components/features/ai/ShareInsightDialog'
import { ExportMenu } from '@/components/features/ai/ExportMenu'
import { useSavedInsight } from '@/lib/hooks/useAI'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface InsightDetailPageProps {
  params: {
    id: string
  }
  searchParams: {
    mode?: 'view' | 'edit'
  }
}

export default function InsightDetailPage({
  params,
  searchParams,
}: InsightDetailPageProps) {
  const { id } = params
  const mode = searchParams.mode || 'view'

  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  // 인사이트 조회
  const { data } = useSavedInsight(id)
  const insight = data?.insight

  const handleShare = () => {
    setShareDialogOpen(true)
  }

  const handleExport = () => {
    setExportDialogOpen(true)
  }

  return (
    <div className="container mx-auto p-6">
      <SavedInsightDetail
        insightId={id}
        mode={mode}
        onShare={handleShare}
        onExport={handleExport}
      />

      {/* 공유 다이얼로그 */}
      {insight && (
        <ShareInsightDialog
          insightId={id}
          initialIsPublic={insight.is_public}
          initialSharedWith={insight.shared_with}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      {/* 내보내기 다이얼로그 */}
      {insight && (
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>인사이트 내보내기</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ExportMenu
                insight={insight}
                data={insight.chart_data}
                variant="default"
                size="lg"
                className="w-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
