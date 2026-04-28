const OPENAI_KEY = process.env.OPENAI_API_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { campaign_name, campaign_type, stats, action, subjects, hot_leads } = req.body || {};

  if (!campaign_name || !action) {
    return res.status(400).json({ error: 'campaign_name and action required' });
  }

  const prompts = {
    followup: `You are an investor relations specialist for Oak Street Capital, a real estate private equity firm.

Write a brief, warm follow-up email for investors who clicked on the "${campaign_name}" email but haven't yet filled out the investor profile form.

Context:
- Campaign: ${campaign_name} (${campaign_type || 'investor outreach'})
- ${stats?.sent || 0} emails sent, ${stats?.unique_clickers || 0} clicked
- ${hot_leads || 0} high-engagement investors (2+ clicks) haven't profiled yet
- Previous subject lines: ${(subjects || []).slice(0, 3).join(' | ')}

Requirements:
- 150–200 words maximum
- Personalized, not salesy — these people already showed interest
- Reference their previous engagement subtly
- Clear CTA to fill out investor profile
- Subject line + email body
- No em dashes. Professional but human.`,

    reengagement: `You are an investor relations specialist for Oak Street Capital.

Write a re-engagement email for investors who received "${campaign_name}" but haven't opened or clicked yet.

Context:
- ${stats?.sent || 0} total sent, only ${stats?.unique_clickers || 0} clicked so far
- Previous subject lines used: ${(subjects || []).slice(0, 3).join(' | ')}

Requirements:
- New angle, different from previous subject lines
- 120–160 words
- Curiosity-driven subject line that stands out
- Focus on what they're missing
- No em dashes. Conversational tone.`,

    analysis: `You are an expert investor relations analyst.

Analyze this campaign performance and give Brian Hampton at Oak Street Capital 3 specific, actionable recommendations to improve results.

Campaign: ${campaign_name}
Stats:
- Sent: ${stats?.sent || 0}
- Click rate: ${stats?.click_rate || 0}%
- Hot leads (2+ clicks): ${hot_leads || 0}
- Replies: ${stats?.replies || 0}
- Bounced: ${stats?.bounced || 0}

Give concrete actions (not generic advice). Each recommendation should be 2–3 sentences max. Format as numbered list.`,
  };

  const prompt = prompts[action];
  if (!prompt) return res.status(400).json({ error: `Unknown action: ${action}` });

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || '';
    return res.json({ text });
  } catch (err) {
    console.error('ai-draft error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
