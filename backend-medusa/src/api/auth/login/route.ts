import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * Custom login endpoint that checks email verification before allowing login
 * This endpoint should be used instead of the default Medusa auth.login
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const body = (req.body ?? {}) as { email?: string; password?: string }
  const { email, password } = body

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    })
  }

  try {
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    // NOTE: This route is not used by the storefront anymore.
    // Kept for backward compatibility/debugging, but do NOT rely on Modules.AUTH.login.

    return res.status(410).json({
      message:
        "This login endpoint is deprecated. Please use the standard Medusa auth endpoint.",
      code: "DEPRECATED_ENDPOINT",
    })

    // If auth succeeds, check email verification
    try {
      const customers = await customerModuleService.listCustomers({
        email,
      })

      if (customers.length > 0) {
        const customer = customers[0]
        const emailVerified = customer.metadata?.email_verified as boolean | undefined

        // Block login if email is not verified
        if (emailVerified === false) {
          return res.status(403).json({
            message: "Please verify your email before logging in. Check your inbox for the verification link.",
            code: "EMAIL_NOT_VERIFIED",
          })
        }

        // If email_verified is not set (legacy users), mark as verified
        // no-op
      }
    } catch (verificationCheckError) {
      // Log but don't block login if verification check fails
      console.error("Verification check error:", verificationCheckError)
    }

    // unreachable
  } catch (error: any) {
    console.error("Login error:", error)
    const statusCode = error.status || error.statusCode || 500
    return res.status(statusCode).json({
      message: error.message || "Login failed",
    })
  }
}
