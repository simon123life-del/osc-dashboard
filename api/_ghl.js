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
// Tries the /contacts/search endpoint first (1 request + total count).
// Falls back to paginated GET if search isn't available.
async function fetchContactsByTag(tag, locationId, apiKey, { maxContacts = 5000, pageLimit = 100 } = {}) {
  // --- Try search endpoint first ---
  try {
    const data = await ghlPost('/contacts/search', {
      locationId,
      page: 1,
      pageLimit,
      filters: [{ field: 'tags', operator: 'contains', value: tag }],
    }, apiKey);

    // If response looks valid, use it
    if (Array.isArray(data.contacts)) {
      const total = data.total ?? data.count ?? data.contacts.length;
      // If there are more pages, fetch them
      const contacts = [...data.contacts];
      if (total > pageLimit) {
        const pages = Math.ceil(Math.min(total, maxContacts) / pageLimit);
        for (let page = 2; page <= pages; page++) {
          const more = await ghlPost('/contacts/search', {
            locationId,
            page,
            pageLimit,
            filters: [{ field: 'tags', operator: 'contains', value: tag }],
          }, apiKey);
          contacts.push(...(more.contacts || []));
        }
      }
      return { total, contacts };
    }
  } catch (_) {
    // Fall through to paginated GET
  }

  // --- Fallback: paginated GET with client-side tag filter ---
  const contacts = [];
  let startAfterDate = null;
  let startAfterId = null;

  while (contacts.length < maxContacts) {
    const params = { locationId, limit: 100 };
    if (startAfterDate) params.startAfter = startAfterDate;
    if (startAfterId) params.startAfterId = startAfterId;

    const data = await ghlGet('/contacts/', params, apiKey);
    const page = data.contacts || [];

    for (const c of page) {
      if ((c.tags || []).includes(tag)) contacts.push(c);
    }

    if (page.length < 100) break;
    const meta = data.meta || {};
    startAfterDate = meta.startAfter;
    startAfterId = meta.startAfterId;
    if (!startAfterDate && !startAfterId) break;
  }

  return { total: contacts.length, contacts };
}

function tsDisplay(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d)) return '—';
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

module.exports = { ghlGet, ghlPost, fetchContactsByTag, tsDisplay };
