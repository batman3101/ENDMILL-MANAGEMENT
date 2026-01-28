/**
 * AI Hooks
 * React Query를 사용한 AI 기능 훅
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFactory } from './useFactory'

// 타입 정의
export interface NaturalLanguageQueryResponse {
  answer: string
  sql: string
  data: any[]
  cached: boolean
  safetyScore: number
  responseTimeMs: number
  question: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  userId: string
  messageType: 'user' | 'ai' | 'system'
  content: string
  createdAt: string
  responseTimeMs?: number
}

export interface Insight {
  title: string
  summary: string
  priority: 'high' | 'medium' | 'low'
  category: string
  data?: any
}

export interface InsightsResponse {
  insights: Insight[]
  dataRange: {
    from: string
    to: string
  }
  summary: {
    totalChanges: number
    damageCount: number
    lowStockCount: number
  }
}

// 대화 히스토리 타입
export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

/**
 * 자연어 쿼리 실행 훅
 */
export function useNaturalLanguageQuery() {
  const { currentFactory } = useFactory()

  return useMutation<
    NaturalLanguageQueryResponse,
    Error,
    { question: string; chatHistory?: ChatHistoryItem[] }
  >({
    mutationFn: async ({ question, chatHistory }) => {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          chatHistory: chatHistory || [],
          factoryId: currentFactory?.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '쿼리 실행 중 오류가 발생했습니다.')
      }

      return response.json()
    },
  })
}

/**
 * 채팅 메시지 전송 훅
 */
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { currentFactory } = useFactory()

  return useMutation<
    { message: string; sessionId: string; responseTimeMs: number },
    Error,
    { sessionId: string; message: string }
  >({
    mutationFn: async ({ sessionId, message }) => {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, message, factoryId: currentFactory?.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '메시지 전송 중 오류가 발생했습니다.')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // 채팅 히스토리 갱신
      queryClient.invalidateQueries({
        queryKey: ['chatHistory', variables.sessionId],
      })
    },
  })
}

/**
 * 채팅 히스토리 조회 훅
 */
export function useChatHistory(sessionId: string) {
  return useQuery<{ sessionId: string; messages: ChatMessage[] }>({
    queryKey: ['chatHistory', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/ai/chat?sessionId=${sessionId}`)

      if (!response.ok) {
        throw new Error('채팅 히스토리 조회 실패')
      }

      return response.json()
    },
    enabled: !!sessionId,
  })
}

/**
 * 자동 인사이트 조회 훅
 */
export function useInsights() {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id
  return useQuery<InsightsResponse>({
    queryKey: ['insights', factoryId],
    queryFn: async () => {
      const response = await fetch(`/api/ai/insights${factoryId ? `?factoryId=${factoryId}` : ''}`)

      if (!response.ok) {
        throw new Error('인사이트 조회 실패')
      }

      return response.json()
    },
    // 2시간마다 자동 갱신
    refetchInterval: 2 * 60 * 60 * 1000,
  })
}

/**
 * 커스텀 데이터 인사이트 생성 훅
 */
export function useGenerateInsights() {
  return useMutation<{ insights: Insight[]; dataCount: number }, Error, any[]>({
    mutationFn: async (data: any[]) => {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '인사이트 생성 중 오류가 발생했습니다.')
      }

      return response.json()
    },
  })
}

/**
 * 저장된 인사이트 조회 훅
 */
export function useSavedInsights(options?: {
  filter?: 'my' | 'shared' | 'public'
  sortBy?: 'newest' | 'oldest' | 'mostViewed'
  search?: string
  tags?: string[]
}) {
  const { currentFactory } = useFactory()
  const factoryId = currentFactory?.id
  const params = new URLSearchParams()

  if (factoryId) params.append('factoryId', factoryId)
  if (options?.filter) params.append('filter', options.filter)
  if (options?.sortBy) params.append('sortBy', options.sortBy)
  if (options?.search) params.append('search', options.search)
  if (options?.tags && options.tags.length > 0) {
    params.append('tags', options.tags.join(','))
  }

  return useQuery({
    queryKey: ['savedInsights', factoryId, options],
    queryFn: async () => {
      const response = await fetch(`/api/ai/insights/saved?${params.toString()}`)

      if (!response.ok) {
        throw new Error('저장된 인사이트 조회 실패')
      }

      return response.json()
    },
  })
}

/**
 * 단일 인사이트 조회 훅
 */
export function useSavedInsight(id: string) {
  return useQuery({
    queryKey: ['savedInsight', id],
    queryFn: async () => {
      const response = await fetch(`/api/ai/insights/saved/${id}`)

      if (!response.ok) {
        throw new Error('인사이트 조회 실패')
      }

      return response.json()
    },
    enabled: !!id,
  })
}

/**
 * 인사이트 저장 훅
 */
export function useSaveInsight() {
  const queryClient = useQueryClient()
  const { currentFactory } = useFactory()

  return useMutation({
    mutationFn: async (insight: {
      title: string
      content: string
      contentType: 'markdown' | 'html'
      chartConfig?: any
      tags?: string[]
      isPublic?: boolean
    }) => {
      const response = await fetch('/api/ai/insights/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...insight, factoryId: currentFactory?.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '인사이트 저장 중 오류가 발생했습니다.')
      }

      return response.json()
    },
    onSuccess: () => {
      // 저장된 인사이트 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['savedInsights'] })
    },
  })
}

/**
 * 인사이트 수정 훅
 */
export function useUpdateInsight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: {
        title?: string
        content?: string
        chartConfig?: any
        tags?: string[]
      }
    }) => {
      const response = await fetch(`/api/ai/insights/saved/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '인사이트 수정 중 오류가 발생했습니다.')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedInsights'] })
    },
  })
}

/**
 * 인사이트 삭제 훅
 */
export function useDeleteInsight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ai/insights/saved/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '인사이트 삭제 중 오류가 발생했습니다.')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedInsights'] })
    },
  })
}

/**
 * 인사이트 공유 훅
 */
export function useShareInsight() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      shareWith,
      isPublic,
    }: {
      id: string
      shareWith?: string[]
      isPublic: boolean
    }) => {
      const response = await fetch(`/api/ai/insights/${id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shareWith, isPublic }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '공유 설정 중 오류가 발생했습니다.')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // 해당 인사이트와 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['savedInsight', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['savedInsights'] })
    },
  })
}
