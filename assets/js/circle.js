/* HEARTH — The Circle member app (collab-hub.html)
   Supabase tables used (same as before):
   profiles(id, email, full_name, location, craft text[], skill_level, day_rate, flexible_rate,
            availability, portfolio_url, social_url, union_status, union_name, status, created_at, updated_at)
   connections(id, requester_id, recipient_id, status 'pending'|'accepted') */
(function () {
  'use strict';
  var CFG = window.HEARTH_CONFIG || {};
  var root = document.querySelector('[data-hub]');
  if (!root) return;
  if (!(window.supabase && CFG.supabaseUrl && CFG.supabaseAnonKey)) {
    root.querySelector('[data-state="loading"]').textContent = 'The Circle is unavailable right now. Please try again shortly.';
    return;
  }
  var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
  var PAGE = 12;
  var S = { user: null, profile: null, conns: [], directory: [], craft: '', shown: PAGE, sub: 'incoming', recovering: false, dirty: false };

  /* ---------- helpers ---------- */
  function $(sel, el) { return (el || root).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function initials(n) { return (n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function first(n) { return (n || '').trim().split(/\s+/)[0] || ''; }
  function skillShort(s) { return (s || '').split(/\s+[—–-]\s+/)[0]; }
  function crafts(p) { return (p && p.craft && p.craft.length) ? p.craft : []; }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'hub-toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function showState(name) {
    $$('[data-state]').forEach(function (el) { el.hidden = el.getAttribute('data-state') !== name; });
  }

  /* ---------- connections ---------- */
  function connWith(id) { return S.conns.find(function (c) { return c.requester_id === id || c.recipient_id === id; }); }
  function lists() {
    var me = S.user ? S.user.id : null;
    return {
      network: S.conns.filter(function (c) { return c.status === 'accepted'; }),
      incoming: S.conns.filter(function (c) { return c.status === 'pending' && c.recipient_id === me; }),
      sent: S.conns.filter(function (c) { return c.status === 'pending' && c.requester_id === me; })
    };
  }
  function connectButton(p) {
    if (!S.user || p.id === S.user.id) return '<button class="hbtn soft" type="button" disabled>This is you</button>';
    var c = connWith(p.id);
    if (!c) return '<button class="hbtn" type="button" data-act="connect" data-id="' + esc(p.id) + '">Connect</button>';
    if (c.status === 'accepted') return '<button class="hbtn soft" type="button" disabled>✓ Connected</button>';
    if (c.requester_id === S.user.id) return '<button class="hbtn soft" type="button" data-act="cancel" data-conn="' + esc(c.id) + '" aria-label="Requested. Cancel request">Requested</button>';
    return '<button class="hbtn" type="button" data-act="accept" data-conn="' + esc(c.id) + '">Accept</button>';
  }
  function memberCard(p, opts) {
    opts = opts || {};
    var cr = crafts(p).join(', ');
    var meta = [cr, p.location].filter(Boolean).join(' · ');
    var pills = [skillShort(p.skill_level), p.availability].filter(Boolean).map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');
    var port = safeUrl(p.portfolio_url);
    return '<article class="room-card mcard">' +
      '<div class="who"><span class="av" aria-hidden="true">' + esc(initials(p.full_name)) + '</span><div class="stack gap-8"><h3>' + esc(p.full_name || 'HEARTH member') + '</h3>' + (meta ? '<span class="meta">' + esc(meta) + '</span>' : '') + '</div></div>' +
      (pills ? '<div class="pills">' + pills + '</div>' : '') +
      '<div class="foot">' + (port ? '<a href="' + esc(port) + '" target="_blank" rel="noopener noreferrer">Portfolio ↗<span class="sr-only"> (opens in a new tab)</span></a>' : '<span style="font-size:14px;color:var(--room-muted)">No portfolio yet</span>') +
      (opts.preview ? '' : connectButton(p)) + '</div></article>';
  }

  /* ---------- data ---------- */
  function loadProfile() {
    return sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle().then(function (r) { S.profile = r.data || null; });
  }
  function loadConns() {
    return sb.from('connections').select('*').or('requester_id.eq.' + S.user.id + ',recipient_id.eq.' + S.user.id)
      .then(function (r) { S.conns = r.data || []; });
  }
  function loadDirectory() {
    return sb.from('profiles').select('id, full_name, location, craft, skill_level, availability, portfolio_url, created_at')
      .eq('status', 'approved').order('created_at', { ascending: false })
      .then(function (r) { S.directory = r.data || []; });
  }
  function profilesById(ids) {
    if (!ids.length) return Promise.resolve({});
    return sb.from('profiles').select('id, full_name, location, craft, skill_level, availability, portfolio_url').in('id', ids).then(function (r) {
      var m = {}; (r.data || []).forEach(function (p) { m[p.id] = p; }); return m;
    });
  }

  /* ---------- render: home ---------- */
  function completeness(p) {
    if (!p) return 0;
    var keys = ['full_name', 'location', 'skill_level', 'availability', 'portfolio_url', 'social_url'];
    var n = keys.filter(function (k) { return p[k]; }).length + (crafts(p).length ? 1 : 0);
    return Math.round(n / (keys.length + 1) * 100);
  }
  function renderHome() {
    var L = lists(), p = S.profile || {};
    $('[data-first-name]').innerHTML = first(p.full_name) ? ', <em>' + esc(first(p.full_name)) + '</em>' : '';
    var bits = [];
    if (L.incoming.length) bits.push(L.incoming.length === 1 ? 'One person wants to connect.' : L.incoming.length + ' people want to connect.');
    bits.push('Find collaborators, answer requests, and keep your profile current.');
    $('[data-home-sub]').textContent = bits.join(' ');
    $('[data-stat="connections"]').textContent = L.network.length;
    $('[data-stat="incoming"]').textContent = L.incoming.length;
    $('[data-stat="directory"]').textContent = S.directory.length;
    var badge = $('[data-incoming-badge]');
    badge.hidden = !L.incoming.length; badge.textContent = L.incoming.length;
    // status
    var dot = $('[data-status-dot]');
    var st = p.status || 'pending';
    dot.className = 'live-dot' + (st === 'approved' ? '' : st === 'rejected' ? ' rejected' : ' pending');
    dot.textContent = st === 'approved' ? 'Live in the directory' : st === 'rejected' ? 'Needs a revision' : 'In review';
    $('[data-profile-line]').textContent = [crafts(p)[0], p.location].filter(Boolean).join(' · ') || 'Finish your profile';
    var pct = completeness(p);
    $('[data-complete-bar]').style.width = pct + '%';
    $('[data-complete-note]').textContent = st === 'rejected' ? 'Update your profile, or email operations@buildyourhearth.studio.' :
      pct >= 100 ? 'Your profile is complete.' : 'Your profile is ' + pct + '% complete. Add more so people can find you.';
    // requests
    var box = $('[data-home-requests]');
    if (!L.incoming.length) { box.innerHTML = '<div class="hub-empty">No requests right now. <a href="#directory" style="text-decoration:underline">Browse the directory</a> to reach out first.</div>'; }
    else {
      var ids = L.incoming.slice(0, 3).map(function (c) { return c.requester_id; });
      profilesById(ids).then(function (m) { box.innerHTML = '<div class="req-list">' + L.incoming.slice(0, 3).map(function (c) { return reqRow(c, m[c.requester_id], 'incoming'); }).join('') + '</div>'; });
    }
    var fresh = S.directory.filter(function (x) { return x.id !== S.user.id; }).slice(0, 3);
    $('[data-home-new]').innerHTML = fresh.length ? fresh.map(function (x) { return memberCard(x); }).join('') :
      '<div class="hub-empty" style="grid-column:1/-1">The directory is filling up. Check back soon.</div>';
  }
  function reqRow(c, p, kind) {
    p = p || { full_name: 'HEARTH member' };
    var meta = [crafts(p).join(', '), p.location].filter(Boolean).join(' · ');
    var port = safeUrl(p.portfolio_url);
    var actions = kind === 'incoming'
      ? '<button class="hbtn" type="button" data-act="accept" data-conn="' + esc(c.id) + '">Accept</button><button class="hbtn line" type="button" data-act="cancel" data-conn="' + esc(c.id) + '">Decline</button>'
      : kind === 'sent' ? '<button class="hbtn line" type="button" data-act="cancel" data-conn="' + esc(c.id) + '">Cancel request</button>'
      : (port ? '<a class="hbtn line" style="display:inline-flex;align-items:center" href="' + esc(port) + '" target="_blank" rel="noopener noreferrer">Portfolio ↗</a>' : '');
    return '<div class="req-row"><span class="av sm" aria-hidden="true">' + esc(initials(p.full_name)) + '</span><div class="stack gap-8"><span class="name">' + esc(p.full_name || 'HEARTH member') + '</span>' +
      (meta ? '<span class="tag-live">' + esc(meta.toUpperCase()) + '</span>' : '') + '</div><div class="actions">' + actions + '</div></div>';
  }

  /* ---------- render: directory ---------- */
  function renderCraftChips() {
    var set = {};
    S.directory.forEach(function (p) { crafts(p).forEach(function (c) { set[c] = (set[c] || 0) + 1; }); });
    var all = Object.keys(set).sort(function (a, b) { return set[b] - set[a]; });
    var html = '<label class="chip"><input type="radio" name="craftf" value=""' + (S.craft ? '' : ' checked') + '><span>All</span></label>' +
      all.map(function (c) { return '<label class="chip"><input type="radio" name="craftf" value="' + esc(c) + '"' + (S.craft === c ? ' checked' : '') + '><span>' + esc(c) + '</span></label>'; }).join('');
    $('[data-craft-chips]').innerHTML = html;
  }
  function filtered() {
    var q = ($('[data-filter="q"]').value || '').toLowerCase().trim();
    var city = $('[data-filter="city"]').value;
    var av = $('[data-filter="availability"]').value;
    var sk = $('[data-filter="skill"]').value;
    return S.directory.filter(function (p) {
      if (S.craft && crafts(p).indexOf(S.craft) < 0) return false;
      if (av && p.availability !== av) return false;
      if (sk && skillShort(p.skill_level) !== sk) return false;
      var loc = (p.location || '').toLowerCase();
      if (city && !city.split('|').some(function (k) { return loc.indexOf(k) > -1; })) return false;
      if (q) { var hay = [p.full_name, p.location, crafts(p).join(' ')].join(' ').toLowerCase(); if (hay.indexOf(q) < 0) return false; }
      return true;
    });
  }
  function renderDirectory() {
    var list = filtered();
    $('[data-dir-count]').textContent = list.length === 1 ? 'Showing 1 member' : 'Showing ' + list.length + ' members';
    $('[data-dir-grid]').innerHTML = list.length ? list.slice(0, S.shown).map(function (p) { return memberCard(p); }).join('') :
      '<div class="hub-empty" style="grid-column:1/-1">No one matches those filters yet. Try widening your search.</div>';
    $('[data-more]').hidden = list.length <= S.shown;
  }

  /* ---------- render: connections ---------- */
  function renderConnections() {
    var L = lists();
    ['incoming', 'network', 'sent'].forEach(function (k) { $('[data-count="' + k + '"]').textContent = '(' + L[k].length + ')'; });
    $$('[data-sub]').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-sub') === S.sub ? 'true' : 'false'); });
    var rows = L[S.sub], box = $('[data-con-list]');
    if (!rows.length) {
      box.innerHTML = '<div class="hub-empty">' + ({ incoming: 'No requests waiting on you.', network: 'No connections yet. Browse the directory and reach out.', sent: 'No pending requests.' })[S.sub] + '</div>';
      return;
    }
    var other = function (c) { return c.requester_id === S.user.id ? c.recipient_id : c.requester_id; };
    profilesById(rows.map(other)).then(function (m) {
      box.innerHTML = '<div class="req-list">' + rows.map(function (c) { return reqRow(c, m[other(c)], S.sub); }).join('') + '</div>';
    });
  }

  /* ---------- render: profile ---------- */
  var form = $('[data-profile-form]');
  function fillForm() {
    var p = S.profile || {};
    form.reset();
    form.full_name.value = p.full_name || '';
    form.location.value = p.location || '';
<<<<<<< HEAD
    var known = $$('input[name="craft"]', form).map(function (i) { return i.value; });
    var custom = crafts(p).filter(function (c) { return known.indexOf(c) < 0; });
    $$('input[name="craft"]', form).forEach(function (i) { i.checked = crafts(p).indexOf(i.value) > -1 || (i.value === 'Other' && custom.length > 0); });
    form.craft_other.value = custom.join(', ');
=======
    $$('input[name="craft"]', form).forEach(function (i) { i.checked = crafts(p).indexOf(i.value) > -1; });
>>>>>>> bdb0effb52f7a486f64191de66a4c0c84dbf7964
    $$('input[name="skill_level"]', form).forEach(function (i) { i.checked = i.value === p.skill_level || skillShort(i.value) === skillShort(p.skill_level); });
    form.day_rate.value = p.day_rate != null ? p.day_rate : '';
    form.flexible_rate.checked = !!p.flexible_rate;
    $$('input[name="availability"]', form).forEach(function (i) { i.checked = i.value === p.availability; });
    form.portfolio_url.value = p.portfolio_url || '';
    form.social_url.value = p.social_url || '';
    $$('input[name="union_status"]', form).forEach(function (i) { i.checked = i.value === p.union_status; });
    form.union_name.value = p.union_name || '';
<<<<<<< HEAD
    if (window.HEARTH_syncReveals) window.HEARTH_syncReveals(form);
=======
>>>>>>> bdb0effb52f7a486f64191de66a4c0c84dbf7964
    S.dirty = false;
    renderPreview();
  }
  function formData() {
    var sel = function (n) { var i = form.querySelector('input[name="' + n + '"]:checked'); return i ? i.value : null; };
    return {
      id: S.user.id, email: S.user.email,
      full_name: form.full_name.value.trim(), location: form.location.value.trim(),
<<<<<<< HEAD
      craft: $$('input[name="craft"]:checked', form).map(function (i) { return i.value; }).filter(function (c) { return c !== 'Other'; })
        .concat(form.querySelector('input[name="craft"][value="Other"]:checked') && form.craft_other.value.trim() ? form.craft_other.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : []),
=======
      craft: $$('input[name="craft"]:checked', form).map(function (i) { return i.value; }),
>>>>>>> bdb0effb52f7a486f64191de66a4c0c84dbf7964
      skill_level: sel('skill_level'),
      day_rate: form.day_rate.value ? Number(form.day_rate.value) : null,
      flexible_rate: form.flexible_rate.checked,
      availability: sel('availability'),
      portfolio_url: form.portfolio_url.value.trim() || null,
      social_url: form.social_url.value.trim() || null,
      union_status: sel('union_status'),
      union_name: form.union_name.value.trim() || null
    };
  }
  function renderPreview() { $('[data-preview]').innerHTML = memberCard(formData(), { preview: true }); }
  form.addEventListener('input', function () { S.dirty = true; renderPreview(); });
  form.addEventListener('change', function () { S.dirty = true; renderPreview(); });
  $('[data-cancel]').addEventListener('click', function () { fillForm(); toast('Changes discarded'); });
  $('[data-save]').addEventListener('click', function () {
    var err = $('[data-save-err]'); err.textContent = '';
    var d = formData();
    if (!d.full_name || !d.location) { err.textContent = 'Add your name and location.'; (d.full_name ? form.location : form.full_name).focus(); return; }
<<<<<<< HEAD
    if (form.querySelector('input[name="craft"][value="Other"]:checked') && !form.craft_other.value.trim()) { err.textContent = 'Tell us what your craft is.'; form.craft_other.focus(); return; }
    if (!d.craft.length) { err.textContent = 'Pick at least one craft.'; form.querySelector('input[name="craft"]').focus(); return; }
    ['portfolio_url', 'social_url'].forEach(function (k) { if (d[k] && !/^https?:\/\//i.test(d[k])) { d[k] = 'https://' + d[k]; form[k].value = d[k]; } });
=======
    if (!d.craft.length) { err.textContent = 'Pick at least one craft.'; form.querySelector('input[name="craft"]').focus(); return; }
>>>>>>> bdb0effb52f7a486f64191de66a4c0c84dbf7964
    if ((d.portfolio_url && !safeUrl(d.portfolio_url)) || (d.social_url && !safeUrl(d.social_url))) { err.textContent = 'Links need to start with https://'; return; }
    var btn = this; btn.disabled = true; btn.textContent = 'Saving…';
    d.status = 'pending'; d.updated_at = new Date().toISOString();
    sb.from('profiles').upsert(d).then(function (r) {
      btn.disabled = false; btn.textContent = 'Save profile';
      if (r.error) { console.error(r.error); err.textContent = 'That didn’t save. Try again, or email operations@buildyourhearth.studio.'; return; }
      S.profile = Object.assign({}, S.profile || {}, d); S.dirty = false;
      $('[data-save-status]').textContent = 'Saved · in review';
      toast('Saved. Your profile is with our team for review.');
      loadDirectory().then(refreshAll);
    });
  });
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- routing ---------- */
  var VIEWS = ['home', 'directory', 'connections', 'profile'];
  function route() {
    if (!S.user) return;
    var v = (location.hash || '#home').slice(1);
    if (VIEWS.indexOf(v) < 0) v = 'home';
    if (!S.profile || !S.profile.full_name) v = 'profile'; // finish your profile first
    $$('[data-view]').forEach(function (s) { s.hidden = s.getAttribute('data-view') !== v; });
    $$('[data-tab]').forEach(function (t) { if (t.getAttribute('data-tab') === v) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
    if (v === 'home') renderHome();
    if (v === 'directory') renderDirectory();
    if (v === 'connections') renderConnections();
    if (v === 'profile' && !S.dirty) fillForm();
    var h = $('[data-view="' + v + '"] h1');
    if (h && document.activeElement && document.activeElement.closest && document.activeElement.closest('.hub-tabs')) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', function () { route(); window.scrollTo({ top: 0 }); });
  function refreshAll() { renderCraftChips(); route(); }

  /* ---------- actions ---------- */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !S.user) return;
    b.disabled = true;
    var act = b.getAttribute('data-act'), p;
    if (act === 'connect') {
      var id = b.getAttribute('data-id');
      var reverse = S.conns.find(function (c) { return c.requester_id === id && c.recipient_id === S.user.id && c.status === 'pending'; });
      p = reverse ? sb.from('connections').update({ status: 'accepted' }).eq('id', reverse.id)
        : sb.from('connections').insert({ requester_id: S.user.id, recipient_id: id, status: 'pending' });
    } else if (act === 'accept') {
      p = sb.from('connections').update({ status: 'accepted' }).eq('id', b.getAttribute('data-conn'));
    } else if (act === 'cancel') {
      p = sb.from('connections').delete().eq('id', b.getAttribute('data-conn'));
    }
    p.then(function (r) {
      if (r.error) { console.error(r.error); toast('Something went wrong. Try again.'); b.disabled = false; return; }
      toast({ connect: 'Request sent', accept: 'Connected', cancel: 'Done' }[act]);
      loadConns().then(refreshAll);
    });
  });
  $$('[data-sub]').forEach(function (b) { b.addEventListener('click', function () { S.sub = b.getAttribute('data-sub'); renderConnections(); }); });
  root.addEventListener('change', function (e) {
    if (e.target.name === 'craftf') { S.craft = e.target.value; S.shown = PAGE; renderDirectory(); }
    else if (e.target.matches('[data-filter]')) { S.shown = PAGE; renderDirectory(); }
  });
  $('[data-filter="q"]').addEventListener('input', function () { S.shown = PAGE; renderDirectory(); });
  $('[data-more]').addEventListener('click', function () { S.shown += PAGE; renderDirectory(); });

  /* ---------- auth ---------- */
  var sif = $('[data-signin-form]');
  sif.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('[data-signin-err]'), ok = $('[data-signin-ok]'); err.textContent = ''; ok.textContent = '';
    if (!sif.email.value || !sif.password.value) { err.textContent = 'Enter your email and password.'; return; }
    var btn = sif.querySelector('button[type=submit]'); btn.disabled = true;
    sb.auth.signInWithPassword({ email: sif.email.value.trim(), password: sif.password.value }).then(function (r) {
      btn.disabled = false;
      if (r.error) err.textContent = r.error.message === 'Invalid login credentials' ? 'That email and password don’t match. Try again or reset your password.' : r.error.message;
    });
  });
  $('[data-forgot]').addEventListener('click', function () {
    var err = $('[data-signin-err]'), ok = $('[data-signin-ok]'); err.textContent = ''; ok.textContent = '';
    var email = sif.email.value.trim();
    if (!email) { err.textContent = 'Enter your email above, then choose “Forgot password?”'; sif.email.focus(); return; }
    sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function (r) {
      if (r.error) err.textContent = r.error.message; else ok.textContent = 'Check your inbox for a link to reset your password.';
    });
  });
  var rcf = $('[data-recovery-form]');
  rcf.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('[data-recovery-err]'); err.textContent = '';
    if (!rcf.password.checkValidity()) { err.textContent = 'Use at least 8 characters.'; return; }
    sb.auth.updateUser({ password: rcf.password.value }).then(function (r) {
      if (r.error) { err.textContent = r.error.message; return; }
      S.recovering = false; toast('Password updated'); start();
    });
  });
  $('[data-signout]').addEventListener('click', function () { sb.auth.signOut().then(function () { location.hash = ''; }); });

  function headerPill() {
    var cta = document.querySelectorAll('.header-cta');
    cta.forEach(function (a) {
      if (S.user) { a.setAttribute('href', '#profile'); a.innerHTML = '<span class="av sm" aria-hidden="true" style="width:30px;height:30px;font-size:12px;margin:-6px 4px -6px -12px;background:var(--terracotta);color:#FBF7F1;font-family:var(--sans)">' + esc(initials((S.profile && S.profile.full_name) || S.user.email)) + '</span>' + esc(first(S.profile && S.profile.full_name) || 'Your profile'); }
      else { a.setAttribute('href', 'join.html'); a.innerHTML = 'Join<span class="cta-long"> the Circle</span>'; }
    });
  }

  function start() {
    sb.auth.getSession().then(function (r) {
      S.user = r.data && r.data.session ? r.data.session.user : null;
      if (S.recovering) { showState('recovery'); return; }
      if (!S.user) { headerPill(); showState('signedout'); return; }
      return Promise.all([loadProfile(), loadConns(), loadDirectory()]).then(function () {
        headerPill(); showState('signedin'); refreshAll();
      });
    }).catch(function (e) { console.error(e); $('[data-state="loading"]').textContent = 'Couldn’t open the Circle. Refresh to try again.'; });
  }
  sb.auth.onAuthStateChange(function (event) {
    if (event === 'PASSWORD_RECOVERY') { S.recovering = true; showState('recovery'); return; }
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') start();
  });
  start();
})();
