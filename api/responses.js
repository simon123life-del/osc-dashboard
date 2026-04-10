const { fetchContactsByTag } = require('./_ghl');

// Map GHL tags to readable labels
const TAG_MAP = {
  // Asset types
  inv_multifamily:       { field: 'asset_type', label: 'Multifamily' },
  inv_industrial:        { field: 'asset_type', label: 'Industrial' },
  inv_office:            { field: 'asset_type', label: 'Office' },
  inv_retail:            { field: 'asset_type', label: 'Retail' },
  inv_mixed_use:         { field: 'asset_type', label: 'Mixed-Use' },
  inv_development:       { field: 'asset_type', label: 'Development' },
  inv_hospitality:       { field: 'asset_type', label: 'Hospitality' },
  inv_self_storage:      { field: 'asset_type', label: 'Self-Storage' },
  inv_nnn:               { field: 'asset_type', label: 'NNN Retail' },
  inv_sfr:               { field: 'asset_type', label: 'SFR Portfolio' },
  // Check sizes (new form ranges)
  'check_1m_5m':         { field: 'check_size', label: '$1M–$5M' },
  'check_5m_15m':        { field: 'check_size', label: '$5M–$15M' },
  'check_15m_25m':       { field: 'check_size', label: '$15M–$25M' },
  'check_25m_plus':      { field: 'check_size', label: '$25M+' },
  // Check sizes (legacy CRM import)
  'check_under_100k':    { field: 'check_size', label: '<$100K' },
  'check_100k_250k':     { field: 'check_size', label: '$100K–$250K' },
  'check_250k_500k':     { field: 'check_size', label: '$250K–$500K' },
  'check_250k_plus':     { field: 'check_size', label: '$250K+' },
  'check_500k_1m':       { field: 'check_size', label: '$500K–$1M' },
  'check_1m_plus':       { field: 'check_size', label: '$1M+' },
  'check_5m_plus':       { field: 'check_size', label: '$5M+' },
  // Target returns (from form submissions)
  'ret_6_8_pref':        { field: 'target_return', label: '6–8% Pref' },
  'ret_8_10_pref':       { field: 'target_return', label: '8–10% Pref' },
  'ret_10_plus_pref':    { field: 'target_return', label: '10%+ Pref' },
  'ret_irr_15_plus':     { field: 'target_return', label: '15%+ IRR' },
  'ret_open':            { field: 'target_return', label: 'Open' },
  // Structure
  struct_equity:         { field: 'structure', label: 'Equity' },
  struct_debt:           { field: 'structure', label: 'Debt' },
  struct_preferred:      { field: 'structure', label: 'Preferred Equity' },
  struct_open:           { field: 'structure', label: 'Open to All' },
  struct_jv:             { field: 'structure', label: 'JV' },
  // Geography
  geo_national:          { field: 'geography', label: 'National' },
  geo_sunbelt:           { field: 'geography', label: 'Sunbelt' },
  geo_southeast:         { field: 'geography', label: 'Southeast' },
  geo_southwest:         { field: 'geography', label: 'Southwest' },
  geo_northeast:         { field: 'geography', label: 'Northeast' },
  geo_midwest:           { field: 'geography', label: 'Midwest' },
  geo_texas:             { field: 'geography', label: 'Texas' },
  geo_florida:           { field: 'geography', label: 'Florida' },
  geo_california:        { field: 'geography', label: 'California' },
  // Status
  accredited:            { field: 'accredited', label: 'Accredited' },
  prospect:              { field: 'investor_type', label: 'Prospect' },
  active_investor:       { field: 'investor_type', label: 'Active Investor' },
};

// GHL custom field IDs for investor profile data
const CUSTOM_FIELD_IDS = {
  investor_status:     '7MpSP6jNoNuMp5RDzKQK',
  preferred_structure: 'c4HXPZ9T64GBHCFrIyps',
  profile_submitted:   'smibuHdMLQLf4YRc3Vmb',
  investment_focus:    'GyCXzBLOWzPsUZkkskmf',
  target_irr:          'C9GCTbO4td0x0mOScJqa',
};

// Map raw form values (stored in custom fields) to readable labels
const STATUS_LABELS = {
  actively_now:      'Actively Investing',
  '3_6_months':      '3–6 Months',
  passive:           'Passive / Network',
  not_now:           'Not Now',
};

const RETURNS_LABELS = {
  '6_8_pref':          '6–8% Pref',
  '8_10_pref':         '8–10% Pref',
  '10_plus_pref':      '10%+ Pref',
  irr_focused_15_plus: '15%+ IRR',
  open:                'Open',
};

function parseContactProfile(contact) {
  const tags = contact.tags || [];
  const profile = { asset_types: [], check_size: null, structure: [], geography: [], accredited: false, investor_type: null };

  for (const tag of tags) {
    const mapping = TAG_MAP[tag];
    if (!mapping) continue;
    if (mapping.field === 'asset_type') profile.asset_types.push(mapping.label);
    else if (mapping.field === 'check_size') profile.check_size = mapping.label;
    else if (mapping.field === 'structure') profile.structure.push(mapping.label);
    else if (mapping.field === 'geography') profile.geography.push(mapping.label);
    else if (mapping.field === 'accredited') profile.accredited = true;
    else if (mapping.field === 'investor_type') profile.investor_type = mapping.label;
    else if (mapping.field === 'target_return') profile.target_return_tag = mapping.label;
  }

  // Pull custom fields
  const customFields = contact.customFields || [];
  for (const cf of customFields) {
    if (cf.id === CUSTOM_FIELD_IDS.investor_status && cf.value) {
      profile.investor_status_raw = cf.value;
      profile.investor_status = STATUS_LABELS[cf.value] || cf.value;
    }
    if (cf.id === CUSTOM_FIELD_IDS.preferred_structure && cf.value) profile.preferred_structure = cf.value;
    if (cf.id === CUSTOM_FIELD_IDS.profile_submitted && cf.value) profile.profile_submitted = cf.value;
    if (cf.id === CUSTOM_FIELD_IDS.investment_focus && cf.value) profile.investment_focus_raw = cf.value;
    if (cf.id === CUSTOM_FIELD_IDS.target_irr && cf.value) {
      // n8n stores already-readable values like "IRR 15%+" — use as-is
      profile.target_irr = RETURNS_LABELS[cf.value] || cf.value;
    }
  }

  return profile;
}

module.exports = async function handler(req, res) {
  const GHL_API_KEY     = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return res.status(500).json({ error: 'GHL credentials not configured' });
  }

  try {
    // Fetch all contacts who clicked the nurture email link
    const { contacts } = await fetchContactsByTag(
      'investor_profiled',
      GHL_LOCATION_ID,
      GHL_API_KEY,
      { maxContacts: 200, pageLimit: 50 }
    );

    const results = contacts.map(c => {
      const profile = parseContactProfile(c);
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.contactName || '';
      return {
        id:            c.id,
        name,
        email:         c.email || '',
        company:       c.companyName || '',
        date_updated:  c.dateUpdated || c.dateAdded || '',
        profile_submitted:    profile.profile_submitted || null,
        investor_status:      profile.investor_status || null,
        asset_types:          profile.asset_types,
        investment_focus_raw: profile.investment_focus_raw || null,
        check_size:           profile.check_size,
        structure:            profile.structure,
        preferred_structure:  profile.preferred_structure || null,
        geography:            profile.geography,
        accredited:           profile.accredited,
        target_irr:           profile.target_irr || profile.target_return_tag || null,
        has_profile:          profile.asset_types.length > 0 || !!profile.check_size || !!profile.investor_status,
      };
    });

    // Only show contacts who have actually submitted profile data
    const withProfile = results.filter(r => r.has_profile);

    // Sort: profile_submitted date first, then by date_updated
    withProfile.sort((a, b) => {
      if (a.profile_submitted && !b.profile_submitted) return -1;
      if (!a.profile_submitted && b.profile_submitted) return 1;
      return new Date(b.date_updated) - new Date(a.date_updated);
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.json({ responses: withProfile, total: withProfile.length });
  } catch (err) {
    console.error('responses error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
