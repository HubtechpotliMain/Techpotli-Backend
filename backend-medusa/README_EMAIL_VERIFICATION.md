# Email Verification Implementation

This document describes the email verification system implemented for TechPotli.

## Overview

The system implements Magic Link email verification for first-time users using Resend. Users must verify their email before they can log in.

## Architecture

### Backend Components

1. **Email Verification Service** (`src/services/email-verification.ts`)
   - Handles sending verification emails via Resend
   - Uses HTML and plain text email templates
   - Configurable via environment variables

2. **Verification Token Utility** (`src/utils/verification-token.ts`)
   - Generates secure HMAC-SHA256 signed tokens
   - Validates tokens and checks expiration (24 hours)
   - Uses JWT_SECRET for signing

3. **Customer Created Subscriber** (`src/subscribers/customer-created.ts`)
   - Listens to `customer.created` event
   - Sets `email_verified = false` in customer metadata
   - Generates verification token
   - Sends verification email automatically

4. **Verification API Endpoint** (`src/api/auth/verify-email/route.ts`)
   - GET endpoint: `/auth/verify-email?token=...`
   - Validates token
   - Marks customer as verified
   - Redirects to frontend with status

5. **Custom Login Endpoint** (`src/api/auth/login/route.ts`)
   - POST endpoint: `/auth/login`
   - Checks email verification before allowing login
   - Returns 403 error if email not verified
   - Uses Medusa's auth module for actual authentication

### Frontend Components

1. **Updated Signup Flow** (`src/lib/data/customer.ts`)
   - Sets `email_verified = false` on customer creation
   - Shows success message indicating verification email was sent
   - Doesn't auto-login after signup

2. **Updated Login Flow** (`src/lib/data/customer.ts`)
   - Uses custom `/auth/login` endpoint
   - Displays verification error messages
   - Handles EMAIL_NOT_VERIFIED error code

3. **Verification Banner** (`src/modules/account/components/verification-banner/index.tsx`)
   - Shows verification status messages
   - Handles URL query parameters
   - Auto-dismisses after 10 seconds

## Environment Variables

Add these to your `.env` file:

```env
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@techpotli.com

# URLs
BACKEND_URL=http://localhost:9000
FRONTEND_URL=http://localhost:3000

# JWT Secret (should already exist)
JWT_SECRET=your-secret-key-here
```

## User Flow

1. **Signup**
   - User fills registration form
   - Account created with `email_verified = false`
   - Verification email sent automatically
   - User sees success message

2. **Email Verification**
   - User clicks link in email
   - Backend validates token
   - Customer marked as verified
   - User redirected to account page with success message

3. **Login**
   - User attempts to log in
   - System checks `email_verified` status
   - If false: Login blocked with clear error message
   - If true: Login proceeds normally

## API Endpoints

### POST `/auth/login`
Custom login endpoint that checks email verification.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "token": "jwt_token_here"
}
```

**Error Response (403 - Email Not Verified):**
```json
{
  "message": "Please verify your email before logging in. Check your inbox for the verification link.",
  "code": "EMAIL_NOT_VERIFIED"
}
```

### GET `/auth/verify-email?token=...`
Verification endpoint that validates token and marks email as verified.

**Query Parameters:**
- `token` (required): Verification token from email

**Response:**
- Redirects to frontend with query parameters:
  - Success: `/account?verified=true`
  - Error: `/account?error=error_code`

## Testing

1. **Test Signup:**
   - Register a new user
   - Check email inbox for verification email
   - Verify customer metadata has `email_verified: false`

2. **Test Verification:**
   - Click verification link from email
   - Should redirect to account page with success message
   - Verify customer metadata has `email_verified: true`

3. **Test Login Block:**
   - Try to log in before verifying email
   - Should receive EMAIL_NOT_VERIFIED error
   - Verify email, then login should succeed

4. **Test Expired Token:**
   - Wait 24+ hours or modify token expiry
   - Click old verification link
   - Should show expired token error

## Production Considerations

1. **Email Service:**
   - Ensure Resend API key is set in production
   - Verify EMAIL_FROM domain is verified in Resend
   - Monitor email delivery rates

2. **Security:**
   - Use strong JWT_SECRET in production
   - Ensure BACKEND_URL and FRONTEND_URL are HTTPS in production
   - Consider rate limiting on verification endpoint

3. **Error Handling:**
   - Email failures don't block customer creation
   - Log all email sending errors
   - Consider retry mechanism for failed emails

4. **Legacy Users:**
   - Existing users without `email_verified` are auto-marked as verified on first login
   - This ensures backward compatibility

## Troubleshooting

**Verification email not sent:**
- Check RESEND_API_KEY is set correctly
- Verify EMAIL_FROM domain is verified in Resend
- Check backend logs for email service errors

**Login blocked for verified users:**
- Check customer metadata in database
- Verify `email_verified` is set to `true` (not string "true")
- Check token validation logic

**Token validation fails:**
- Ensure JWT_SECRET matches between token generation and validation
- Check token hasn't expired (24 hour limit)
- Verify token format is correct
