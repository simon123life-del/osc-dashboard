const TRACKER_BASE = process.env.TRACKER_BASE_URL || 'https://bryces-mac-mini.tailfa4ceb.ts.net';

module.exports = async function handler(req, res) {
  const slug = req.query.slug;
  if (!slug) return res.status(400).json({ error: 'slug required' });

  try {
    const r = await fetch(`${TRACKER_BASE}/api/pacing/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Tracker ${r.status}`);
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.json(data);
  } catch (err) {
    console.error('pacing error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
