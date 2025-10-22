'use client'

/**
 * MessageInput Component
 * 채팅 메시지 입력 컴포넌트
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSendMessage: (message: string) => void
  isLoading?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
}

export function MessageInput({
  onSendMessage,
  isLoading = false,
  placeholder = '메시지를 입력하세요...',
  maxLength = 1000,
  className,
}: MessageInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 자동 포커스
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isLoading])

  // 전송 핸들러
  const handleSend = () => {
    if (!input.trim() || isLoading) {
      return
    }

    onSendMessage(input)
    setInput('')

    // Textarea 높이 초기화
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // 키보드 이벤트
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 키로 전송 (Shift+Enter는 줄바꿈)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Textarea 자동 높이 조절
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value

    // 최대 길이 체크
    if (value.length <= maxLength) {
      setInput(value)
    }

    // 높이 자동 조절
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  const charCount = input.length
  const isOverLimit = charCount > maxLength
  const isSendDisabled = !input.trim() || isLoading || isOverLimit

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            'min-h-[60px] max-h-[200px] pr-12 resize-none',
            isOverLimit && 'border-destructive focus-visible:ring-destructive'
          )}
          rows={1}
        />

        {/* 전송 버튼 */}
        <div className="absolute bottom-2 right-2">
          <Button
            onClick={handleSend}
            disabled={isSendDisabled}
            size="icon"
            className="rounded-full h-8 w-8"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Enter: 전송</span>
          <span>Shift+Enter: 줄바꿈</span>
        </div>

        {/* 글자 수 표시 */}
        <span
          className={cn(
            'transition-colors',
            isOverLimit && 'text-destructive font-semibold'
          )}
        >
          {charCount} / {maxLength}
        </span>
      </div>
    </div>
  )
}
