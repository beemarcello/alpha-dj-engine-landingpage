/* Erzeugt assets/img/usb-spin.svg — Sprite-Streifen mit einem isometrisch
 * rotierenden Pixel-USB-Stick.
 *
 * Hier steht nur noch das MODELL; gerendert wird in src/lib/iso-pixel.mjs,
 * gemeinsam mit build-player-spin.mjs. Dort stehen auch Projektion,
 * Backface-Culling, Tiefensortierung und die Begruendungen dazu.
 *
 * Gleiches Prinzip wie build-horse.mjs: alle Frames nebeneinander in EINER
 * SVG, der Container zeigt eines davon, CSS schiebt den Streifen mit steps()
 * durch (.pixel-spin in css/site.css). Keine GIFs, keine externen Dateien.
 *
 * Warum gerendert und nicht gemalt: ein Objekt, das sich wirklich dreht,
 * braucht pro Frame eine andere Perspektive. Von Hand gesetzte Pixel haetten
 * bei 24 Frames keine Chance, rund zu bleiben.
 *
 * Neu bauen:  npm run build:usb
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSprite } from './lib/iso-pixel.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Palette. Spiegelt css/site.css: Koerper --purple, Stecker --white/--paper.
 * Die Seitentoene sind abgedunkelte Varianten — fuer Schattierung kennt die
 * Palette keine eigenen Tokens. Aendert sich --purple, gehoert das hier mit. */
const BODY  = { top: '#e6cef9', sides: ['#cfaaf0', '#b98fdf', '#9f73c8'] };
const METAL = { top: '#ffffff', sides: ['#dcdcdb', '#c4c4c3', '#ababaa'] };
const DECAL = '#8e8e8d';

/* Modell: Steckergehaeuse + Metallstecker, liegend, Drehachse ist z.
 * x laeuft der Laenge nach, y quer, z hoch.
 *
 * Die x-Werte sind um den Mittelpunkt des GANZEN Objekts verschoben, nicht um
 * den des Gehaeuses — sonst eiert der Stick beim Drehen, statt sich um sich
 * selbst zu drehen.
 *
 * Die Aufdrucke auf dem Stecker sind die Naht quer ueber die Spitze und die
 * zwei Ausstanzungen, die ein USB-A-Stecker oben traegt. Ohne sie ist der
 * Stecker eine leere weisse Flaeche (Marcel, 2026-11-19). */
const SOLIDS = [
  { kind: 'box', x: [-2.2, 5.8], y: [-2.3, 2.3], z: [0, 2.6], c: BODY },
  {
    kind: 'box', x: [-5.8, -2.2], y: [-1.4, 1.4], z: [0.5, 2.1], c: METAL,
    decals: [
      { x: [-5.30, -5.00], y: [-1.10, 1.10], color: DECAL },   // Naht quer, nahe der Spitze
      { x: [-4.45, -3.65], y: [-1.05, -0.25], color: DECAL },  // linke Ausstanzung
      { x: [-4.45, -3.65], y: [0.25, 1.05], color: DECAL },    // rechte Ausstanzung
    ],
  },
];

const FRAMES = 24;          // 24 Schritte = 15 Grad pro Frame
const { svg, W, H } = renderSprite({
  frames: FRAMES,
  scale: 4.0,               // Pixel pro Modelleinheit
  tiltDeg: 14,
  margin: 2,
  solids: SOLIDS,
  outline: '#000000',
  label: 'A pixel USB stick turning slowly',
});

mkdirSync(join(root, 'assets', 'img'), { recursive: true });
writeFileSync(join(root, 'assets', 'img', 'usb-spin.svg'), svg);
console.log(`usb-spin.svg: ${FRAMES} Frames, ${W}x${H}, ${(svg.length / 1024).toFixed(1)} kB`);
console.log(`  -> css/site.css: .pixel-spin--usb  --spin-ratio: ${W} / ${H}, --frames: ${FRAMES}`);
