const { fetchContactsByTag } = require('./_ghl');

const CAMPAIGNS = [
  { slug: 'white_rocks', name: 'White Rocks Entertainment Hotel & Residences' },
  { slug: 'nurture_q2_2026', name: 'Q2 2026 Investor Nurture' },
];

module.exports = async function handler(req, res) {
  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return res.status(500).json({ error: 'GHL credentials not configured' });
  }

  try {
    const campaignContacts = await Promise.all(CAMPAIGNS.map(async (campaign) => {
      const tag = `deal_outreach_${campaign.slug}`;
      const { contacts } = await fetchContactsByTag(tag, GHL_LOCATION_ID, GHL_API_KEY, {
        maxContacts: 5000,
        pageLimit: 100,
      });

      return contacts.map(c => {
        const ts = c.dateUpdated || c.dateAdded || null;
        let tsDisplay = '—';
        if (ts) {
          const d = new Date(ts);
          if (!isNaN(d)) {
            tsDisplay = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          }
        }
        return {
          campaign: campaign.name,
          slug: campaign.slug,
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.contactName || '—',
          email: c.email || '—',
          company: c.companyName || c.company || '—',
          ts_display: tsDisplay,
          status: 'sent',
        };
      });
    }));

    // Flatten and sort newest first
    const rows = campaignContacts.flat();
    rows.sort((a, b) => b.ts_display.localeCompare(a.ts_display));

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    return res.json(rows);
  } catch (err) {
    console.error('recipients error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
