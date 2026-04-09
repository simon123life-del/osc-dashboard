const { ghlGet, tsDisplay } = require('./_ghl');

module.exports = async function handler(req, res) {
  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return res.status(500).json({ error: 'GHL credentials not configured' });
  }

  try {
    // Fetch the 50 most recently active email conversations
    const data = await ghlGet('/conversations/search', {
      locationId: GHL_LOCATION_ID,
      limit: 50,
      sort: 'last_message_date',
      sortDir: 'desc',
      type: 'Email',
    }, GHL_API_KEY);

    const conversations = data.conversations || [];
    const now = Date.now();

    const activity = conversations.map(c => {
      const ts = c.lastMessageDate || c.dateUpdated || c.dateAdded || null;
      const d = ts ? new Date(ts) : null;
      const ageMin = d ? Math.floor((now - d.getTime()) / 60000) : null;

      return {
        timestamp: ts || '',
        ts_display: tsDisplay(ts),
        contact_name: c.contactName || c.fullName || c.firstName || '',
        contact_email: c.email || c.contactEmail || '',
        deal_slug: c.lastMessageBody
          ? c.lastMessageBody.slice(0, 40).replace(/\s+/g, ' ')
          : 'email',
        is_repeat: false,
        is_new: ageMin !== null && ageMin < 60,
        age_minutes: ageMin,
      };
    });

    // Sort newest first
    activity.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.json(activity);
  } catch (err) {
    console.error('activity error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
