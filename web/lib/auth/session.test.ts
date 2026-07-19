import { describe, expect, it } from "vitest"

import { createSessionToken, verifySessionToken } from "./session"

describe("dashboard session", () => {
  const secret = "a-secret-long-enough-for-the-test"
  const now = Date.UTC(2026, 6, 18)

  it("accepts a valid signed session", () => {
    const token = createSessionToken(secret, now)

    expect(verifySessionToken(token, secret, now)).toBe(true)
  })

  it("rejects a token signed with another secret", () => {
    const token = createSessionToken(secret, now)

    expect(verifySessionToken(token, "another-secret", now)).toBe(false)
  })

  it("rejects an expired session", () => {
    const token = createSessionToken(secret, now)

    expect(verifySessionToken(token, secret, now + 24 * 60 * 60 * 1000)).toBe(
      false
    )
  })

  it("rejects malformed input", () => {
    expect(verifySessionToken("not-a-session", secret, now)).toBe(false)
  })
})
