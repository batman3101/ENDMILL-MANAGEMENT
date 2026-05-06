'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const BottomSheet = DialogPrimitive.Root
const BottomSheetTrigger = DialogPrimitive.Trigger
const BottomSheetClose = DialogPrimitive.Close

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title?: string
    description?: string
  }
>(({ className, children, title, description, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-[100] bg-ink/50',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-[101] flex max-h-[85dvh] flex-col rounded-t-xl bg-paper shadow-modal',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        'duration-200 ease-out',
        className
      )}
      {...props}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-divider px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <DialogPrimitive.Title className="text-title font-semibold text-ink">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-caption text-ink-soft">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="touch-target inline-flex items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-warm">
            <X className="h-5 w-5" />
            <span className="sr-only">닫기</span>
          </DialogPrimitive.Close>
        </div>
      )}
      <div className="flex-1 overflow-y-auto pb-safe">{children}</div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
BottomSheetContent.displayName = 'BottomSheetContent'

export { BottomSheet, BottomSheetTrigger, BottomSheetClose, BottomSheetContent }
