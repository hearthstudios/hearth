// HEARTH™ — Netlify Function: Circle invite
// Sends a Supabase "Invite user" email and creates a pending Circle profile from
// a website form submission (crew call, Spoken & Sung).
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   SUPABASE_SERVICE_ROLE_KEY  required. Supabase → Project Settings → API Keys → a Secret key (sb_secret_…),
//                              or the legacy service_role key. Never put it in page code.
//   SUPABASE_URL               optional. Defaults to the HEARTH project below.
//   SITE_URL                   optional. Defaults to https://buildyourhearth.studio
//
// The invite email itself is sent by Supabase through the Resend SMTP settings,
// using the "Invite user" template in Supabase → Authentication → Email Templates.

const DEFAULT_SUPABASE_URL = 'https://ogxnqfensgdfjqaronsi.supabase.co';
const DEFAULT_SITE_URL = 'https://buildyourhearth.studio';
const SOURCES = ['crew_call', 'spoken_sung'];
const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?buildyourhearth\.studio$/, /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/, /^https:\/\/[a-z0-9-]+\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/];

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
function reply(statusCode, body) { return { statusCode, headers: HEADERS, body: JSON.stringify(body) }; }

function str(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max || 300) : null;
}
function url(v) {
  const s = str(v, 500);
  return s && /^https?:\/\//i.test(s) ? s : null;
}
function list(v) {
  return (Array.isArray(v) ? v : v ? [v] : []).map((x) => str(x, 80)).filter(Boolean).slice(0, 20);
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...HEADERS, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method Not Allowed' });

  // Only accept requests made by our own pages (stops other sites from using this to send invites)
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  if (origin && !ALLOWED_ORIGINS.some((re) => re.test(origin))) return reply(403, { error: 'Forbidden' });

  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SB = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const SITE = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
  if (!KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    return reply(500, { error: 'Server configuration error' });
  }

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { error: 'Invalid JSON' }); }

  if (b.company_website) return reply(200, { ok: true }); // honeypot: quietly ignore bots
  const email = str(b.email, 254);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'A valid email is required' });
  const source = SOURCES.indexOf(b.source) > -1 ? b.source : null;
  if (!source) return reply(400, { error: 'Unknown source' });

  const p = b.profile || {};
  const fullName = str(p.full_name, 120);
  // New-style secret keys (sb_secret_…) go in the apikey header only; a legacy service_role JWT (eyJ…) also needs Authorization.
  const auth = { apikey: KEY, 'Content-Type': 'application/json' };
  if (/^eyJ/.test(KEY)) auth.Authorization = 'Bearer ' + KEY;

  // 1. Send the invite. Supabase creates the account and emails the "Invite user" template.
  const redirect = SITE + '/collab-hub.html?invite=1';
  let user;
  try {
    const r = await fetch(SB + '/auth/v1/invite?redirect_to=' + encodeURIComponent(redirect), {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ email, data: { full_name: fullName, invited_from: source } })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = String(data.msg || data.message || data.error_description || data.error || '');
      if (r.status === 422 || data.error_code === 'email_exists' || /already (been )?registered|already exists/i.test(msg)) {
        // Already in the Circle (or already invited): nothing to send, and we never overwrite an existing profile.
        return reply(200, { ok: true, existing: true });
      }
      console.error('Supabase invite failed', r.status, msg);
      return reply(502, { error: 'Invite failed' });
    }
    user = data && (data.id ? data : data.user);
  } catch (err) {
    console.error('Supabase invite error:', err.message);
    return reply(502, { error: 'Invite failed' });
  }
  if (!user || !user.id) return reply(200, { ok: true, invited: true, profile: false });

  // 2. Create their Circle profile, pending review, so they arrive to a filled-in profile.
  const location = [str(p.city, 80), str(p.state, 60)].filter(Boolean).join(', ') || null;
  const profile = {
    id: user.id,
    email,
    full_name: fullName,
    location,
    craft: list(p.craft),
    skill_level: str(p.skill_level, 80),
    day_rate: p.day_rate != null && p.day_rate !== '' && !isNaN(Number(p.day_rate)) ? Math.round(Number(p.day_rate)) : null,
    flexible_rate: typeof p.flexible_rate === 'boolean' ? p.flexible_rate : null,
    availability: str(p.availability, 60),
    portfolio_url: url(p.portfolio_url),
    social_url: url(p.social_url),
    union_status: str(p.union_status, 60),
    status: 'pending',
    updated_at: new Date().toISOString()
  };
  Object.keys(profile).forEach((k) => { if (profile[k] === null || (Array.isArray(profile[k]) && !profile[k].length)) delete profile[k]; });

  try {
    const r = await fetch(SB + '/rest/v1/profiles?on_conflict=id', {
      method: 'POST',
      headers: { ...auth, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(profile)
    });
    if (!r.ok) {
      console.error('Profile upsert failed', r.status, await r.text().catch(() => ''));
      return reply(200, { ok: true, invited: true, profile: false });
    }
  } catch (err) {
    console.error('Profile upsert error:', err.message);
    return reply(200, { ok: true, invited: true, profile: false });
  }
  return reply(200, { ok: true, invited: true, profile: true });
};
