export type ActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export const idleActionState: ActionState = { status: "idle", message: "" }

export function successState(message: string): ActionState {
  return { status: "success", message }
}

export function errorState(message: string): ActionState {
  return { status: "error", message }
}
