"use client"

import { useActionState } from "react"

import { submitFeedbackAction } from "@/app/(dashboard)/feedback/actions"
import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import type { FeedbackTargetType } from "@/lib/api/types"
import { idleActionState } from "@/lib/forms/action-state"

type FeedbackButtonsProps = {
  targetType: FeedbackTargetType
  targetId: string
  revalidatePath: string
}

export function FeedbackButtons({
  targetType,
  targetId,
  revalidatePath,
}: FeedbackButtonsProps) {
  const [state, formAction] = useActionState(
    submitFeedbackAction,
    idleActionState
  )

  return (
    <div className="space-y-2">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
        Feedback del operador
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <form action={formAction}>
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <input type="hidden" name="label" value="useful" />
          <input type="hidden" name="revalidatePath" value={revalidatePath} />
          <SubmitButton size="sm" variant="outline" pendingLabel="Guardando…">
            Útil
          </SubmitButton>
        </form>
        <form action={formAction}>
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <input type="hidden" name="label" value="noise" />
          <input type="hidden" name="revalidatePath" value={revalidatePath} />
          <SubmitButton size="sm" variant="ghost" pendingLabel="Guardando…">
            Ruido
          </SubmitButton>
        </form>
        <ActionMessage state={state} />
      </div>
    </div>
  )
}
