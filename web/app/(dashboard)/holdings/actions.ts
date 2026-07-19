"use server"

import { revalidatePath } from "next/cache"

import {
  createHolding,
  createWatchlistEntry,
  deleteHolding,
  deleteWatchlistEntry,
  updateHolding,
} from "@/lib/api/portfolio"
import { requireSession, toErrorState } from "@/lib/forms/action-guard"
import {
  errorState,
  successState,
  type ActionState,
} from "@/lib/forms/action-state"
import { parseHoldingForm, parseWatchlistForm } from "@/lib/forms/portfolio"
import { readString } from "@/lib/forms/parse"

export async function createHoldingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession()

  const parsed = parseHoldingForm(formData)
  if (!parsed.ok) {
    return errorState(parsed.error)
  }

  try {
    const holding = await createHolding(parsed.value)
    revalidatePath("/holdings")
    return successState(`${holding.symbol} added to holdings.`)
  } catch (error) {
    return toErrorState(error)
  }
}

export async function updateHoldingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession()

  const id = readString(formData, "id")
  const parsed = parseHoldingForm(formData)
  if (!parsed.ok) {
    return errorState(parsed.error)
  }

  try {
    const holding = await updateHolding(id, parsed.value)
    revalidatePath("/holdings")
    return successState(`${holding.symbol} updated.`)
  } catch (error) {
    return toErrorState(error)
  }
}

export async function deleteHoldingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession()

  try {
    await deleteHolding(readString(formData, "id"))
    revalidatePath("/holdings")
    return successState("Holding removed.")
  } catch (error) {
    return toErrorState(error)
  }
}

export async function createWatchlistEntryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession()

  const parsed = parseWatchlistForm(formData)
  if (!parsed.ok) {
    return errorState(parsed.error)
  }

  try {
    const entry = await createWatchlistEntry(parsed.value)
    revalidatePath("/holdings")
    return successState(`${entry.symbol} added to the watchlist.`)
  } catch (error) {
    return toErrorState(error)
  }
}

export async function deleteWatchlistEntryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireSession()

  try {
    await deleteWatchlistEntry(readString(formData, "id"))
    revalidatePath("/holdings")
    return successState("Watchlist entry removed.")
  } catch (error) {
    return toErrorState(error)
  }
}
