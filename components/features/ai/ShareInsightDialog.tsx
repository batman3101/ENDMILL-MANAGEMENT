'use client'

/**
 * ShareInsightDialog Component
 * 인사이트 공유 다이얼로그
 */

import { useState, useEffect } from 'react'
import { useShareInsight } from '@/lib/hooks/useAI'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Globe, Lock, Share2, AlertCircle } from 'lucide-react'
import { UserMultiSelect } from './UserMultiSelect'

interface ShareInsightDialogProps {
  insightId: string
  initialIsPublic?: boolean
  initialSharedWith?: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareInsightDialog({
  insightId,
  initialIsPublic = false,
  initialSharedWith = [],
  open,
  onOpenChange,
}: ShareInsightDialogProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    initialSharedWith
  )

  const shareInsightMutation = useShareInsight()

  // 초기값 설정
  useEffect(() => {
    if (open) {
      setIsPublic(initialIsPublic)
      setSelectedUserIds(initialSharedWith)
    }
  }, [open, initialIsPublic, initialSharedWith])

  // 공유 설정 저장
  const handleShare = async () => {
    try {
      await shareInsightMutation.mutateAsync({
        id: insightId,
        shareWith: selectedUserIds,
        isPublic,
      })

      onOpenChange(false)
    } catch (error: any) {
      // 에러는 mutation에서 처리됨
      console.error('공유 설정 오류:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            인사이트 공유
          </DialogTitle>
          <DialogDescription>
            인사이트를 다른 사용자와 공유하거나 공개로 설정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 공개 여부 스위치 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="public-switch" className="text-base">
                  공개 인사이트
                </Label>
                <p className="text-sm text-muted-foreground">
                  모든 사용자가 볼 수 있습니다
                </p>
              </div>
            </div>
            <Switch
              id="public-switch"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* 공개 상태 안내 */}
          {isPublic && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                공개로 설정하면 모든 사용자가 이 인사이트를 볼 수
                있습니다.
              </AlertDescription>
            </Alert>
          )}

          {/* 특정 사용자와 공유 */}
          {!isPublic && (
            <div className="space-y-2">
              <Label className="text-base">특정 사용자와 공유</Label>
              <p className="text-sm text-muted-foreground mb-2">
                선택한 사용자만 이 인사이트를 볼 수 있습니다
              </p>
              <UserMultiSelect
                selectedUserIds={selectedUserIds}
                onSelectionChange={setSelectedUserIds}
              />
            </div>
          )}

          {/* 에러 메시지 */}
          {shareInsightMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {shareInsightMutation.error?.message ||
                  '공유 설정 중 오류가 발생했습니다.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={shareInsightMutation.isPending}
          >
            취소
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareInsightMutation.isPending}
          >
            {shareInsightMutation.isPending ? '저장 중...' : '공유 설정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
