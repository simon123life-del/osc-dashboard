/**
 * Outlook OAuth callback proxy.
 *
 * Microsoft redirects here after the user authorizes the app.
 * We forward code + state to the tracker which exchanges the code for tokens,
 * then return the success page to the user's browser.
 *
 * This keeps the client-visible URL on the dashboard domain
 * (not bryces-mac-mini.tailfa4ceb.ts.net).
 */
const TRACKER_BASE = process.env.TRACKER_BASE_URL || 'https://bryces-mac-mini.tailfa4ceb.ts.net';

module.exports = async function handler(req, res) {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`
      <!doctype html><html><head><title>Connection Failed</title>
      <style>body{font-family:system-ui;max-width:520px;margin:80px auto;padding:0 24px;text-align:center}
      h2{color:#c0392b}p{color:#555}</style></head><body>
      <h2>Authorization Failed</h2>
      <p>${error}: ${error_description || ''}</p>
      <p>Please close this tab and try again from the dashboard.</p>
      </body></html>
    `);
  }

  if (!code) {
    return res.status(400).send('No authorization code received.');
  }

  try {
    const url = `${TRACKER_BASE}/auth/outlook/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const html = await r.text();
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(r.ok ? 200 : r.status).send(html);
  } catch (err) {
    return res.status(500).send(`
      <!doctype html><html><head><title>Connection Error</title>
      <style>body{font-family:system-ui;max-width:520px;margin:80px auto;padding:0 24px;text-align:center}
      h2{color:#c0392b}p{color:#555}</style></head><body>
      <h2>Connection Error</h2>
      <p>${err.message}</p>
      <p>Please close this tab and try again.</p>
      </body></html>
    `);
  }
};
