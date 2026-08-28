/* ==========================================================================
   build-sitemap.mjs — erzeugt sitemap.xml

   Aufruf:  npm run build:sitemap   (im `npm run build` als LETZTER Schritt,
   damit alle generierten Seiten existieren)

   lastmod je Datei aus der git-Historie (letzter Commit). Eine Datei mit
   uncommitteten Aenderungen bekommt das heutige Datum — sie wird ja gleich
   committet, das Datum stimmt dann. Ein falsches lastmod ist schlechter als
   keines: Google lernt daraus, dass die Angabe unzuverlaessig ist, und
   ignoriert sie kuenftig.

   Die Bestandsseiten stehen hier fest verdrahtet, mitsamt der Gruende fuer
   Sonderfaelle (siehe Kommentare im XML). privacy.html ist seit 2026-08-28
   dabei: das noindex fiel am 27.08. mit der Finalisierung der Erklaerung
   (Commit 907b4c6). Wer eine Seite wieder auf noindex stellt, nimmt sie HIER
   raus — eine noindex-Seite in der Sitemap meldet die Search Console als
   Widerspruch. Die generierten Seiten unter usb/ kommen automatisch aus dem
   Dateisystem dazu.
   ========================================================================== */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://alpha-dj-engine.com';

function lastmod(relPath) {
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', relPath], { cwd: ROOT }).toString().trim();
    if (dirty) return new Date().toISOString().slice(0, 10);
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', relPath], { cwd: ROOT }).toString().trim();
    if (date) return date;
  } catch { /* kein git verfuegbar → heutiges Datum */ }
  return new Date().toISOString().slice(0, 10);
}

/* Bestandsseiten: Reihenfolge und Prioritaeten wie in der bisherigen
   handgepflegten sitemap.xml. */
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
    comment: 'terms.html ist seit der juristischen Freigabe (2026-08-22) ohne noindex\n       und gehoert damit in die Sitemap.',
  },
  { loc: '/withdrawal.html', file: 'withdrawal.html', priority: '0.4' },
  {
    loc: '/privacy.html', file: 'privacy.html', priority: '0.4',
    comment: 'privacy.html ist seit 2026-08-27 ohne noindex (Erklaerung finalisiert,\n       minimales Setup) und gehoert seither in die Sitemap.',
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

  lastmod aus der git-Historie (letzter Commit je Datei); uncommittete
  Aenderungen bekommen das heutige Datum. Ein falsches lastmod ist schlechter
  als keines: Google lernt daraus, dass die Angabe unzuverlaessig ist, und
  ignoriert sie kuenftig.

  NICHT enthalten: privacy.html. Die Seite traegt noch noindex, solange
  Hosting-AVV und Double-Opt-in offen sind. Eine Seite mit noindex in die
  Sitemap zu schreiben, ist ein Widerspruch, den die Search Console als Fehler
  meldet.
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_PAGES.map(entryXml).join('\n')}
  <!-- Generierte Geraeteseiten (Programmatic SEO), Quelle: data/devices.json -->
${generated.map(entryXml).join('\n')}
</urlset>
`;

writeFileSync(join(ROOT, 'sitemap.xml'), xml);
console.log('✓ sitemap.xml geschrieben: ' + (STATIC_PAGES.length + generated.length) + ' Eintraege (' + generated.length + ' generiert).');
