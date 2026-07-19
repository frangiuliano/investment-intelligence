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
          placeholder="Ticker, e.g. AAPL"
          required
          className="w-44 uppercase"
          aria-label="Ticker to brief"
        />
        <SubmitButton pendingLabel="Generating… this can take a minute">
          Request brief
        </SubmitButton>
      </div>
      <ActionMessage state={state} />
    </form>
  )
}
