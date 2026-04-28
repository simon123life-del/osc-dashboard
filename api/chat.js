const OPENAI_KEY = process.env.OPENAI_API_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { messages, campaign_context } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const ctx = campaign_context || {};
  const st = ctx.stats || {};
  const hotList = (ctx.hot_leads || []).slice(0, 8);
  const subjects = (ctx.subjects || []);

  const system = `You are a campaign intelligence assistant inside Ledger, a tool built by Emerson North for Oak Street Capital — a real estate private equity firm.

You have full access to the "${ctx.name || 'this'}" investor outreach campaign.

CAMPAIGN PERFORMANCE:
- Sent: ${st.sent || 0}
- Delivered: ${st.delivered || 0}
- Unique link clicks: ${st.unique_clickers || 0} (${st.click_rate || 0}% click rate)
- Investor replies: ${st.replies || 0}
- Bounced: ${st.bounced || 0}

CONTACT BREAKDOWN:
${ctx.contacts_summary || 'Not available'}

TOP ENGAGED INVESTORS (by clicks):
${hotList.length ? hotList.map((l, i) => `${i + 1}. ${l.name || l.email} — ${l.company || 'Unknown'} — ${l.click_count} clicks`).join('\n') : 'None recorded yet'}

EMAIL SUBJECTS USED:
${subjects.length ? subjects.map((s, i) => `Email ${i + 1}: "${s}"`).join('\n') : 'Not available'}

Be concise, specific, and actionable. Reference actual numbers from the data above. For email drafts, write complete ready-to-send emails. Professional but human tone. No em dashes. When asked about next steps, give specific, prioritized recommendations.`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: 700,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const data = await r.json();
    return res.json({ text: data.choices?.[0]?.message?.content || '' });
  } catch (err) {
    console.error('chat error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
