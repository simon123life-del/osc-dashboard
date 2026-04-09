const { ghlGet } = require('./_ghl');

module.exports = async function handler(req, res) {
  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return res.status(500).json({ error: 'GHL credentials not configured' });
  }

  try {
    const data = await ghlGet('/conversations/search', {
      locationId: GHL_LOCATION_ID,
      limit: 50,
    }, GHL_API_KEY);

    const conversations = data.conversations || [];
    const now = Date.now();

    const activity = conversations
      .filter(c => c.lastMessageDate) // only ones with activity
      .map(c => {
        // lastMessageDate comes back as epoch ms
        const ts = typeof c.lastMessageDate === 'number'
          ? c.lastMessageDate
          : new Date(c.lastMessageDate).getTime();

        const d = new Date(ts);
        const ageMin = Math.floor((now - ts) / 60000);

        // Derive campaign from contact's tags
        const tags = c.tags || [];
        const outreachTag = tags.find(t => t.startsWith('deal_outreach_'));
        const dealSlug = outreachTag ? outreachTag.replace('deal_outreach_', '') : '';

        const tsDisplay = isNaN(d)
          ? '—'
          : `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

        return {
          timestamp: new Date(ts).toISOString(),
          ts_display: tsDisplay,
          contact_name: c.contactName || c.fullName || '',
          contact_email: c.email || '',
          deal_slug: dealSlug,
          is_repeat: false,
          is_new: ageMin < 60,
          age_minutes: ageMin,
        };
      });

    // Sort newest first
    activity.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.json(activity.slice(0, 50));
  } catch (err) {
    console.error('activity error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
