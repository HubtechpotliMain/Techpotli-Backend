# Email Verification & Admin Notifications Setup Checklist

## ✅ Code Implementation Status

All code files have been created and are ready:

- ✅ Email Verification Service (`src/services/email-verification.ts`)
- ✅ Resend Notification Provider (`src/modules/resend/`) – admin password reset & invite emails
- ✅ Password Reset Subscriber (`src/subscribers/password-reset.ts`) – `auth.password_reset`
- ✅ Invite Created Subscriber (`src/subscribers/invite-created.ts`) – `invite.created`
- ✅ Token Utility (`src/utils/verification-token.ts`)
- ✅ Customer Created Subscriber (`src/subscribers/customer-created.ts`)
- ✅ Verification API Endpoint (`src/api/auth/verify-email/route.ts`)
- ✅ Custom Login Endpoint (`src/api/auth/login/route.ts`)
- ✅ Frontend Login Update (`Frontend/.../src/lib/data/customer.ts`)
- ✅ Frontend Signup Update (`Frontend/.../src/lib/data/customer.ts`)
- ✅ Verification Banner Component (`Frontend/.../src/modules/account/components/verification-banner/index.tsx`)
- ✅ Account Layout Update (`Frontend/.../src/modules/account/templates/account-layout.tsx`)
- ✅ Users & Developer access guard – only emails in ALLOWED_SETTINGS_ACCESS_EMAILS (env) or users with `metadata.can_access_users_developer` can access **Users** and **Developer** (no email in code)
- ✅ GET `/admin/custom/me-permissions` – returns `{ can_access_users_developer }` so the dashboard can hide Users/Developer menu
- ✅ Admin widget `settings-access-gate.tsx` – shows “Access restricted” message on Users / API Keys / Workflows pages when the admin has no permission (backend still returns 403 for API calls)
- ✅ PATCH `/admin/custom/users/:id/settings-access` – grant/revoke Users & Developer access (body: `{ can_access_users_developer: true | false }`)
- ✅ Invite accepted subscriber (`src/subscribers/invite-accepted.ts`) – copies `invite.metadata.can_access_users_developer` to the new user when they accept

## 🔧 Required Environment Variables

Add these to your `.env` file in `Backend/backend-medusa/`:

```env
# Resend API Key (REQUIRED)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Email Configuration (customer verification + admin notifications)
EMAIL_FROM=noreply@techpotli.com
# Optional: used by notification module for admin emails (password reset, invites). Defaults to EMAIL_FROM.
RESEND_FROM_EMAIL=noreply@techpotli.com

# URLs (Update for production)
BACKEND_URL=http://localhost:9000
FRONTEND_URL=http://localhost:3000

# JWT Secret (should already exist)
JWT_SECRET=your-secret-key-here

# REQUIRED for primary admin: emails that can access Users & Developer (no email is hardcoded in code for security)
# Comma-separated. Set your admin email(s) here; others can be granted via user metadata.
# ALLOWED_SETTINGS_ACCESS_EMAILS=your-admin@company.com
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

### Issue: Admin password reset or invite email not sent
**Solution:**
- Ensure the **notification module** is configured in `medusa-config.ts` with the Resend provider (see `@medusajs/medusa/notification` and `./src/modules/resend`).
- Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (or `EMAIL_FROM`). Same Resend key/from as customer verification.
- Check backend logs for "Processing auth.password_reset" or "Processing invite.created" and any Resend errors.
- Verify `BACKEND_URL` is correct so reset/invite links point to your admin (e.g. `BACKEND_URL/app/reset-password`).

### Issue: Admin gets 403 when opening Users or Developer section
**Solution:**
- Only emails in ALLOWED_SETTINGS_ACCESS_EMAILS (set in .env) and users with `can_access_users_developer: true` in user metadata can access **Users** and **Developer**.
- Add the admin’s user ID to `To grant access: call` `PATCH /admin/custom/users/:id/settings-access` with body `{ can_access_users_developer: true }`, or when inviting send `metadata: { can_access_users_developer: true }`.
- The admin widget `settings-access-gate` shows an “Access restricted” message on Users, API Keys, and Workflows pages when the admin has no permission; the backend still returns 403 for those API calls. To hide the menu items entirely you would need to call `GET /admin/custom/me-permissions` and conditionally hide the sidebar entries (Medusa admin does not expose a built-in way to filter core menu items).

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
