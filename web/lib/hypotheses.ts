import type { Hypothesis } from "@/lib/api/types"

export type PartitionedOpenHypotheses = {
  fromReports: Hypothesis[]
  manual: Hypothesis[]
}

/** Open hypotheses from briefs/alerts first; manuals kept separate for the desk. */
export function partitionOpenHypotheses(
  open: Hypothesis[]
): PartitionedOpenHypotheses {
  const fromReports: Hypothesis[] = []
  const manual: Hypothesis[] = []

  for (const hypothesis of open) {
    if (hypothesis.source === "manual") {
      manual.push(hypothesis)
    } else {
      fromReports.push(hypothesis)
    }
  }

  return { fromReports, manual }
}

export function findHypothesisForBrief(
  hypotheses: Hypothesis[],
  briefId: string
): Hypothesis | null {
  return (
    hypotheses.find(
      (hypothesis) =>
        hypothesis.source === "brief" && hypothesis.sourceRefId === briefId
    ) ?? null
  )
}
