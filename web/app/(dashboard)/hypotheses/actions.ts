"use server"

import { revalidatePath } from "next/cache"

import { closeHypothesis, createHypothesis } from "@/lib/api/research"
import { requireSession, toErrorState } from "@/lib/forms/action-guard"
import {
  errorState,
  successState,
  type ActionState,
} from "@/lib/forms/action-state"
import { readOptionalString, readString } from "@/lib/forms/parse"
import { parseHypothesisForm } from "@/lib/forms/research"

export async function createHypothesisAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession()

  const parsed = parseHypothesisForm(formData)
  if (!parsed.ok) {
    return errorState(parsed.error)
  }

  try {
    const hypothesis = await createHypothesis(parsed.value)
    revalidatePath("/hypotheses")
    return successState(`Se abrió la hipótesis de ${hypothesis.symbol}.`)
  } catch (error) {
    return toErrorState(error)
  }
}

export async function closeHypothesisAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession()

  try {
    const hypothesis = await closeHypothesis(
      readString(formData, "id"),
      readOptionalString(formData, "closeNote") ?? undefined
    )
    revalidatePath("/hypotheses")
    return successState(`Se cerró la hipótesis de ${hypothesis.symbol}.`)
  } catch (error) {
    return toErrorState(error)
  }
}
