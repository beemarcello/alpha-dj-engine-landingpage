/* ==========================================================================
   build-sitemap.mjs — erzeugt sitemap.xml

   Aufruf:  npm run build:sitemap   (im `npm run build` als LETZTER Schritt,
   damit alle generierten Seiten existieren)

   lastmod je Datei aus der git-Historie — aber aus dem letzten Commit, der
   den INHALT der Seite geaendert hat. Commits, die an einer Seite nur den
   Cache-Buster (?v=NN auf css/site.css oder js/site.js) hochzaehlen, werden
   uebersprungen. Warum das noetig ist: jede Aenderung an CSS oder JS bumpt den
   Buster auf ALLEN 15 Handseiten. Ohne diesen Filter trugen alle 20 Eintraege
   dasselbe Datum, obwohl z.B. imprint.html seit dem 24.08. inhaltlich
   unveraendert ist. Ein falsches lastmod ist schlechter als keines: Google
   lernt daraus, dass die Angabe unzuverlaessig ist, und ignoriert sie kuenftig
   — und dann auch dort, wo sich wirklich etwas geaendert hat.

   Die Bestandsseiten stehen hier fest verdrahtet. Wer eine Seite auf noindex
   stellt, nimmt sie HIER raus — eine noindex-Seite in der Sitemap meldet die
   Search Console als Widerspruch. Aktuell traegt keine Seite noindex, alle
   Bestandsseiten stehen drin. Die generierten Seiten unter usb/ kommen
   automatisch aus dem Dateisystem dazu.
   ========================================================================== */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://alpha-dj-engine.com';

const HEUTE = () => new Date().toISOString().slice(0, 10);
const git = (args) => execFileSync('git', args, { cwd: ROOT }).toString();

/* Eine geaenderte Diff-Zeile, die NUR den Cache-Buster hochzaehlt, z.B.
     -  <script src="js/site.js?v=30" defer></script>
     +  <script src="js/site.js?v=31" defer></script>
   Solche Zeilen sind keine inhaltliche Aenderung der Seite. */
const NUR_CACHE_BUSTER = /(?:css|js)\/[\w.-]+\?v=\d+/;

function lastmod(relPath) {
  try {
    if (git(['status', '--porcelain', '--', relPath]).trim()) return HEUTE();

    const commits = git(['log', '--format=%H %cs', '-40', '--', relPath])
      .trim().split('\n').filter(Boolean)
      .map((z) => { const i = z.indexOf(' '); return { hash: z.slice(0, i), datum: z.slice(i + 1) }; });
    if (!commits.length) return HEUTE();

    for (const c of commits) {
      const geaendert = git(['show', '--unified=0', '--format=', c.hash, '--', relPath])
        .split('\n').filter((z) => /^[+-][^+-]/.test(z));
      // Keine Diff-Zeilen (z.B. reiner Rename) oder mindestens eine echte
      // Inhaltszeile => dieser Commit hat die Seite wirklich veraendert.
      if (!geaendert.length || geaendert.some((z) => !NUR_CACHE_BUSTER.test(z))) return c.datum;
    }
    // Seit dem Anlegen ausschliesslich Cache-Buster-Bumps: aeltester Commit.
    return commits[commits.length - 1].datum;
  } catch { /* kein git verfuegbar → heutiges Datum */ }
  return HEUTE();
}

/* Bestandsseiten in fester Reihenfolge.
   priority ist bewusst konservativ gestaffelt, aber niemand sollte Zeit in die
   Feinjustierung stecken: Google ignoriert priority (und changefreq) seit
   Jahren. Die Werte stehen hier nur, weil sie das Protokoll erlaubt und andere
   Crawler sie gelegentlich lesen. */
const STATIC_PAGES = [
  { loc: '/compatibility.html', file: 'compatibility.html', priority: '0.8' },
  { loc: '/imprint.html', file: 'imprint.html', priority: '0.4' },
  { loc: '/', file: 'index.html', priority: '1.0' },
  { loc: '/features/', file: 'features/index.html', priority: '0.9' },
  { loc: '/pricing.html', file: 'pricing.html', priority: '0.8' },
  {
    loc: '/knowledgebase/', file: 'knowledgebase/index.html', priority: '0.6',
    comment: 'Wissensbasis des AI-Support-Agents. Steht hier drin, weil sie von keiner\n       Seite verlinkt ist — ohne Sitemap-Eintrag wuerde ein Crawler sie nie\n       finden. Muss indexierbar bleiben, sonst kann der Support-Agent sie nicht\n       lesen (Marcel, 2026-08-22).',
  },
  {
    loc: '/terms.html', file: 'terms.html', priority: '0.4',

  },
  { loc: '/withdrawal.html', file: 'withdrawal.html', priority: '0.4' },
  {
    loc: '/privacy.html', file: 'privacy.html', priority: '0.4',

  },
];

/* Generierte Seiten: Hub 0.7, Geraeteseiten 0.6. */
const generated = [];
if (existsSync(join(ROOT, 'usb/index.html'))) {
  generated.push({ loc: '/usb/', file: 'usb/index.html', priority: '0.7' });
  for (const entry of readdirSync(join(ROOT, 'usb'), { withFileTypes: true })) {
    if (entry.isDirectory() && existsSync(join(ROOT, 'usb', entry.name, 'index.html'))) {
      generated.push({ loc: '/usb/' + entry.name + '/', file: 'usb/' + entry.name + '/index.html', priority: '0.6' });
    }
  }
}

const entryXml = (p) =>
  (p.comment ? '  <!-- ' + p.comment + ' -->\n' : '') +
  '  <url>\n' +
  '    <loc>' + ORIGIN + p.loc + '</loc>\n' +
  '    <lastmod>' + lastmod(p.file) + '</lastmod>\n' +
  '    <priority>' + p.priority + '</priority>\n' +
  '  </url>';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  AUTOMATISCH ERZEUGT von src/build-sitemap.mjs — nicht von Hand editieren.
  Neue statische Seiten: in src/build-sitemap.mjs eintragen.
  Generierte Seiten (usb/) kommen automatisch dazu.

  Diese Datei wird in der Google Search Console unter "Sitemaps" eingereicht:
  ${ORIGIN}/sitemap.xml

  lastmod ist der letzte Commit, der den INHALT der jeweiligen Seite geaendert
  hat; reine Cache-Buster-Bumps (?v=NN) zaehlen nicht mit. Uncommittete
  Aenderungen bekommen das heutige Datum.

  Enthalten sind alle indexierbaren Seiten — aktuell traegt keine mehr ein
  noindex. Kaeme wieder eines dazu, muesste die Seite aus STATIC_PAGES in
  src/build-sitemap.mjs raus: eine noindex-Seite in der Sitemap meldet die
  Search Console als Widerspruch.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_PAGES.map(entryXml).join('\n')}
  <!-- Generierte Geraeteseiten (Programmatic SEO), Quelle: data/devices.json -->
${generated.map(entryXml).join('\n')}
</urlset>
`;

writeFileSync(join(ROOT, 'sitemap.xml'), xml);
console.log('✓ sitemap.xml geschrieben: ' + (STATIC_PAGES.length + generated.length) + ' Eintraege (' + generated.length + ' generiert).');
