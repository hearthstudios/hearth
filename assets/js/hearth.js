/* HEARTH Studios — site behavior. No framework; progressive enhancement. */
(function () {
  'use strict';
  var CFG = window.HEARTH_CONFIG || {};
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- signed-in member state (site-wide) ---------------- */
  function readMember() {
    try {
      var ref = (CFG.supabaseUrl || '').replace(/^https?:\/\//, '').split('.')[0];
      var raw = ref && localStorage.getItem('sb-' + ref + '-auth-token');
      if (!raw) return null;
      var t = JSON.parse(raw), sess = t && (t.currentSession || t);
      if (!sess || !sess.refresh_token || !sess.user) return null;
      var u = sess.user, cached = JSON.parse(localStorage.getItem('hearth_member') || 'null');
      var name = (cached && cached.id === u.id && cached.name) || (u.user_metadata && u.user_metadata.full_name) || '';
      return { id: u.id, name: name, email: u.email };
    } catch (e) { return null; }
  }
  function escHTML(x) { return String(x || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function applyMember(m, keepPage) {
    document.documentElement.classList.toggle('is-member', !!m);
    if (!keepPage) { // on page load only; never swap out a form someone just finished
      document.querySelectorAll('[data-guest-only]').forEach(function (el) { el.hidden = !!m; });
      document.querySelectorAll('[data-member-only]').forEach(function (el) { el.hidden = !m; });
    }
    if (!m) return;
    var first = (m.name || '').trim().split(/\s+/)[0] || '';
    var ini = (m.name || m.email || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
    document.querySelectorAll('[data-member-first]').forEach(function (el) { el.textContent = first ? ', ' + first : ''; });
    document.querySelectorAll('.header-cta').forEach(function (a) {
      a.setAttribute('href', 'collab-hub.html');
      a.setAttribute('aria-label', 'Your Circle, signed in as ' + (m.name || m.email || 'member'));
      a.setAttribute('title', 'Your Circle');
      a.classList.add('is-avatar');
      a.textContent = ini;
    });
    document.querySelectorAll('a[href="join.html"]:not(.header-cta)').forEach(function (a) {
      if (/see who/i.test(a.textContent)) { a.setAttribute('href', 'collab-hub.html#directory'); a.textContent = 'Open the directory'; return; }
      a.setAttribute('href', 'collab-hub.html');
      if (!a.children.length || /join/i.test(a.textContent)) a.textContent = a.textContent.trim().charAt(0) === '→' ? '→ Go to the Circle' : 'Go to the Circle';
    });
    document.querySelectorAll('[data-signin]').forEach(function (a) { if (!a.closest('[data-hub]')) a.hidden = true; });
  }
  window.HEARTH_applyMember = function (m) {
    try { if (m) localStorage.setItem('hearth_member', JSON.stringify({ id: m.id, name: m.name })); else localStorage.removeItem('hearth_member'); } catch (e) {}
    applyMember(m, true);
  };
  var MEMBER = readMember();
  // signed-in members never need the sign-up page: send them into the Circle
  if (MEMBER && document.querySelector('form[data-join]') && !/[?&]stay\b/.test(location.search)) { location.replace('collab-hub.html'); return; }
  applyMember(MEMBER);

  /* ---------------- menu overlay ---------------- */
  var menu = document.getElementById('site-menu');
  var openers = document.querySelectorAll('[data-menu-open]');
  var lastFocus = null;
  function openMenu() {
    if (!menu) return;
    lastFocus = document.activeElement;
    menu.hidden = false;
    requestAnimationFrame(function () { menu.classList.add('is-open'); });
    document.body.classList.add('menu-open');
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    var first = menu.querySelector('[data-menu-close]');
    if (first) first.focus();
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    setTimeout(function () { menu.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  }
  openers.forEach(function (b) { b.addEventListener('click', openMenu); });
  document.querySelectorAll('[data-menu-close]').forEach(function (b) { b.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) {
    if (!menu || !menu.classList.contains('is-open')) return;
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key === 'Tab') { // keep focus inside the open menu
      var f = menu.querySelectorAll('a[href],button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------- homepage video hero (self-hosted muted loop) ---------------- */
  var hero = document.querySelector('[data-video-hero]');
  if (hero) {
    var vid = hero.querySelector('[data-loop]');
    var btn = hero.querySelector('.pause-btn');
    var saveData = navigator.connection && navigator.connection.saveData;
    var userPaused = false;
    function setPaused(p) {
      if (!btn) return;
      btn.setAttribute('aria-pressed', p ? 'true' : 'false');
      btn.setAttribute('aria-label', p ? 'Play background video' : 'Pause background video');
    }
    function tryPlay() {
      if (!vid || userPaused) return;
      vid.muted = true; vid.defaultMuted = true;
      var pr = vid.play();
      if (pr && pr.then) pr.then(function () { setPaused(false); }).catch(function () { setPaused(true); });
    }
    if (vid) {
      // the browser picks the first <source> it can play (MP4 for Safari/Chrome/Edge, WebM otherwise).
      // Phones get the lighter 720p files.
      if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
        vid.querySelectorAll('source[data-small]').forEach(function (so) { so.src = so.getAttribute('data-small'); });
        vid.load();
      }
      vid.muted = true; vid.defaultMuted = true; vid.loop = true;
      // belt and braces: restart at the end if a browser ignores loop
      vid.addEventListener('ended', function () { vid.currentTime = 0; tryPlay(); });
      if (reduceMotion || saveData) { userPaused = true; setPaused(true); }
      else {
        vid.addEventListener('canplay', tryPlay, { once: true });
        tryPlay();
        // if autoplay was blocked (e.g. iPhone Low Power Mode), start on the first tap or scroll
        var kick = function () { if (vid.paused) tryPlay(); ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(function (ev) { window.removeEventListener(ev, kick); }); };
        ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(function (ev) { window.addEventListener(ev, kick, { passive: true }); });
      }
      if (btn) btn.addEventListener('click', function () {
        if (vid.paused) { userPaused = false; tryPlay(); } else { userPaused = true; vid.pause(); setPaused(true); }
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (userPaused) return; if (e.isIntersecting) tryPlay(); else vid.pause(); });
        }, { threshold: 0.1 }).observe(hero);
      }
      document.addEventListener('visibilitychange', function () { if (!document.hidden) tryPlay(); });
    }
  }

  /* ---------------- helpers ---------------- */
  function postJSON(url, data) {
    if (!url) return Promise.reject(new Error('No endpoint configured'));
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('Request failed (' + r.status + ')');
      return r;
    });
  }
  function collect(form) {
    var out = {};
    var fd = new FormData(form);
    fd.forEach(function (v, k) {
      if (k === 'company_website') return; // honeypot
      if (out[k] === undefined) out[k] = v;
      else if (Array.isArray(out[k])) out[k].push(v);
      else out[k] = [out[k], v];
    });
    form.querySelectorAll('input[type=checkbox]').forEach(function (c) {
      if (out[c.name] === undefined) out[c.name] = [];
      else if (!Array.isArray(out[c.name])) out[c.name] = [out[c.name]];
    });
    out.page = location.pathname;
    out.submitted_at = new Date().toISOString();
    return out;
  }
  function isBot(form) {
    var hp = form.querySelector('input[name=company_website]');
    return hp && hp.value;
  }

  /* ---------------- conditional "other" fields ---------------- */
  function syncReveals(scope) {
    (scope || document).querySelectorAll('[data-reveal-when]').forEach(function (w) {
      var parts = w.getAttribute('data-reveal-when').split('=');
      var form = w.closest('form') || document;
      var on = !!form.querySelector('input[name="' + parts[0] + '"][value="' + parts[1] + '"]:checked');
      w.hidden = !on;
      w.querySelectorAll('input,textarea,select').forEach(function (el) { el.disabled = !on; if (el.hasAttribute('data-req')) el.required = on; });
    });
  }
  window.HEARTH_syncReveals = syncReveals;
  document.addEventListener('change', function (e) { if (e.target.matches('input[type=radio],input[type=checkbox]')) syncReveals(e.target.closest('form') || document); });
  document.addEventListener('reset', function (e) { setTimeout(function () { syncReveals(e.target); }, 0); });
  syncReveals();

  /* ---------------- The Glow signup ---------------- */
  document.querySelectorAll('[data-glow-form]').forEach(function (form) {
    var msg = form.querySelector('.glow-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isBot(form)) return;
      var email = form.querySelector('input[type=email]');
      if (!email.value || !email.checkValidity()) { msg.textContent = 'Enter a valid email address.'; email.focus(); return; }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; msg.textContent = 'Subscribing…';
      postJSON(CFG.glowEndpoint, { email: email.value, utm_medium: 'website_form', utm_campaign: form.getAttribute('data-source') || 'the_glow' })
        .then(function () { msg.textContent = 'You’re in. Check your inbox for The Glow.'; form.reset(); })
        .catch(function () { msg.textContent = 'That didn’t go through. Try again, or email operations@buildyourhearth.studio.'; })
        .then(function () { btn.disabled = false; });
    });
  });

  /* ---------------- multi-step forms ---------------- */
  function Stepper(form, onSubmit) {
    var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
    var formSteps = steps.filter(function (s) { return !s.hasAttribute('data-done'); });
    var done = form.querySelector('[data-done]');
    var progress = form.querySelector('.progress');
    var bars = progress ? progress.querySelectorAll('.bars span') : [];
    var counter = progress ? progress.querySelector('[data-step-count]') : null;
    var nameEl = progress ? progress.querySelector('[data-step-name]') : null;
    var err = form.querySelector('.form-error');
    var i = 0;
    function show(n) {
      i = n;
      formSteps.forEach(function (s, k) { s.hidden = k !== n; });
      if (done) done.hidden = true;
      bars.forEach(function (b, k) { b.classList.toggle('on', k <= n); });
      if (counter) counter.textContent = String(n + 1);
      if (nameEl) nameEl.textContent = formSteps[n].getAttribute('data-name') || '';
      if (err) err.textContent = '';
      stepErr().textContent = '';
    }
    function stepErr() {
      var e = formSteps[i].querySelector('.form-error');
      if (!e) { e = document.createElement('p'); e.className = 'form-error'; e.setAttribute('role', 'alert'); var nav = formSteps[i].querySelector('.step-nav'); formSteps[i].insertBefore(e, nav || null); }
      return e;
    }
    function valid() {
      // forgive links typed without https://
      formSteps[i].querySelectorAll('input[type=url]').forEach(function (u) {
        var v = u.value.trim(); if (v && !/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) u.value = 'https://' + v;
      });
      var ok = true, firstBad = null;
      formSteps[i].querySelectorAll('input,textarea,select').forEach(function (el) {
        if (!el.checkValidity()) { ok = false; if (!firstBad) firstBad = el; }
      });
      var need = formSteps[i].querySelector('[data-require-one]');
      var msg = '';
      if (need && !need.querySelector('input:checked')) {
        ok = false; msg = need.getAttribute('data-require-one');
        if (!firstBad) firstBad = need.querySelector('input');
      } else if (!ok && firstBad) {
        var lab = firstBad.closest('fieldset') ? firstBad.closest('fieldset').querySelector('legend') : (firstBad.labels && firstBad.labels[0]);
        var name = lab ? lab.textContent.replace(/[*?]/g, '').replace(/pick any/i, '').trim() : '';
        msg = firstBad.type === 'url' ? 'Check the link in “' + name + '”. It should look like https://yoursite.com.'
          : firstBad.type === 'email' && firstBad.value ? 'Enter a valid email address.'
          : name ? 'Please complete “' + name.charAt(0) + name.slice(1).toLowerCase() + '”.' : 'Please fill in the required fields.';
      }
      stepErr().textContent = msg;
      if (firstBad) firstBad.focus();
      return ok;
    }
    function focusStep() {
      var h = formSteps[i].querySelector('h3');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
    }
    form.addEventListener('click', function (e) {
      var t = e.target.closest('[data-next],[data-back],[data-reset]');
      if (!t) return;
      e.preventDefault();
      if (t.hasAttribute('data-back')) { show(Math.max(0, i - 1)); focusStep(); return; }
      if (t.hasAttribute('data-reset')) { form.reset(); show(0); focusStep(); return; }
      if (!valid()) return;
      var before = t.getAttribute('data-before');
      var go = function () {
        if (i < formSteps.length - 1) { show(i + 1); focusStep(); }
      };
      if (before && Stepper.hooks[before]) {
        t.disabled = true;
        Stepper.hooks[before](form).then(go).catch(function (x) { stepErr().textContent = x.message; })
          .then(function () { t.disabled = false; });
      } else go();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid() || isBot(form)) return;
      var btn = form.querySelector('.step:not([hidden]) button[type=submit]');
      if (btn) btn.disabled = true;
      stepErr().textContent = '';
      onSubmit(collect(form)).then(function () {
        formSteps.forEach(function (s) { s.hidden = true; });
        if (progress) progress.hidden = true;
        if (done) { done.hidden = false; var h = done.querySelector('h3,.h3'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } }
      }).catch(function (x) {
        stepErr().textContent = x.message || 'Something went wrong. Try again, or email operations@buildyourhearth.studio.';
      }).then(function () { if (btn) btn.disabled = false; });
    });
    form.addEventListener('reset', function () { setTimeout(function () { if (progress) progress.hidden = false; show(0); }, 0); });
    show(0);
  }
  Stepper.hooks = {};

  /* ---------------- Airtable / form routing ---------------- */
  function clean(o) { Object.keys(o).forEach(function (k) { var v = o[k]; if (v === '' || v == null || (Array.isArray(v) && !v.length)) delete o[k]; }); return o; }
  function list(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  function yes(v) { return list(v).indexOf('yes') > -1; }
  function airtable(target, fields) {
    if (!target) return Promise.reject(new Error('Form destination not configured'));
    return postJSON(CFG.airtableEndpoint, { base: target.base, table: target.table, fields: clean(fields) });
  }
  function describe(d, extra) {
    var parts = [];
    if (d.project_details) parts.push(d.project_details);
    (extra || []).forEach(function (x) { if (x[1]) parts.push(x[0] + ': ' + x[1]); });
    return parts.join('\n\n');
  }
  var ROUTES = {
    inquiry: function (d) {
      var svc = list(d.services);
      return airtable(CFG.airtable.inquiry, {
        'Intake Status': 'New — Unreviewed',
        'Organization or Company Name': d.organization,
        'Primary Contact Full Name': d.name,
        'Email Address': d.email,
        'Phone Number': d.phone,
        'City': d.city,
        'State': d.state,
        'Organization Website': d.website,
        'How did you hear about HEARTH?': d.referral_source,
        'Which HEARTH service are you most interested in?': svc[0],
        'Please describe your project in as much detail as you can': describe(d, [
          ['All services selected', svc.length > 1 ? svc.join(', ') : ''],
          ['Timeline', d.timeline], ['Budget range', d.budget], ['Submitted from', d.page]
        ])
      });
    },
    sponsorship: function (d) {
      return airtable(CFG.airtable.inquiry, {
        'Intake Status': 'New — Unreviewed',
        'Organization or Company Name': d.organization,
        'Primary Contact Full Name': d.name,
        'Email Address': d.email,
        'Phone Number': d.phone,
        'Which HEARTH service are you most interested in?': 'Sponsorships',
        'Please describe your project in as much detail as you can': describe(d, [['Sponsorship level', d.sponsorship_level], ['Submitted from', d.page]])
      });
    },
    music_submission: function (d) {
      var f = {
        'Artist': d.artist_name, 'Artist Contact Email': d.email, 'Artist Phone': d.phone,
        'Portfolio or Website Link': d.website,
        'Song Title': d.track_1_title, 'Primary Steaming Link': d.track_1_link, // Airtable column is spelled "Steaming"
        'Genre': d.genre, 'Primary Instruments': d.primary_instrument, 'Vocal Type': d.vocals,
        'Approximate BPM': d.bpm ? (parseInt(d.bpm, 10) || null) : null,
        'Explicit Content': d.explicit, 'Lyrics Available': d.lyrics_available, 'Stems Available': d.stems,
        'Exclusivity': d.exclusivity, 'Rights Holder Contact': d.rights_holder_contact,
        'Rights Confirmation': yes(d.rights_confirmed) ? true : null,
        'Newsletter Opt-in': yes(d.glow_opt_in) ? true : null
      };
      for (var n = 2; n <= 5; n++) { f['Track Title ' + n] = d['track_' + n + '_title']; f['Streaming Link ' + n] = d['track_' + n + '_link']; }
      return airtable(CFG.airtable.music, f).then(function (r) {
        if (yes(d.glow_opt_in)) {
          postJSON(CFG.glowEndpoint, { email: d.email, utm_medium: 'music_submission', utm_campaign: 'sync_library' }).catch(function () {});
        }
        return r;
      });
    },
    program_notify: function (d) {
      if (CFG.airtable.notify) {
        return airtable(CFG.airtable.notify, { 'Name': d.name, 'Email': d.email, 'Role': d.role, 'Programs': list(d.programs).join(', '), 'Page': d.page });
      }
      var g = CFG.notifyGoogleForm;
      var p = new URLSearchParams();
      p.append(g.name, d.name); p.append(g.email, d.email); p.append(g.role, d.role || 'Artist/Creator');
      return fetch(g.action, { method: 'POST', mode: 'no-cors', body: p });
    }
  };

  document.querySelectorAll('form[data-inquiry]').forEach(function (form) {
    Stepper(form, function (data) {
      data.form = data.form || 'inquiry';
      var route = ROUTES[data.form];
      return route(data).catch(function (x) {
        console.error('[HEARTH] form error', x);
        throw new Error('We couldn’t send that. Try again, or email operations@buildyourhearth.studio.');
      });
    });
  });

  /* ---------------- The Circle (Supabase) ---------------- */
  var sb = null;
  function supa() {
    if (sb) return sb;
    if (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
    }
    return sb;
  }
  var joinForm = document.querySelector('form[data-join]');
  if (joinForm) {
    Stepper(joinForm, function (data) {
      var client = supa();
      if (!client) { console.warn('[HEARTH] Supabase not configured — join form is in preview mode.'); return Promise.resolve(); }
      return client.auth.signUp({ email: data.email, password: data.password, options: { data: { full_name: data.display_name } } })
        .then(function (res) {
          if (res.error) throw new Error(res.error.message);
          var session = res.data && res.data.session;
          var user = res.data && res.data.user;
          var note = joinForm.querySelector('[data-done-note]');
          if (!session || !user) {
            if (note) note.textContent = 'Check your inbox to confirm your email. Then sign in to finish your profile and enter the Circle.';
            return;
          }
          return client.from(CFG.profilesTable || 'profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: data.display_name,
            location: (data.city === 'Elsewhere' ? data.city_other : data.city) || null,
            craft: list(data.roles).filter(function (r) { return r !== 'Other'; }).concat(data.roles_other ? [String(data.roles_other).trim()] : []),
            portfolio_url: data.portfolio_url || null,
            status: 'pending',
            updated_at: new Date().toISOString()
          }).then(function (r) { if (r.error) throw new Error(r.error.message); window.HEARTH_applyMember({ id: user.id, name: data.display_name, email: user.email }); });
        });
    });
    var enter = document.querySelector('[data-circle-app]');
    if (enter && CFG.circleAppUrl) enter.setAttribute('href', CFG.circleAppUrl);
  }

  document.querySelectorAll('[data-signin]').forEach(function (a) {
    if (CFG.signInUrl) a.setAttribute('href', CFG.signInUrl);
  });

  /* Resources: unlock downloads for signed-in Circle members */
  var res = document.querySelector('[data-resources]');
  if (res) {
    var client = supa();
    if (client) {
      client.auth.getSession().then(function (s) {
        if (!(s.data && s.data.session)) return;
        res.classList.add('unlocked');
        res.querySelectorAll('.res-row[data-file]').forEach(function (row) {
          row.setAttribute('href', row.getAttribute('data-file'));
          row.setAttribute('download', '');
          var g = row.querySelector('.get');
          if (g) g.innerHTML = 'DOWNLOAD ↓';
        });
        var card = document.querySelector('[data-res-card]');
        if (card) card.innerHTML = '<span class="eyebrow">// YOU’RE IN THE CIRCLE</span><span class="h4">Download anything on this page.</span><p class="body">New templates land here as we build them.</p>';
      });
    }
  }


  /* Programs filter */
  var pf = document.querySelector('[data-program-filter]');
  if (pf) {
    pf.addEventListener('change', function () {
      var v = (pf.querySelector('input:checked') || {}).value || 'all';
      var shown = 0;
      document.querySelectorAll('[data-cat]').forEach(function (row) {
        var on = v === 'all' || row.getAttribute('data-cat').split(' ').indexOf(v) > -1;
        row.hidden = !on; if (on) shown++;
      });
      var live = document.querySelector('[data-filter-status]');
      if (live) live.textContent = shown + (shown === 1 ? ' program' : ' programs') + ' shown';
    });
  }

  /* Spotlight carousel */
  document.querySelectorAll('[data-carousel]').forEach(function (c) {
    var slides = c.querySelectorAll('[data-slide]');
    var dots = c.querySelectorAll('[data-dot]');
    var count = c.querySelector('[data-count]');
    var i = 0, n = slides.length;
    function pad(x) { return (x < 10 ? '0' : '') + x; }
    function go(k) {
      i = (k + n) % n;
      slides.forEach(function (s, j) { s.hidden = j !== i; });
      dots.forEach(function (d, j) { d.setAttribute('aria-current', j === i ? 'true' : 'false'); });
      if (count) count.textContent = pad(i + 1) + ' / ' + pad(n);
    }
    var prev = c.querySelector('[data-prev]'), next = c.querySelector('[data-next-slide]');
    if (prev) prev.addEventListener('click', function () { go(i - 1); });
    if (next) next.addEventListener('click', function () { go(i + 1); });
    dots.forEach(function (d, j) { d.addEventListener('click', function () { go(j); }); });
    go(0);
  });

  /* Music submission: add track rows */
  document.querySelectorAll('[data-add-track]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var hiddenRow = btn.closest('form').querySelector('.track-row[hidden]');
      if (hiddenRow) { hiddenRow.hidden = false; var f = hiddenRow.querySelector('input'); if (f) f.focus(); }
      if (!btn.closest('form').querySelector('.track-row[hidden]')) btn.hidden = true;
    });
  });

  /* Luma links */
  document.querySelectorAll('[data-luma]').forEach(function (a) {
    if (CFG.lumaCalendarUrl) a.setAttribute('href', CFG.lumaCalendarUrl);
  });

  /* Year in footer */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
