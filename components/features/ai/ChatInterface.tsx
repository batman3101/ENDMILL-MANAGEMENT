'use client'

/**
 * ChatInterface Component
 * 대화형 AI 채팅 인터페이스
 */

import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useTranslations } from '@/lib/hooks/useTranslations'
import { useSendMessage, useChatHistory } from '@/lib/hooks/useAI'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, MessageSquare, RotateCcw } from 'lucide-react'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { toast } from 'sonner'

interface ChatInterfaceProps {
  className?: string
  initialSessionId?: string
}

export interface Message {
  id: string
  sessionId: string
  userId?: string
  messageType: 'user' | 'ai' | 'system'
  content: string
  createdAt: string
  responseTimeMs?: number
}

export function ChatInterface({ className, initialSessionId }: ChatInterfaceProps) {
  const { t } = useTranslations()
  const [sessionId, setSessionId] = useState<string>(initialSessionId || uuidv4())
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sendMessageMutation = useSendMessage()
  const { data: chatHistory, isLoading: isLoadingHistory } = useChatHistory(sessionId)

  // 채팅 히스토리 로드
  useEffect(() => {
    if (chatHistory?.messages) {
      setMessages(chatHistory.messages)
    }
  }, [chatHistory])

  // 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 메시지 전송 핸들러
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) {
      return
    }

    // 사용자 메시지 즉시 추가
    const userMessage: Message = {
      id: uuidv4(),
      sessionId,
      messageType: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      // AI 응답 요청
      const response = await sendMessageMutation.mutateAsync({
        sessionId,
        message: content.trim(),
      })

      // AI 응답 메시지 추가
      const aiMessage: Message = {
        id: uuidv4(),
        sessionId,
        messageType: 'ai',
        content: response.message,
        createdAt: new Date().toISOString(),
        responseTimeMs: response.responseTimeMs,
      }

      setMessages((prev) => [...prev, aiMessage])

      // 응답 시간 표시
      if (response.responseTimeMs) {
        const seconds = (response.responseTimeMs / 1000).toFixed(1)
        toast.success(`응답 시간: ${seconds}초`)
      }
    } catch (error: any) {
      toast.error(error.message || '메시지 전송에 실패했습니다.')

      // 에러 메시지 추가
      const errorMessage: Message = {
        id: uuidv4(),
        sessionId,
        messageType: 'system',
        content: `오류: ${error.message || '메시지 전송에 실패했습니다.'}`,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, errorMessage])
    }
  }

  // 새 대화 시작
  const handleNewChat = () => {
    const newSessionId = uuidv4()
    setSessionId(newSessionId)
    setMessages([])
    toast.success('새 대화가 시작되었습니다.')
  }

  return (
    <div className={className}>
      <Card className="flex flex-col h-[600px]">
        {/* 헤더 */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('aiInsights.chat')}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              disabled={sendMessageMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('aiInsights.newChat')}
            </Button>
          </div>
        </CardHeader>

        {/* 메시지 목록 */}
        <CardContent className="flex-1 overflow-hidden p-0">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MessageList
              messages={messages}
              isLoading={sendMessageMutation.isPending}
            />
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* 입력창 */}
        <div className="border-t p-4">
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
            placeholder={t('aiInsights.messagePlaceholder')}
          />
        </div>
      </Card>
    </div>
  )
}
