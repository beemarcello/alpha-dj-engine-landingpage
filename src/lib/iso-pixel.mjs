/* iso-pixel.mjs — winziger Renderer fuer isometrische Pixel-Objekte.
 *
 * Gemeinsame Basis von build-usb-spin.mjs und build-player-spin.mjs. Beide
 * beschreiben nur noch ihr Modell; alles ab hier ist geteilt, damit es nicht
 * zwei Kopien derselben Projektion gibt, die auseinanderlaufen.
 *
 * Verfahren: die Koerper werden um die Hochachse gedreht, isometrisch
 * projiziert und in ein grobes Raster gefuellt. Die Pixeligkeit entsteht durch
 * die niedrige Aufloesung, nicht durch einen Filter.
 *
 * Isometrie: px = (x - y) * cos30, py = (x + y) * sin30 - z. Die Kamera steht
 * damit bei (+inf, +inf, +inf); sichtbar ist jede Flaeche, deren Normale nach
 * (1,1,1) zeigt. Daran haengt das Backface-Culling UND die Tiefensortierung.
 *
 * Koerper:
 *   { kind: 'box', x: [x0,x1], y: [y0,y1], z: [z0,z1], c, decals? }
 *   { kind: 'cyl', cx, cy, r, z: [z0,z1], sides, c, decals? }
 * c = { top, sides: [hell, mittel, dunkel] }.
 *
 * decals sind flache Rechtecke auf der DECKFLAECHE des Koerpers (Aufdrucke,
 * Tasten, Displays). Sie werden NICHT eigenstaendig tiefensortiert, sondern
 * direkt nach der Flaeche gezeichnet, auf der sie kleben (deren depth +
 * Epsilon). Sortierte man sie nach ihrem eigenen Schwerpunkt, verschwaende ein
 * Aufdruck am hinteren Rand unter seiner eigenen Traegerflaeche — und ein
 * Koerper davor verdeckt ihn weiterhin richtig, weil er die Traegerflaeche
 * ueberdeckt.
 */

const COS30 = Math.cos(Math.PI / 6), SIN30 = 0.5;
const DECAL_EPS = 0.004;

/* Die sechs Flaechen eines Quaders als Eckindizes + Normale.
 * Ecken 0..3 = unterer Ring (x0y0, x1y0, x1y1, x0y1), 4..7 = oberer Ring. */
const BOX_FACES = [
  { i: [4, 5, 6, 7], n: [0, 0, 1] },    // oben
  { i: [0, 3, 2, 1], n: [0, 0, -1] },   // unten
  { i: [1, 2, 6, 5], n: [1, 0, 0] },
  { i: [0, 4, 7, 3], n: [-1, 0, 0] },
  { i: [3, 7, 6, 2], n: [0, 1, 0] },
  { i: [0, 1, 5, 4], n: [0, -1, 0] },
];

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** Flaechen eines Frames, hinten zuerst, in Modellkoordinaten projiziert. */
function quadsFor(angle, solids, tilt, project) {
  const quads = [];

  const place = (x, y, z) => {
    const [rx, ry] = rot(x, y, angle);
    return tilt([rx, ry, z]);
  };
  const shade = (c, n, isTop) => {
    if (isTop) return c.top;
    const lit = (n[0] * 0.25 + n[1] * 0.95) / Math.hypot(n[0], n[1], n[2]);
    return c.sides[lit > 0.45 ? 0 : lit > -0.25 ? 1 : 2];
  };
  const push = (pts, fill, depth) =>
    quads.push({ poly: pts.map((p) => project(p[0], p[1], p[2])), fill, depth });
  const mid = (pts) => pts.reduce((s, p) => s + p[0] + p[1] + p[2], 0) / pts.length;

  /** Aufdrucke auf der Deckflaeche, direkt nach ihrer Traegerflaeche. */
  const decalsOn = (solid, zTop, carrierDepth) => {
    for (const d of solid.decals || []) {
      const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([cx, cy]) =>
        place(d.x[cx], d.y[cy], zTop));
      push(pts, d.color, carrierDepth + DECAL_EPS);
    }
  };

  for (const s of solids) {
    if (s.kind === 'cyl') {
      const N = s.sides;
      const ring = (z) => Array.from({ length: N }, (_, k) => {
        const a = (k / N) * Math.PI * 2;
        return place(s.cx + Math.cos(a) * s.r, s.cy + Math.sin(a) * s.r, z);
      });
      const lo = ring(s.z[0]), hi = ring(s.z[1]);

      /* Mantel: je Segment ein Viereck, Normale radial nach aussen. */
      for (let k = 0; k < N; k++) {
        const a = ((k + 0.5) / N) * Math.PI * 2;
        const [nx, ny] = rot(Math.cos(a), Math.sin(a), angle);
        const n = tilt([nx, ny, 0]);
        if (n[0] + n[1] + n[2] <= 0.0001) continue;
        const k2 = (k + 1) % N;
        const pts = [hi[k], hi[k2], lo[k2], lo[k]];
        push(pts, shade(s.c, n, false), mid(pts));
      }

      /* Deckel als N-Eck. Der Rasterizer fuellt beliebige Polygone. */
      const nTop = tilt([0, 0, 1]);
      if (nTop[0] + nTop[1] + nTop[2] > 0.0001) {
        const depth = mid(hi);
        push(hi, s.c.top, depth);
        decalsOn(s, s.z[1], depth);
      }
      continue;
    }

    const corners = [];
    for (const z of s.z) for (const [cy, cx] of [[0, 0], [0, 1], [1, 1], [1, 0]]) {
      corners.push(place(s.x[cx], s.y[cy], z));
    }
    for (const f of BOX_FACES) {
      const [nx, ny] = rot(f.n[0], f.n[1], angle);
      const n = tilt([nx, ny, f.n[2]]);
      if (n[0] + n[1] + n[2] <= 0.0001) continue;          // Rueckseite

      const pts = f.i.map((k) => corners[k]);
      const depth = mid(pts);
      push(pts, shade(s.c, n, f.n[2] === 1), depth);
      if (f.n[2] === 1) decalsOn(s, s.z[1], depth);
    }
  }
  return quads.sort((a, b) => a.depth - b.depth);          // hinten zuerst
}

/** Punkt-in-Polygon, Strahl nach rechts (even-odd). */
function inside(poly, px, py) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * Rendert einen Sprite-Streifen und gibt { svg, W, H } zurueck.
 *
 * @param {object}   o
 * @param {number}   o.frames   Anzahl Frames fuer eine volle Umdrehung
 * @param {number}   o.scale    Pixel pro Modelleinheit
 * @param {number}   o.tiltDeg  feste Neigung um die x-Achse, NACH der Drehung
 * @param {number}   o.margin   Rand im Raster
 * @param {Array}    o.solids   die Koerper (siehe Kopf)
 * @param {string}   o.outline  Farbe der Silhouette
 * @param {string}   o.label    aria-label der SVG
 */
export function renderSprite({ frames, scale, tiltDeg, margin, solids, outline, label }) {
  const project = (x, y, z) => [(x - y) * COS30 * scale, ((x + y) * SIN30 - z) * scale];

  /* Feste Neigung um die x-Achse. Ohne sie stehen einzelne Frames exakt
     achsparallel und wirken flach wie ein Aufriss; mit ihr kippt das Objekt
     beim Drehen leicht, wie ein Kreisel. Dieselbe Matrix gilt fuer Punkte und
     Normalen (Drehungen sind orthogonal, sonst stimmten Culling und
     Schattierung nicht mehr). */
  const t = (tiltDeg * Math.PI) / 180;
  const tilt = ([x, y, z]) => [
    x,
    y * Math.cos(t) - z * Math.sin(t),
    y * Math.sin(t) + z * Math.cos(t),
  ];

  /* Rahmen einmal ueber ALLE Frames messen — je Frame einzeln gerahmt wackelt
     das Objekt beim Drehen im Kasten. */
  const perFrame = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let f = 0; f < frames; f++) {
    const q = quadsFor((f / frames) * Math.PI * 2, solids, tilt, project);
    perFrame.push(q);
    for (const { poly } of q) for (const [x, y] of poly) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const W = Math.ceil(maxX - minX) + 2 * margin + 2;
  const H = Math.ceil(maxY - minY) + 2 * margin + 2;
  const OX = -minX + margin + 1, OY = -minY + margin + 1;

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
          out[y][x] = outline;
      }
    return out;
  }

  /* Erst waagerecht lauflaengenkodieren, dann senkrecht gleiche Laeufe
     zusammenfassen: aus Hunderten 1px hohen Rechtecken werden wenige Bloecke.
     Ohne diesen zweiten Schritt ist die Datei rund doppelt so gross. */
  const runs = new Map();
  const emit = (r, ox) => {
    if (!runs.has(r.c)) runs.set(r.c, []);
    runs.get(r.c).push(`<rect x="${ox + r.x}" y="${r.y}" width="${r.n}" height="${r.h}"/>`);
  };

  for (let f = 0; f < frames; f++) {
    const g = rasterize(perFrame[f]), ox = f * W;
    let open = [];                                  // offene Rechtecke der Vorzeile
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
      for (const o of open) emit(o, ox);             // nicht fortgesetzt -> schreiben
      open = next;
    }
    for (const o of open) emit(o, ox);
  }

  let body = '';
  for (const [color, rects] of runs) body += `<g fill="${color}">${rects.join('')}</g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * frames} ${H}" `
    + `width="${W * frames}" height="${H}" shape-rendering="crispEdges" `
    + `role="img" aria-label="${label}">${body}</svg>\n`;

  return { svg, W, H };
}
