"use client"

import { useActionState } from "react"

import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { HYPOTHESIS_BIASES } from "@/lib/api/types"
import { idleActionState } from "@/lib/forms/action-state"

import { createHypothesisAction } from "./actions"

export function HypothesisCreateForm() {
  const [state, formAction] = useActionState(
    createHypothesisAction,
    idleActionState
  )

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="hypothesis-symbol">Symbol</Label>
          <Input
            id="hypothesis-symbol"
            name="symbol"
            placeholder="MSFT"
            required
            className="uppercase"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hypothesis-bias">Bias</Label>
          <NativeSelect id="hypothesis-bias" name="bias" required>
            {HYPOTHESIS_BIASES.map((bias) => (
              <option key={bias} value={bias}>
                {bias}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hypothesis-horizon">Horizon (days)</Label>
          <Input
            id="hypothesis-horizon"
            name="horizonDays"
            type="number"
            min="1"
            step="1"
            placeholder="30"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hypothesis-thesis">Thesis</Label>
        <Textarea
          id="hypothesis-thesis"
          name="thesis"
          placeholder="What do you expect to happen, and why?"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hypothesis-invalidation">Invalidation</Label>
        <Textarea
          id="hypothesis-invalidation"
          name="invalidation"
          placeholder="What observation would prove this thesis wrong?"
          required
        />
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel="Opening…">Open hypothesis</SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}
