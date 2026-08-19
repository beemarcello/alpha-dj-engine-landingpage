# Alpha-DJ-Engine — Landingpage 2026

One-Pager-Marketing-Website für den **Alpha-DJ-Engine** (Desktop-App, macOS first).
Kein Framework, kein Build-Step: statisches HTML/CSS/JS, direkt deploybar.

---

## Quellen der Wahrheit

| Was | Wo |
|-----|-----|
| **Design System** (Farben, Typo, Radien, Motion) | `AlphaMusicConverter/DESIGN.md` |
| Produkt-Positionierung / USP | `AlphaMusicConverter/research/07-competitive-positioning-usp.md` |
| Produkt-Doku (Features, Architektur, Entscheidungen) | `AlphaMusicConverter/AGENTS.md` |
| Marken-Assets (Logo, Step-Grafiken, Fonts) | `AlphaMusicConverter/research/CI_and_Frames_Logos/` |

> Wenn sich die Palette oder Typo in der Desktop-App ändert: erst `DESIGN.md` nachziehen,
> dann `css/site.css` (Block „2. Tokens"). Website und Produkt sollen identisch aussehen.

---

## Struktur

```
AMC_Landingpage_2026/
├── index.html              Startseite (One-Pager)
├── compatibility.html      „Works with your setup?" — Gerätesuche
├── pricing.html            Preise (Free / Lifetime)
├── terms.html              AGB — Entwurf, trägt noindex
├── withdrawal.html         Widerrufsbelehrung EN + DE — geprüft
├── privacy.html            Datenschutz — Entwurf, trägt noindex
├── imprint.html            Impressum — vollständig
├── robots.txt · sitemap.xml
├── css/
│   ├── site.css            Design-Tokens + Komponenten + Animationen
│   └── tailwind.css        ERZEUGT — npm run build:css
├── js/
│   ├── site.js             CTA, Nav, Energy-Arc, Gerätesuche, Consent, Modal
│   └── icons.js            ERZEUGT — npm run build:icons
├── src/                    Build-Eingaben (tailwind.css, build-icons.mjs)
├── assets/
│   ├── fonts/              Space Grotesk + Doto (selbst gehostet, SIL OFL)
│   ├── logo/               Logo_Alpha_DJ_Engine.png ← aktuelle Wortmarke
│   ├── icons/              favicon.png (aus dem Logo geschnitten)
│   ├── img/                Hero-Foto + og-image.png
│   └── docs/               widerrufsformular.pdf (EN + DE)
├── _drafts/
│   └── generated-page-18.html   Original-Export des Website-Builders (nicht deployen)
└── README.md
```

> **Namenswechsel 2026-08-19:** Das Produkt heisst jetzt **Alpha-DJ-Engine**
> (vorher Alpha Music Converter), Domain `alpha-dj-engine.com`. Umgestellt wurden
> alle Seiten, Rechtstexte, Titel, Meta-Tags, das OG-Bild, das Favicon und das
> Widerrufs-PDF. Der **Ordnername bleibt** `AMC_Landingpage_2026` — Pfade sind
> Infrastruktur, nicht Präsentation.

---

## Build

Die Seite ist statisch und läuft ohne Build. Zwei erzeugte Dateien gibt es trotzdem —
beide sind eingecheckt, du musst also nur bauen, wenn du HTML/JS geändert hast.

```bash
npm install     # einmalig
npm run build   # baut css/tailwind.css und js/icons.js
```

| Datei | Erzeugt aus | Wann neu bauen |
|-------|-------------|----------------|
| `css/tailwind.css` | `src/tailwind.css` + `tailwind.config.js` | wenn du **neue Tailwind-Klassen** in HTML oder JS verwendest — sonst fehlen sie im gepurgten Build |
| `js/icons.js` | `src/build-icons.mjs` + `lucide-static` | wenn du ein **neues `data-lucide`-Icon** verwendest |

Einzeln: `npm run build:css` · `npm run build:icons` · `npm run watch:css`

**Warum lokal statt CDN:** `cdn.tailwindcss.com` und `unpkg.com` hätten die IP-Adresse
jedes Besuchers an Dritte übertragen — ohne Einwilligung derselbe Fehlertyp wie
eingebettete Google Fonts. Die Seite lädt jetzt **keine externen Ressourcen mehr**.

`css/tailwind.css` wird bewusst **nach** `site.css` eingebunden: Die frühere Play-CDN
hängte ihren `<style>` ans Ende des `<head>`, die Kaskade bleibt damit identisch.

Lucide läuft nicht mehr als komplette Bibliothek, sondern als 5 kB grosse Datei mit
genau den 25 verwendeten Icons. `window.lucide.createIcons()` hat dieselbe Signatur wie
vorher, `js/site.js` musste dafür nicht angefasst werden.

> Zwei Icons wurden in neueren Lucide-Versionen umbenannt und im Markup nachgezogen:
> `check-circle-2` → `circle-check-big`, `help-circle` → `circle-help`.

---

## Lokal starten

Reines `file://`-Öffnen funktioniert nicht sauber (die Fonts werden über relative
Pfade geladen). Einen kleinen Server nutzen:

```bash
python3 -m http.server 4500 --directory "/Users/marcelpasternak/Documents/alphabees/Website/Aura_2026/AlphaMusicConverter/AMC_Landingpage_2026"
```

Dann http://localhost:4500 öffnen. In Claude Code liegt dafür ein Eintrag
`amc-landingpage` in `.claude/launch.json` (AlphaTutor-Repo).

> **Cache:** Ohne Build-Step gibt es kein Datei-Hashing, und der Browser hält
> `site.css` / `site.js` hartnäckig fest. Beide sind deshalb in `index.html` mit
> `?v=N` verlinkt — **bei jeder Änderung an diesen Dateien hochzählen**. Sonst
> siehst du deine eigenen Änderungen nicht (bzw. brauchst `Cmd+Shift+R`).

---

## Seitenaufbau

| Anker | Sektion | Farbe |
|-------|---------|-------|
| — | Sticky Nav | transparent → `--paper` beim Scrollen |
| — | Hero (Bild links, Claim + CTA rechts) | weiß |
| — | Pain / Gain („Before Alpha" / „With Alpha") | schwarz / `--purple` |
| `#how-it-works` | Intro „This is how it works" (Typewriter, Doto) | `--paper-2` |
| `#analyze` | 01 Analyze | `--green` |
| `#compose` | 02 Compose (interaktives Energy-Arc-Chart) | `--purple` |
| `#refine` | 03 Refine | `--red` |
| `#export` | 04 Export | `--beige` |
| `#download` | Final CTA „Ready to try?" | schwarz |
| — | Footer | `--paper` |

Die Reihenfolge grün → lila → rot → beige ist das „Ordner"-Motiv aus der App
(`DESIGN.md` §7) — nicht umsortieren.

Die Nav enthält bewusst **keine** Abschnitts-Links, nur Wortmarke + CTA
(Marcel, 2026-08-18). Auf `#how-it-works` zeigt weiterhin der „Watch demo"-Button
im Hero — der Anker muss also bleiben, solange es kein echtes Demo-Video gibt.

---

## Adaptiver CTA (wichtig)

Alpha ist eine Desktop-App. Mobile Besucher können sie nicht installieren, also
zeigen wir ihnen keinen toten Download-Button:

- **macOS-Desktop** → `.cta-mac`: Download-Button
- **alles andere** (Mobile, Windows, Linux, iPad) → `.cta-other`: E-Mail-Capture

Die Umschaltung passiert in `js/site.js::initAdaptiveCta()` über
`pointer: coarse` + Plattform-String (iPadOS meldet sich als `MacIntel`, wird
über den Touch-Check korrekt als Mobile behandelt).

Beide Varianten stehen an **drei** Stellen im Markup: Nav, Hero, Final-CTA.
Wer eine neue CTA-Stelle ergänzt, braucht immer beide `<div>`s mit `hidden`.

---

## Offene Punkte

### A — Entscheidungen (blockieren die Umsetzung)

- [ ] **Domain festlegen.** Wird für `<link rel="canonical">` und die absolute
      `og:image`-URL gebraucht. Beides ist aktuell bewusst leer bzw. relativ.
- [x] ~~Netto oder brutto~~ — entschieden am 2026-08-19: **30 € brutto**, überall
      als „€30 incl. VAT" ausgezeichnet (Startseite, FAQ, Preisseite, beide
      Meta-Descriptions, OG-Bild). Beim Anlegen des Stripe-Produkts muss der Preis
      als *inklusive Steuer* konfiguriert werden, nicht als Nettopreis.
- [ ] **Stripe direkt oder Merchant of Record.** Bei Stripe bleibt Alphabees
      Vertragspartner und trägt alle Verbraucherpflichten selbst. Ein MoR (Paddle,
      Lemon Squeezy, FastSpring) wird rechtlich zum Verkäufer und übernimmt USt.
      und Rückabwicklung. Die Entscheidung ändert Preisseite, Widerrufsbelehrung
      und Impressum-Bezüge.

### B — Zuliefern (extern, nicht im Code lösbar)

- [ ] **Datenschutzerklärung.** `privacy.html` ist ein Gerüst mit sechs offenen
      Blöcken. Trägt `noindex`.
- [ ] **AGB für AMC.** Die Alphalearn-AGB passen nicht — die regeln B2B-Abos,
      AMC ist eine Einmallizenz.
- [x] ~~Widerrufsbelehrung prüfen lassen~~ — juristisch geprüft und freigegeben am
      2026-08-19. `noindex` ist entfernt. Einzig offen: die URL der Widerrufsfunktion
      (Platzhalter in `withdrawal.html`), siehe Block C.
- [ ] **Bildrechte klären.** Die Fotos in `assets/img/` sehen nach Händler-/Stock-
      Produktbildern aus (Dateinamen „gebraucht"; `denon-dj-prime-go_1_DJE0007380-000.webp`
      trägt ein sichtbares „MUSIC STORE professional"-Wasserzeichen). Das eingebundene
      `Denon-DJ-Prime-Go-gebraucht-3-768x768.webp` ist wasserzeichenfrei, die Herkunft offen.
- [ ] **Hero-Bild ab ~1600 px.** Aktuell 768×768, wird per `object-cover` ~1.25×
      hochskaliert. Nicht die 1280er-Variante nehmen — Wasserzeichen.
- [ ] **Release-URL** für den Download (`index.html` Final-CTA + `pricing.html`).
- [ ] **E-Mail-Provider** für das Lead-Capture (`js/site.js::initLeadForms()` ist
      ein Platzhalter ohne Backend).
- [ ] **Demo-Video** (YouTube-ID) für das Modal im Hero. Einbauanleitung steht als
      Kommentar in `index.html` beim `<dialog id="demo-modal">`.

### C — Im Checkout zu bauen (falls Stripe direkt)

- [ ] **§ 356 Abs. 5 BGB:** Pflicht-Checkbox mit Zustimmung zum sofortigen Beginn
      *und* Bestätigung des Widerrufsrecht-Verlusts. Ohne das bleibt 14 Tage
      Widerrufsrecht trotz Download. In Stripe Checkout als Consent abbildbar.
- [ ] **Widerrufsbelehrung vor dem Bestellbutton** platzieren (Footer-Link genügt
      nicht) und nach dem Kauf im **Volltext** in der Bestätigungsmail mitschicken.
- [ ] **Widerrufsbutton** (Pflicht seit 19.06.2026) plus automatische
      Eingangsbestätigung mit Inhalt, Datum und Uhrzeit.
- [ ] **Stripe Tax** aktivieren — löst den EU-Steuersatz nach Käuferland (OSS).

### D — Technik vor Livegang

- [x] ~~Tailwind und Lucide von der CDN lösen~~ — erledigt am 2026-08-19. Die Seite
      lädt **keine externen Ressourcen mehr**; das war zugleich der DSGVO-Blocker in
      der Datenschutzerklärung. Siehe Abschnitt „Build" unten.
- [ ] **Fonts als WOFF2** — aktuell TTF (134 kB + 2× 141 kB), spart grob 60 %.
- [ ] **`noindex` entfernen** auf `privacy.html` und `withdrawal.html`, sobald geprüft.
- [ ] **Geräteliste pflegen:** `js/site.js` → `DEVICES`, `aliases` nicht vergessen.

## Copy — Tonalität

Die Pain-Spalte ist bewusst direkt gehalten („Rekordbox sucks", „Rekordbox to DENON
sucks", „Engine DJ sucks") — von Marcel am 2026-08-18 so bestätigt. Nicht
eigenmächtig entschärfen.

Die Überschriften lauten „Before Alpha" / „With Alpha" (der Builder-Entwurf hatte
dort „Before Alpha I had much pain" / „With Alpha I feel chill" — grammatikalisch
schief, deshalb gekürzt).

Produktsprache ist laut `AGENTS.md` D2 **Englisch** (internationale Zielgruppe).

### Preismodell — steht seit 2026-08-19

- **Gratis:** einmalig die ersten **10 Tracks** analysieren + exportieren (voller
  Funktionsumfang, kein Demo-Modus, keine Kreditkarte).
- **Danach:** **20 €, einmalig.** Lifetime-Lizenz, kein Abo, Updates inklusive.

Achtung: „einmalig 10 Tracks", **nicht** „10 Tracks pro Set". Die alte Builder-Copy
sagte „up to 10 tracks per set" — das ist an allen vier Stellen korrigiert (Hero-Hint
entfernt, Final-CTA, FAQ „Which gear", FAQ „free download" / „What does Alpha cost?").
Wenn sich die Regel ändert, **alle vier** nachziehen — sonst widerspricht sich die Seite.

Damit ist die Entscheidung gefallen, die `AGENTS.md` noch als offene Option führt
(Abo + Cloud-Brain vs. Lifetime-Lizenz) → **Lifetime**. Die `AGENTS.md` im
Software-Repo ist dazu noch nicht aktualisiert (dort darf von hier aus nicht
geschrieben werden).

---

## Was gegenüber dem Builder-Entwurf repariert wurde

- **Doto wurde nie geladen.** Der Entwurf nutzte `font-doto`, verlinkte aber nur
  Space Grotesk — alle Step-Titel fielen auf Monospace zurück.
- **Energy-Arc-Chart war tot.** Das Skript suchte
  `[data-element-id="aura-emsysicsm8szue1se"]`; dieses Attribut existierte im Export
  nicht, also brach es sofort ab und die Sektion blieb leer.
- **Doppelte `id="how-it-works"`** an zwei Sektionen.
- **Off-Palette-Farben** (`#E6BAFD`, `#ecd7ff`, `#cfa5ff`, `slate-50`, `slate-950`)
  auf die Tokens aus `DESIGN.md` normalisiert.
- **Mobile-Nav** brach um (Wortmarke und CTA je zweizeilig).
- Fehlende Meta-Tags, Favicon, `prefers-reduced-motion`, Fokus-Ringe, Skip-Link,
  Form-Labels; Listen als `<ul>` statt `<div>`-Stapel.
