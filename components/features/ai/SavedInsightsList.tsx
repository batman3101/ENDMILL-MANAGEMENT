'use client'

/**
 * SavedInsightsList Component
 * 저장된 인사이트 목록 컴포넌트
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSavedInsights, useDeleteInsight } from '@/lib/hooks/useAI'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Share2,
  Download,
  Globe,
  Lock,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface SavedInsightsListProps {
  className?: string
  onEdit?: (id: string) => void
  onShare?: (id: string) => void
  onExport?: (id: string) => void
}

export function SavedInsightsList({
  className,
  onEdit,
  onShare,
  onExport,
}: SavedInsightsListProps) {
  const router = useRouter()

  // 상태 관리
  const [filter, setFilter] = useState<'my' | 'shared' | 'public'>('my')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'mostViewed'>(
    'newest'
  )
  const [search, setSearch] = useState('')
  const [selectedTags] = useState<string[]>([])

  // 데이터 조회
  const { data, isLoading, error } = useSavedInsights({
    filter,
    sortBy,
    search: search || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
  })

  const deleteInsightMutation = useDeleteInsight()

  // 핸들러
  const handleView = (id: string) => {
    router.push(`/dashboard/ai-insights/saved/${id}`)
  }

  const handleEdit = (id: string) => {
    if (onEdit) {
      onEdit(id)
    } else {
      router.push(`/dashboard/ai-insights/saved/${id}?mode=edit`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      await deleteInsightMutation.mutateAsync(id)
    } catch (error: any) {
      alert(error.message || '삭제 중 오류가 발생했습니다.')
    }
  }

  const handleShare = (id: string) => {
    if (onShare) {
      onShare(id)
    }
  }

  const handleExport = (id: string) => {
    if (onExport) {
      onExport(id)
    }
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">
              {error.message || '인사이트를 불러올 수 없습니다.'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const insights = data?.insights || []
  const total = data?.total || 0

  return (
    <div className={className}>
      {/* 필터 및 검색 */}
      <div className="space-y-4 mb-6">
        {/* 탭 필터 */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my">
              <Lock className="h-4 w-4 mr-2" />내 인사이트
            </TabsTrigger>
            <TabsTrigger value="shared">
              <Users className="h-4 w-4 mr-2" />
              공유받음
            </TabsTrigger>
            <TabsTrigger value="public">
              <Globe className="h-4 w-4 mr-2" />
              공개
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 검색 및 정렬 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
              <SelectItem value="mostViewed">인기순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 인사이트 목록 */}
      {insights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {search
                ? '검색 결과가 없습니다.'
                : '저장된 인사이트가 없습니다.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight: any) => (
              <Card
                key={insight.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleView(insight.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">
                      {insight.title}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleView(insight.id)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          보기
                        </DropdownMenuItem>
                        {filter === 'my' && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(insight.id)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShare(insight.id)
                              }}
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              공유
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(insight.id)
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExport(insight.id)
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          내보내기
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* 내용 미리보기 */}
                  <div
                    className="text-sm text-muted-foreground line-clamp-3 mb-4"
                    dangerouslySetInnerHTML={{
                      __html:
                        insight.content
                          ?.replace(/<[^>]*>/g, '')
                          .slice(0, 150) + '...' || '',
                    }}
                  />

                  {/* 태그 */}
                  {insight.tags && insight.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {insight.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                      {insight.tags.length > 3 && (
                        <Badge variant="outline">+{insight.tags.length - 3}</Badge>
                      )}
                    </div>
                  )}

                  {/* 메타 정보 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {insight.view_count || 0}
                      </span>
                      {insight.is_public && (
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          공개
                        </Badge>
                      )}
                    </div>
                    <span>
                      {format(new Date(insight.created_at), 'PPP', {
                        locale: ko,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 총 개수 */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            총 {total}개의 인사이트
          </div>
        </>
      )}
    </div>
  )
}
