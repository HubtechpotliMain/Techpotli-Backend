import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * Lightweight endpoint used by the storefront to check whether
 * a customer is allowed to log in based on email verification status.
 *
 * It does NOT perform login itself – it only inspects customer metadata.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email } = req.body as { email?: string }

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    })
  }

  try {
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

    const customers = await customerModuleService.listCustomers({
      email,
    })

    // If no customer yet, allow login attempt (auth.register will handle errors)
    if (!customers.length) {
      return res.status(200).json({
        can_login: true,
      })
    }

    const customer = customers[0]
    const rawEmailVerified = customer.metadata?.email_verified as
      | boolean
      | string
      | undefined

    // Treat ONLY true as verified. Missing/false/string-false => blocked.
    const isVerified = rawEmailVerified === true || rawEmailVerified === "true"

    if (!isVerified) {
      return res.status(403).json({
        can_login: false,
        code: "EMAIL_NOT_VERIFIED",
        message:
          "We’ve sent you a verification link. Please check your email inbox and verify your account before signing in.",
      })
    }

    return res.status(200).json({
      can_login: true,
    })
  } catch (error: any) {
    console.error("check-email-verified error:", error)
    return res.status(500).json({
      can_login: false,
      message: "Unable to verify email status. Please try again.",
    })
  }
}

