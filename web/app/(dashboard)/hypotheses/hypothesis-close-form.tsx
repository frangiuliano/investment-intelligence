"use client"

import { useActionState, useState } from "react"

import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { idleActionState } from "@/lib/forms/action-state"

import { closeHypothesisAction } from "./actions"

export function HypothesisCloseForm({
  hypothesisId,
  symbol,
}: {
  hypothesisId: string
  symbol: string
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [state, formAction] = useActionState(
    closeHypothesisAction,
    idleActionState
  )

  if (!isClosing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsClosing(true)}
      >
        Close hypothesis
      </Button>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={hypothesisId} />
      <div className="space-y-2">
        <Label htmlFor={`close-note-${hypothesisId}`}>
          Close note (optional)
        </Label>
        <Input
          id={`close-note-${hypothesisId}`}
          name="closeNote"
          placeholder={`Why is the ${symbol} hypothesis being closed?`}
        />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingLabel="Closing…">
          Confirm close
        </SubmitButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsClosing(false)}
        >
          Cancel
        </Button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}
