import crypto from "crypto"

const TOKEN_EXPIRY_HOURS = 24
const TOKEN_SECRET = process.env.JWT_SECRET || "supersecret"

export interface VerificationTokenPayload {
  customerId: string
  email: string
  createdAt: number
}

/**
 * Generate a secure verification token
 * Uses HMAC-SHA256 to create a signed token
 */
export function generateVerificationToken(
  customerId: string,
  email: string
): string {
  const payload: VerificationTokenPayload = {
    customerId,
    email,
    createdAt: Date.now(),
  }

  const payloadString = JSON.stringify(payload)
  const hmac = crypto.createHmac("sha256", TOKEN_SECRET)
  hmac.update(payloadString)
  const signature = hmac.digest("hex")

  const token = Buffer.from(payloadString).toString("base64url") + "." + signature
  return token
}

/**
 * Verify and decode a verification token
 * Returns the payload if valid, null if invalid or expired
 */
export function verifyVerificationToken(
  token: string
): VerificationTokenPayload | null {
  try {
    const [payloadBase64, signature] = token.split(".")

    if (!payloadBase64 || !signature) {
      return null
    }

    const payloadString = Buffer.from(payloadBase64, "base64url").toString("utf-8")
    const payload: VerificationTokenPayload = JSON.parse(payloadString)

    // Verify signature
    const hmac = crypto.createHmac("sha256", TOKEN_SECRET)
    hmac.update(payloadString)
    const expectedSignature = hmac.digest("hex")

    if (signature !== expectedSignature) {
      return null
    }

    // Check expiration (24 hours)
    const now = Date.now()
    const expiryTime = payload.createdAt + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000

    if (now > expiryTime) {
      return null
    }

    return payload
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}
