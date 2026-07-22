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
    const messageByStatus: Record<number, string> = {
      400: "Revisá los datos ingresados e intentá nuevamente.",
      401: "La sesión o la autorización del panel no es válida.",
      404: "No se encontró el recurso solicitado.",
      409: "La operación entra en conflicto con el estado actual del recurso.",
    }
    return errorState(
      messageByStatus[error.status] ??
        "El servicio de datos no pudo completar la operación. Intentá nuevamente."
    )
  }
  return errorState(
    "No se pudo conectar con el servicio de datos. Intentá nuevamente."
  )
}
