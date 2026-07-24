"use client"

import { useActionState } from "react"

import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import { SymbolSuggestInput } from "@/components/symbol-suggest-input"
import { idleActionState } from "@/lib/forms/action-state"

import { requestBriefAction } from "./actions"

export function BriefRequestForm() {
  const [state, formAction] = useActionState(
    requestBriefAction,
    idleActionState
  )

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex items-end gap-2">
        <SymbolSuggestInput
          name="ticker"
          required
          className="w-full"
          aria-label="Símbolo para el informe"
        />
        <SubmitButton pendingLabel="Generando… puede tardar un minuto">
          Solicitar informe
        </SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground">
        Empezá a escribir un símbolo o el nombre de la empresa y elegí una
        sugerencia.
      </p>
      <ActionMessage state={state} />
    </form>
  )
}
