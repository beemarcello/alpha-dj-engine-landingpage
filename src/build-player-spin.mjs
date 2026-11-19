/* Erzeugt assets/img/player-spin.svg — Sprite-Streifen mit einem isometrisch
 * rotierenden Pixel-DJ-Player (Standalone-Deck mit Jogwheel).
 *
 * Gegenstueck zu build-usb-spin.mjs fuer den Blogbeitrag "Which player is in
 * the booth?". Gerendert wird in src/lib/iso-pixel.mjs; hier steht nur das
 * Modell.
 *
 * Bewusst KEIN konkretes Geraet nachgebaut. Der Beitrag handelt davon, dass
 * sich Modelle unterscheiden — ein erkennbarer CDJ oder Prime waere eine
 * Aussage, die der Text gerade nicht macht, und markenrechtlich unnoetig.
 * Was man sehen soll: Jogwheel, Display, Fader, zwei Tasten. Das genuegt.
 *
 * Neu bauen:  npm run build:player
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSprite } from './lib/iso-pixel.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Palette. Das Geraet ist grau statt lila — die zweite Blogkarte soll sich vom
 * USB-Stick unterscheiden, und Booth-Technik ist nun einmal grau. Die beiden
 * Farbtupfer kommen aus den "hot"-Toenen der Seite (--green-hot, --beige-hot),
 * damit auch dieses Objekt in der Palette bleibt. */
const CASE  = { top: '#8e8e91', sides: ['#7a7a7d', '#646467', '#4e4e51'] };
const WHEEL = { top: '#f2f2f1', sides: ['#dcdcdb', '#c4c4c3', '#a8a8a7'] };
const CAP   = { top: '#d7d7d6', sides: ['#c0c0bf', '#aaaaa9', '#939392'] };

const SCREEN = '#2b3a4a';   // Display
const FADER  = '#cfcfce';   // Pitchfader
const PLAY   = '#5dff7e';   // --green-hot
const CUE    = '#f5aa82';   // --beige-hot

/* Modell: flaches Chassis, Jogwheel mittig, Display hinten, Fader rechts,
 * zwei Tasten vorn. x quer, y in die Tiefe, z hoch; Drehachse ist z.
 * Um (0,0) zentriert, damit die Drehung nicht auswandert.
 *
 * Display, Fader und Tasten sind Aufdrucke auf der Deckflaeche, keine eigenen
 * Koerper: bei rund 3,4 Pixeln je Modelleinheit waere eine Erhebung von 0,2
 * Einheiten weniger als ein Pixel hoch und damit unsichtbar — ein farbiger
 * Fleck liest sich auf dieser Aufloesung besser als echte Geometrie. */
const SOLIDS = [
  {
    kind: 'box', x: [-5, 5], y: [-6, 6], z: [0, 1.3], c: CASE,
    decals: [
      { x: [-3.4, 3.4], y: [-5.4, -2.9], color: SCREEN },   // Display, hinten
      { x: [3.5, 4.5], y: [-1.6, 2.6], color: FADER },      // Pitchfader, rechts
      { x: [-4.5, -3.3], y: [3.5, 4.7], color: PLAY },      // Play
      { x: [-2.5, -1.3], y: [3.5, 4.7], color: CUE },       // Cue
    ],
  },
  /* Jogwheel. 16 Segmente sind der Punkt, an dem der Rand im Raster rund
     wirkt; mit 8 sieht man das Vieleck, ueber 16 kostet es nur Dateigroesse. */
  { kind: 'cyl', cx: 0, cy: 1.4, r: 3.1, z: [1.3, 1.95], sides: 16, c: WHEEL },
  { kind: 'cyl', cx: 0, cy: 1.4, r: 1.0, z: [1.95, 2.15], sides: 12, c: CAP },
];

const FRAMES = 24;          // 24 Schritte = 15 Grad pro Frame
const { svg, W, H } = renderSprite({
  frames: FRAMES,
  scale: 3.4,               // Pixel pro Modelleinheit
  tiltDeg: 14,
  margin: 2,
  solids: SOLIDS,
  outline: '#000000',
  label: 'A pixel DJ player turning slowly',
});

mkdirSync(join(root, 'assets', 'img'), { recursive: true });
writeFileSync(join(root, 'assets', 'img', 'player-spin.svg'), svg);
console.log(`player-spin.svg: ${FRAMES} Frames, ${W}x${H}, ${(svg.length / 1024).toFixed(1)} kB`);
console.log(`  -> css/site.css: .pixel-spin--player  --spin-ratio: ${W} / ${H}, --frames: ${FRAMES}`);
