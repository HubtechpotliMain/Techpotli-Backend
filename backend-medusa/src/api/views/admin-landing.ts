/**
 * Techpotli Admin Landing — view layer for GET "/".
 * TypeScript-owned template: no loose HTML files, no runtime file reads.
 * Used only by src/api/route.ts. No DB, no auth, sub-100ms delivery.
 */

const LOGO_PATH = "/mn.png";

/** Inline CSS: single paint, no extra requests, enterprise SaaS look. */
const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: #0c0c0f;
    background-image: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.12), transparent),
      linear-gradient(180deg, #0c0c0f 0%, #111114 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #e4e4e7;
    padding: 1.5rem;
  }
  .card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    padding: 3rem 2.5rem;
    max-width: 420px;
    width: 100%;
    text-align: center;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 25px 50px -12px rgba(0,0,0,0.5);
  }
  .logo {
    width: 128px;
    height: auto;
    margin-bottom: 2rem;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.03em;
    margin-bottom: 0.5rem;
    color: #fff;
  }
  .subtitle {
    font-size: 0.9375rem;
    color: #a1a1aa;
    margin-bottom: 2rem;
    font-weight: 400;
  }
  .btn {
    display: inline-block;
    background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
    color: #fff;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9375rem;
    padding: 0.875rem 2rem;
    border-radius: 10px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    border: none;
    cursor: pointer;
  }
  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.45);
  }
  .footer {
    margin-top: 2rem;
    font-size: 0.75rem;
    color: #71717a;
  }
`;

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
    <p class="footer">Techpotli &middot; Backend</p>
  </div>
</body>
</html>`;
}
