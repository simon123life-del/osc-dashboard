const TRACKER_BASE = process.env.TRACKER_BASE_URL || 'https://bryces-mac-mini.tailfa4ceb.ts.net';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const r = await fetch(`${TRACKER_BASE}/api/send_reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`Tracker ${r.status}`);
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.json(data);
  } catch (err) {
    console.error('send-reply error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
