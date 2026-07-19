"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import type { ActionState } from "@/lib/forms/action-state"
import { cn } from "@/lib/utils"

export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  )
}

export function ActionMessage({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) {
    return null
  }

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "text-sm",
        state.status === "error" ? "text-destructive" : "text-emerald-800"
      )}
    >
      {state.message}
    </p>
  )
}
