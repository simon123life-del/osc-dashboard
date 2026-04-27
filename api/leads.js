// leads.js — proxy inbound replies + form submissions from the local tracker
const TRACKER_BASE = process.env.TRACKER_BASE_URL || 'https://bryces-mac-mini.tailfa4ceb.ts.net';

module.exports = async function handler(req, res) {
  try {
    const url = `${TRACKER_BASE}/leads?limit=50`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Tracker returned ${response.status}`);
    const data = await response.json();

    const replies = (data.replies || []).map(r => ({
      id:            r.id,
      type:          'reply',
      received_at:   r.received_at,
      ts_display:    _fmtTs(r.received_at),
      contact_email: r.contact_email || '',
      contact_name:  r.contact_name  || '',
      campaign_slug: r.campaign_slug || '',
      subject:       r.subject       || '',
      body_preview:  r.body_preview  || '',
      body_plain:    r.body_plain    || '',
    }));

    const forms = (data.form_submissions || []).map(f => ({
      id:            f.id,
      type:          'form',
      received_at:   f.submitted_at,
      ts_display:    _fmtTs(f.submitted_at),
      contact_email: f.contact_email || '',
      contact_name:  '',
      campaign_slug: '',
      subject:       f.form_name    || 'Form Submission',
      body_preview:  f.payload_preview || '',
    }));

    const all = [...replies, ...forms].sort(
      (a, b) => new Date(b.received_at) - new Date(a.received_at)
    );

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ leads: all });
  } catch (err) {
    console.error('leads error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

function _fmtTs(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
