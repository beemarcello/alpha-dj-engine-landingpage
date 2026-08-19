/* ==========================================================================
   Alpha Music Converter — Landingpage 2026
   Kein Build-Step, kein Framework. Vanilla JS, defer geladen.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     1. Adaptiver CTA — macOS bekommt den Download, alles andere E-Mail-Capture
     Strategie: Die App läuft nur auf dem Desktop. Mobile Besucher können nicht
     installieren, also halten wir den Lead per E-Mail statt sie in eine
     Sackgasse zu schicken.
     ------------------------------------------------------------------------ */
  function initAdaptiveCta() {
    var ua = navigator.userAgent;
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    var isTouch = window.matchMedia('(pointer: coarse)').matches;
    // iPadOS meldet sich als "MacIntel" mit Touch → als Mobile behandeln.
    var isMac = /Mac/i.test(platform + ' ' + ua) && !isTouch;

    document.querySelectorAll('.cta-mac').forEach(function (el) {
      el.hidden = !isMac;
    });
    document.querySelectorAll('.cta-other').forEach(function (el) {
      el.hidden = isMac;
    });
  }

  /* ------------------------------------------------------------------------
     2. E-Mail-Capture — Platzhalter bis ein Backend/Provider angebunden ist.
     TODO: an den echten Endpoint hängen (siehe README "Offene Punkte").
     ------------------------------------------------------------------------ */
  function initLeadForms() {
    document.querySelectorAll('[data-lead-form]').forEach(function (form) {
      // Die Gerätesuche rendert Formulare nach und ruft diese Funktion erneut auf —
      // ohne Marker würde jedes bestehende Formular einen zweiten Listener bekommen.
      if (form.dataset.leadWired) return;
      form.dataset.leadWired = '1';

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var status = form.parentElement.querySelector('[data-lead-status]');
        var button = form.querySelector('button[type="submit"]');
        if (button) {
          button.disabled = true;
          button.textContent = 'Thanks — link on its way';
        }
        if (status) {
          status.textContent = 'Check your inbox — we just sent you the download link.';
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     3. Demo-Modal
     Escape, Fokusfalle und Backdrop übernimmt das native <dialog>. Hier nur
     Öffnen, Schliessen und Klick auf den Backdrop.
     ------------------------------------------------------------------------ */
  function initDemoModal() {
    var dialog = document.getElementById('demo-modal');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    document.querySelectorAll('[data-demo-open]').forEach(function (btn) {
      btn.addEventListener('click', function () { dialog.showModal(); });
    });

    document.querySelectorAll('[data-demo-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { dialog.close(); });
    });

    // Klick auf den Backdrop schliesst — das Dialog-Element füllt die ganze
    // Fläche, also über die Trefferbox des Inhalts entscheiden.
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var box = dialog.getBoundingClientRect();
      var inside = event.clientX >= box.left && event.clientX <= box.right &&
                   event.clientY >= box.top && event.clientY <= box.bottom;
      if (!inside) dialog.close();
    });

    // Escape erledigt <dialog> normalerweise selbst. Der Handler ist die
    // Absicherung für Umgebungen, in denen der native Close-Request ausbleibt
    // (u. a. ferngesteuerte Browser) — close() auf ein bereits geschlossenes
    // Dialog ist ein No-op, es kann also nichts doppelt feuern.
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        dialog.close();
      }
    });

    dialog.addEventListener('close', function () {
      // ► Beim Einbau des YouTube-iframes diese Zeilen aktivieren, sonst läuft
      //   das Video im geschlossenen Modal weiter:
      // var frame = dialog.querySelector('iframe');
      // if (frame) frame.src = frame.src;
    });
  }

  /* ------------------------------------------------------------------------
     4. Sticky Nav — Rand + Schatten erst beim Scrollen
     ------------------------------------------------------------------------ */
  function initNavbar() {
    var nav = document.getElementById('navbar');
    if (!nav) return;

    var onScroll = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------------
     4. Energy-Arc Chart (02 Compose)
     Rendert Balken + Kurve + Punkte für die gewählte Arc-Form und rotiert
     automatisch durch die Presets.
     ------------------------------------------------------------------------ */
  /* Reihenfolge + Anzahl bestimmen die Button-Zeile darunter — vier Presets
     passen bei 1080px Container in eine Reihe, fünf brechen um. */
  var ARC_SHAPES = {
    'Journey':   [20, 25, 40, 50, 60, 75, 80, 70, 50, 45],
    'Wave':      [40, 70, 40, 70, 40, 70, 40, 70, 40, 70],
    'Peak-time': [60, 80, 100, 90, 100, 80, 95, 100, 90, 80],
    'Cooldown':  [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]
  };
  var ARC_BARS = 50;
  var ARC_ROTATE_MS = 3200;

  /** Cosinus-geglättete Interpolation der 10 Stützpunkte auf `steps` Balken. */
  function interpolate(points, steps) {
    var out = [];
    for (var i = 0; i < steps; i++) {
      var t = i / (steps - 1);
      var index = t * (points.length - 1);
      var lower = Math.floor(index);
      var upper = Math.ceil(index);
      if (lower === upper) {
        out.push(points[lower]);
      } else {
        var weight = (1 - Math.cos((index - lower) * Math.PI)) / 2;
        out.push(points[lower] * (1 - weight) + points[upper] * weight);
      }
    }
    return out;
  }

  function initEnergyArc() {
    var root = document.querySelector('[data-energy-arc]');
    if (!root) return;

    var barsEl = root.querySelector('[data-arc-bars]');
    var pathEl = root.querySelector('[data-arc-path]');
    var dotsEl = root.querySelector('[data-arc-dots]');
    var btnsEl = root.querySelector('[data-arc-buttons]');
    if (!barsEl || !pathEl || !dotsEl || !btnsEl) return;

    var tabs = Object.keys(ARC_SHAPES);
    var activeTab = tabs[0];
    var rotateTimer = null;

    function render() {
      var heights = interpolate(ARC_SHAPES[activeTab], ARC_BARS);

      if (!barsEl.children.length) {
        heights.forEach(function (h) {
          var bar = document.createElement('div');
          bar.className = 'flex-1 bg-black rounded-t-[1px] transition-all duration-700 ease-in-out';
          bar.style.height = h + '%';
          barsEl.appendChild(bar);
        });
      } else {
        Array.prototype.forEach.call(barsEl.children, function (bar, i) {
          bar.style.height = heights[i] + '%';
        });
      }

      var d = '';
      heights.forEach(function (h, i) {
        var x = (i / (ARC_BARS - 1)) * 100;
        var y = 100 - h;
        d += (i === 0 ? 'M ' : 'L ') + x + ' ' + y + ' ';
      });
      pathEl.setAttribute('d', d);

      var points = ARC_SHAPES[activeTab];
      if (!dotsEl.children.length) {
        points.forEach(function (h, i) {
          var dot = document.createElement('div');
          dot.className = 'absolute w-3.5 h-3.5 bg-white border-[2px] border-black rounded-full ' +
                          'transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out z-10';
          dot.style.left = ((i / (points.length - 1)) * 100) + '%';
          dot.style.top = (100 - h) + '%';
          dotsEl.appendChild(dot);
        });
      } else {
        Array.prototype.forEach.call(dotsEl.children, function (dot, i) {
          dot.style.top = (100 - points[i]) + '%';
        });
      }
    }

    function renderButtons() {
      btnsEl.innerHTML = '';
      tabs.forEach(function (tab) {
        var btn = document.createElement('button');
        var isActive = tab === activeTab;
        btn.type = 'button';
        // Unterhalb lg ist die Panel-Spalte am schmalsten (~284px bei 768px
        // Viewport). Dort teilen sich die Buttons die Breite gleichmässig
        // (flex-1), damit die Reihe nie umbricht; ab lg wieder kompakte Pills.
        btn.className = 'flex-1 lg:flex-none min-w-0 px-2 lg:px-4 py-1.5 rounded-full ' +
          'border-[2px] border-black font-semibold text-[11px] lg:text-sm whitespace-nowrap ' +
          'transition-all shadow-[2px_2px_0_0_#000] hover:translate-y-[1px] hover:translate-x-[1px] ' +
          'hover:shadow-[1px_1px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none ' +
          (isActive ? 'bg-[var(--purple-hot)]' : 'bg-white');
        btn.textContent = tab;
        btn.setAttribute('aria-pressed', String(isActive));
        btn.addEventListener('click', function () {
          activeTab = tab;
          renderButtons();
          render();
          startRotation();
        });
        btnsEl.appendChild(btn);
      });
    }

    function startRotation() {
      if (reduceMotion) return;
      clearInterval(rotateTimer);
      rotateTimer = setInterval(function () {
        activeTab = tabs[(tabs.indexOf(activeTab) + 1) % tabs.length];
        renderButtons();
        render();
      }, ARC_ROTATE_MS);
    }

    // Rotation pausieren, solange die Sektion nicht sichtbar ist.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) startRotation();
          else clearInterval(rotateTimer);
        });
      }, { threshold: .2 }).observe(root);
    }

    renderButtons();
    render();
    startRotation();
  }

  /* ------------------------------------------------------------------------
     6. Geräte-Kompatibilitätssuche (compatibility.html)

     Pflege: neue Hardware hier eintragen. `aliases` fängt Schreibweisen ab, die
     Leute wirklich tippen (ohne Leerzeichen, ohne Marke, Spitznamen).

     status:
       'yes'    → Engine OS, schreibt Alpha
       'never'  → anderes Ökosystem, bewusst nicht unterstützt (rekordbox/Serato)
       (kein Treffer) → "Not supported yet" + Gerät melden
     ------------------------------------------------------------------------ */
  var ENGINE = 'Fully compatible · Engine DJ';
  var DEVICES = [
    { name: 'Denon DJ Prime Go',   status: 'yes', meta: ENGINE, aliases: ['primego', 'prime go', 'go'],
      note: 'Our reference device — every release is tested on it.' },
    { name: 'Denon DJ Prime 2',    status: 'yes', meta: ENGINE, aliases: ['prime2', 'prime 2'] },
    { name: 'Denon DJ Prime 4',    status: 'yes', meta: ENGINE, aliases: ['prime4', 'prime 4'] },
    { name: 'Denon DJ SC5000 Prime',  status: 'yes', meta: ENGINE, aliases: ['sc5000'] },
    { name: 'Denon DJ SC5000M Prime', status: 'yes', meta: ENGINE, aliases: ['sc5000m'] },
    { name: 'Denon DJ SC6000 Prime',  status: 'yes', meta: ENGINE, aliases: ['sc6000'] },
    { name: 'Denon DJ SC6000M Prime', status: 'yes', meta: ENGINE, aliases: ['sc6000m'] },
    { name: 'Numark Mixstream Pro',   status: 'yes', meta: ENGINE, aliases: ['mixstream', 'mixstreampro'] },
    { name: 'Denon DJ LC6000 Prime',  status: 'yes', meta: 'Engine DJ · expansion controller',
      aliases: ['lc6000'],
      note: 'An expansion controller — it has no drive of its own. Write the USB for the SC5000 or SC6000 it is paired with.' },

    { name: 'Pioneer DJ CDJ', status: 'never', meta: 'Not supported — rekordbox ecosystem',
      aliases: ['cdj', 'cdj3000', 'cdj 3000', 'cdj2000', 'pioneer'],
      note: 'rekordbox stores its library in an encrypted database. We deliberately leave that alone, so Pioneer players are out of scope.' },
    { name: 'Pioneer DJ XDJ', status: 'never', meta: 'Not supported — rekordbox ecosystem',
      aliases: ['xdj', 'xdj rx', 'xdjrx', 'xdj xz'],
      note: 'rekordbox stores its library in an encrypted database. We deliberately leave that alone, so Pioneer players are out of scope.' },
    { name: 'Serato hardware', status: 'never', meta: 'Not supported — Serato ecosystem',
      aliases: ['serato', 'rane'],
      note: 'Serato runs from a laptop rather than a self-contained USB drive, so there is nothing for Alpha to write.' }
  ];

  function normalize(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function matchDevices(query) {
    var q = normalize(query);
    if (q.length < 2) return [];
    return DEVICES.filter(function (d) {
      if (normalize(d.name).indexOf(q) !== -1) return true;
      return (d.aliases || []).some(function (a) { return normalize(a).indexOf(q) !== -1; });
    });
  }

  function deviceCard(d) {
    var yes = d.status === 'yes';
    var icon = yes ? 'check' : 'x';
    return '' +
      '<li class="dev-card ' + (yes ? 'dev-card--yes' : 'dev-card--no') + '">' +
        '<span class="dev-card__mark"><i data-lucide="' + icon + '" class="w-4 h-4 stroke-[2.5]"></i></span>' +
        '<span>' +
          '<p class="dev-card__name">' + d.name + '</p>' +
          '<p class="dev-card__meta">' + d.meta + '</p>' +
          (d.note ? '<p class="dev-card__note">' + d.note + '</p>' : '') +
        '</span>' +
      '</li>';
  }

  function unknownCard(query) {
    return '' +
      '<li class="dev-card dev-card--no">' +
        '<span class="dev-card__mark"><i data-lucide="circle-help" class="w-4 h-4 stroke-[2.5]"></i></span>' +
        '<span class="w-full">' +
          '<p class="dev-card__name">Not supported yet</p>' +
          '<p class="dev-card__meta">We have no entry for “' + query.replace(/[<>&"]/g, '') + '”.</p>' +
          '<div class="dev-tell">' +
            '<p class="dev-card__note" style="margin-bottom:8px">Tell us what device you use →</p>' +
            '<form class="dev-tell__row" data-lead-form>' +
              '<label class="sr-only" for="dev-email">Email address</label>' +
              '<input id="dev-email" name="email" type="email" autocomplete="email" required ' +
                     'placeholder="Email address" class="input">' +
              '<button type="submit" class="btn btn-primary">Notify me</button>' +
            '</form>' +
            '<p class="dev-card__note" data-lead-status>We\'ll let you know when your hardware is covered.</p>' +
          '</div>' +
        '</span>' +
      '</li>';
  }

  function initDeviceSearch() {
    var input = document.querySelector('[data-device-input]');
    var out = document.querySelector('[data-device-results]');
    if (!input || !out) return;

    var form = input.closest('form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

    function render() {
      var q = input.value.trim();
      if (normalize(q).length < 2) { out.innerHTML = ''; return; }

      var hits = matchDevices(q);
      out.innerHTML = '<ul class="dev-results">' +
        (hits.length ? hits.map(deviceCard).join('') : unknownCard(q)) +
        '</ul>';

      if (window.lucide) window.lucide.createIcons();
      initLeadForms();   // das frisch gerenderte Melde-Formular verdrahten
    }

    input.addEventListener('input', render);
    render();
  }

  /* ------------------------------------------------------------------------
     7. Consent-Banner

     Drei Stufen, abgebildet als Plattenteller: volle Platte, halbe Platte,
     leerer Teller mit abgehobenem Tonarm.

     Zuordnung zu Google Consent Mode v2:
       all   → analytics_storage + ad_storage/ad_user_data/ad_personalization
       stats → nur analytics_storage
       none  → alles denied (Ausgangszustand)

     WICHTIG: Google Analytics wird hier NICHT geladen. Der Banner setzt nur
     den Consent-Zustand. Zum Scharfschalten den markierten Block in
     loadAnalytics() ausfüllen — dann laedt GA erst nach Einwilligung.
     ------------------------------------------------------------------------ */
  var CONSENT_KEY = 'amc-consent-v1';

  var CONSENT_LEVELS = [
    { id: 'all', name: 'Play it all',
      desc: 'Usage stats plus campaign measurement, so we know which posts actually bring DJs here.' },
    { id: 'stats', name: 'Stats only',
      desc: 'Anonymous usage measurement — which pages get read and where people drop off.' },
    { id: 'none', name: 'Needle up',
      desc: 'Nothing is measured. The site works exactly the same.' }
  ];

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function writeConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* Private Mode */ }
  }

  /** Plattenteller als SVG. fill: 'full' | 'half' | 'none' */
  function deckSvg(fill, labelColor) {
    var grooves = '';
    [38, 33, 28, 23].forEach(function (r) {
      grooves += '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>';
    });

    var vinyl = '';
    if (fill !== 'none') {
      // Halbe Platte: rechte Haelfte wegschneiden
      var clip = fill === 'half'
        ? '<defs><clipPath id="cc-half"><rect x="0" y="0" width="60" height="120"/></clipPath></defs>'
        : '';
      var clipAttr = fill === 'half' ? ' clip-path="url(#cc-half)"' : '';
      vinyl =
        clip +
        '<g class="deck__spin">' +
          '<g' + clipAttr + '>' +
            '<circle cx="60" cy="60" r="44" fill="#111" stroke="#000" stroke-width="2"/>' +
            grooves +
            '<circle cx="60" cy="60" r="15" fill="' + labelColor + '" stroke="#000" stroke-width="2"/>' +
          '</g>' +
          // Schnittkante der halben Platte sichtbar machen
          (fill === 'half'
            ? '<line x1="60" y1="16" x2="60" y2="104" stroke="#000" stroke-width="2"/>'
            : '') +
        '</g>';
    }

    return '' +
      '<svg viewBox="0 0 120 120" aria-hidden="true">' +
        // Teller
        '<circle cx="60" cy="60" r="52" fill="#d9d9d7" stroke="#000" stroke-width="2"/>' +
        vinyl +
        // Spindel
        '<circle cx="60" cy="60" r="3" fill="#000"/>' +
        // Tonarm
        '<g class="deck__arm">' +
          '<circle cx="104" cy="18" r="7" fill="#fff" stroke="#000" stroke-width="2"/>' +
          '<line x1="104" y1="18" x2="72" y2="52" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>' +
          '<rect x="66" y="48" width="10" height="7" rx="2" fill="#fff" stroke="#000" stroke-width="2" transform="rotate(-45 71 51)"/>' +
        '</g>' +
      '</svg>';
  }

  var LABEL_COLORS = { all: '#5dff7e', stats: '#c987fd', none: '#ffffff' };
  var FILL_BY_ID   = { all: 'full',    stats: 'half',    none: 'none' };

  /** Consent an Google Consent Mode v2 melden. */
  function applyConsent(level) {
    var granted = function (v) { return v ? 'granted' : 'denied'; };
    var analytics = level === 'all' || level === 'stats';
    var ads = level === 'all';

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('consent', 'update', {
      analytics_storage:   granted(analytics),
      ad_storage:          granted(ads),
      ad_user_data:        granted(ads),
      ad_personalization:  granted(ads)
    });

    if (analytics) loadAnalytics();
  }

  var analyticsLoaded = false;
  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    /* ====================================================================
       HIER GOOGLE ANALYTICS EINSETZEN — laeuft nur nach Einwilligung.

       var s = document.createElement('script');
       s.async = true;
       s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX';
       document.head.appendChild(s);
       window.dataLayer = window.dataLayer || [];
       function gtag(){ dataLayer.push(arguments); }
       gtag('js', new Date());
       gtag('config', 'G-XXXXXXX', { anonymize_ip: true });

       Solange die Mess-ID fehlt, passiert hier bewusst nichts.
       ==================================================================== */
  }

  function buildBanner(current) {
    var wrap = document.createElement('div');
    wrap.className = 'cc';
    wrap.id = 'cc-banner';

    var opts = CONSENT_LEVELS.map(function (l) {
      var checked = l.id === current;
      return '' +
        '<button type="button" class="cc-opt" role="radio" data-consent="' + l.id + '" ' +
                'aria-checked="' + checked + '">' +
          '<span class="deck"><span class="deck__inner">' +
            deckSvg(FILL_BY_ID[l.id], LABEL_COLORS[l.id]) +
          '</span></span>' +
          '<span class="cc-opt__name">' + l.name + '</span>' +
          '<span class="cc-opt__desc">' + l.desc + '</span>' +
        '</button>';
    }).join('');

    wrap.innerHTML = '' +
      '<div class="cc__panel" role="dialog" aria-modal="true" aria-labelledby="cc-title">' +
        '<p class="cc__eyebrow">A quick word on cookies</p>' +
        '<h2 class="cc__title" id="cc-title">How much should we measure?</h2>' +
        '<p class="cc__lead">We only want to know whether this site works: which pages get read ' +
          'and where people drop off. Anonymous, never sold, never shared with advertisers ' +
          'beyond what you pick here.</p>' +
        '<div class="cc__options" role="radiogroup" aria-labelledby="cc-title">' + opts + '</div>' +
        '<button type="button" class="btn btn-primary cc__confirm" data-cc-confirm>Confirm selection</button>' +
        '<p class="cc__foot">You can change this any time via “Cookie settings” in the footer. ' +
          'See the <a href="privacy.html">privacy page</a> for detail.</p>' +
        '<details class="cc__details">' +
          '<summary>What exactly do we measure?</summary>' +
          '<div class="cc__detailsBody">' +
            '<p><strong>Needle up</strong> — nothing at all. No cookies, no measurement. ' +
              'Only your choice here is remembered, in your browser.</p>' +
            '<p><strong>Stats only</strong> — Google Analytics with a shortened IP: pages viewed, ' +
              'roughly where in the world you are, which link brought you. No advertising features.</p>' +
            '<p><strong>Play it all</strong> — the above plus campaign measurement, so we can tell ' +
              'which post or ad actually sent a DJ our way.</p>' +
          '</div>' +
        '</details>' +
      '</div>';

    return wrap;
  }

  function initConsent() {
    var stored = readConsent();

    // Ausgangszustand: alles verweigert, bis eine Wahl vorliegt.
    window.dataLayer = window.dataLayer || [];
    (function () {
      function gtag() { window.dataLayer.push(arguments); }
      gtag('consent', 'default', {
        analytics_storage: 'denied', ad_storage: 'denied',
        ad_user_data: 'denied', ad_personalization: 'denied',
        wait_for_update: 500
      });
    })();

    if (stored) applyConsent(stored);

    function open(preselect) {
      if (document.getElementById('cc-banner')) return;
      var selected = preselect || readConsent() || 'stats';
      var el = buildBanner(selected);
      document.body.appendChild(el);
      if (window.lucide) window.lucide.createIcons();

      var lastFocus = document.activeElement;

      el.querySelectorAll('.cc-opt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          selected = btn.dataset.consent;
          el.querySelectorAll('.cc-opt').forEach(function (b) {
            b.setAttribute('aria-checked', String(b === btn));
          });
        });
      });

      el.querySelector('[data-cc-confirm]').addEventListener('click', function () {
        writeConsent(selected);
        applyConsent(selected);
        el.remove();
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      });

      // Escape = ablehnen, aber nicht speichern — die Frage bleibt offen.
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { el.remove(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
      });

      var first = el.querySelector('.cc-opt[aria-checked="true"]') || el.querySelector('.cc-opt');
      if (first) first.focus();
    }

    if (!stored) open();

    // Footer-Link „Cookie settings"
    document.querySelectorAll('[data-cookie-settings]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); open(); });
    });
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  function boot() {
    initAdaptiveCta();
    initLeadForms();
    initDemoModal();
    initNavbar();
    initEnergyArc();
    initDeviceSearch();
    initConsent();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
