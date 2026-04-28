const TRACKER_BASE = process.env.TRACKER_BASE_URL || 'https://bryces-mac-mini.tailfa4ceb.ts.net';

module.exports = async function handler(req, res) {
  const { contact_id } = req.query;
  if (!contact_id) return res.status(400).json({ error: 'contact_id required' });
  try {
    const r = await fetch(
      `${TRACKER_BASE}/api/contact/${encodeURIComponent(contact_id)}/thread?client=osc`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!r.ok) throw new Error(`Tracker ${r.status}`);
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.json(data);
  } catch (err) {
    console.error('thread error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
