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
       'yes'    → Alpha schreibt einen Stick, den das Gerät liest
       'never'  → anderes Ökosystem, bewusst nicht unterstützt (Serato)
       (kein Treffer) → "Not supported yet" + Gerät melden

     Geaendert am 2026-08-25 (Marcel): CDJ/XDJ standen hier auf 'never' mit der
     Begruendung, rekordbox sei eine verschluesselte Datenbank, die wir bewusst
     in Ruhe lassen. Das ist ueberholt — Alpha schreibt den rekordbox-Stick
     inzwischen selbst (siehe /knowledgebase/#rekordbox-export). Die Suche hat
     Pioneer-Nutzern also aktiv abgesagt, obwohl ihr Geraet unterstuetzt ist.
     Der Vorbehalt aus der Wissensbasis ("neues Ziel, bitte am eigenen Player
     bestaetigen") steht bewusst im note-Feld und darf nicht wegfallen.
     ------------------------------------------------------------------------ */
  var ENGINE = 'Fully compatible · Engine DJ';
  var REKORDBOX = 'Fully compatible · rekordbox USB';

  /* Marken- und Formatnamen, die Leute statt des Modells tippen. Wer
     "pioneer", "alphatheta" oder "rekordbox" sucht, soll alle Player sehen. */
  var RB = ['pioneer', 'alphatheta', 'rekordbox'];
  var RB_NOTE = 'Alpha writes the rekordbox library itself, so the stick plays ' +
                'straight on the player — no rekordbox software needed. This ' +
                'target is new: please confirm it on your own gear.';
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

    { name: 'Pioneer DJ CDJ-3000', status: 'yes', meta: REKORDBOX,
      aliases: ['cdj3000', 'cdj 3000'].concat(RB), note: RB_NOTE },
    { name: 'Pioneer DJ CDJ-2000NXS2', status: 'yes', meta: REKORDBOX,
      aliases: ['cdj2000', 'cdj 2000', 'nxs2', 'nexus'].concat(RB), note: RB_NOTE },
    { name: 'Pioneer DJ XDJ-RX3', status: 'yes', meta: REKORDBOX,
      aliases: ['xdjrx3', 'xdj rx3', 'rx3'].concat(RB), note: RB_NOTE },
    { name: 'Pioneer DJ XDJ-RX2', status: 'yes', meta: REKORDBOX,
      aliases: ['xdjrx2', 'xdj rx2', 'rx2'].concat(RB), note: RB_NOTE },
    { name: 'Pioneer DJ XDJ-XZ', status: 'yes', meta: REKORDBOX,
      aliases: ['xdjxz', 'xdj xz', 'xz'].concat(RB), note: RB_NOTE },
    { name: 'Pioneer DJ XDJ-1000MK2', status: 'yes', meta: REKORDBOX,
      aliases: ['xdj1000', 'xdj 1000', '1000mk2'].concat(RB), note: RB_NOTE },
    { name: 'Pioneer DJ XDJ-700', status: 'yes', meta: REKORDBOX,
      aliases: ['xdj700', 'xdj 700'].concat(RB), note: RB_NOTE },
    { name: 'AlphaTheta OPUS-QUAD', status: 'yes', meta: REKORDBOX,
      aliases: ['opus', 'opusquad', 'opus quad'].concat(RB), note: RB_NOTE },
    { name: 'AlphaTheta XDJ-AZ', status: 'yes', meta: REKORDBOX,
      aliases: ['xdjaz', 'xdj az'].concat(RB), note: RB_NOTE },

    { name: 'VirtualDJ (any controller)', status: 'yes', meta: 'Fully compatible · VirtualDJ library',
      aliases: ['virtualdj', 'virtual dj', 'vdj'],
      note: 'Alpha writes a VirtualDJ library onto the stick. It is loaded by the VirtualDJ app on a Mac or PC, so any controller VirtualDJ supports will play the set — it is not a standalone stick for the gear itself.' },

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

     Drei Stufen in Klartext, Zuordnung zu Google Consent Mode v2:
       all   → analytics_storage + ad_storage/ad_user_data/ad_personalization
       stats → nur analytics_storage
       none  → alles denied

     Der Banner LAEDT nichts. gtag.js steht im <head> und startet mit dem
     Default "denied"; der Banner schickt nur das consent-update. Bis dahin
     setzt GA keine Cookies. Google Ads ist der einzige Tag, der zusaetzlich
     einen config-Aufruf braucht — der steht in loadAds() und feuert nur bei
     Stufe "all".
     ------------------------------------------------------------------------ */
  var CONSENT_KEY = 'amc-consent-v1';

  /* Reihenfolge = Anzeigereihenfolge in der Feineinstellung: von der
     sparsamsten zur weitgehendsten Stufe. Die ids bleiben unveraendert
     ('none' | 'stats' | 'all') — sie stehen so im localStorage der bisherigen
     Besucher, und ein Umbenennen wuerde deren Entscheidung entwerten und die
     Frage erneut stellen. Nur die sichtbaren Namen sind neu: die alten
     DJ-Metaphern ("Needle up", "Play it all") waren der Grund, warum Besucher
     nicht wussten, was sie anklicken. */
  var CONSENT_LEVELS = [
    { id: 'none',  name: 'Essential only',
      desc: 'Nothing is measured. Only your choice here is stored, in your browser.' },
    { id: 'stats', name: 'Essential + statistics',
      desc: 'Anonymous usage measurement: which pages get read and where people drop off.' },
    { id: 'all',   name: 'Statistics + campaign measurement',
      desc: 'The above, plus which post or ad brought someone here.' }
  ];

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function writeConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* Private Mode */ }
  }


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

    /* Kein loadAnalytics mehr — GA laeuft ueber den <head> und richtet sich
       allein nach diesem Update. */
    if (ads) loadAds();
  }

  /* ------------------------------------------------------------------------
     Google-Tags

     GA4 wird nicht mehr von hier geladen. gtag.js und der config-Aufruf stehen
     fest im <head> jeder Seite, weil Googles Installationspruefung die Seite
     abruft und das Tag im Quelltext sucht — nachgeladen findet sie es nie.

     Gemessen wird trotzdem erst nach der Entscheidung: der consent-default im
     <head> steht auf denied, und erst applyConsent() schickt das Update. Bis
     dahin setzt GA keine Cookies.

     Bleibt hier: Google Ads. Das Skript ist durch den <head> schon geladen, es
     fehlt nur der config-Aufruf — und der darf ausschliesslich bei Stufe "all"
     kommen.
     ------------------------------------------------------------------------ */
  var GA_CFG = {
    adsConversionId: ''      // AW-XXXXXXXXX, nur falls Ads geschaltet werden
  };

  function gtagPush() { (window.dataLayer = window.dataLayer || []).push(arguments); }

  var adsAngemeldet = false;
  function loadAds() {
    if (adsAngemeldet || !GA_CFG.adsConversionId) return;
    adsAngemeldet = true;
    gtagPush('config', GA_CFG.adsConversionId);
  }

  /* Zwei Ebenen:
       1. Leiste — ein Satz, "Reject" und "Accept", daneben "Settings".
       2. Feineinstellung — die drei Stufen, erst nach Klick sichtbar.

     Ebene 1 hat KEINE Vorauswahl. Das ist kein Versehen: vorher stand die
     Stufe "stats" vorgewaehlt da, und eine vorangekreuzte nicht-notwendige
     Einwilligung ist unwirksam. Zwei ausdrueckliche Knoepfe loesen das ganz. */
  function buildBanner(current) {
    var wrap = document.createElement('div');
    wrap.className = 'cc';
    wrap.id = 'cc-banner';

    var opts = CONSENT_LEVELS.map(function (l) {
      return '' +
        '<button type="button" class="cc-opt" role="radio" data-consent="' + l.id + '" ' +
                'aria-checked="' + (l.id === current) + '">' +
          '<span class="cc-opt__dot"></span>' +
          '<span><span class="cc-opt__name">' + l.name + '</span>' +
          '<span class="cc-opt__desc">' + l.desc + '</span></span>' +
        '</button>';
    }).join('');

    wrap.innerHTML = '' +
      '<div class="cc__panel" role="region" aria-label="Cookie notice">' +
        '<div class="cc__row">' +
          '<p class="cc__text">We use cookies to measure how this site is used. ' +
            'You can accept, reject, or choose in detail. ' +
            '<a href="' + PRIVACY_HREF + '">Privacy</a></p>' +
          '<div class="cc__actions">' +
            '<button type="button" class="btn" data-cc-set="none">Reject</button>' +
            '<button type="button" class="btn btn-primary" data-cc-set="all">Accept</button>' +
            '<button type="button" class="cc__more" data-cc-more aria-expanded="false">Settings</button>' +
          '</div>' +
        '</div>' +

        '<div class="cc__detail">' +
          '<div role="radiogroup" aria-label="How much may we measure?">' + opts + '</div>' +
          '<button type="button" class="btn btn-primary cc__save" data-cc-save>Save selection</button>' +
        '</div>' +
      '</div>';

    return wrap;
  }

  /* Die Datenschutzseite liegt je nach Unterordner anders. Ein fest kodiertes
     "privacy.html" haette auf /features/ und /knowledgebase/ ins Leere gezeigt. */
  var PRIVACY_HREF = (function () {
    var tiefe = window.location.pathname.replace(/\/[^\/]*$/, '/').split('/').length - 2;
    return (tiefe > 0 ? '../'.repeat(tiefe) : '') + 'privacy.html';
  })();

  function initConsent() {
    var stored = readConsent();

    /* Der Ausgangszustand (alles denied) wird NICHT mehr hier gesetzt, sondern
       im <head> jeder Seite — direkt vor dem Laden von gtag.js. site.js laeuft
       mit defer und damit zu spaet: einen Default nach der Initialisierung
       ignoriert Google, und die Seite haette stillschweigend ohne Schutz
       gemessen. Hier bleibt nur das Update nach der Entscheidung. */
    window.dataLayer = window.dataLayer || [];

    if (stored) applyConsent(stored);

    function open(detailSofort) {
      var vorhanden = document.getElementById('cc-banner');
      if (vorhanden) {
        // Schon offen — dann nur die Feineinstellung aufklappen.
        if (detailSofort) zeigeDetail(vorhanden);
        return;
      }

      // Vorauswahl NUR in der Feineinstellung, und nur aus einer frueheren
      // Entscheidung. Ohne gespeicherte Wahl steht die sparsamste Stufe vorn —
      // niemals eine, die etwas erlaubt.
      var selected = readConsent() || 'none';
      var el = buildBanner(selected);
      document.body.appendChild(el);
      if (detailSofort) zeigeDetail(el);

      function entscheide(level) {
        writeConsent(level);
        applyConsent(level);
        el.remove();
      }

      el.querySelectorAll('[data-cc-set]').forEach(function (btn) {
        btn.addEventListener('click', function () { entscheide(btn.dataset.ccSet); });
      });

      el.querySelector('[data-cc-more]').addEventListener('click', function () {
        zeigeDetail(el);
      });

      el.querySelectorAll('.cc-opt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          selected = btn.dataset.consent;
          el.querySelectorAll('.cc-opt').forEach(function (b) {
            b.setAttribute('aria-checked', String(b === btn));
          });
        });
      });

      el.querySelector('[data-cc-save]').addEventListener('click', function () {
        entscheide(selected);
      });
    }

    function zeigeDetail(el) {
      el.classList.add('is-detail');
      var more = el.querySelector('[data-cc-more]');
      if (more) { more.setAttribute('aria-expanded', 'true'); more.hidden = true; }
      var erste = el.querySelector('.cc-opt[aria-checked="true"]') || el.querySelector('.cc-opt');
      if (erste) erste.focus();
    }

    if (!stored) open();

    // Footer-Link „Cookie settings"
    document.querySelectorAll('[data-cookie-settings]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); open(true); });
    });
  }

  /* ------------------------------------------------------------------------
     8. Download-Modal — Registrierung + Verifikation auf der Seite (Clerk)

     Jeder Download-CTA traegt data-download und oeffnet dieses Modal statt
     direkt zu laden. Das Markup wird hier erzeugt, damit es auf allen Seiten
     ohne kopiertes HTML existiert.

     Ablauf (Marcel, 2026-08-20) — drei Schritte in EINEM Modal:
       1. E-Mail eingeben  → Clerk legt den Sign-up an und mailt einen
                             sechsstelligen Code.
       2. Code eingeben    → Verifikation passiert auf der Seite. Kein
                             Bestaetigungslink, kein Tabwechsel.
       3. Download startet sofort. Der Link geht zusaetzlich per Mail raus,
          falls der Download abbricht oder das Geraet gewechselt wird.

     Warum Code statt Link: der Link-Weg zwingt den Nutzer in die Inbox UND
     zurueck ueber einen neuen Tab — der urspruengliche Tab bleibt verwaist.
     Beim Code bleibt der Nutzer hier, der Zustand geht nicht verloren. Der
     Inbox-Weg entfaellt damit nicht ganz (E-Mail-Besitz muss ja belegt
     werden), aber er schrumpft auf "Code abholen".

     Weiterhin gilt: hier wird NUR die E-Mail erhoben. Nickname und Passwort
     legt der Nutzer erst in der Desktop-App an. Wer Felder ergaenzen will,
     prueft vorher, ob sie nicht dorthin gehoeren.

     Clerk wird bewusst ERST beim ersten Klick geladen, nicht im <head>:
       - die Startseite bleibt damit frei von Drittanbieter-Requests,
       - und das Skript laedt nur, wenn der Nutzer die Registrierung aktiv
         angefordert hat.
     Wer das nach oben zieht, macht aus dem Modal einen Tracker auf jeder
     Seite. Nicht tun.
     ------------------------------------------------------------------------ */

  /*  Konfiguration — hier eintragen, sonst faellt das Modal auf den alten
      "wir mailen dir den Link"-Text zurueck (siehe CONFIGURED unten).

      publishableKey  Clerk → Dashboard → API Keys → "Publishable key".
                      Faengt mit pk_live_ (Produktion) oder pk_test_ an.
                      Der Key ist oeffentlich, er gehoert ins Frontend.
      downloadUrl     Direkte URL zum .dmg.
      notifyEndpoint  Optional. Bekommt nach erfolgreicher Verifikation
                      { email } gePOSTet und verschickt die Backup-Mail mit
                      dem Downloadlink. Leer lassen = keine Backup-Mail.   */
  var DL_CFG = {
    publishableKey: '',
    downloadUrl: '',
    notifyEndpoint: ''
  };

  function initDownloadModal() {
    if (!document.querySelector('[data-download]')) return;

    var CONFIGURED = !!DL_CFG.publishableKey;

    var dlg = document.createElement('dialog');
    dlg.className = 'dl-modal';
    dlg.id = 'download-modal';
    dlg.setAttribute('aria-labelledby', 'dl-title');
    dlg.setAttribute('data-step', 'email');
    dlg.innerHTML = '' +
      '<div class="dl-modal__inner">' +
        '<div class="dl-modal__head">' +
          '<h2 class="dl-modal__title" id="dl-title">Create your account</h2>' +
          '<button type="button" class="dl-modal__close" data-dl-close aria-label="Close">' +
            '<i data-lucide="x" class="w-5 h-5"></i></button>' +
        '</div>' +

        '<ul class="dl-modal__perks">' +
          '<li><i data-lucide="check" class="w-4 h-4"></i>First 10 tracks free</li>' +
          '<li><i data-lucide="check" class="w-4 h-4"></i>No payment details</li>' +
          '<li><i data-lucide="check" class="w-4 h-4"></i>macOS</li>' +
        '</ul>' +

        '<p class="dl-modal__error" data-dl-error role="alert" aria-live="assertive">' +
          '<i data-lucide="triangle-alert" class="w-4 h-4"></i>' +
          '<span data-dl-error-text></span>' +
        '</p>' +

        /* ---- Schritt 1: E-Mail ---- */
        '<div class="dl-step" data-for="email">' +
          '<p class="dl-modal__lead">' +
            'Enter your email, confirm the code we send, and the download starts ' +
            'right here.' +
          '</p>' +
          '<form class="dl-modal__form" data-dl-email-form novalidate>' +
            '<label class="sr-only" for="dl-email">Email address</label>' +
            '<input id="dl-email" name="email" type="email" autocomplete="email" required ' +
                   'placeholder="you@example.com" class="input">' +
            '<button type="submit" class="btn btn-primary">' +
              '<span><i data-lucide="arrow-down-to-line" class="w-5 h-5"></i>' +
              'Continue</span>' +
            '</button>' +
          '</form>' +
        '</div>' +

        /* ---- Schritt 2: Code ---- */
        '<div class="dl-step" data-for="code">' +
          '<p class="dl-modal__lead">' +
            'We sent a 6-digit code to <strong data-dl-echo></strong>. ' +
            'Enter it below — no need to leave this page.' +
          '</p>' +
          '<form class="dl-modal__form" data-dl-code-form novalidate>' +
            '<label class="sr-only" for="dl-code">6-digit code</label>' +
            '<input id="dl-code" name="code" class="input dl-code" required ' +
                   'inputmode="numeric" autocomplete="one-time-code" ' +
                   'maxlength="6" pattern="[0-9]{6}" placeholder="······">' +
            '<button type="submit" class="btn btn-primary">' +
              '<span><i data-lucide="arrow-down-to-line" class="w-5 h-5"></i>' +
              'Verify &amp; download</span>' +
            '</button>' +
          '</form>' +
          '<p class="dl-modal__alt">' +
            '<button type="button" data-dl-resend>Resend code</button>' +
            '<button type="button" data-dl-restart>Use a different email</button>' +
          '</p>' +
        '</div>' +

        /* ---- Schritt 3: fertig ---- */
        '<div class="dl-step" data-for="done">' +
          '<div class="dl-modal__done">' +
            '<span class="mark"><i data-lucide="check" class="w-6 h-6 stroke-[2.5]"></i></span>' +
            '<p style="font-weight:600;font-size:17px;margin:0 0 6px" data-dl-done-title></p>' +
            '<p style="font-size:14px;color:var(--ink-55);margin:0" data-dl-done-text></p>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(dlg);
    if (window.lucide) window.lucide.createIcons();

    var lastFocus = null;
    var email = '';
    var mode = 'signUp';   // 'signUp' = neuer Account, 'signIn' = Adresse gibt es schon
    var clerkPromise = null;

    var titleEl  = dlg.querySelector('#dl-title');
    var errEl    = dlg.querySelector('[data-dl-error]');
    var errText  = dlg.querySelector('[data-dl-error-text]');
    var emailIn  = dlg.querySelector('#dl-email');
    var codeIn   = dlg.querySelector('#dl-code');

    var TITLES = {
      email: 'Create your account',
      code:  'Check your email',
      done:  'You\'re in'
    };

    // titel ueberschreibt den Standard — gebraucht im Fallback, wo der Nutzer
    // den done-Schritt sieht, ohne verifiziert zu haben.
    function setStep(name, titel) {
      dlg.setAttribute('data-step', name);
      titleEl.textContent = titel || TITLES[name];
      clearError();
    }

    function showError(msg) {
      errText.textContent = msg;
      errEl.classList.add('is-shown');
    }
    function clearError() { errEl.classList.remove('is-shown'); }

    function busy(form, on) {
      var btn = form.querySelector('button[type="submit"]');
      btn.classList.toggle('is-busy', on);
      btn.disabled = on;
    }

    /* Clerk laedt sein eigenes Skript von der Frontend-API, deren Host im
       Publishable Key steckt: pk_live_<base64> decodiert zu "clerk.deine-
       domain.com$". Das "$" am Ende ist ein Trenner von Clerk, kein Teil des
       Hosts. */
    function clerkHost(key) {
      var raw = key.replace(/^pk_(test|live)_/, '');
      return atob(raw).replace(/\$+$/, '');
    }

    /* Zwei Dinge, die hier leicht schiefgehen und beide schon passiert sind:

       1. Ohne Timeout haengt der Spinner bei blockiertem oder langsamem Netz
          minutenlang. Content-Blocker filtern Clerk regelmaessig weg, und ein
          DNS-Fehler braucht je nach Resolver 30 s und mehr. 15 s reichen fuer
          jede gesunde Verbindung.
       2. Die Promise darf im Fehlerfall NICHT zwischengespeichert bleiben —
          sonst liefert jeder weitere Klick sofort dieselbe alte Ablehnung und
          der Nutzer kommt bis zum Reload nicht mehr weiter. Deshalb wird
          clerkPromise bei Misserfolg zurueckgesetzt.                          */
    var CLERK_TIMEOUT_MS = 15000;

    function loadClerk() {
      if (clerkPromise) return clerkPromise;

      clerkPromise = new Promise(function (resolve, reject) {
        var host, fertig = false;
        try { host = clerkHost(DL_CFG.publishableKey); }
        catch (e) { reject(new Error('Publishable key is malformed.')); return; }

        var frist = setTimeout(function () {
          if (fertig) return;
          fertig = true;
          reject(new Error('The sign-up service is taking too long to respond. ' +
                           'If you use a content blocker, allow clerk.com and try again.'));
        }, CLERK_TIMEOUT_MS);

        function scheitern(msg) {
          if (fertig) return;
          fertig = true; clearTimeout(frist);
          reject(new Error(msg));
        }
        function gelingen(clerk) {
          if (fertig) return;
          fertig = true; clearTimeout(frist);
          resolve(clerk);
        }

        var s = document.createElement('script');
        s.src = 'https://' + host + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.setAttribute('data-clerk-publishable-key', DL_CFG.publishableKey);
        s.onload = function () {
          if (!window.Clerk) { scheitern('The sign-up service failed to start.'); return; }
          window.Clerk.load().then(
            function () { gelingen(window.Clerk); },
            function () { scheitern('The sign-up service failed to start.'); }
          );
        };
        s.onerror = function () {
          scheitern('Could not reach the sign-up service. If you use a content ' +
                    'blocker, allow clerk.com and try again.');
        };
        document.head.appendChild(s);
      });

      clerkPromise.catch(function () { clerkPromise = null; });
      return clerkPromise;
    }

    /* Clerk wirft ClerkAPIResponseError mit .errors[]. longMessage ist der
       ausformulierte Satz, message die Kurzform. */
    function readError(err) {
      var first = err && err.errors && err.errors[0];
      if (first) return { code: first.code, text: first.longMessage || first.message };
      return { code: '', text: (err && err.message) || 'Something went wrong. Please try again.' };
    }

    /* Schickt den Code — als neuer Sign-up oder, wenn es die Adresse schon
       gibt, als Sign-in. Beides endet im selben Code-Schritt. */
    async function sendCode(clerk) {
      try {
        var su = await clerk.client.signUp.create({ emailAddress: email });
        await su.prepareEmailAddressVerification({ strategy: 'email_code' });
        mode = 'signUp';
        return;
      } catch (err) {
        var info = readError(err);
        // Adresse existiert schon → derselbe Nutzer will nur nochmal laden.
        if (info.code !== 'form_identifier_exists') throw err;
      }

      var si = await clerk.client.signIn.create({ identifier: email });
      var factor = (si.supportedFirstFactors || []).filter(function (f) {
        return f.strategy === 'email_code';
      })[0];
      if (!factor) {
        throw new Error('This email is already registered. Please open Alpha and sign in there.');
      }
      await si.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      mode = 'signIn';
    }

    async function verifyCode(clerk, code) {
      if (mode === 'signUp') {
        return clerk.client.signUp.attemptEmailAddressVerification({ code: code });
      }
      return clerk.client.signIn.attemptFirstFactor({ strategy: 'email_code', code: code });
    }

    /* Backup-Mail mit dem Downloadlink. Fire and forget — wenn das schiefgeht,
       hat der Nutzer die Datei ja bereits. */
    function sendBackupMail() {
      if (!DL_CFG.notifyEndpoint) return;
      try {
        fetch(DL_CFG.notifyEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        }).catch(function () {});
      } catch (e) { /* egal */ }
    }

    function startDownload() {
      if (!DL_CFG.downloadUrl) return;
      var a = document.createElement('a');
      a.href = DL_CFG.downloadUrl;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function finish() {
      var t = dlg.querySelector('[data-dl-done-title]');
      var p = dlg.querySelector('[data-dl-done-text]');

      if (DL_CFG.downloadUrl) {
        t.textContent = 'Your download is starting';
        p.innerHTML = 'We also emailed the link to <strong></strong>, in case you ' +
                      'need it again. Set your nickname and password the first time ' +
                      'Alpha opens.<br><br>' +
                      '<a href="' + DL_CFG.downloadUrl + '">Download didn\'t start? Get it here.</a>';
        p.querySelector('strong').textContent = email;
        setStep('done');
        sendBackupMail();
        startDownload();
      } else {
        // Kein Artefakt hinterlegt — ehrlich bleiben statt einen toten
        // Download vorzutaeuschen.
        t.textContent = 'You\'re on the list';
        p.textContent = 'Your account is verified. The macOS build isn\'t public ' +
                        'yet — we\'ll email ' + email + ' the moment it is.';
        setStep('done');
        sendBackupMail();
      }
      dlg.querySelector('[data-dl-close]').focus();
    }

    function open(e) {
      if (e) e.preventDefault();
      lastFocus = document.activeElement;
      dlg.querySelector('[data-dl-email-form]').reset();
      dlg.querySelector('[data-dl-code-form]').reset();
      setStep('email');
      dlg.showModal();
      emailIn.focus();
      // Clerk schon mal anstossen, waehrend der Nutzer tippt.
      if (CONFIGURED) loadClerk().catch(function () {});
    }

    function close() {
      dlg.close();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.querySelectorAll('[data-download]').forEach(function (el) {
      el.addEventListener('click', open);
    });

    dlg.querySelectorAll('[data-dl-close]').forEach(function (b) {
      b.addEventListener('click', close);
    });

    // Klick auf den Backdrop schliesst
    dlg.addEventListener('click', function (event) {
      if (event.target !== dlg) return;
      var box = dlg.getBoundingClientRect();
      var drin = event.clientX >= box.left && event.clientX <= box.right &&
                 event.clientY >= box.top && event.clientY <= box.bottom;
      if (!drin) close();
    });

    /* ---- Schritt 1 absenden ---- */
    dlg.querySelector('[data-dl-email-form]').addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!emailIn.checkValidity()) { emailIn.reportValidity(); return; }
      email = emailIn.value.trim();
      clearError();

      // Ohne Clerk-Key bleibt es beim alten Verhalten, damit die Live-Seite
      // durch das Ausrollen nicht kaputtgeht.
      if (!CONFIGURED) {
        var t = dlg.querySelector('[data-dl-done-title]');
        var p = dlg.querySelector('[data-dl-done-text]');
        t.textContent = 'Check your inbox';
        p.textContent = 'We sent a confirmation link to ' + email + '. Click it, ' +
                        'download Alpha, and set your nickname and password when it ' +
                        'first opens.';
        setStep('done', 'Check your email');
        dlg.querySelector('[data-dl-close]').focus();
        return;
      }

      busy(this, true);
      try {
        var clerk = await loadClerk();
        await sendCode(clerk);
        dlg.querySelector('[data-dl-echo]').textContent = email;
        setStep('code');
        codeIn.focus();
      } catch (err) {
        showError(readError(err).text);
      } finally {
        busy(this, false);
      }
    });

    /* ---- Schritt 2 absenden ---- */
    dlg.querySelector('[data-dl-code-form]').addEventListener('submit', async function (event) {
      event.preventDefault();
      var code = codeIn.value.replace(/\D/g, '');
      if (code.length !== 6) { showError('Please enter the 6-digit code from the email.'); return; }
      clearError();

      busy(this, true);
      try {
        var clerk = await loadClerk();
        var res = await verifyCode(clerk, code);
        if (res.status === 'complete') {
          await clerk.setActive({ session: res.createdSessionId });
          finish();
        } else {
          showError('That didn\'t complete. Please request a new code.');
        }
      } catch (err) {
        showError(readError(err).text);
        codeIn.select();
      } finally {
        busy(this, false);
      }
    });

    /* ---- Code erneut senden ---- */
    dlg.querySelector('[data-dl-resend]').addEventListener('click', async function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      clearError();
      try {
        await sendCode(await loadClerk());
        btn.textContent = 'Code sent';
      } catch (err) {
        showError(readError(err).text);
        btn.textContent = 'Resend code';
      }
      // Kurze Sperre, damit der Link nicht zum Mail-Bombardement wird.
      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = 'Resend code';
      }, 30000);
    });

    /* ---- Zurueck zur E-Mail-Eingabe ---- */
    dlg.querySelector('[data-dl-restart]').addEventListener('click', function () {
      setStep('email');
      emailIn.focus();
      emailIn.select();
    });
  }

  /* ------------------------------------------------------------------------
     9. 03 Refine — Demo der Bedienung

     Spielt den echten Ablauf durch: Balken anklicken, anhoeren, im Fortschritt
     vorspulen, den Nachbarn anhoeren, beide tauschen — und dasselbe an einer
     zweiten Stelle des Sets.

     Warum hier und nicht als CSS-Keyframes: die Choreografie hat rund zwanzig
     Schritte an zwei Stellen. Als Keyframes muesste jede Zeigerposition als
     Prozentwert des Containers von Hand gerechnet werden, und jede Aenderung
     an der Balkenzahl oder am Panel-Layout wuerde sie stillschweigend
     verschieben. Hier wird stattdessen die tatsaechliche Position der
     Zielelemente ausgelesen — das stimmt auf jedem Viewport und ueberlebt
     Layoutaenderungen.

     Der Zeiger bewegt sich ueber die CSS-Variablen --rf-x / --rf-y, nicht ueber
     transform direkt: die Klick-Stauchung teilt sich dieselbe
     transform-Eigenschaft und wuerde die Position sonst ueberschreiben.
     ------------------------------------------------------------------------ */
  function initRefineDemo() {
    var panel = document.querySelector('[data-refine-demo]');
    if (!panel || reduceMotion) return;

    var cursor = panel.querySelector('[data-rf-cursor]');
    var bars   = panel.querySelectorAll('[data-rf-bar]');
    var play   = panel.querySelector('[data-rf-play]');
    var track  = panel.querySelector('[data-rf-progress]');
    var fill   = panel.querySelector('[data-rf-fill]');
    var title  = panel.querySelector('[data-rf-title]');
    var meta   = panel.querySelector('[data-rf-meta]');
    if (!cursor || !bars.length || !play || !track || !fill) return;

    // Die vier Balken, an denen etwas passiert — je eine Delle neben einem
    // hohen Nachbarn, damit der Tausch ueberhaupt auffaellt.
    var A1 = 14, A2 = 15, B1 = 5, B2 = 6;

    var TRACKS = {};
    TRACKS[A1] = ['Something for Myself', 'Rampa · 119 BPM · 8A · Intro'];
    TRACKS[A2] = ['Sun Rising', 'Adriatique · 121 BPM · 8A · Peak'];
    TRACKS[B1] = ['Blue Hour', 'Trikk · 117 BPM · 7A · Warm-up'];
    TRACKS[B2] = ['Dial Tone', 'Marbs · 120 BPM · 7A · Build'];

    /* Mittelpunkt eines Elements, relativ zum Panel. fy steuert die Hoehe im
       Element — bei den Balken zielen wir nach oben, weil man dort greift. */
    function pointOf(el, fx, fy) {
      var p = panel.getBoundingClientRect(), r = el.getBoundingClientRect();
      return {
        x: r.left - p.left + r.width  * (fx == null ? 0.5 : fx),
        y: r.top  - p.top  + r.height * (fy == null ? 0.5 : fy)
      };
    }

    function moveTo(pt, ms) {
      cursor.style.transitionDuration = ms + 'ms, 250ms';
      cursor.style.setProperty('--rf-x', pt.x + 'px');
      cursor.style.setProperty('--rf-y', pt.y + 'px');
    }

    function click() {
      cursor.classList.add('is-clicking');
      setTimeout(function () { cursor.classList.remove('is-clicking'); }, 110);
    }

    function select(i) {
      for (var n = 0; n < bars.length; n++) bars[n].classList.remove('is-selected');
      bars[i].classList.add('is-selected');
      if (TRACKS[i] && title && meta) {
        title.textContent = TRACKS[i][0];
        meta.textContent  = TRACKS[i][1];
      }
    }

    /* Abspielen: die Leiste laeuft ueber die angegebene Dauer bis pct. */
    function playTo(pct, ms) {
      fill.style.transitionDuration = ms + 'ms';
      fill.style.width = pct + '%';
    }

    /* Vorspulen: die Leiste springt OHNE Uebergang, sonst sieht es aus wie
       normales Abspielen. Der Reflow dazwischen ist noetig, damit der naechste
       Uebergang wieder greift. */
    function seekTo(pct) {
      fill.classList.add('is-seeking');
      fill.style.width = pct + '%';
      void fill.offsetWidth;
      fill.classList.remove('is-seeking');
    }

    function swap(a, b) {
      var slot = bars[a].getBoundingClientRect().width + 3;   // Balken + gap
      bars[a].classList.add('is-lifted');
      bars[a].style.transform = 'translate(' + slot + 'px, -3px)';
      bars[b].style.transform = 'translate(' + (-slot) + 'px, 0)';
    }

    function resetAll() {
      for (var n = 0; n < bars.length; n++) {
        bars[n].classList.remove('is-selected', 'is-lifted');
        bars[n].style.transform = '';
      }
      seekTo(0);
      if (title && meta) {
        title.textContent = TRACKS[A1][0];
        meta.textContent  = TRACKS[A1][1];
      }
    }

    /* Ein Ort: anklicken, abspielen, zweimal vorspulen, Nachbarn anhoeren,
       tauschen. Beide Stellen laufen durch dieselbe Beschreibung. */
    function ortSchritte(i1, i2, seeks) {
      var s = [];
      s.push([function () { moveTo(pointOf(bars[i1], 0.5, 0.3), 400); }, 420]);
      s.push([function () { click(); select(i1); seekTo(0); }, 220]);
      s.push([function () { moveTo(pointOf(play), 330); }, 350]);
      s.push([function () { click(); playTo(seeks[0] - 18, 620); }, 660]);

      for (var k = 0; k < seeks.length; k++) {
        (function (pct) {
          s.push([function () { moveTo(pointOf(track, pct / 100, 0.5), 300); }, 320]);
          s.push([function () { click(); seekTo(pct); }, 180]);
          s.push([function () { playTo(pct + 8, 360); }, 380]);
        })(seeks[k]);
      }

      s.push([function () { moveTo(pointOf(bars[i2], 0.5, 0.3), 360); }, 380]);
      s.push([function () { click(); select(i2); seekTo(0); playTo(32, 620); }, 700]);
      s.push([function () { moveTo(pointOf(bars[i1], 0.5, 0.25), 340); }, 360]);
      s.push([function () { cursor.classList.add('is-grabbing'); }, 200]);
      s.push([function () {
        swap(i1, i2);
        // Der Zeiger wandert mit dem gegriffenen Balken.
        var slot = bars[i1].getBoundingClientRect().width + 3;
        var pt = pointOf(bars[i1], 0.5, 0.25);
        moveTo({ x: pt.x + slot, y: pt.y }, 380);
      }, 430]);
      s.push([function () { cursor.classList.remove('is-grabbing'); bars[i1].classList.remove('is-lifted'); }, 260]);
      return s;
    }

    var sequence = []
      .concat([[function () { cursor.classList.add('is-on'); }, 260]])
      .concat(ortSchritte(A1, A2, [58, 84]))
      .concat(ortSchritte(B1, B2, [62]))
      .concat([
        [function () { moveTo({ x: panel.offsetWidth + 30, y: panel.offsetHeight * 0.9 }, 480); }, 500],
        [function () { cursor.classList.remove('is-on'); }, 320],
        [function () { resetAll(); }, 900]
      ]);

    var i = 0, timer = null, laeuft = false;

    function step() {
      var s = sequence[i];
      s[0]();
      i = (i + 1) % sequence.length;
      timer = setTimeout(step, s[1]);
    }

    function start() {
      if (laeuft) return;
      laeuft = true;
      i = 0;
      resetAll();
      step();
    }
    function stop() {
      laeuft = false;
      clearTimeout(timer);
      cursor.classList.remove('is-on', 'is-grabbing', 'is-clicking');
      resetAll();
    }

    /* Nur laufen lassen, solange das Panel zu sehen ist — sonst tickt der
       Timer die ganze Seite lang im Hintergrund weiter. */
    function imBild() {
      var r = panel.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      /* Schwelle bewusst niedrig: das Panel ist rund 390px hoch. Bei 0.35
         muessten davon 136px zu sehen sein, was auf einem quer gehaltenen
         Telefon knapp wird — dort liefe die Demo dann nie an. */
      }, { threshold: 0.15 }).observe(panel);

      /* Auffangnetz: der Observer ist der einzige Ausloeser, und wenn er nicht
         meldet, laeuft die Animation NIE. Genau das ist beim Testen passiert.
         Browser stellen IntersectionObserver-Rueckmeldungen zurueck, wenn das
         Dokument gerade nicht gerendert wird (Hintergrundtab, ausgeblendetes
         Fenster) — und in manchen Faellen kommen sie danach nicht nach. Diese
         eine Nachpruefung kostet nichts und macht das Feature unabhaengig
         davon. Der Observer bleibt zustaendig fuers Anhalten beim Wegscrollen. */
      setTimeout(function () { if (!laeuft && imBild()) start(); }, 400);
    } else {
      start();
    }
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
    initDownloadModal();
    initRefineDemo();
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
