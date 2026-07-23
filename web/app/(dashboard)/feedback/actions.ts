"use server"

import { revalidatePath } from "next/cache"

import { createFeedback } from "@/lib/api/feedback"
import type { FeedbackLabel, FeedbackTargetType } from "@/lib/api/types"
import { requireSession, toErrorState } from "@/lib/forms/action-guard"
import {
  errorState,
  successState,
  type ActionState,
} from "@/lib/forms/action-state"
import { readString } from "@/lib/forms/parse"

const TARGET_TYPES = new Set(["analysis", "brief", "notification"])
const LABELS = new Set(["useful", "noise"])

export async function submitFeedbackAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession()

  const targetType = readString(formData, "targetType")
  const targetId = readString(formData, "targetId")
  const label = readString(formData, "label")
  const revalidate = readString(formData, "revalidatePath") || "/alerts"

  if (!TARGET_TYPES.has(targetType)) {
    return errorState("Tipo de feedback inválido.")
  }
  if (!LABELS.has(label)) {
    return errorState("Etiqueta de feedback inválida.")
  }
  if (!targetId) {
    return errorState("Falta el identificador del ítem.")
  }

  try {
    const feedback = await createFeedback({
      targetType: targetType as FeedbackTargetType,
      targetId,
      label: label as FeedbackLabel,
    })
    revalidatePath(revalidate)
    return successState(
      feedback.label === "useful"
        ? "Marcado como útil."
        : "Marcado como ruido."
    )
  } catch (error) {
    return toErrorState(error)
  }
}
