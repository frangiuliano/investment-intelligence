import "server-only"

import { redirect } from "next/navigation"

import { BackendApiError } from "@/lib/api/client"
import { hasValidSession } from "@/lib/auth/server-session"
import { errorState, type ActionState } from "@/lib/forms/action-state"

export async function requireSession(): Promise<void> {
  if (!(await hasValidSession())) {
    redirect("/login")
  }
}

export function toErrorState(error: unknown): ActionState {
  if (error instanceof BackendApiError) {
    return errorState(error.message)
  }
  return errorState("The backend could not be reached. Try again.")
}
