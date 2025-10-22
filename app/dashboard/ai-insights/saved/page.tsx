/**
 * Saved Insights Page
 * 저장된 인사이트 목록 페이지
 */

'use client'

import { useState } from 'react'
import { SavedInsightsList } from '@/components/features/ai/SavedInsightsList'
import { ShareInsightDialog } from '@/components/features/ai/ShareInsightDialog'
import { ExportMenu } from '@/components/features/ai/ExportMenu'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookmarkCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSavedInsight } from '@/lib/hooks/useAI'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function SavedInsightsPage() {
  const router = useRouter()
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(
    null
  )

  // 선택된 인사이트 조회 (공유/내보내기용)
  const { data: selectedInsightData } = useSavedInsight(
    selectedInsightId || ''
  )

  const handleShare = (id: string) => {
    setSelectedInsightId(id)
    setShareDialogOpen(true)
  }

  const handleExport = (id: string) => {
    setSelectedInsightId(id)
    setExportDialogOpen(true)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookmarkCheck className="h-8 w-8" />
              저장된 인사이트
            </h1>
            <p className="text-muted-foreground mt-1">
              저장한 인사이트를 관리하고 공유할 수 있습니다
            </p>
          </div>
        </div>
      </div>

      {/* 인사이트 목록 */}
      <SavedInsightsList
        onShare={handleShare}
        onExport={handleExport}
      />

      {/* 공유 다이얼로그 */}
      {selectedInsightId && selectedInsightData?.insight && (
        <ShareInsightDialog
          insightId={selectedInsightId}
          initialIsPublic={selectedInsightData.insight.is_public}
          initialSharedWith={selectedInsightData.insight.shared_with}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      {/* 내보내기 다이얼로그 */}
      {selectedInsightId && selectedInsightData?.insight && (
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>인사이트 내보내기</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <ExportMenu
                insight={selectedInsightData.insight}
                data={selectedInsightData.insight.chart_data}
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
