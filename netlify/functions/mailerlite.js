// HEARTH — Netlify Function: MailerLite subscription proxy.
// The API token lives in Netlify environment variables, never in page code.
//   MAILERLITE_API_KEY   token from MailerLite → Integrations → MailerLite API
//   MAILERLITE_GROUP_ID  ID of the "The Glow" group

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const JSON_HEADERS = Object.assign({ 'Content-Type': 'application/json' }, CORS);
const reply = (statusCode, obj) => ({ statusCode, headers: JSON_HEADERS, body: JSON.stringify(obj) });

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const API_KEY = process.env.MAILERLITE_API_KEY;
  const GROUP_ID = process.env.MAILERLITE_GROUP_ID;
  if (!API_KEY || !GROUP_ID) {
    console.error('MAILERLITE_API_KEY or MAILERLITE_GROUP_ID is not set');
    return reply(500, { error: 'Server configuration error' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return reply(400, { error: 'Invalid JSON' }); }

  const email = String(body.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'Missing or invalid email' });

  // Source tags are logged so you can see where signups come from in Netlify's function logs.
  console.log('Glow signup', JSON.stringify({
    medium: body.utm_medium || 'website_form',
    campaign: body.utm_campaign || 'the_glow'
  }));

  try {
    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email: email, groups: [GROUP_ID] })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('MailerLite error', res.status, JSON.stringify(data));
      return reply(res.status, { error: data.message || 'Subscription failed' });
    }
    return reply(200, { ok: true });
  } catch (err) {
    console.error('MailerLite request failed:', err.message);
    return reply(500, { error: 'Subscription failed' });
  }
};
