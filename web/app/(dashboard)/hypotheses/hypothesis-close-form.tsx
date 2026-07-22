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
        Cerrar hipótesis
      </Button>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={hypothesisId} />
      <div className="space-y-2">
        <Label htmlFor={`close-note-${hypothesisId}`}>
          Nota de cierre (opcional)
        </Label>
        <Input
          id={`close-note-${hypothesisId}`}
          name="closeNote"
          placeholder={`¿Por qué se cierra la hipótesis de ${symbol}?`}
        />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingLabel="Cerrando…">
          Confirmar cierre
        </SubmitButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsClosing(false)}
        >
          Cancelar
        </Button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}
