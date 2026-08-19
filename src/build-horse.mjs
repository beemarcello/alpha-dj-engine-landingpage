/* Erzeugt assets/img/horse-gallop.svg — Sprite-Streifen mit 8 Galopp-Frames.
 *
 * Der Rumpf stammt 1:1 aus der Wortmarke (19x9-Raster, 2x hochskaliert), die
 * Beine werden pro Frame aus handgesetzten Posen gezeichnet.
 *
 * Blickrichtung: Kopf LINKS, Schweif RECHTS — vorwaerts ist -x. Wer die Posen
 * spiegelt, muss die Vorzeichen drehen.
 *
 * Gangfolge (Transversalgalopp, 4 Schlaege): Hinterhand einzeln, diagonales
 * Paar, fuehrende Vorhand, dann SCHWEBEPHASE mit ANGEZOGENEN Beinen. Die
 * gestreckte "Schaukelpferd"-Pose in der Luft waere falsch (Muybridge 1878).
 *
 * VERWORFEN (2026-08-19): Kopf und Schweif wurden zeitweise mitbewegt — Kopf
 * auf einer Ellipse, Schweif als Scherwelle. Im direkten Vergleich wirkte das
 * unruhiger als der starre Kopf; Marcel hat sich fuer diese Fassung
 * entschieden. Nicht erneut einbauen, ohne es wieder gegenzustellen.
 *
 * Neu bauen:  npm run build:horse
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BODY = [
  '..#................',
  '..###..............',
  '.######............',
  '########...........',
  '##..#####.....###..',
  '....##############.',
  '....##########..###',
  '....##########.....',
  '....###...####.....',
];

const SCALE = 2;
const PAD_LEFT = 1, PAD_RIGHT = 1;      // Platz fuer vorgreifenden Hals und Schweifausschlag
const LOGO_W = 19;
const COLS = (LOGO_W + PAD_LEFT + PAD_RIGHT) * SCALE;
const ROWS = 34, FRAMES = 8;
const BODY_TOP = 2;

const SHOULDER = { near: (5+PAD_LEFT)*SCALE, far: (3+PAD_LEFT)*SCALE };
const HIP      = { near: (12+PAD_LEFT)*SCALE, far: (14+PAD_LEFT)*SCALE };

const FORE = {
  reach: { k: [-3, 5], f: [-8,  8] },
  plant: { k: [ 0, 6], f: [-2, 13] },
  push:  { k: [ 3, 6], f: [ 8, 10] },
  fold:  { k: [-3, 4], f: [ 1,  7] },
};
const HIND = {
  reach: { k: [-2, 5], f: [-5, 10] },
  plant: { k: [ 2, 6], f: [ 0, 13] },
  push:  { k: [ 5, 6], f: [12,  8] },
  fold:  { k: [ 3, 4], f: [-2,  7] },
};

const CYCLE = [
  { bob: 0, fn: 'fold',  ff: 'fold',  hn: 'fold',  hf: 'fold' },
  { bob: 0, fn: 'fold',  ff: 'fold',  hn: 'fold',  hf: 'reach' },
  { bob: 1, fn: 'reach', ff: 'fold',  hn: 'reach', hf: 'plant' },
  { bob: 2, fn: 'reach', ff: 'plant', hn: 'plant', hf: 'push' },
  { bob: 2, fn: 'plant', ff: 'plant', hn: 'push',  hf: 'push' },
  { bob: 1, fn: 'plant', ff: 'push',  hn: 'push',  hf: 'fold' },
  { bob: 1, fn: 'push',  ff: 'reach', hn: 'fold',  hf: 'fold' },
  { bob: 0, fn: 'fold',  ff: 'reach', hn: 'fold',  hf: 'fold' },
];


function dot(grid, x, y) {
  for (let dy = 0; dy < SCALE; dy++)
    for (let dx = 0; dx < SCALE; dx++) {
      const px = x+dx, py = y+dy;
      if (py >= 0 && py < ROWS && px >= 0 && px < COLS) grid[py][px] = '#';
    }
}

function line(grid, x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1-x0), sx = x0<x1 ? 1 : -1;
  const dy = -Math.abs(y1-y0), sy = y0<y1 ? 1 : -1;
  let err = dx+dy;
  for (;;) {
    dot(grid, x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2*err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function leg(grid, jx, jy, pose) {
  const kx = jx + pose.k[0], ky = jy + pose.k[1];
  const fx = jx + pose.f[0], fy = jy + pose.f[1];
  line(grid, jx, jy, kx, ky);
  line(grid, kx, ky, fx, fy);
}

function frame(i, still = false) {
  const c0 = CYCLE[i];
  // Vergleichsvariante: Beine und bob wie gehabt, Kopf und Schweif unbewegt.
  const c = still ? { ...c0 } : c0;
  const p = i / FRAMES;
  const grid = Array.from({length: ROWS}, () => Array(COLS).fill('.'));
  const top = BODY_TOP + c.bob*SCALE;
  const jy  = top + BODY.length*SCALE - SCALE;

  /** Logo-Zelle als SCALExSCALE-Block. */
  const cell = (x, y) => dot(grid, (x + PAD_LEFT)*SCALE, top + y*SCALE);

  // --- Ferne Beine hinter den Rumpf ---------------------------------------
  leg(grid, HIP.far,      jy, HIND[c.hf]);
  leg(grid, SHOULDER.far, jy, FORE[c.ff]);

  // --- Rumpf samt Kopf und Schweif, unveraendert aus der Wortmarke ----------
  for (let y = 0; y < BODY.length; y++)
    for (let x = 0; x < LOGO_W; x++)
      if (BODY[y][x] === '#') cell(x, y);

  // --- Nahe Beine davor ----------------------------------------------------
  leg(grid, HIP.near,      jy, HIND[c.hn]);
  leg(grid, SHOULDER.near, jy, FORE[c.fn]);
  return grid;
}

let rects = '';
for (let i = 0; i < FRAMES; i++) {
  const g = frame(i), ox = i*COLS;
  for (let y = 0; y < ROWS; y++) {
    let run = 0;
    for (let x = 0; x <= COLS; x++) {
      const on = x < COLS && g[y][x] === '#';
      if (on) { run++; continue; }
      if (run) { rects += `<rect x="${ox+x-run}" y="${y}" width="${run}" height="1"/>`; run = 0; }
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COLS*FRAMES} ${ROWS}" `
+ `width="${COLS*FRAMES}" height="${ROWS}" shape-rendering="crispEdges" fill="#000" `
+ `role="img" aria-label="Galloping pixel horse">${rects}</svg>\n`;

writeFileSync(join(root, 'assets', 'img', 'horse-gallop.svg'), svg);
console.log(`horse-gallop.svg: ${FRAMES} Frames, ${COLS}x${ROWS}, ${(svg.length/1024).toFixed(1)} kB`);
