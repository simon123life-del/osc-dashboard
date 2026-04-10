const fs   = require('fs');
const path = require('path');

// Map campaign slug to its email preview template
const TEMPLATES = {
  nurture_q2_2026: path.join(__dirname, 'nurture_q2_2026_preview.html'),
};

module.exports = function handler(req, res) {
  const slug = req.query.slug;

  if (!slug || !TEMPLATES[slug]) {
    return res.status(404).send('<p style="font-family:sans-serif;padding:40px;color:#888">No preview available for this campaign.</p>');
  }

  try {
    let html = fs.readFileSync(TEMPLATES[slug], 'utf8');

    // Replace template variables with preview placeholders
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
