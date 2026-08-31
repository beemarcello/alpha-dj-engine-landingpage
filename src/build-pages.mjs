/* ==========================================================================
   build-pages.mjs — Programmatic-SEO-Generator

   Rendert aus templates/ + data/ die Geraeteseiten unter usb/<slug>/ sowie
   die Hub-Seite usb/index.html, und erzeugt den DEVICES-Block in js/site.js
   (Kompatibilitaetssuche) aus data/devices.json neu.

   Aufruf:  npm run build:pages   (danach build:css + build:icons!)

   Grundsaetze — bitte nicht aufweichen:
   - Generierte Seiten werden NIE von Hand editiert; jede Aenderung laeuft
     ueber templates/ (alle Seiten), data/pathways.json (eine Export-Familie)
     oder data/devices.json (ein Geraet).
   - Unbekannter Platzhalter = Abbruch mit Fehler. Stilles Leersubstituieren
     wuerde unbemerkt duenne Seiten erzeugen (SEO-Gift).
   - Die ?v=-Cache-Buster werden aus index.html gelesen, damit generierte
     Seiten immer dieselben Versionen referenzieren wie die Handseiten.
   - Geloeschte Geraete raeumen ihr usb/<slug>/-Verzeichnis mit ab — eine
     entfernte Seite darf nicht als Leiche live bleiben.

   Template-Syntax (bewusst minimale Mustache-Teilmenge, null Dependencies):
     {{feld.pfad}}      HTML-escaped einsetzen
     {{{feld}}}         roh einsetzen (fuer HTML-Bloecke aus pathways.json)
     {{#if feld}}...{{/if}}       rendern, wenn truthy (leeres Array = false)
     {{#each liste}}...{{/each}}  je Element rendern, Kontext = Element
     {{this}}           aktuelles Element in einem each
     {{> name}}         templates/partials/<name>.html einfuegen
   ========================================================================== */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://alpha-dj-engine.com';

/* ---------------- Daten laden ---------------- */

const devicesData = JSON.parse(readFileSync(join(ROOT, 'data/devices.json'), 'utf8'));
const pathways = JSON.parse(readFileSync(join(ROOT, 'data/pathways.json'), 'utf8'));
const hub = JSON.parse(readFileSync(join(ROOT, 'data/hub.json'), 'utf8'));
const devices = devicesData.devices;

/* ---------------- Validierung ---------------- */

const errors = [];
const warnings = [];
const slugSet = new Set();

for (const d of devices) {
  if (!d.slug) errors.push('Geraet ohne slug: ' + JSON.stringify(d).slice(0, 60));
  if (slugSet.has(d.slug)) errors.push('Doppelter slug: ' + d.slug);
  slugSet.add(d.slug);
  if (!pathways[d.pathway]) errors.push(d.slug + ': unbekannter pathway "' + d.pathway + '"');
  for (const flag of d.caveatFlags || []) {
    if (!pathways[d.pathway]?.caveats?.[flag]) {
      errors.push(d.slug + ': caveatFlag "' + flag + '" existiert nicht in pathways.' + d.pathway + '.caveats');
    }
  }
}

/* pageDevices = alle Geraete mit Seiten-CONTENT (werden validiert, damit der
   Content jederzeit freigabefaehig ist). releasedDevices = davon die per
   released:true freigegebenen — NUR die werden geschrieben, im Hub verlinkt
   und in der Sitemap gelistet. Gestaffelter Rollout ist Absicht (schlechte
   GSC-Erfahrung mit viel neuem Content auf einmal): Flag umstellen,
   `npm run build`, Diff pruefen, pushen. */
const pageDevices = devices.filter((d) => d.page);
const releasedDevices = pageDevices.filter((d) => d.released === true);
const intros = new Map();
for (const d of pageDevices) {
  for (const field of ['brand', 'model', 'fullName', 'title', 'h1', 'description', 'intro', 'deviceDetail', 'hubMeta', 'primaryKeyword']) {
    if (!d[field]) errors.push(d.slug + ': Pflichtfeld "' + field + '" fehlt oder ist leer');
  }
  if (!Array.isArray(d.quirks) || d.quirks.length < 1) errors.push(d.slug + ': mindestens 1 quirk noetig (Anti-Doorway-Substanz)');
  if (!Array.isArray(d.faq) || d.faq.length < 2) errors.push(d.slug + ': mindestens 2 FAQ-Eintraege noetig (Anti-Doorway-Substanz)');
  if (!Array.isArray(d.facts) || d.facts.length < 2) errors.push(d.slug + ': mindestens 2 facts noetig');
  for (const r of d.related || []) {
    const t = devices.find((x) => x.slug === r);
    if (!t) errors.push(d.slug + ': related-Slug "' + r + '" existiert nicht');
    else if (!t.page) errors.push(d.slug + ': related-Slug "' + r + '" hat keine Seite');
  }
  if (d.intro) {
    if (intros.has(d.intro)) errors.push(d.slug + ': intro ist identisch mit ' + intros.get(d.intro) + ' — jede Seite braucht ein eigenes Intro');
    intros.set(d.intro, d.slug);
  }
}

/* ---------------- Keyword-Abgleich (data/keywords.csv) ---------------- */
/* title-driver-Zeilen (P1/P2, status=mapped) muessen sich in title+h1+
   description der Zielseite wiederfinden — sonst optimiert die Seite an der
   Nachfrage vorbei. Nur Warnung, kein Abbruch: die Tabelle enthaelt bewusst
   auch spekulative Eintraege. */

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const kwPath = join(ROOT, 'data/keywords.csv');
const kwBySlug = new Map();
if (existsSync(kwPath)) {
  const lines = readFileSync(kwPath, 'utf8').trim().split('\n').slice(1);
  for (const line of lines) {
    const cols = line.split(',');
    if (cols.length < 10) continue;
    const row = {
      query: cols[0], language: cols[1], intent: cols[2], volume: cols[3],
      pageType: cols[4], slug: cols[5], role: cols[6], priority: cols[7],
      status: cols[8], notes: cols.slice(9).join(','),
    };
    if (!kwBySlug.has(row.slug)) kwBySlug.set(row.slug, []);
    kwBySlug.get(row.slug).push(row);

    if (row.pageType === 'device' && row.status === 'mapped' && !devices.some((d) => d.slug === row.slug && d.page)) {
      warnings.push('keywords.csv: "' + row.query + '" ist auf Slug "' + row.slug + '" gemappt, aber dafuer gibt es keine Seite');
    }
  }
  for (const d of pageDevices) {
    const rows = kwBySlug.get(d.slug) || [];
    if (!rows.length) warnings.push(d.slug + ': keine Keyword-Zeile in keywords.csv');
    for (const row of rows) {
      if (row.role !== 'title-driver' || row.status !== 'mapped' || row.priority === 'P3') continue;
      const hay = ' ' + norm(d.title + ' ' + d.h1 + ' ' + d.description) + ' ';
      /* Zweite Chance ohne Leerzeichen: "cdj 2000 nxs2" soll den Modellnamen
         "CDJ-2000NXS2" als Treffer werten. */
      const hayJoined = hay.replace(/ /g, '');
      const missing = norm(row.query).split(' ').filter((tok) => !hay.includes(' ' + tok + ' ') && !hayJoined.includes(tok));
      if (missing.length) {
        warnings.push(d.slug + ': title-driver "' + row.query + '" — Woerter fehlen in title/h1/description: ' + missing.join(', '));
      }
    }
  }
}

if (errors.length) {
  console.error('FEHLER — es wurde nichts geschrieben:');
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}

/* ---------------- Cache-Buster aus index.html lesen ---------------- */

const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
function version(pattern, label) {
  const m = indexHtml.match(pattern);
  if (!m) { console.error('FEHLER: ?v= fuer ' + label + ' nicht in index.html gefunden'); process.exit(1); }
  return m[1];
}
const v = {
  siteCss: version(/css\/site\.css\?v=(\d+)/, 'site.css'),
  tailwindCss: version(/css\/tailwind\.css\?v=(\d+)/, 'tailwind.css'),
  iconsJs: version(/js\/icons\.js\?v=(\d+)/, 'icons.js'),
  siteJs: version(/js\/site\.js\?v=(\d+)/, 'site.js'),
};

/* ---------------- Mini-Template-Engine ---------------- */

const partialCache = new Map();
function partial(name) {
  if (!partialCache.has(name)) {
    partialCache.set(name, readFileSync(join(ROOT, 'templates/partials', name + '.html'), 'utf8'));
  }
  return partialCache.get(name);
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function lookup(path, stack) {
  if (path === 'this') return stack[0];
  const parts = path.split('.');
  for (const ctx of stack) {
    if (ctx != null && typeof ctx === 'object' && parts[0] in ctx) {
      let val = ctx;
      for (const p of parts) {
        if (val == null || !(p in val)) return undefined;
        val = val[p];
      }
      return val;
    }
  }
  return undefined;
}

/* Findet zum oeffnenden {{#tag ...}} das passende {{/tag}} (gleiche Sorte
   darf verschachtelt sein) und gibt Body + Endposition zurueck. */
function findBlock(tpl, openEnd, tag, tplName) {
  const openRe = new RegExp('\\{\\{#' + tag + '\\s', 'g');
  const closeRe = new RegExp('\\{\\{\\/' + tag + '\\}\\}', 'g');
  let depth = 1;
  let pos = openEnd;
  while (depth > 0) {
    closeRe.lastIndex = pos;
    const close = closeRe.exec(tpl);
    if (!close) throw new Error(tplName + ': {{/' + tag + '}} fehlt');
    openRe.lastIndex = pos;
    const open = openRe.exec(tpl);
    if (open && open.index < close.index) { depth++; pos = open.index + open[0].length; }
    else { depth--; pos = close.index + close[0].length; if (depth === 0) return { body: tpl.slice(openEnd, close.index), end: pos }; }
  }
}

function render(tpl, stack, tplName) {
  /* Partials zuerst inlinen, dann alles in einem Durchgang verarbeiten. */
  tpl = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => partial(name));

  let out = '';
  let i = 0;
  while (i < tpl.length) {
    const start = tpl.indexOf('{{', i);
    if (start === -1) { out += tpl.slice(i); break; }
    out += tpl.slice(i, start);

    const block = tpl.slice(start).match(/^\{\{#(each|if)\s+([\w.]+|this)\s*\}\}/);
    if (block) {
      const tag = block[1];
      const path = block[2];
      const { body, end } = findBlock(tpl, start + block[0].length, tag, tplName);
      const val = lookup(path, stack);
      if (tag === 'each') {
        if (val !== undefined && !Array.isArray(val)) throw new Error(tplName + ': {{#each ' + path + '}} ist kein Array');
        for (const item of val || []) out += render(body, [item, ...stack], tplName);
      } else if (val && (!Array.isArray(val) || val.length)) {
        out += render(body, stack, tplName);
      }
      i = start + (end - (start + block[0].length)) + block[0].length;
      continue;
    }

    const raw = tpl.slice(start).match(/^\{\{\{\s*([\w.]+|this)\s*\}\}\}/);
    if (raw) {
      const val = lookup(raw[1], stack);
      if (val === undefined) throw new Error(tplName + ': unbekannter Platzhalter {{{' + raw[1] + '}}}');
      out += String(val);
      i = start + raw[0].length;
      continue;
    }

    const simple = tpl.slice(start).match(/^\{\{\s*([\w.]+|this)\s*\}\}/);
    if (simple) {
      const val = lookup(simple[1], stack);
      if (val === undefined) throw new Error(tplName + ': unbekannter Platzhalter {{' + simple[1] + '}}');
      out += esc(val);
      i = start + simple[0].length;
      continue;
    }

    /* '{{' ohne parsebaren Inhalt — bewusst Fehler statt Durchreichen. */
    throw new Error(tplName + ': nicht parsebares "{{" bei Zeichen ' + start + ': ' + tpl.slice(start, start + 40));
  }
  return out;
}

/* ---------------- JSON-LD ---------------- */

const ldScript = (obj) => '<script type="application/ld+json">' + JSON.stringify(obj) + '</script>';

function deviceJsonld(d) {
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_ORIGIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'USB guides', item: SITE_ORIGIN + '/usb/' },
      { '@type': 'ListItem', position: 3, name: d.fullName, item: SITE_ORIGIN + '/usb/' + d.slug + '/' },
    ],
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: d.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  return ldScript(crumbs) + '\n' + ldScript(faq);
}

const hubJsonld = ldScript({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_ORIGIN + '/' },
    { '@type': 'ListItem', position: 2, name: 'USB guides', item: SITE_ORIGIN + '/usb/' },
  ],
});

/* ---------------- Hero-Bilder (assets/img/usb/<slug>.*) ----------------
   Marcel legt Bilder unter assets/img/usb/ ab, benannt nach dem Seiten-Slug
   (z. B. denon-prime-go.webp) bzw. hub.* fuer die Uebersichtsseite. Liegt
   eine Datei da, baut die Seite sie automatisch als Hero unter dem Intro ein
   und nutzt sie als og:image. Fehlt sie, rendert die Seite ohne Bild.
   Breite/Hoehe kommen per `sips` (macOS-Bordmittel) ins Markup, damit das
   Layout beim Laden nicht springt (CLS); schlaegt sips fehl, bleiben die
   Attribute einfach weg. Alt-Text: optionales Feld heroAlt in devices.json,
   sonst der volle Geraetename. */

import { execFileSync } from 'node:child_process';
const HERO_EXTS = ['webp', 'avif', 'jpg', 'jpeg', 'png'];

/* Exakter Dateinamen-Abgleich ueber das Verzeichnis-Listing statt
   existsSync: macOS findet "Numark-Mixstream-Pro.jpg" auch bei Anfrage nach
   "numark-mixstream-pro.jpg" (case-insensitives Dateisystem), GitHub Pages
   aber NICHT — das Bild waere live ein 404. Deshalb: nur exakte Treffer
   zaehlen, Beinahe-Treffer bekommen unten einen Umbenennungs-Hinweis. */
const heroDirFiles = existsSync(join(ROOT, 'assets/img/usb'))
  ? readdirSync(join(ROOT, 'assets/img/usb'))
  : [];

function findHero(name) {
  /* Mehrere Endungen zum selben Slug: gewinnen wuerde stillschweigend die
     erste aus HERO_EXTS — beim Bildtausch (neue Endung, alte Datei bleibt
     liegen) waere das die ALTE. Deshalb hier melden statt raten. */
  const dupes = HERO_EXTS.map((e) => name + '.' + e).filter((f) => heroDirFiles.includes(f));
  if (dupes.length > 1) {
    warnings.push('assets/img/usb/: mehrere Bilder fuer "' + name + '" (' + dupes.join(', ') +
      ') — verwendet wird ' + dupes[0] + '. Ueberfluessige Datei loeschen.');
  }
  for (const ext of HERO_EXTS) {
    const file = name + '.' + ext;
    const rel = 'assets/img/usb/' + file;
    if (heroDirFiles.includes(file)) {
      let width = '', height = '';
      try {
        const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', join(ROOT, rel)]).toString();
        width = (out.match(/pixelWidth: (\d+)/) || [])[1] || '';
        height = (out.match(/pixelHeight: (\d+)/) || [])[1] || '';
      } catch { /* ohne Masse weiterrendern */ }
      return { rel, width, height };
    }
  }
  return null;
}

/* ---------------- Seiten rendern ---------------- */

const deviceTpl = readFileSync(join(ROOT, 'templates/device.html'), 'utf8');
const hubTpl = readFileSync(join(ROOT, 'templates/hub.html'), 'utf8');
let written = 0;

for (const d of releasedDevices) {
  const pw = pathways[d.pathway];
  /* Caveat-Texte des Pfads als letzte quirks anhaengen — so steht der
     "confirm on your own gear"-Vorbehalt garantiert auf jeder Seite, die
     ihn braucht, und ist trotzdem nur einmal definiert. */
  const quirks = [...d.quirks, ...(d.caveatFlags || []).map((f) => pw.caveats[f])];
  const heroFile = findHero(d.slug);
  const hero = heroFile ? {
    src: '../../' + heroFile.rel,
    width: heroFile.width,
    height: heroFile.height,
    alt: d.heroAlt || d.fullName,
  } : null;
  const stepsResolved = pw.steps.map((s) => s.replace(/\{model\}/g, d.model));
  const ctx = {
    root: '../../',
    v,
    hero,
    device: { ...d, quirks },
    pathway: pw,
    stepsResolved,
    /* Prozess-Schaufenster: Titel fix, Texte = die pfadspezifischen Steps
       (bereits mit Modellnamen aufgeloest) — so bleibt der SEO-Text pro
       Geraet einzigartig und die Grafiken erklaeren ihn. */
    processSteps: ['Analyze', 'Compose', 'Refine', 'Export'].map((title, k) => ({
      num: '0' + (k + 1), title, text: stepsResolved[k],
    })),
    processExport: { stick: pw.processStick, done: pw.processDone },
    /* Related nur auf freigegebene Seiten verlinken — ein Link auf eine noch
       nicht existierende Seite waere ein 404. */
    relatedResolved: (d.related || [])
      .map((slug) => devices.find((x) => x.slug === slug))
      .filter((t) => t.released === true)
      .map((t) => ({ slug: t.slug, fullName: t.fullName })),
    page: {
      title: d.title,
      description: d.description,
      canonical: SITE_ORIGIN + '/usb/' + d.slug + '/',
      crumbLeaf: d.model,
      ogImage: heroFile ? SITE_ORIGIN + '/' + heroFile.rel : SITE_ORIGIN + '/assets/img/og-image.png',
      jsonld: deviceJsonld({ ...d, faq: d.faq }),
    },
  };
  const html = render(deviceTpl, [ctx], 'templates/device.html [' + d.slug + ']');
  const dir = join(ROOT, 'usb', d.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  written++;
}

/* Hub-Seite */
{
  const hubHeroFile = findHero('hub');
  const ctx = {
    root: '../',
    v,
    hero: hubHeroFile ? {
      src: '../' + hubHeroFile.rel,
      width: hubHeroFile.width,
      height: hubHeroFile.height,
      alt: 'DJ players Alpha-DJ-Engine prepares USB drives for',
    } : null,
    processSteps: ['Analyze', 'Compose', 'Refine', 'Export'].map((title, k) => ({
      num: '0' + (k + 1), title, text: hub.processSteps[k],
    })),
    processExport: hub.processExport,
    groups: hub.groups.map((g) => ({
      ...g,
      /* Freigegebene Geraete als Links, der Rest als unverlinkte
         "coming soon"-Karten — die Kompatibilitaetsaussage bleibt komplett,
         aber es entsteht kein Crawl-Pfad zu unveroeffentlichten Seiten. */
      devices: releasedDevices.filter((d) => d.pathway === g.pathway).map((d) => ({
        slug: d.slug, fullName: d.fullName, hubMeta: d.hubMeta,
      })),
      comingSoon: pageDevices.filter((d) => d.pathway === g.pathway && d.released !== true).map((d) => ({
        fullName: d.fullName, hubMeta: d.hubMeta,
      })),
    })),
    page: {
      title: hub.title,
      description: hub.description,
      canonical: hub.canonical,
      ogImage: hubHeroFile ? SITE_ORIGIN + '/' + hubHeroFile.rel : SITE_ORIGIN + '/assets/img/og-image.png',
      jsonld: hubJsonld,
    },
  };
  writeFileSync(join(ROOT, 'usb/index.html'), render(hubTpl, [ctx], 'templates/hub.html'));
  written++;
}

/* ---------------- Verwaiste Seiten entfernen ---------------- */

const expected = new Set(releasedDevices.map((d) => d.slug));
for (const entry of readdirSync(join(ROOT, 'usb'), { withFileTypes: true })) {
  if (entry.isDirectory() && !expected.has(entry.name)) {
    rmSync(join(ROOT, 'usb', entry.name), { recursive: true });
    console.log('  ✗ verwaist entfernt: usb/' + entry.name + '/');
  }
}

/* ---------------- DEVICES-Block in js/site.js neu erzeugen ---------------- */

const BEGIN = '/* BEGIN GENERATED DEVICES (aus data/devices.json — dort aendern, dann `npm run build:pages`) */';
const END = '/* END GENERATED DEVICES */';
const sitePath = join(ROOT, 'js/site.js');
const siteJs = readFileSync(sitePath, 'utf8');
const b = siteJs.indexOf(BEGIN);
const e = siteJs.indexOf(END);
if (b === -1 || e === -1) {
  console.error('FEHLER: Marker fuer den generierten DEVICES-Block fehlen in js/site.js.');
  console.error('Erwartet:\n  ' + BEGIN + '\n  ...\n  ' + END);
  process.exit(1);
}

const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const deviceLines = devices.map((d) => {
  const pw = pathways[d.pathway];
  const meta = d.metaOverride || pw.metaLine;
  const note = d.compatNote || ((d.caveatFlags || []).length ? pw.searchNote : '');
  const parts = [
    'name: ' + q(d.fullName),
    "status: 'yes'",
    'meta: ' + q(meta),
    'aliases: [' + d.aliases.map(q).join(', ') + ']',
  ];
  if (note) parts.push('note: ' + q(note));
  if (d.released === true) parts.push('url: ' + q('usb/' + d.slug + '/'));
  return '    { ' + parts.join(',\n      ') + ' },';
});
const generated = BEGIN + '\n  var DEVICES = [\n' + deviceLines.join('\n') + '\n  ];\n  ' + END;
writeFileSync(sitePath, siteJs.slice(0, b) + generated + siteJs.slice(e + END.length));

/* ---------------- Zusammenfassung ---------------- */

console.log('✓ ' + written + ' Seiten geschrieben (' + releasedDevices.length + ' von ' + pageDevices.length + ' Geraeten freigegeben + Hub), DEVICES-Block in js/site.js aktualisiert.');
const unreleased = pageDevices.filter((d) => d.released !== true);
if (unreleased.length) {
  console.log('  Noch nicht freigegeben (released:false): ' + unreleased.map((d) => d.slug).join(', '));
}
const missingHero = releasedDevices.filter((d) => !findHero(d.slug)).map((d) => d.slug);
if (!findHero('hub')) missingHero.unshift('hub');
if (missingHero.length) {
  console.log('  Ohne Hero-Bild (assets/img/usb/<name>.webp|jpg|png ablegen): ' + missingHero.join(', '));
}
/* Beinahe-Treffer melden: gleiche Buchstaben, falscher Name/Case. */
for (const slug of [...missingHero]) {
  /* Nur echte Schreibweisen-Varianten melden (Gross-/Kleinschreibung,
     Trennzeichen, Marken-Praefix) — NICHT jede Datei derselben Marke, sonst
     schlaegt die Warnung bei einem Alternativ-Foto faelschlich an. */
  const key = (x) => x.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]/g, '');
  const near = heroDirFiles.find((f) => !f.startsWith('.') && key(f) === key(slug));
  if (near) {
    console.log('  ⚠ "' + near + '" sieht nach ' + slug + ' aus — bitte exakt in "' + slug + '.<ext>" umbenennen (GitHub Pages ist case-sensitiv).');
  }
}
console.log('  Cache-Buster aus index.html: site.css v' + v.siteCss + ', tailwind v' + v.tailwindCss + ', icons v' + v.iconsJs + ', site.js v' + v.siteJs);
if (warnings.length) {
  console.log('Warnungen (' + warnings.length + '):');
  for (const w of warnings) console.log('  ⚠ ' + w);
}
console.log('Nicht vergessen: npm run build:css && npm run build:icons (Tailwind-Purge + Icon-Scan über die neuen Seiten).');
