import { createHmac, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE_NAME = "research_desk_session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

type SessionPayload = {
  expiresAt: number
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function createSessionToken(
  secret: string,
  now = Date.now()
): string {
  const payload = Buffer.from(
    JSON.stringify({
      expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
    } satisfies SessionPayload)
  ).toString("base64url")

  return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now()
): boolean {
  if (!token || !secret) {
    return false
  }

  const [payload, signature, extra] = token.split(".")
  if (!payload || !signature || extra) {
    return false
  }

  const expectedSignature = Buffer.from(sign(payload, secret))
  const actualSignature = Buffer.from(signature)

  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return false
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SessionPayload

    return Number.isFinite(session.expiresAt) && session.expiresAt > now
  } catch {
    return false
  }
}
