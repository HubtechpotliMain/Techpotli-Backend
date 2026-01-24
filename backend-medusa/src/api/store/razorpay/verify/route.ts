import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * POST /store/razorpay/verify
 * 
 * Verifies Razorpay payment signature and authorizes payment
 * Called from frontend after successful Razorpay checkout
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, cart_id } = req.body

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      res.status(400).json({
        error: "Missing required payment verification data",
      })
      return
    }

    if (!cart_id) {
      res.status(400).json({
        error: "Missing cart_id",
      })
      return
    }

    // Get payment module service
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
    
    // Get cart payment collection via the query/remote joiner.
    // In Medusa v2, Cart doesn't expose `payment_collection` as a direct relation in the Cart module service.
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const [cart] = await remoteQuery({
      entryPoint: "cart",
      fields: ["id", "payment_collection.id"],
      variables: { id: [cart_id] },
    })

    const paymentCollectionId = (cart as any)?.payment_collection?.id

    if (!paymentCollectionId) {
      res.status(400).json({
        error: "Cart payment collection not found",
        message:
          "The cart is missing a payment collection. Please go back to the Payment step and select Razorpay again (this creates a payment collection + session).",
      })
      return
    }

    // Get payment sessions for this collection
    const paymentSessions = await paymentModuleService.listPaymentSessions({
      payment_collection_id: paymentCollectionId,
    })

    // Find Razorpay payment session
    // Medusa v2 uses format: pp_{provider_id}_{provider_id}
    const razorpaySession = paymentSessions.find(
      (session: any) => 
        session.provider_id === "pp_razorpay_razorpay" ||
        session.provider_id?.includes("razorpay")
    )

    if (!razorpaySession) {
      res.status(400).json({
        error: "Razorpay payment session not found",
      })
      return
    }

    // Authorize the payment session (will call the provider internally)
    await paymentModuleService.authorizePaymentSession(razorpaySession.id, {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    })

    res.json({
      success: true,
      payment_session_id: razorpaySession.id,
      status: "authorized",
    })
  } catch (error: any) {
    console.error("Razorpay verification error:", error)
    res.status(500).json({
      error: "Payment verification failed",
      message: error?.message || String(error),
    })
  }
}
