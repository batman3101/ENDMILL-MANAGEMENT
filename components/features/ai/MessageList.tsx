'use client'

/**
 * MessageList Component
 * 채팅 메시지 목록 표시
 */

import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Bot, User, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Message } from './ChatInterface'

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm', { locale: ko })
    } catch {
      return ''
    }
  }

  const getMessageIcon = (type: Message['messageType']) => {
    switch (type) {
      case 'user':
        return <User className="h-5 w-5" />
      case 'ai':
        return <Bot className="h-5 w-5" />
      case 'system':
        return <AlertCircle className="h-5 w-5" />
    }
  }

  const getMessageStyles = (type: Message['messageType']) => {
    switch (type) {
      case 'user':
        return 'bg-primary text-primary-foreground ml-auto'
      case 'ai':
        return 'bg-muted text-foreground'
      case 'system':
        return 'bg-destructive/10 text-destructive border border-destructive/20'
    }
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Bot className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">대화를 시작하세요</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          AI에게 데이터에 대한 질문을 하거나, 인사이트를 요청해보세요.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto p-4 space-y-4"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3',
            message.messageType === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {/* AI/System 아이콘 (왼쪽) */}
          {message.messageType !== 'user' && (
            <div className="flex-shrink-0 mt-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  message.messageType === 'ai'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-destructive/10 text-destructive'
                )}
              >
                {getMessageIcon(message.messageType)}
              </div>
            </div>
          )}

          {/* 메시지 내용 */}
          <div
            className={cn(
              'max-w-[75%] rounded-lg px-4 py-3',
              getMessageStyles(message.messageType)
            )}
          >
            {/* 마크다운 렌더링 */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code({ node: _node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md my-2"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className={cn(
                          'px-1.5 py-0.5 rounded text-sm',
                          message.messageType === 'user'
                            ? 'bg-primary-foreground/20'
                            : 'bg-muted-foreground/20'
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  },
                  p({ children }) {
                    return <p className="mb-2 last:mb-0">{children}</p>
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-4 mb-2">{children}</ul>
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-4 mb-2">{children}</ol>
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* 타임스탬프 및 응답시간 */}
            <div
              className={cn(
                'flex items-center gap-2 mt-2 text-xs',
                message.messageType === 'user'
                  ? 'text-primary-foreground/70'
                  : 'text-muted-foreground'
              )}
            >
              <span>{formatTime(message.createdAt)}</span>
              {message.responseTimeMs && (
                <span>
                  • {(message.responseTimeMs / 1000).toFixed(1)}초
                </span>
              )}
            </div>
          </div>

          {/* User 아이콘 (오른쪽) */}
          {message.messageType === 'user' && (
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {getMessageIcon(message.messageType)}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="flex-shrink-0 mt-1">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <div className="max-w-[75%] rounded-lg px-4 py-3 bg-muted">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                AI가 답변을 생성하고 있습니다...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
