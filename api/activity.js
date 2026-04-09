const { fetchContactsByTag } = require('./_ghl');

// Campaigns to check for open/click events
const CAMPAIGNS = [
  { slug: 'white_rocks',      name: 'White Rocks' },
  { slug: 'nurture_q2_2026',  name: 'Q2 2026 Nurture' },
];

module.exports = async function handler(req, res) {
  const GHL_API_KEY    = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return res.status(500).json({ error: 'GHL credentials not configured' });
  }

  try {
    // Fetch contacts with deal_viewed_* tags across all campaigns in parallel
    const campaignViews = await Promise.all(CAMPAIGNS.map(async (campaign) => {
      const viewedTag = `deal_viewed_${campaign.slug}`;
      const { contacts } = await fetchContactsByTag(viewedTag, GHL_LOCATION_ID, GHL_API_KEY, {
        pageLimit: 100,
        maxContacts: 200,
      });
      return contacts.map(c => ({ ...c, _campaign: campaign }));
    }));

    const now = Date.now();
    const events = campaignViews.flat().map(c => {
      const ts   = c.dateUpdated || c.dateAdded || null;
      const d    = ts ? new Date(ts) : null;
      const ageMin = d ? Math.floor((now - d.getTime()) / 60000) : null;

      const tsDisplay = d && !isNaN(d)
        ? `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
        : '—';

      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.contactName || '';

      return {
        timestamp:     ts || '',
        ts_display:    tsDisplay,
        contact_name:  name,
        contact_email: c.email || '',
        deal_slug:     c._campaign.slug,
        is_repeat:     false,
        is_new:        ageMin !== null && ageMin < 60,
        age_minutes:   ageMin,
      };
    });

    // Sort newest first, cap at 50
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.json(events.slice(0, 50));
  } catch (err) {
    console.error('activity error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
