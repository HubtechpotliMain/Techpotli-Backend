# Techpotli Admin Login — UI/UX Design

## Design direction

- **Light theme only** — no dark mode. Trust, security, and professionalism.
- **Enterprise SaaS** — internal admin panel, not a consumer storefront.

## Design choices

1. **Background & card**
   - Page background: `#F5F7FA` (soft gray) to reduce glare and feel calm.
   - Card: `#FFFFFF`, 12px radius, light shadow (`0 1px 3px rgba(0,0,0,0.08)`) so the form reads as a clear, contained surface.
   - Card max-width 360px with padding for comfortable reading and alignment.

2. **Branding**
   - Logo at top, compact (`h-10`, max-width 140px) so it doesn’t dominate.
   - Title: “Techpotli Admin Panel” — clear and admin-focused.
   - Subtitle: “Secure access to your enterprise ecommerce management system” — reinforces security and scope.

3. **Form**
   - Labels: “Email” and “Password” (from i18n).
   - Inputs: white background, `#E5E7EB` border, 8px radius; focus ring uses primary blue.
   - Primary CTA: “Login to Dashboard” (replacing “Continue with Email”), blue `#2563EB`, hover `#1D4ED8`.

4. **Copy**
   - Removed generic “account area”; replaced with enterprise/subtitle copy above.
   - Footer: “© Techpotli • Secure Admin Access” in muted gray below the form.

5. **Performance**
   - Single injected `<style>` block; no extra JS or animations.
   - Theme applied by adding one class to the login root; selectors stay minimal.

## Files

| File | Role |
|------|------|
| `src/admin/i18n/json/en.json` | Title, hint, button, forgot password, fields. |
| `src/admin/widgets/login-branding.tsx` | Light-theme CSS, logo, hide Medusa logo. |
| `src/admin/widgets/login-footer.tsx` | Footer “© Techpotli • Secure Admin Access”. |

## Constraints

- Authentication logic and backend auth are unchanged.
- Only layout, styles, and copy are modified via i18n and login.before / login.after widgets.
