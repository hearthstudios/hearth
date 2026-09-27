/*
  HEARTH site configuration. Nothing secret goes in this file: it ships to
  the browser. The Airtable token and Beehiiv key stay in Netlify environment
  variables (AIRTABLE_PAT, BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID), read by
  netlify/functions/airtable.js and beehiiv.js.
*/
window.HEARTH_CONFIG = {
  // The Glow signup → Beehiiv (netlify/functions/beehiiv.js)
  glowEndpoint: '/.netlify/functions/beehiiv',

  // Airtable proxy (netlify/functions/airtable.js). It expects { base, table, fields }.
  airtableEndpoint: '/.netlify/functions/airtable',
  airtable: {
    // Client inquiries: Work With Us, every service page, and sponsorships
    inquiry: { base: 'appyhjawc9vZ5DfWg', table: 'tbl0F7d1Sgor8ZZWj' },
    // Sync library / Music Catalog
    music:   { base: 'appKsSNFxrW7R8nfs', table: 'tblJzxn2bQag54qMD' }
  },

  // Program "Get notified" → the Google Form your program pages already use.
  // To move it to Airtable, add a table here as airtable.notify and hearth.js will use it.
  notifyGoogleForm: {
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSe1o__-yr9H13nCkVnSJLNuvgCGhpd0fD5C1OBsZ0-IA02NUg/formResponse',
    name: 'entry.675473085',
    email: 'entry.1885537716',
    role: 'entry.852923629'
  },

  // The Circle (Supabase) — same project as collab-hub.html
  supabaseUrl: 'https://ogxnqfensgdfjqaronsi.supabase.co',
  supabaseAnonKey: 'sb_publishable_3VHZtT3Lyx0v0nKuvnBRIw_Rk50vquw',
  profilesTable: 'profiles',

  // Where members sign in and manage their profile
  circleAppUrl: 'collab-hub.html',
  signInUrl: 'collab-hub.html',

  // Events
  lumaCalendarUrl: 'https://luma.com/calendar/cal-p2tGnB5LuPogUhA', // confirm this is your public Luma calendar page
  lumaEmbedUrl: 'https://luma.com/embed/calendar/cal-p2tGnB5LuPogUhA/events?lt=dark',

  // Homepage hero film
  heroYouTubeId: 'lrYv5KQ2OuE'
};
