"use server"

import { revalidatePath } from "next/cache"

import { runPeriodReview } from "@/lib/api/research"
import { requireSession, toErrorState } from "@/lib/forms/action-guard"
import { successState, type ActionState } from "@/lib/forms/action-state"

export async function runReviewAction(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  await requireSession()

  try {
    const result = await runPeriodReview()
    revalidatePath("/reviews")
    return successState(
      `Revisión finalizada: ${result.run.reviewedCount} evaluadas y ${result.run.skippedCount} omitidas.`
    )
  } catch (error) {
    return toErrorState(error)
  }
}
