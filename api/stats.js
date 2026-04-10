const { fetchContactsByTag } = require('./_ghl');

const DAILY_LIMIT = 150;

// Tag that identifies the full campaign list (all eligible contacts)
const LIST_TAG = '1st import';

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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch deal stats + total list count in parallel
    const [dealStats, listResult] = await Promise.all([
      Promise.all(DEALS.map(async (deal) => {
        const outreachTag = `deal_outreach_${deal.slug}`;
        const viewedTag   = `deal_viewed_${deal.slug}`;

        const [outreach, viewed] = await Promise.all([
          fetchContactsByTag(outreachTag, GHL_LOCATION_ID, GHL_API_KEY),
          fetchContactsByTag(viewedTag,   GHL_LOCATION_ID, GHL_API_KEY),
        ]);

        // Last send date = most recently updated outreach contact
        let lastActivity = null;
        let sentAt = null;
        if (outreach.contacts.length > 0) {
          const sorted = outreach.contacts.slice().sort((a, b) =>
            new Date(b.dateUpdated || b.dateAdded || 0) - new Date(a.dateUpdated || a.dateAdded || 0)
          );
          const d = new Date(sorted[0].dateUpdated || sorted[0].dateAdded);
          if (!isNaN(d)) {
            lastActivity = `${d.getMonth() + 1}/${d.getDate()}`;
            sentAt = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
          }
        }

        // daily_sent: contacts tagged today (dateUpdated >= today 00:00)
        const sentToday = outreach.contacts.filter(c => {
          const d = new Date(c.dateUpdated || c.dateAdded || 0);
          return d >= todayStart;
        }).length;

        const sentCount     = outreach.total;
        const uniqueViewers = viewed.total;
        const viewRate      = sentCount > 0 ? Math.round((uniqueViewers / sentCount) * 100) : 0;

        return {
          name: deal.name,
          slug: deal.slug,
          campaign_type: deal.campaign_type || 'deal',
          asset_type: deal.asset_type || null,
          location: deal.location || null,
          raise_target: deal.raise_target || null,
          memo_url: deal.memo_url || null,
          sent_count: sentCount,
          sent_today: sentToday,
          total_views: uniqueViewers,
          unique_viewers: uniqueViewers,
          view_rate: viewRate,
          last_activity: lastActivity,
          sent_at: sentAt,
          status: sentCount > 0 ? 'SENT' : 'PENDING',
        };
      })),
      fetchContactsByTag(LIST_TAG, GHL_LOCATION_ID, GHL_API_KEY),
    ]);

    const totalContacts = listResult.total;
    const dailySent     = dealStats.reduce((sum, d) => sum + d.sent_today, 0);
    const activeDeals   = dealStats.filter(d => d.status === 'SENT').length;

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.json({
      deals: dealStats,
      daily_sent: dailySent,
      daily_limit: DAILY_LIMIT,
      total_contacts: totalContacts,
      active_deals: activeDeals,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('stats error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
