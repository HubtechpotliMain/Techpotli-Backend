/**
 * Techpotli Admin Landing — view layer for GET /home (and root redirect).
 * Light theme, trust-focused, enterprise. No dark mode.
 * Used by src/api/home/route.ts. No DB, no auth, sub-100ms delivery.
 */

const LOGO_PATH = "/mn.png"

/** Light theme: white/soft gray, optional subtle saffron accent (Hanuman ji inspired). */
const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: #F5F7FA;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #111827;
    padding: 1.5rem;
  }
  .card {
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    padding: 2.5rem 2rem;
    max-width: 420px;
    width: 100%;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  .logo {
    width: 120px;
    height: auto;
    margin-bottom: 1.5rem;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  h1 {
    font-size: 1.375rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin-bottom: 0.5rem;
    color: #111827;
  }
  .subtitle {
    font-size: 0.9375rem;
    color: #6B7280;
    margin-bottom: 1.75rem;
    font-weight: 400;
    line-height: 1.45;
  }
  .btn {
    display: inline-block;
    background: #2563EB;
    color: #fff;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9375rem;
    padding: 0.75rem 1.75rem;
    border-radius: 8px;
    transition: background 0.15s ease, box-shadow 0.15s ease;
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  .btn:hover {
    background: #1D4ED8;
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
  }
  .footer {
    margin-top: 1.75rem;
    font-size: 0.75rem;
    color: #9CA3AF;
  }
  .accent-dot { color: #EAB308; }
`

/**
 * Returns the full HTML for the Techpotli Admin landing page.
 * Static string: no I/O, no DB, safe for high throughput.
 */
export function getAdminLandingHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Techpotli Admin Panel</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="card">
    <img src="${LOGO_PATH}" alt="Techpotli" class="logo" />
    <h1>Techpotli Admin Panel</h1>
    <p class="subtitle">Enterprise Ecommerce Management System</p>
    <a href="/app" class="btn">Login to Dashboard</a>
    <p class="footer">© Techpotli · Secure Admin Access</p>
  </div>
</body>
</html>`
}
