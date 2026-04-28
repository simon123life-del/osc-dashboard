const TRACKER_BASE = process.env.TRACKER_BASE_URL || 'https://bryces-mac-mini.tailfa4ceb.ts.net';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const r = await fetch(
      `${TRACKER_BASE}/auth/gmail/disconnect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: 'osc' }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!r.ok) throw new Error(`Tracker ${r.status}`);
    const data = await r.json();
    return res.json(data);
  } catch (err) {
    console.error('gmail-disconnect error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
