const { fetchContactsByTag, ghlGet } = require('./_ghl');

const DAILY_LIMIT = 500;

const DEALS = [
  {
    slug: 'white_rocks',
    name: 'White Rocks Entertainment Hotel & Residences',
    campaign_type: 'deal',
    asset_type: 'Mixed-Use',
    location: 'Austin, Texas',
    raise_target: '$30,000,000',
    memo_url: 'https://deals.oakstcap.com/white-rocks',
    form_tag: null,
  },
  {
    slug: 'nurture_q2_2026',
    name: 'Q2 2026 Investor Nurture',
    campaign_type: 'nurture',
    asset_type: null,
    location: null,
    raise_target: null,
    memo_url: null,
    form_tag: 'investor_profiled',  // GHL tag applied when investor submits the profile form
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

    const [dealStats, totalContactsResult] = await Promise.all([
      Promise.all(DEALS.map(async (deal) => {
        const outreachTag = `deal_outreach_${deal.slug}`;
        const clickedTag  = `deal_viewed_${deal.slug}`;

        const fetches = [
          fetchContactsByTag(outreachTag, GHL_LOCATION_ID, GHL_API_KEY),
          fetchContactsByTag(clickedTag,  GHL_LOCATION_ID, GHL_API_KEY),
        ];
        if (deal.form_tag) {
          fetches.push(fetchContactsByTag(deal.form_tag, GHL_LOCATION_ID, GHL_API_KEY));
        }

        const results = await Promise.all(fetches);
        const outreach = results[0];
        const clicked  = results[1];
        const profiled = results[2] || { total: 0 };

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

        const sentToday = outreach.contacts.filter(c => {
          const d = new Date(c.dateUpdated || c.dateAdded || 0);
          return d >= todayStart;
        }).length;

        const emailsSent     = outreach.total;
        const uniqueClickers = clicked.total;
        const formSubmissions = profiled.total;
        const clickRate      = emailsSent > 0 ? Math.round((uniqueClickers / emailsSent) * 100) : 0;
        const conversionRate = uniqueClickers > 0 ? Math.round((formSubmissions / uniqueClickers) * 100) : 0;

        return {
          name: deal.name,
          slug: deal.slug,
          campaign_type: deal.campaign_type || 'deal',
          asset_type: deal.asset_type || null,
          location: deal.location || null,
          raise_target: deal.raise_target || null,
          memo_url: deal.memo_url || null,
          has_form: !!deal.form_tag,
          // Explicit, unambiguous metric names
          emails_sent:       emailsSent,
          sent_today:        sentToday,
          unique_clickers:   uniqueClickers,
          form_submissions:  formSubmissions,
          click_rate:        clickRate,
          conversion_rate:   conversionRate,
          last_activity:     lastActivity,
          sent_at:           sentAt,
          status: emailsSent > 0 ? 'SENT' : 'PENDING',
          // Legacy aliases so existing renderers don't break
          sent_count:        emailsSent,
          total_views:       uniqueClickers,
          unique_viewers:    uniqueClickers,
          view_rate:         clickRate,
        };
      })),
      ghlGet('/contacts/', { locationId: GHL_LOCATION_ID, limit: 1 }, GHL_API_KEY)
        .catch(() => ({ meta: { total: 0 } })),
    ]);

    const totalContacts = totalContactsResult.meta?.total || 0;
    const dailySent     = dealStats.reduce((sum, d) => sum + d.sent_today, 0);
    const activeDeals   = dealStats.filter(d => d.status === 'SENT').length;
    const totalFormSubmissions = dealStats.reduce((sum, d) => sum + (d.form_submissions || 0), 0);

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.json({
      deals: dealStats,
      daily_sent: dailySent,
      daily_limit: DAILY_LIMIT,
      total_contacts: totalContacts,
      active_deals: activeDeals,
      total_form_submissions: totalFormSubmissions,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('stats error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
