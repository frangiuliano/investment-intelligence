"use client"

import { useActionState } from "react"

import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { HYPOTHESIS_BIASES } from "@/lib/api/types"
import { biasLabel } from "@/lib/display"
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
          <Label htmlFor="hypothesis-symbol">Símbolo</Label>
          <Input
            id="hypothesis-symbol"
            name="symbol"
            placeholder="MSFT"
            required
            className="uppercase"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hypothesis-bias">Sesgo</Label>
          <NativeSelect id="hypothesis-bias" name="bias" required>
            {HYPOTHESIS_BIASES.map((bias) => (
              <option key={bias} value={bias}>
                {biasLabel(bias)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hypothesis-horizon">Horizonte (días)</Label>
          <Input
            id="hypothesis-horizon"
            name="horizonDays"
            type="number"
            min="1"
            step="1"
            defaultValue={30}
            placeholder="30"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hypothesis-thesis">Tesis</Label>
        <Textarea
          id="hypothesis-thesis"
          name="thesis"
          placeholder="¿Qué esperás que ocurra y por qué?"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hypothesis-invalidation">Invalidación</Label>
        <Textarea
          id="hypothesis-invalidation"
          name="invalidation"
          placeholder="¿Qué observación demostraría que esta tesis es incorrecta?"
          required
        />
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel="Abriendo…">Abrir hipótesis</SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}
