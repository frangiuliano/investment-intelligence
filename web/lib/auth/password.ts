import "server-only"

import { timingSafeEqual } from "node:crypto"

export function verifyDashboardPassword(candidate: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD
  if (!expected) {
    return false
  }

  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)

  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  )
}
