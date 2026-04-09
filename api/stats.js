const { fetchContactsByTag } = require('./_ghl');

const DEALS = [
  {
    slug: 'white_rocks',
    name: 'White Rocks Entertainment Hotel & Residences',
    campaign_type: 'deal',
    asset_type: 'Mixed-Use',
    location: 'Austin, Texas',
    raise_target: '$30,000,000',
    memo_url: 'https://deals.oakstcap.com/white-rocks',
  },
  {
    slug: 'nurture_q2_2026',
    name: 'Q2 2026 Investor Nurture',
    campaign_type: 'nurture',
    asset_type: null,
    location: null,
    raise_target: null,
    memo_url: null,
  },
];

module.exports = async function handler(req, res) {
  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return res.status(500).json({ error: 'GHL credentials not configured' });
  }

  try {
    const dealStats = await Promise.all(DEALS.map(async (deal) => {
      const tag = `deal_outreach_${deal.slug}`;
      const { total, contacts } = await fetchContactsByTag(tag, GHL_LOCATION_ID, GHL_API_KEY, { pageLimit: 100 });

      // Use the most recently updated contact's date as "last activity"
      let lastActivity = null;
      let sentAt = null;
      if (contacts.length > 0) {
        const sorted = contacts.slice().sort((a, b) =>
          new Date(b.dateUpdated || b.dateAdded || 0) - new Date(a.dateUpdated || a.dateAdded || 0)
        );
        const latest = sorted[0];
        const d = new Date(latest.dateUpdated || latest.dateAdded);
        if (!isNaN(d)) {
          lastActivity = `${d.getMonth() + 1}/${d.getDate()}`;
          sentAt = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }
      }

      return {
        name: deal.name,
        slug: deal.slug,
        campaign_type: deal.campaign_type || 'deal',
        asset_type: deal.asset_type || null,
        location: deal.location || null,
        raise_target: deal.raise_target || null,
        memo_url: deal.memo_url || null,
        sent_count: total,
        total_matched: total,
        total_views: 0,
        unique_viewers: 0,
        view_rate: 0,
        last_activity: lastActivity,
        sent_at: sentAt,
        status: total > 0 ? 'SENT' : 'PENDING',
      };
    }));

    const totalContacts = dealStats.reduce((sum, d) => sum + d.sent_count, 0);
    const activeDeals = dealStats.filter(d => d.status === 'SENT').length;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.json({
      deals: dealStats,
      daily_sent: 0,
      daily_limit: 100,
      total_contacts: totalContacts,
      active_deals: activeDeals,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('stats error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
