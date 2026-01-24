# Razorpay Payment Integration Setup Guide

## ✅ Integration Complete

Razorpay payment provider has been successfully integrated into your Medusa ecommerce platform.

## 📁 Files Created

### Backend
- `src/modules/payment-razorpay/service.ts` - Payment provider service
- `src/modules/payment-razorpay/index.ts` - Module definition
- `src/api/store/razorpay/verify/route.ts` - Payment verification endpoint
- `src/api/webhooks/razorpay/route.ts` - Webhook handler

### Frontend
- `src/modules/checkout/components/payment-wrapper/razorpay-wrapper.tsx` - Razorpay wrapper
- `src/modules/checkout/components/payment-button/razorpay-button.tsx` - Payment button component

## 🔧 Environment Variables Required

### Backend (.env)
```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret (optional, for webhook verification)
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## 🚀 Quick Start

1. **Get Razorpay API Keys**
   - Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
   - Go to Settings → API Keys
   - Generate Test/Live keys
   - Copy Key ID and Key Secret

2. **Add Environment Variables**
   - Add keys to backend `.env`
   - Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` to frontend `.env.local`

3. **Restart Servers**
   ```bash
   # Backend
   cd Backend/backend-medusa
   npm run dev

   # Frontend
   cd Frontend/nextjs-starter-medusa
   npm run dev
   ```

4. **Test Payment**
   - Add products to cart
   - Go to checkout
   - Select "Razorpay" as payment method
   - Complete test payment

## 🔐 Security Features

- ✅ Server-side signature verification (HMAC SHA256)
- ✅ Webhook signature verification
- ✅ No secret keys exposed to frontend
- ✅ Payment verification before order creation

## 📝 Payment Flow

1. Customer selects Razorpay → `initiatePayment()` creates Razorpay order
2. Frontend opens Razorpay Checkout with `order_id`
3. Customer completes payment on Razorpay
4. Frontend receives payment response → sends to `/store/razorpay/verify`
5. Backend verifies signature → authorizes payment session
6. Medusa order created → payment captured automatically

## 🧪 Testing

### Test Cards (Test Mode)
- **Visa**: `4111 1111 1111 1111`
- **Mastercard**: `5555 5555 5555 4444`
- **UPI Success**: `success@razorpay`
- **UPI Failure**: `failure@razorpay`

### Test Mode Features
- No real money deducted
- Mock payment pages
- Test all payment methods

## 🌐 Webhook Setup

1. In Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `payment.authorized`
   - `refund.created`
   - `refund.processed`
4. Copy webhook secret to `RAZORPAY_WEBHOOK_SECRET`

## 🎯 Production Checklist

- [ ] Switch to Live Mode API keys
- [ ] Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` with live keys
- [ ] Configure webhook URL in Razorpay Dashboard
- [ ] Set `RAZORPAY_WEBHOOK_SECRET`
- [ ] Test end-to-end payment flow
- [ ] Verify webhook events are received
- [ ] Enable auto-capture in Razorpay Dashboard (optional)

## 📚 API Endpoints

### POST /store/razorpay/verify
Verifies payment and authorizes payment session.

**Request:**
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

## 🐛 Troubleshooting

### Payment provider not showing
- Check `medusa-config.ts` has Razorpay in payment providers
- Verify environment variables are set
- Restart Medusa backend

### Payment verification fails
- Check `RAZORPAY_KEY_SECRET` matches the key used to create order
- Verify signature is being sent correctly from frontend
- Check backend logs for error details

### Webhook not receiving events
- Verify webhook URL is accessible
- Check webhook secret matches
- Ensure events are enabled in Razorpay Dashboard

## 📞 Support

For issues:
1. Check Razorpay Dashboard for payment status
2. Review backend logs for errors
3. Verify all environment variables are set
4. Test with Razorpay test mode first
