/* Erzeugt assets/img/usb-spin.svg — Sprite-Streifen mit einem isometrisch
 * rotierenden Pixel-USB-Stick.
 *
 * Gleiches Prinzip wie build-horse.mjs: alle Frames nebeneinander in EINER
 * SVG, der Container zeigt eines davon, CSS schiebt den Streifen mit steps()
 * durch (.usb-spin in css/site.css). Keine GIFs, keine externen Dateien.
 *
 * Warum gerendert und nicht gemalt: ein Objekt, das sich wirklich dreht,
 * braucht pro Frame eine andere Perspektive. Von Hand gesetzte Pixel haetten
 * bei 24 Frames keine Chance, rund zu bleiben. Also steht hier ein winziger
 * Renderer: zwei Quader werden um die Hochachse gedreht, isometrisch
 * projiziert und in ein grobes Raster gefuellt. Die Pixeligkeit entsteht
 * durch die niedrige Aufloesung, nicht durch einen Filter.
 *
 * Isometrie: px = (x - y) * cos30, py = (x + y) * sin30 - z. Die Kamera steht
 * damit bei (+inf, +inf, +inf); sichtbar ist jede Flaeche, deren Normale nach
 * (1,1,1) zeigt. Daran haengt das Backface-Culling UND die Tiefensortierung.
 *
 * Neu bauen:  npm run build:usb
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const FRAMES = 24;          // 24 Schritte = 15 Grad pro Frame
const S = 4.0;              // Pixel pro Modelleinheit
const MARGIN = 2;           // Rand im Raster; W/H werden daraus gerechnet
const COS30 = Math.cos(Math.PI / 6), SIN30 = 0.5;

/* Palette. Spiegelt css/site.css: Koerper --purple, Stecker --white/--paper.
 * Die Seitentoene sind abgedunkelte Varianten — fuer Schattierung kennt die
 * Palette keine eigenen Tokens. Aendert sich --purple, gehoert das hier mit. */
const BODY  = { top: '#e6cef9', sides: ['#cfaaf0', '#b98fdf', '#9f73c8'] };
const METAL = { top: '#ffffff', sides: ['#dcdcdb', '#c4c4c3', '#ababaa'] };
const OUTLINE = '#000000';

/* Modell: Steckergehaeuse + Metallstecker, liegend, Drehachse ist z.
 * x laeuft der Laenge nach, y quer, z hoch.
 * Die x-Werte sind um den Mittelpunkt des GANZEN Objekts verschoben, nicht um
 * den des Gehaeuses — sonst eiert der Stick beim Drehen, statt sich um sich
 * selbst zu drehen. */
const BOXES = [
  { x: [-2.2, 5.8], y: [-2.3, 2.3], z: [0, 2.6], c: BODY  },    // Gehaeuse
  { x: [-5.8, -2.2], y: [-1.4, 1.4], z: [0.5, 2.1], c: METAL }, // Stecker
];

/* Aufdrucke auf der Steckeroberseite: die Naht quer ueber die Spitze und die
 * zwei Ausstanzungen, die ein USB-A-Stecker oben traegt. Ohne sie ist der
 * Stecker eine leere weisse Flaeche (Marcel, 2026-11-19).
 *
 * Sie liegen in der z-Ebene der Steckeroberseite und werden NICHT eigenstaendig
 * tiefensortiert: ein Aufdruck wird direkt nach der Flaeche gezeichnet, auf der
 * er klebt (depth der Traegerflaeche + Epsilon). Sortierte man ihn nach seinem
 * eigenen Schwerpunkt, verschwaende ein Aufdruck am hinteren Rand unter seiner
 * eigenen Traegerflaeche — und ein Gehaeuse davor verdeckt ihn weiterhin
 * richtig, weil es die Traegerflaeche ueberdeckt. */
const DECAL_COLOR = '#8e8e8d';
const DECALS = [
  { x: [-5.30, -5.00], y: [-1.10, 1.10] },   // Naht quer, nahe der Spitze
  { x: [-4.45, -3.65], y: [-1.05, -0.25] },  // linke Ausstanzung
  { x: [-4.45, -3.65], y: [ 0.25, 1.05] },   // rechte Ausstanzung
];
const DECAL_BOX = 1;        // Index in BOXES: der Stecker
const DECAL_EPS = 0.004;

/* Die sechs Flaechen eines Quaders als Eckindizes + Normale.
 * Ecken 0..3 = unterer Ring (x0y0, x1y0, x1y1, x0y1), 4..7 = oberer Ring. */
const FACES = [
  { i: [4, 5, 6, 7], n: [0, 0, 1] },    // oben
  { i: [0, 3, 2, 1], n: [0, 0, -1] },   // unten
  { i: [1, 2, 6, 5], n: [1, 0, 0] },
  { i: [0, 4, 7, 3], n: [-1, 0, 0] },
  { i: [3, 7, 6, 2], n: [0, 1, 0] },
  { i: [0, 1, 5, 4], n: [0, -1, 0] },
];

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const project = (x, y, z) => [(x - y) * COS30 * S, ((x + y) * SIN30 - z) * S];

/* Feste Neigung um die x-Achse, NACH der Drehung angewandt. Ohne sie stehen
 * vier der 24 Frames exakt achsparallel und wirken flach wie ein Aufriss; mit
 * ihr kippt der Stick beim Drehen leicht, wie ein Kreisel. Dieselbe Matrix
 * gilt fuer Punkte und Normalen (Drehungen sind orthogonal, sonst stimmten
 * Culling und Schattierung nicht mehr). */
const TILT = 14 * Math.PI / 180;
const tilt = ([x, y, z]) => [
  x,
  y * Math.cos(TILT) - z * Math.sin(TILT),
  y * Math.sin(TILT) + z * Math.cos(TILT),
];

/** Sichtbare Flaechen eines Frames, hinten zuerst, schon projiziert. */
function quadsFor(angle) {
  const quads = [];
  for (const box of BOXES) {
    const corners = [];
    for (const z of box.z) for (const [cy, cx] of [[0, 0], [0, 1], [1, 1], [1, 0]]) {
      const [rx, ry] = rot(box.x[cx], box.y[cy], angle);
      corners.push(tilt([rx, ry, z]));
    }
    for (const f of FACES) {
      const [nx, ny] = rot(f.n[0], f.n[1], angle);
      const n = tilt([nx, ny, f.n[2]]);
      if (n[0] + n[1] + n[2] <= 0.0001) continue;          // Rueckseite

      const pts = f.i.map((k) => corners[k]);
      const depth = pts.reduce((s, p) => s + p[0] + p[1] + p[2], 0) / pts.length;

      /* Schattierung: Deckel eigener Ton, Seiten nach Lichteinfall in drei
         Stufen. Diskret, nicht weich — sonst sieht es nicht nach Pixeln aus. */
      let fill;
      if (f.n[2] === 1) fill = box.c.top;          // Deckel, auch geneigt
      else {
        const lit = (n[0] * 0.25 + n[1] * 0.95) / Math.hypot(n[0], n[1], n[2]);
        fill = box.c.sides[lit > 0.45 ? 0 : lit > -0.25 ? 1 : 2];
      }
      quads.push({ poly: pts.map((p) => project(p[0], p[1], p[2])), fill, depth });

      if (box === BOXES[DECAL_BOX] && f.n[2] === 1) {
        const zTop = box.z[1];
        for (const d of DECALS) {
          const corners4 = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([cx, cy]) => {
            const [rx, ry] = rot(d.x[cx], d.y[cy], angle);
            return tilt([rx, ry, zTop]);
          });
          quads.push({
            poly: corners4.map((p) => project(p[0], p[1], p[2])),
            fill: DECAL_COLOR,
            depth: depth + DECAL_EPS,
          });
        }
      }
    }
  }
  return quads.sort((a, b) => a.depth - b.depth);          // hinten zuerst
}

/* ---- Rahmen: einmal ueber ALLE Frames messen ----------------------------
   Wird je Frame einzeln gerahmt, wackelt das Objekt beim Drehen im Kasten. */
const perFrame = [];
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (let f = 0; f < FRAMES; f++) {
  const q = quadsFor((f / FRAMES) * Math.PI * 2);
  perFrame.push(q);
  for (const { poly } of q) for (const [x, y] of poly) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
const W = Math.ceil(maxX - minX) + 2 * MARGIN + 2;
const H = Math.ceil(maxY - minY) + 2 * MARGIN + 2;
const OX = -minX + MARGIN + 1, OY = -minY + MARGIN + 1;

/** Punkt-in-Polygon, Strahl nach rechts (even-odd). */
function inside(poly, px, py) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function rasterize(quads) {
  const grid = Array.from({ length: H }, () => Array(W).fill(null));
  for (const q of quads) {
    const poly = q.poly.map(([x, y]) => [x + OX, y + OY]);
    const x0 = Math.max(0, Math.floor(Math.min(...poly.map((p) => p[0]))));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(...poly.map((p) => p[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...poly.map((p) => p[1]))));
    const y1 = Math.min(H - 1, Math.ceil(Math.max(...poly.map((p) => p[1]))));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (inside(poly, x + 0.5, y + 0.5)) grid[y][x] = q.fill;
  }

  /* Silhouette: leeres Pixel mit gefuelltem Nachbarn wird schwarz. Die Seite
     umrandet alles mit 2px Kontur; im Pixelraster ist das genau ein Pixel. */
  const out = grid.map((r) => r.slice());
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (grid[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy]?.[x + dx]))
        out[y][x] = OUTLINE;
    }
  return out;
}

/* ---- Frames zu einem Streifen -------------------------------------------
   Erst waagerecht lauflaengenkodieren, dann senkrecht gleiche Laeufe
   zusammenfassen: aus Hunderten 1px hohen Rechtecken werden wenige Bloecke.
   Ohne diesen zweiten Schritt ist die Datei rund doppelt so gross. */
const runs = new Map();
for (let f = 0; f < FRAMES; f++) {
  const g = rasterize(perFrame[f]), ox = f * W;
  let open = [];                                    // offene Rechtecke der Vorzeile
  for (let y = 0; y < H; y++) {
    const row = [];
    let x = 0;
    while (x < W) {
      const c = g[y][x];
      if (!c) { x++; continue; }
      let n = 1;
      while (x + n < W && g[y][x + n] === c) n++;
      row.push({ x, n, c });
      x += n;
    }
    const next = [];
    for (const r of row) {
      const cont = open.find((o) => o.x === r.x && o.n === r.n && o.c === r.c);
      if (cont) { cont.h++; next.push(cont); open = open.filter((o) => o !== cont); }
      else next.push({ ...r, y, h: 1 });
    }
    for (const o of open) emit(o, ox);               // nicht fortgesetzt -> schreiben
    open = next;
  }
  for (const o of open) emit(o, ox);
}

function emit(r, ox) {
  if (!runs.has(r.c)) runs.set(r.c, []);
  runs.get(r.c).push(`<rect x="${ox + r.x}" y="${r.y}" width="${r.n}" height="${r.h}"/>`);
}

let body = '';
for (const [color, rects] of runs) body += `<g fill="${color}">${rects.join('')}</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * FRAMES} ${H}" `
  + `width="${W * FRAMES}" height="${H}" shape-rendering="crispEdges" `
  + `role="img" aria-label="A pixel USB stick turning slowly">${body}</svg>\n`;

mkdirSync(join(root, 'assets', 'img'), { recursive: true });
writeFileSync(join(root, 'assets', 'img', 'usb-spin.svg'), svg);
console.log(`usb-spin.svg: ${FRAMES} Frames, ${W}x${H}, ${(svg.length / 1024).toFixed(1)} kB`);
console.log(`  -> css/site.css: .usb-spin aspect-ratio ${W} / ${H}, --usb-frames: ${FRAMES}`);
