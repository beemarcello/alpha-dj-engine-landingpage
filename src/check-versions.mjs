/* ==========================================================================
   check-versions.mjs — Cache-Buster-Wache (letzter Schritt in `npm run build`)

   Problem, das hier abgefangen wird: aendert ein Build css/tailwind.css,
   js/site.js oder js/icons.js, ohne dass die ?v=-Nummer auf den Handseiten
   mitgezogen wird, laden gecachte Browser die ALTE Datei — Layout bricht
   nur bei Bestandsbesuchern, lokal sieht alles gut aus. Ist zweimal passiert
   (v18→19 am 31.08., mt-8 danach gleich nochmal).

   Regel: Datei inhaltlich geaendert (gegen git HEAD) UND ?v= in index.html
   unveraendert → Build schlaegt fehl mit Anweisung.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ASSETS = [
  { file: 'css/site.css', re: /css\/site\.css\?v=(\d+)/ },
  { file: 'css/tailwind.css', re: /css\/tailwind\.css\?v=(\d+)/ },
  { file: 'js/site.js', re: /js\/site\.js\?v=(\d+)/ },
  { file: 'js/icons.js', re: /js\/icons\.js\?v=(\d+)/ },
];

function gitShow(path) {
  try { return execFileSync('git', ['show', 'HEAD:' + path], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 }).toString(); }
  catch { return null; }
}

const indexNow = readFileSync(join(ROOT, 'index.html'), 'utf8');
const indexHead = gitShow('index.html');
let failed = false;

for (const a of ASSETS) {
  const head = gitShow(a.file);
  if (head === null || indexHead === null) continue; // kein git → keine Pruefung
  const now = readFileSync(join(ROOT, a.file), 'utf8');
  if (now === head) continue; // Datei unveraendert → ok
  const vNow = (indexNow.match(a.re) || [])[1];
  const vHead = (indexHead.match(a.re) || [])[1];
  if (vNow === vHead) {
    console.error('✗ ' + a.file + ' hat sich geaendert, aber ?v=' + vNow + ' ist noch der alte Stand.');
    console.error('  Gecachte Browser wuerden die alte Datei laden. Fix: ?v= auf allen 9');
    console.error('  Handseiten auf ' + (Number(vNow) + 1) + ' bumpen, dann `npm run build:pages` (generierte');
    console.error('  Seiten uebernehmen die Nummer aus index.html).');
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('✓ Cache-Buster konsistent (alle geaenderten Assets haben eine neue ?v=-Nummer).');
