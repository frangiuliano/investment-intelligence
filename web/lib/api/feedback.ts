import "server-only"

import { backendFetch } from "@/lib/api/client"
import type {
  FeedbackLabel,
  FeedbackTargetType,
  OperatorFeedback,
} from "@/lib/api/types"

export type CreateFeedbackInput = {
  targetType: FeedbackTargetType
  targetId: string
  label: FeedbackLabel
  actor?: string
}

export function createFeedback(
  input: CreateFeedbackInput
): Promise<OperatorFeedback> {
  return backendFetch<OperatorFeedback>("/feedback", {
    method: "POST",
    body: input,
  })
}
