import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.1em] whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-ink/15 bg-muted/60 text-foreground/80",
        positive: "border-emerald-700/25 bg-emerald-700/10 text-emerald-900",
        negative: "border-destructive/25 bg-destructive/10 text-destructive",
        caution: "border-signal/30 bg-signal/10 text-signal",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
)

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone, className }))}
      {...props}
    />
  )
}

export { Badge }
