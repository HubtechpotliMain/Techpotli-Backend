# Razorpay Payment Provider for Medusa v2

Complete Razorpay payment integration for Medusa ecommerce platform.

## Features

- ✅ Razorpay Orders API integration
- ✅ Payment signature verification (HMAC SHA256)
- ✅ Automatic payment capture
- ✅ Refund support
- ✅ Webhook handling
- ✅ Secure server-side verification
- ✅ Frontend Razorpay Checkout integration

## Setup

### 1. Environment Variables

Add these to your `.env` file in the backend:

```env
# Razorpay API Keys (from Razorpay Dashboard)
RAZORPAY_KEY_ID=your_key_id_here
RAZORPAY_KEY_SECRET=your_key_secret_here

# Optional: Webhook secret for webhook signature verification
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### 2. Frontend Environment Variables

Add to `.env.local` in the frontend:

```env
# Razorpay Publishable Key (same as KEY_ID from dashboard)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key_id_here
```

### 3. Webhook Configuration

In Razorpay Dashboard:
1. Go to Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `payment.authorized`
   - `refund.created`
   - `refund.processed`
4. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

## Payment Flow

1. **Customer selects Razorpay** → Medusa calls `initiatePayment()`
2. **Razorpay order created** → `razorpay_order_id` stored in payment session
3. **Frontend opens Razorpay Checkout** → Customer completes payment
4. **Payment success callback** → Frontend sends payment details to `/store/razorpay/verify`
5. **Backend verifies signature** → HMAC SHA256 verification
6. **Payment authorized** → Medusa order created
7. **Payment captured** → Automatically or manually via admin

## API Endpoints

### POST /store/razorpay/verify
Verifies payment signature and authorizes payment session.

**Request Body:**
```json
{
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "signature_xxx",
  "cart_id": "cart_xxx"
}
```

### POST /api/webhooks/razorpay
Handles Razorpay webhook events.

## Security

- ✅ All secret keys stored server-side only
- ✅ Payment signature verification before authorization
- ✅ Webhook signature verification
- ✅ No sensitive data in frontend

## Testing

Use Razorpay test mode:
- Test Key ID and Secret from Dashboard
- Test cards: `4111 1111 1111 1111` (Visa)
- UPI: `success@razorpay` or `failure@razorpay`

## Production Checklist

- [ ] Switch to Live Mode API keys
- [ ] Configure webhook URL in Razorpay Dashboard
- [ ] Set `RAZORPAY_WEBHOOK_SECRET`
- [ ] Test end-to-end payment flow
- [ ] Verify webhook events are received
- [ ] Enable auto-capture in Razorpay Dashboard (optional)
