"use client"

import { useActionState } from "react"

import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import { idleActionState } from "@/lib/forms/action-state"

import { runReviewAction } from "./actions"

export function RunReviewForm() {
  const [state, formAction] = useActionState(runReviewAction, idleActionState)

  return (
    <form action={formAction} className="space-y-2 text-right">
      <SubmitButton pendingLabel="Revisando… puede tardar un minuto">
        Ejecutar revisión del mes actual
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  )
}
