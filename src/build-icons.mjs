/* Erzeugt js/icons.js aus lucide-static — nur die Icons, die wirklich im
 * Markup vorkommen. Ersetzt die komplette Lucide-Runtime von unpkg.
 * Neu bauen nach dem Hinzufuegen eines Icons:  npm run build:icons        */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Alle data-lucide="..." aus HTML und JS einsammeln.
//
// REKURSIV, und das ist wichtig: frueher wurde nur das Wurzelverzeichnis
// gelesen. Als mit knowledgebase/ der erste Unterordner dazukam, fiel das nicht
// auf, weil dort zufaellig nur Icons vorkamen, die auch in Wurzeldateien
// stehen. Bei features/ flog es dann auf — das dort verwendete "minus" fehlte
// im Bundle, und das <i data-lucide> blieb einfach unersetzt stehen, ohne
// Fehlermeldung im Browser. Wer hier wieder auf eine flache Liste zurueckgeht,
// baut denselben stillen Fehler erneut ein.
function sammle(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const voll = join(dir, name);
    if (statSync(voll).isDirectory()) out.push(...sammle(voll));
    else if (name.endsWith('.html') || name.endsWith('.js')) out.push(voll);
  }
  return out;
}
const files = sammle(root);
const used = new Set();
for (const f of files) {
  for (const m of readFileSync(f, 'utf8').matchAll(/data-lucide="([a-z0-9-]+)"/g)) used.add(m[1]);
}

const iconDir = join(root, 'node_modules', 'lucide-static', 'icons');
const icons = {};
const missing = [];
for (const name of [...used].sort()) {
  try {
    const svg = readFileSync(join(iconDir, name + '.svg'), 'utf8');
    // Nur den Inhalt zwischen den <svg>-Tags behalten; Attribute setzt das Runtime-Skript.
    icons[name] = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '')
                     .replace(/\s+/g, ' ').trim();
  } catch { missing.push(name); }
}
if (missing.length) { console.error('FEHLENDE ICONS:', missing.join(', ')); process.exit(1); }

const out = `/* AUTOMATISCH ERZEUGT von src/build-icons.mjs — nicht von Hand aendern.
 * Enthaelt ${Object.keys(icons).length} Lucide-Icons, lokal statt via unpkg.
 * Lizenz: Lucide, ISC. Neu bauen mit: npm run build:icons
 */
(function () {
  var ICONS = ${JSON.stringify(icons, null, 0)};

  function render(el) {
    var name = el.getAttribute('data-lucide');
    var body = ICONS[name];
    if (!body) { console.warn('Icon fehlt in js/icons.js:', name, '— npm run build:icons'); return; }
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    // Klassen des <i> uebernehmen, damit Groessen-Utilities weiter greifen
    svg.setAttribute('class', 'lucide lucide-' + name + (el.className ? ' ' + el.className : ''));
    svg.innerHTML = body;
    el.replaceWith(svg);
  }

  // Gleiche Signatur wie lucide.createIcons(), damit site.js unveraendert bleibt
  window.lucide = window.lucide || {};
  window.lucide.createIcons = function (root) {
    (root || document).querySelectorAll('i[data-lucide]').forEach(render);
  };
})();
`;
writeFileSync(join(root, 'js', 'icons.js'), out);
console.log('js/icons.js:', Object.keys(icons).length, 'Icons,', (out.length / 1024).toFixed(1), 'kB');
