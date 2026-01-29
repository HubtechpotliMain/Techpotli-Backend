import Razorpay from "razorpay"
import crypto from "crypto"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"

/**
 * Razorpay Payment Provider Service
 * Implements Medusa Payment Provider interface for Razorpay integration
 */
class RazorpayProviderService extends AbstractPaymentProvider {
  // Provider id will be stored as `pp_{identifier}_{providerConfigId}`
  // With `id: "razorpay"` in `medusa-config.ts`, this becomes `pp_razorpay_razorpay`
  static identifier = "razorpay"
  private razorpay: Razorpay

  constructor(container: any, options: Record<string, unknown>) {
    super(container, options)
    
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      throw new Error(
        "Razorpay payment provider requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables"
      )
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })
  }

  /**
   * Get payment provider identifier
   */
  getIdentifier(): string {
    return RazorpayProviderService.identifier
  }

  /**
   * Initialize payment session
   * Creates a Razorpay order and stores order_id in session data
   */
  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    try {
      const { amount, currency_code, data } = input
      const paymentContext = (data || {}) as Record<string, unknown>

      // Convert amount to paise (smallest currency unit for INR)
      // Medusa provides amount in smallest currency unit already
      const amountInPaise = Math.round(Number(amount))

      if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
        throw this.buildError("Amount must be greater than zero")
      }

      // Create Razorpay order
      const orderOptions = {
        amount: amountInPaise,
        currency: String(currency_code || "INR").toUpperCase(),
        receipt: `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        notes: {
          medusa_cart_id: String((paymentContext as any)?.cart_id || ""),
          medusa_region_id: String((paymentContext as any)?.region_id || ""),
        },
      }

      const razorpayOrder = await this.razorpay.orders.create(orderOptions)

      // Store razorpay_order_id in session data
      return {
        id: razorpayOrder.id,
        status: PaymentSessionStatus.PENDING,
        data: {
          razorpay_order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
        },
      }
    } catch (error: any) {
      throw this.buildError(
        `Failed to create Razorpay order: ${error?.message || String(error)}`,
        error
      )
    }
  }

  /**
   * Authorize payment
   * Verifies payment signature and marks payment as authorized
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    try {
      const sessionData = (input.data || {}) as Record<string, unknown>
      const ctx = (input.context || {}) as any

      const razorpay_payment_id = ctx?.razorpay_payment_id as string | undefined
      const razorpay_order_id =
        (ctx?.razorpay_order_id as string | undefined) ||
        (sessionData as any)?.razorpay_order_id
      const razorpay_signature = ctx?.razorpay_signature as string | undefined

      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        throw this.buildError("Missing required payment verification data")
      }

      // If we already have an order_id in the session data, ensure it matches the one returned by Razorpay Checkout
      const expectedOrderId = (sessionData as any)?.razorpay_order_id
      if (expectedOrderId && expectedOrderId !== razorpay_order_id) {
        throw this.buildError("Razorpay order_id mismatch for this payment session")
      }

      // Verify payment signature
      const isValid = this.verifyPaymentSignature(
        razorpay_order_id as string,
        razorpay_payment_id as string,
        razorpay_signature as string
      )

      if (!isValid) {
        throw this.buildError("Invalid payment signature")
      }

      // Fetch payment details from Razorpay
      const payment = await this.razorpay.payments.fetch(
        razorpay_payment_id as string
      )

      if (payment.order_id && payment.order_id !== razorpay_order_id) {
        throw this.buildError("Razorpay payment does not belong to this order")
      }

      if (payment.status !== "authorized" && payment.status !== "captured") {
        throw this.buildError(`Payment status is ${payment.status}`)
      }

      const status =
        payment.status === "captured"
          ? PaymentSessionStatus.CAPTURED
          : PaymentSessionStatus.AUTHORIZED

      // Return authorized status with payment data (merged into the existing session data)
      return {
        status,
        data: {
          ...sessionData,
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id,
          razorpay_signature,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          created_at: payment.created_at,
          captured: payment.captured,
        },
      }
    } catch (error: any) {
      throw this.buildError(
        `Payment authorization failed: ${error?.message || String(error)}`,
        error
      )
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    // Razorpay Order cannot be updated meaningfully for our use-case.
    // Return the input data as-is.
    return {
      data: input.data,
    }
  }

  /**
   * Capture payment
   * Captures an authorized payment in Razorpay
   */
  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    try {
      const sessionData = (input.data || {}) as any
      const razorpay_payment_id = sessionData.razorpay_payment_id as
        | string
        | undefined

      if (!razorpay_payment_id) {
        throw this.buildError("Missing razorpay_payment_id in session data")
      }

      // Fetch payment to check current status
      const payment = await this.razorpay.payments.fetch(razorpay_payment_id)

      // If already captured, return existing data
      if (payment.status === "captured") {
        return {
          data: {
            ...sessionData,
            razorpay_payment_id: payment.id,
            razorpay_order_id: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            captured: payment.captured,
          },
        }
      }

      // Capture the payment
      const capturedPayment = await this.razorpay.payments.capture(
        razorpay_payment_id,
        payment.amount,
        payment.currency
      )

      return {
        data: {
          ...sessionData,
          razorpay_payment_id: capturedPayment.id,
          razorpay_order_id: capturedPayment.order_id,
          amount: capturedPayment.amount,
          currency: capturedPayment.currency,
          status: capturedPayment.status,
          captured: capturedPayment.captured,
        },
      }
    } catch (error: any) {
      throw this.buildError(
        `Payment capture failed: ${error?.message || String(error)}`,
        error
      )
    }
  }

  /**
   * Cancel payment
   * Cancels/refunds a payment in Razorpay
   */
  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    try {
      const sessionData = (input.data || {}) as any
      const razorpay_payment_id = sessionData.razorpay_payment_id as
        | string
        | undefined

      if (!razorpay_payment_id) {
        return {
          data: {
            ...sessionData,
            status: "canceled",
          },
        }
      }

      // Fetch payment status
      const payment = await this.razorpay.payments.fetch(razorpay_payment_id)

      // If payment is captured, initiate refund
      if (payment.status === "captured") {
        try {
          await this.razorpay.payments.refund(razorpay_payment_id, {
            amount: payment.amount,
          })
        } catch (refundError: any) {
          // Log error but don't fail cancellation
          console.error("Refund failed during cancellation:", refundError)
        }
      }

      return {
        data: {
          ...sessionData,
          status: "canceled",
        },
      }
    } catch (error: any) {
      throw this.buildError(
        `Payment cancellation failed: ${error?.message || String(error)}`,
        error
      )
    }
  }

  /**
   * Delete payment session
   */
  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    // Razorpay doesn't require explicit deletion
    return { data: input.data }
  }

  /**
   * Retrieve payment
   * Fetches payment details from Razorpay
   */
  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    try {
      const sessionData = (input.data || {}) as any
      const razorpay_payment_id = sessionData.razorpay_payment_id as
        | string
        | undefined

      if (!razorpay_payment_id) {
        throw this.buildError("Missing razorpay_payment_id")
      }

      const payment = await this.razorpay.payments.fetch(razorpay_payment_id)

      return {
        data: {
          ...sessionData,
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          created_at: payment.created_at,
          captured: payment.captured,
        },
      }
    } catch (error: any) {
      throw this.buildError(
        `Failed to retrieve payment: ${error?.message || String(error)}`,
        error
      )
    }
  }

  /**
   * Refund payment
   * Processes refund through Razorpay
   */
  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    try {
      const sessionData = (input.data || {}) as any
      const razorpay_payment_id = sessionData.razorpay_payment_id as
        | string
        | undefined
      const refundAmount = Math.round(Number(input.amount))

      if (!razorpay_payment_id) {
        throw this.buildError("Missing razorpay_payment_id")
      }

      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        throw this.buildError("Refund amount must be greater than zero")
      }

      // Create refund
      const refund = await this.razorpay.payments.refund(razorpay_payment_id, {
        amount: refundAmount,
      })

      return {
        data: {
          ...sessionData,
          razorpay_payment_id: sessionData.razorpay_payment_id,
          razorpay_order_id: sessionData.razorpay_order_id,
          refund_id: refund.id,
          refund_amount: refund.amount,
          refund_status: refund.status,
          refunded_at: refund.created_at,
        },
      }
    } catch (error: any) {
      throw this.buildError(
        `Refund failed: ${error?.message || String(error)}`,
        error
      )
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    try {
      const sessionData = (input.data || {}) as any
      const razorpay_payment_id = sessionData.razorpay_payment_id as
        | string
        | undefined

      if (!razorpay_payment_id) {
        return { status: PaymentSessionStatus.PENDING }
      }

      const payment = await this.razorpay.payments.fetch(razorpay_payment_id)

      // Map Razorpay status to Medusa status
      switch (payment.status) {
        case "authorized":
          return { status: PaymentSessionStatus.AUTHORIZED }
        case "captured":
          return { status: PaymentSessionStatus.CAPTURED }
        case "refunded":
          return { status: PaymentSessionStatus.CANCELED }
        case "failed":
          return { status: PaymentSessionStatus.ERROR }
        default:
          return { status: PaymentSessionStatus.PENDING }
      }
    } catch (error) {
      return { status: PaymentSessionStatus.PENDING }
    }
  }

  /**
   * Webhook support (optional)
   * We handle Razorpay webhooks in `src/api/webhooks/razorpay/route.ts`.
   * This is implemented to satisfy the abstract interface.
   */
  async getWebhookActionAndData(
    _webhookData: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: "not_supported" }
  }

  /**
   * Verify payment signature
   * Uses HMAC SHA256 to verify payment authenticity
   */
  private verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET
      if (!keySecret) {
        throw new Error("RAZORPAY_KEY_SECRET not configured")
      }

      // Create expected signature
      const text = `${orderId}|${paymentId}`
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(text)
        .digest("hex")

      // Compare signatures (constant-time comparison)
      return crypto.timingSafeEqual(
        Buffer.from(generatedSignature),
        Buffer.from(signature)
      )
    } catch (error) {
      console.error("Signature verification error:", error)
      return false
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    data: string | Record<string, unknown>,
    signature: string
  ): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
      if (!webhookSecret) {
        console.warn("RAZORPAY_WEBHOOK_SECRET not configured, skipping webhook verification")
        return true // Allow if webhook secret not set (for development)
      }

      const payload = typeof data === "string" ? data : JSON.stringify(data)
      const generatedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex")

      return crypto.timingSafeEqual(
        Buffer.from(generatedSignature),
        Buffer.from(signature)
      )
    } catch (error) {
      console.error("Webhook signature verification error:", error)
      return false
    }
  }

  /**
   * Get Razorpay instance (for webhook handler)
   */
  getRazorpayInstance(): Razorpay {
    return this.razorpay
  }

  /**
   * Build error response
   */
  protected buildError(message: string, error?: any): Error {
    const e = new Error(message)

    // Preserve original stack when possible to help debugging
    if (error?.stack) {
      e.stack = error.stack
    }

    return e
  }
}

export default RazorpayProviderService
