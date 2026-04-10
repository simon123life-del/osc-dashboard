// Shared GHL API helpers — not a public route (underscore prefix)

const BASE_URL = 'https://services.leadconnectorhq.com';

function headers(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28',
  };
}

async function ghlGet(path, params, apiKey) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { headers: headers(apiKey) });
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 1200));
    return ghlGet(path, params, apiKey);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GHL GET ${path} → ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function ghlPost(path, body, apiKey) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 1200));
    return ghlPost(path, body, apiKey);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GHL POST ${path} → ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// Fetch contacts with a specific tag.
// GHL's search endpoint returns total:0 even when results exist, so we
// paginate until we get an empty page rather than trusting the total field.
async function fetchContactsByTag(tag, locationId, apiKey, { maxContacts = 5000, pageLimit = 100 } = {}) {
  const allContacts = [];
  let page = 1;

  while (allContacts.length < maxContacts) {
    try {
      const data = await ghlPost('/contacts/search', {
        locationId,
        page,
        pageLimit,
        filters: [{ field: 'tags', operator: 'contains', value: tag }],
      }, apiKey);

      const contacts = Array.isArray(data.contacts) ? data.contacts : [];
      allContacts.push(...contacts);

      if (contacts.length < pageLimit) break; // last page
      page++;
    } catch (_) {
      break;
    }
  }

  return { total: allContacts.length, contacts: allContacts };
}

function tsDisplay(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d)) return '—';
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

module.exports = { ghlGet, ghlPost, fetchContactsByTag, tsDisplay };
