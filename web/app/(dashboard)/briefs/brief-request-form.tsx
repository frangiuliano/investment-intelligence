"use client"

import { useActionState } from "react"

import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import { Input } from "@/components/ui/input"
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
        <Input
          name="ticker"
          placeholder="Símbolo, p. ej. AAPL"
          required
          className="w-44 uppercase"
          aria-label="Símbolo para el informe"
        />
        <SubmitButton pendingLabel="Generando… puede tardar un minuto">
          Solicitar informe
        </SubmitButton>
      </div>
      <ActionMessage state={state} />
    </form>
  )
}
