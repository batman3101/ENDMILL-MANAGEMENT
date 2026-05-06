import * as React from "react"
import { cn } from "@/lib/utils"

export type NoBreakProps = React.HTMLAttributes<HTMLSpanElement>

const NoBreak = React.forwardRef<HTMLSpanElement, NoBreakProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("whitespace-nowrap", className)}
      {...props}
    />
  )
)
NoBreak.displayName = "NoBreak"

export { NoBreak }
