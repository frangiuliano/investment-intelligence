"use server"

import { revalidatePath } from "next/cache"

import { requestBrief } from "@/lib/api/research"
import { requireSession, toErrorState } from "@/lib/forms/action-guard"
import {
  errorState,
  successState,
  type ActionState,
} from "@/lib/forms/action-state"
import { parseTicker, readString } from "@/lib/forms/parse"

export async function requestBriefAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession()

  const ticker = parseTicker(readString(formData, "ticker"))
  if (!ticker.ok) {
    return errorState(ticker.error)
  }

  try {
    const brief = await requestBrief(ticker.value)
    revalidatePath("/briefs")
    return successState(`Brief for ${brief.symbol} is ready below.`)
  } catch (error) {
    return toErrorState(error)
  }
}
