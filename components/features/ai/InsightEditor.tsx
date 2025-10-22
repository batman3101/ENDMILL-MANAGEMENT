'use client'

/**
 * InsightEditor Component
 * Tiptap 기반 인사이트 편집기
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import CodeBlock from '@tiptap/extension-code-block'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EditorToolbar } from './EditorToolbar'
import { Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsightEditorProps {
  title?: string
  content?: string
  onSave?: (title: string, content: string) => void
  isSaving?: boolean
  className?: string
}

export function InsightEditor({
  title: initialTitle = '',
  content: initialContent = '',
  onSave,
  isSaving = false,
  className,
}: InsightEditorProps) {
  const [title, setTitle] = useState(initialTitle)

  // Tiptap 에디터 초기화
  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Bold,
      Italic,
      Link.configure({
        openOnClick: false,
      }),
      CodeBlock,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  })

  // 자동 저장 (3초마다)
  useEffect(() => {
    if (!editor || !onSave) return

    const interval = setInterval(() => {
      const content = editor.getHTML()
      if (title.trim() && content) {
        onSave(title, content)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [editor, title, onSave])

  const handleSave = () => {
    if (!editor || !onSave) return

    const content = editor.getHTML()
    if (title.trim() && content) {
      onSave(title, content)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="인사이트 제목을 입력하세요"
              className="text-2xl font-bold border-none shadow-none focus-visible:ring-0"
              disabled={isSaving}
            />
            <Button
              onClick={handleSave}
              disabled={!title.trim() || !editor?.getText().trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 툴바 */}
          {editor && <EditorToolbar editor={editor} />}

          {/* 에디터 */}
          <div className="border rounded-lg">
            <EditorContent editor={editor} />
          </div>

          {/* 힌트 */}
          <p className="text-xs text-muted-foreground">
            3초마다 자동 저장됩니다. Ctrl+B (굵게), Ctrl+I (기울임), Ctrl+K (링크)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState, useEffect } from 'react'
