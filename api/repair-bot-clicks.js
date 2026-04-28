const TRACKER_BASE = process.env.TRACKER_BASE_URL || 'https://bryces-mac-mini.tailfa4ceb.ts.net';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const r = await fetch(`${TRACKER_BASE}/api/repair_bot_clicks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(`Tracker ${r.status}`);
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
