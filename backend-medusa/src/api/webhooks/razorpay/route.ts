import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"

/**
 * POST /api/webhooks/razorpay
 * 
 * Handles Razorpay webhook events
 * Verifies webhook signature and processes events
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const razorpaySignature = req.headers["x-razorpay-signature"] as string

    if (!razorpaySignature) {
      res.status(400).json({
        error: "Missing Razorpay signature header",
      })
      return
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      res.status(500).json({
        error: "RAZORPAY_WEBHOOK_SECRET is not configured",
      })
      return
    }

    // Verify webhook signature.
    // Prefer using raw body if available; fallback to JSON stringification.
    const rawBody =
      (req as any).rawBody?.toString?.("utf8") ||
      JSON.stringify(req.body ?? {})

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex")

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpaySignature)
    )

    if (!isValid) {
      res.status(401).json({
        error: "Invalid webhook signature",
      })
      return
    }

    const body = (req.body || {}) as any
    const event = body.event
    const payload = body.payload

    // Handle different webhook events
    switch (event) {
      case "payment.captured":
        await handlePaymentCaptured(payload, req.scope)
        break

      case "payment.failed":
        await handlePaymentFailed(payload, req.scope)
        break

      case "payment.authorized":
        await handlePaymentAuthorized(payload, req.scope)
        break

      case "refund.created":
      case "refund.processed":
        await handleRefundProcessed(payload, req.scope)
        break

      default:
        console.log(`Unhandled Razorpay webhook event: ${event}`)
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true })
  } catch (error: any) {
    console.error("Razorpay webhook error:", error)
    // Still return 200 to prevent Razorpay from retrying
    res.status(200).json({
      error: "Webhook processing failed",
      message: error?.message || String(error),
    })
  }
}

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(
  payload: any,
  _scope: any
): Promise<void> {
  try {
    const payment = payload.payment?.entity
    if (!payment) return

    // Find payment session by razorpay_payment_id
    // Note: This requires querying payment sessions by metadata
    // In production, you might want to store a mapping table

    console.log("Payment captured:", payment.id)
    // Update payment status in Medusa
    // Implementation depends on your payment session storage strategy
  } catch (error) {
    console.error("Error handling payment.captured:", error)
  }
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(
  payload: any,
  _scope: any
): Promise<void> {
  try {
    const payment = payload.payment?.entity
    if (!payment) return

    console.log("Payment failed:", payment.id)
    // Update payment status in Medusa
  } catch (error) {
    console.error("Error handling payment.failed:", error)
  }
}

/**
 * Handle payment.authorized event
 */
async function handlePaymentAuthorized(
  payload: any,
  _scope: any
): Promise<void> {
  try {
    const payment = payload.payment?.entity
    if (!payment) return

    console.log("Payment authorized:", payment.id)
    // Payment is authorized, ready for capture
  } catch (error) {
    console.error("Error handling payment.authorized:", error)
  }
}

/**
 * Handle refund processed event
 */
async function handleRefundProcessed(
  payload: any,
  _scope: any
): Promise<void> {
  try {
    const refund = payload.refund?.entity
    if (!refund) return

    console.log("Refund processed:", refund.id)
    // Update refund status in Medusa
  } catch (error) {
    console.error("Error handling refund.processed:", error)
  }
}
