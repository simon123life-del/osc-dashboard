// activity.js — pulls real click events from the tracker server's /clicks endpoint
// Tracker lives on the Mac Mini, exposed publicly via Tailscale Funnel

const TRACKER_BASE = process.env.TRACKER_BASE_URL || 'https://bryces-mac-mini.tailfa4ceb.ts.net';

module.exports = async function handler(req, res) {
  try {
    const url = `${TRACKER_BASE}/clicks?limit=100`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      throw new Error(`Tracker returned ${response.status}`);
    }

    const data = await response.json();
    const events = data.events || [];

    const now = Date.now();

    const formatted = events.map(e => {
      const ts = e.timestamp || '';
      const d  = ts ? new Date(ts) : null;
      const ageMin = d && !isNaN(d) ? Math.floor((now - d.getTime()) / 60000) : null;

      let tsDisplay = '—';
      if (d && !isNaN(d)) {
        tsDisplay = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      }

      return {
        timestamp:     ts,
        ts_display:    tsDisplay,
        contact_name:  e.contact_name  || '',
        contact_email: e.contact_email || '',
        deal_slug:     e.deal_slug     || '',
        campaign_name: e.campaign_name || e.deal_slug || '',
        is_repeat:     e.is_repeat,
        is_new:        ageMin !== null && ageMin < 60,
        age_minutes:   ageMin,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
    return res.json({
      events:          formatted,
      total_events:    data.total_events    || formatted.length,
      unique_clickers: data.unique_clickers || 0,
      first_clicks:    data.first_clicks    || 0,
    });
  } catch (err) {
    console.error('activity error:', err.message);
    // Return empty on error — dashboard shows "no clicks yet" rather than crashing
    return res.json({
      events: [],
      total_events: 0,
      unique_clickers: 0,
      first_clicks: 0,
      error: err.message,
    });
  }
};
