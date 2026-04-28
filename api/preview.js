const fs   = require('fs');
const path = require('path');

const TEMPLATES = {
  nurture_q2_2026: {
    A: path.join(__dirname, 'nurture_q2_2026_preview.html'),
    B: path.join(__dirname, 'nurture_q2_2026_preview_b.html'),
  },
};

module.exports = function handler(req, res) {
  const slug    = req.query.slug;
  const variant = (req.query.variant || 'A').toUpperCase();

  const campaign = TEMPLATES[slug];
  if (!campaign) {
    return res.status(404).send('<p style="font-family:sans-serif;padding:40px;color:#888">No preview available for this campaign.</p>');
  }

  const tplPath = campaign[variant] || campaign['A'];
  try {
    let html = fs.readFileSync(tplPath, 'utf8');
    html = html
      .replace(/\{\{\s*contact\.first_name\s*\}\}/g, 'John')
      .replace(/\[First Name\]/g, 'John')
      .replace(/\[TRACKING_PIXEL\]/g, '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.send(html);
  } catch (err) {
    return res.status(500).send('<p style="font-family:sans-serif;padding:40px;color:#888">Error loading template.</p>');
  }
};
