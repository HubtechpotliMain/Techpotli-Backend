import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { verifyVerificationToken } from "../../../utils/verification-token"

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8000"
const FRONTEND_VERIFY_REDIRECT_PATH =
  process.env.FRONTEND_VERIFY_REDIRECT_PATH || "/in/account"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { token } = req.query

  if (!token || typeof token !== "string") {
    return res.redirect(
      `${FRONTEND_URL}${FRONTEND_VERIFY_REDIRECT_PATH}?error=invalid_token`
    )
  }

  try {
    // Verify token
    const payload = verifyVerificationToken(token)

    if (!payload) {
      return res.redirect(
        `${FRONTEND_URL}${FRONTEND_VERIFY_REDIRECT_PATH}?error=invalid_or_expired_token`
      )
    }

    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

    // Retrieve customer
    const customer = await customerModuleService.retrieveCustomer(payload.customerId)

    if (!customer) {
      return res.redirect(
        `${FRONTEND_URL}${FRONTEND_VERIFY_REDIRECT_PATH}?error=customer_not_found`
      )
    }

    // Check if already verified
    if (customer.metadata?.email_verified === true) {
      return res.redirect(
        `${FRONTEND_URL}${FRONTEND_VERIFY_REDIRECT_PATH}?verified=true&message=already_verified`
      )
    }

    // Verify email matches
    if (customer.email !== payload.email) {
      return res.redirect(
        `${FRONTEND_URL}${FRONTEND_VERIFY_REDIRECT_PATH}?error=email_mismatch`
      )
    }

    // Mark as verified and remove token
    const updatedMetadata: Record<string, unknown> = {
      ...(customer.metadata || {}),
    }

    // IMPORTANT: ensure the token matches the one we issued (prevents reuse)
    const storedToken = customer.metadata?.verification_token as string | undefined
    if (!storedToken || storedToken !== token) {
      return res.redirect(
        `${FRONTEND_URL}${FRONTEND_VERIFY_REDIRECT_PATH}?error=invalid_or_expired_token`
      )
    }

    updatedMetadata.email_verified = true
    updatedMetadata.email_verified_at = Date.now().toString()
    // Remove verification token fields
    delete updatedMetadata.verification_token
    delete updatedMetadata.verification_token_created_at

    // IMPORTANT: updateCustomers signature is (id, data) / (selector, data)
    await customerModuleService.updateCustomers(customer.id, {
      metadata: updatedMetadata,
    })

    // Redirect to frontend success page
    return res.redirect(
      `${FRONTEND_URL}${FRONTEND_VERIFY_REDIRECT_PATH}?verified=true`
    )
  } catch (error) {
    console.error("Email verification error:", error)
    return res.redirect(
      `${FRONTEND_URL}${FRONTEND_VERIFY_REDIRECT_PATH}?error=verification_failed`
    )
  }
}
