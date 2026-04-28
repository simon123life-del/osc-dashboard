const TRACKER_BASE = process.env.TRACKER_BASE_URL || 'https://bryces-mac-mini.tailfa4ceb.ts.net';

module.exports = async function handler(req, res) {
  try {
    const r = await fetch(
      `${TRACKER_BASE}/auth/gmail/status?client=osc`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) throw new Error(`Tracker ${r.status}`);
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.json(data);
  } catch (err) {
    console.error('gmail-status error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
