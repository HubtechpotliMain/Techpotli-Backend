# Email Verification Setup Checklist

## ✅ Code Implementation Status

All code files have been created and are ready:

- ✅ Email Verification Service (`src/services/email-verification.ts`)
- ✅ Token Utility (`src/utils/verification-token.ts`)
- ✅ Customer Created Subscriber (`src/subscribers/customer-created.ts`)
- ✅ Verification API Endpoint (`src/api/auth/verify-email/route.ts`)
- ✅ Custom Login Endpoint (`src/api/auth/login/route.ts`)
- ✅ Frontend Login Update (`Frontend/.../src/lib/data/customer.ts`)
- ✅ Frontend Signup Update (`Frontend/.../src/lib/data/customer.ts`)
- ✅ Verification Banner Component (`Frontend/.../src/modules/account/components/verification-banner/index.tsx`)
- ✅ Account Layout Update (`Frontend/.../src/modules/account/templates/account-layout.tsx`)

## 🔧 Required Environment Variables

Add these to your `.env` file in `Backend/backend-medusa/`:

```env
# Resend API Key (REQUIRED)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email Configuration
EMAIL_FROM=noreply@techpotli.com

# URLs (Update for production)
BACKEND_URL=http://localhost:9000
FRONTEND_URL=http://localhost:3000

# JWT Secret (should already exist)
JWT_SECRET=your-secret-key-here
```

**For Frontend** (`Frontend/nextjs-starter-medusa/.env.local`):
```env
MEDUSA_BACKEND_URL=http://localhost:9000
```

## 🧪 Testing Steps

### 1. Test Signup Flow
1. Start backend: `cd Backend/backend-medusa && npm run dev`
2. Start frontend: `cd Frontend/nextjs-starter-medusa && npm run dev`
3. Go to registration page
4. Fill out registration form
5. Submit form
6. ✅ Should see success message: "Account created! Please check your email to verify your account."
7. ✅ Check email inbox for verification email
8. ✅ Verify customer metadata has `email_verified: false`

### 2. Test Email Verification
1. Click verification link in email
2. ✅ Should redirect to account page
3. ✅ Should see success banner: "Email verified successfully! You can now log in."
4. ✅ Verify customer metadata has `email_verified: true`

### 3. Test Login Block (Before Verification)
1. Try to log in with unverified account
2. ✅ Should see error: "Please verify your email before logging in. Check your inbox for the verification link."
3. ✅ Login should be blocked (403 error)

### 4. Test Login Success (After Verification)
1. Verify email first (step 2)
2. Try to log in
3. ✅ Should log in successfully
4. ✅ Should redirect to account dashboard

### 5. Test Expired Token
1. Wait 24+ hours OR modify token expiry in code
2. Click old verification link
3. ✅ Should see error banner: "Verification link has expired or is invalid."

## ⚠️ Common Issues & Solutions

### Issue: Verification email not sent
**Solution:**
- Check `RESEND_API_KEY` is set correctly
- Verify `EMAIL_FROM` domain is verified in Resend dashboard
- Check backend logs for errors
- Ensure subscriber is registered (check Medusa logs on startup)

### Issue: Login endpoint returns 404
**Solution:**
- Verify custom route is at `src/api/auth/login/route.ts`
- Restart backend server
- Check Medusa route registration logs

### Issue: Frontend can't reach backend
**Solution:**
- Verify `MEDUSA_BACKEND_URL` is set in frontend `.env.local`
- Check CORS settings in `medusa-config.ts`
- Ensure backend is running on correct port

### Issue: Subscriber not firing
**Solution:**
- Check event name is exactly `"customer.created"`
- Verify subscriber file is in `src/subscribers/` directory
- Check backend logs for subscriber registration
- Restart backend server

### Issue: Token validation fails
**Solution:**
- Ensure `JWT_SECRET` matches between token generation and validation
- Check token hasn't expired (24 hour limit)
- Verify token format is correct

## 📝 Notes

- **Legacy Users**: Existing users without `email_verified` will be auto-marked as verified on first login
- **Email Failures**: Customer creation will succeed even if email sending fails (logged but not blocking)
- **Token Storage**: Tokens are stored in customer metadata temporarily and removed after verification
- **Security**: Tokens expire after 24 hours and are HMAC-SHA256 signed

## 🚀 Production Deployment

Before deploying to production:

1. ✅ Set strong `JWT_SECRET` (random 32+ character string)
2. ✅ Update `BACKEND_URL` and `FRONTEND_URL` to production URLs (HTTPS)
3. ✅ Verify `EMAIL_FROM` domain in Resend
4. ✅ Set `RESEND_API_KEY` in production environment
5. ✅ Update CORS settings in `medusa-config.ts`
6. ✅ Test full flow in staging environment
7. ✅ Monitor email delivery rates in Resend dashboard
8. ✅ Set up error logging/monitoring for email failures

## ✅ Verification

Run these checks to verify everything is working:

```bash
# Backend
cd Backend/backend-medusa
npm run build  # Should compile without errors
npm run dev    # Should start without errors

# Frontend  
cd Frontend/nextjs-starter-medusa
npm run build  # Should compile without errors
npm run dev    # Should start without errors
```

If all checks pass and environment variables are set, the system should work! 🎉
