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

## Knowledgebase (`/knowledgebase/`) — wird von einem Agent befüllt

`knowledgebase/index.html` ist die Wissensbasis des **AI-Support-Agents**. Aus
ihr wird eine Vektordatenbank gebaut; der Agent macht damit First-Level-Support.
Befüllt wird sie vom **Software-Agent**, nicht von Hand — die verbindlichen
Regeln und die Copy-Paste-Vorlage stehen als großer Kommentar direkt am Anfang
der Datei.

Drei Eigenschaften, die leicht kaputtgehen und dann teuer sind:

- **Die Seite MUSS indexierbar bleiben.** Kein `noindex`, kein `Disallow` in
  `robots.txt`. Der Support-Agent kann nur indexierbare Seiten crawlen — ein
  `noindex` schaltet damit den First-Level-Support ab. Aus demselben Grund
  steht sie in der `sitemap.xml`: sie ist von keiner Seite verlinkt und wäre
  sonst für keinen Crawler auffindbar.
- **Jede `<h3>` wiederholt den Feature-Namen** („Loudness Leveler settings",
  nicht „Settings"). Die Vektordatenbank zerschneidet den Text; ein Stück mit
  der Überschrift „Settings" ist beim Abruf wertlos. Dasselbe gilt für „it" im
  Fließtext.
- **Keine `--` in HTML-Kommentaren.** Das ist in HTML unzulässig. Chrome
  verzeiht es, ein strengerer Parser beendet den Kommentar früher — dann landet
  die Vorlage („FEATURE NAME", „Frage, so wie ein Kunde sie stellt?") als echter
  Inhalt in der Vektordatenbank und vergiftet die Antworten des Support-Agents.
  Deshalb sind alle Trennlinien im Anleitungskommentar aus `=`, nicht aus `-`.

Öffentlich heißt öffentlich: nicht verlinkt ist **nicht** privat. Keine
Kulanzregeln, keine internen Workarounds, keine unveröffentlichte Roadmap.

Der Beispiel-Artikel (`id="example-feature"`) ist eine ausgefüllte Illustration
der Struktur und muss gelöscht werden, sobald das erste echte Feature drinsteht
— samt seiner Zeile im Inhaltsverzeichnis.

---

## Download-Flow (wichtig)

Jeder Button mit `data-download` öffnet das Modal aus
`js/site.js::initDownloadModal()`. Drei Schritte in **einem** Dialog, ohne
Seitenwechsel:

| Schritt | Was passiert | Clerk-Aufruf |
|---------|--------------|--------------|
| `email` | Adresse eingeben | `signUp.create` + `prepareEmailAddressVerification({strategy:'email_code'})` |
| `code`  | Sechsstelligen Code eingeben | `signUp.attemptEmailAddressVerification` |
| `done`  | Download startet, Backup-Mail geht raus | `setActive` |

Sichtbar ist immer der Block, dessen `data-for` zum `data-step` des Dialogs
passt — die Umschaltung ist reines CSS.

**Warum Code statt Bestätigungslink.** Der Link zwingt den Nutzer in die Inbox
*und* über einen neuen Tab zurück; der ursprüngliche Tab bleibt verwaist und der
Zustand ist weg. Beim Code bleibt der Nutzer im Modal. Der Inbox-Weg entfällt
damit nicht ganz — E-Mail-Besitz muss belegt werden — aber er schrumpft auf
„Code abholen".

Details, die leicht kaputtgehen:

- **Ein Feld für den Code, nicht sechs.** `autocomplete="one-time-code"` füllt
  sich auf macOS/iOS von selbst aus der Mail-App. Alpha ist ein macOS-Produkt,
  das trifft also die Mehrheit der Nutzer. Sechs Einzelfelder brechen genau
  diese Autofill-Übergabe.
- **Bereits registrierte Adressen.** `signUp.create` wirft dann
  `form_identifier_exists`; der Code fängt das ab und wechselt auf den
  Sign-in-Pfad (`signIn.create` → `prepareFirstFactor`). Ohne das läuft jeder
  wiederkehrende Nutzer in eine Sackgasse.
- **15-Sekunden-Timeout beim Laden von Clerk.** Content-Blocker filtern Clerk
  regelmäßig weg. Ohne Timeout dreht sich der Spinner minutenlang.
- **Die Lade-Promise wird bei Misserfolg zurückgesetzt.** Sonst liefert jeder
  weitere Klick sofort dieselbe alte Ablehnung, und der Nutzer kommt bis zum
  Reload nicht mehr weiter.
- **Ohne `DL_CFG.publishableKey`** fällt das Modal auf das alte
  „wir mailen dir einen Link"-Verhalten zurück. Das ist Absicht: die Live-Seite
  darf durch das Ausrollen nicht kaputtgehen.

---

## Offene Punkte

### A — Entscheidungen (blockieren die Umsetzung)

- [x] ~~Domain festlegen~~ — **alpha-dj-engine.com**, seit 2026-08-19 live auf
      GitHub Pages (`beemarcello/alpha-dj-engine-landingpage`, `main:/`).
      `canonical`, `og:url`, `robots.txt` und `sitemap.xml` zeigen darauf. Die
      `CNAME`-Datei im Repo-Root hält die Domain-Bindung — wird sie gelöscht,
      verliert Pages die Domain und das TLS-Zertifikat. Die Cloudflare-Records
      müssen **DNS only** bleiben (graue Wolke), sonst kann GitHub das
      Zertifikat nicht ausstellen.
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
- [ ] **Release-URL** für den Download → `js/site.js` → `DL_CFG.downloadUrl`.
      Solange leer, endet das Modal ehrlich mit „the macOS build isn't public yet"
      statt einen toten Download zu starten.
- [ ] **E-Mail-Provider** für das Lead-Capture (`js/site.js::initLeadForms()` ist
      ein Platzhalter ohne Backend). Betrifft **drei** Formulare: Hero-Mobil
      (`index.html`), Final-CTA (`index.html`) und die Gerätesuche
      (`js/site.js::initDeviceSearch`).

      Am 2026-08-20 besprochen, **noch nicht entschieden**. Empfehlung war eine
      Listen-Software (Kit / ConvertKit) statt AWS SES: die Seite sagt in
      `privacy.html` Double-Opt-in, Abmeldelink und Nachweis der Einwilligung
      mit Zeitstempel zu (§ 7 UWG, Art. 7 Abs. 1 DSGVO) — genau das gibt es dort
      fertig und ist selbst gebaut der teuerste Teil. SES ist nur Versand, keine
      Listenverwaltung. Falls Kit: **nicht** deren Embed-Skript einbauen, sondern
      aus dem eigenen Formular auf deren Endpunkt posten, sonst lädt die Seite
      wieder ein fremdes Skript.

      In **keinem** Fall darf ein API-Key für SES / SendGrid / Resend ins
      Frontend — auf einer statischen Seite ist alles im Quelltext lesbar.

- [ ] **Mobil-CTA klären.** Der Nav-Button auf Mobil heißt „Get the link", trägt
      aber `data-download` und öffnet damit das Registrierungs-Modal statt der
      E-Mail-Erfassung. Das ist inzwischen halbwegs stimmig — wer sich am Handy
      registriert, bekommt den Link ja per Mail — war aber nicht so geplant.
      Entweder bewusst so lassen und den Text schärfen, oder auf ein
      `data-lead-form` umstellen.

#### Registrierung im Download-Modal — WARTET AUF LASSE

> **Blockiert, Stand 2026-08-26.** Marcel wartet darauf, dass **Lasse** den
> BetterAuth-Endpunkt aufsetzt; erst danach werden die Buttons angeschlossen.
> **Hier bitte nicht weiterbauen**, solange der Endpunkt nicht steht.
>
> **Der Anbieter steht fest: BetterAuth** (Marcel, 2026-08-26). Open Source und
> selbst gehostet — kein Drittanbieter, kein AVV, keine Drittlandsübermittlung.
> Clerk ist damit vom Tisch.
>
> Das Modal ist aber noch gegen Clerk gebaut, und das ist kein Austausch
> gleicher Teile:
>
> | | Clerk (verworfen) | BetterAuth (gesetzt) |
> |---|---|---|
> | Art | gehosteter Dienst | TypeScript-Bibliothek |
> | Braucht Backend | nein | **ja**, eigener Server (baut Lasse) |
> | Frontend | SDK von Clerks Domain nachladen | `fetch` gegen den eigenen Endpunkt, CORS nötig |
> | Datenschutz | US-Auftragsverarbeiter, AVV + SCC | selbst gehostet, kein Drittanbieter |
>
> Der Frontend-Aufwand **sinkt** dadurch: statt des SDK nur ein `fetch`, der
> ganze Drittanbieter-Teil entfällt. Die drei Schritte im Modal
> (E-Mail → Code → Download) bleiben gleich, ebenso Markup und CSS.
> Auszutauschen sind nur `loadClerk`, `sendCode` und `verifyCode` in `js/site.js`.
>
> Dass die Seite auf GitHub Pages statisch liegt, steht dem nicht im Weg — sie
> ruft Lasses Endpunkt per `fetch` auf, egal wo sie selbst liegt. Nötig ist
> lediglich, dass der Endpunkt die Origin per CORS zulässt.
>
> **Erledigt am 2026-08-26:** Der Clerk-Abschnitt in `privacy.html` („Your
> account") ist bereits auf BetterAuth umgeschrieben — er beschrieb sonst eine
> Verarbeitung, die es gar nicht gibt. Der Clerk-Code in `js/site.js` steht noch
> unverändert drin; er ist dormant, solange `DL_CFG.publishableKey` leer ist,
> und wird beim Anschließen ersetzt.

Zum Hintergrund: Seit 2026-08-20 registriert und verifiziert der Nutzer direkt
im Modal, statt einen Link aus der Inbox zu holen (siehe „Download-Flow" weiter
unten). Offen ist — sobald der Anbieter feststeht:

- [ ] **Endpunkt-URL von Lasse** → `js/site.js` → `DL_CFG`. **Solange dort nichts
      steht, bleibt das Modal beim alten „wir mailen dir einen Link"-Verhalten** —
      die Live-Seite geht durch das Ausrollen also nicht kaputt.
- [ ] **`loadClerk` / `sendCode` / `verifyCode` ersetzen** durch `fetch`-Aufrufe
      gegen den BetterAuth-Endpunkt. Markup, CSS und die drei Schritte bleiben.
- [ ] **CORS am Endpunkt** für die Origin der Live-Seite freigeben (heute
      `https://alpha-dj-engine.com`, nach dem Hetzner-Umzug unverändert, solange
      die Domain bleibt).
- [ ] **Sign-up-Strategie E-Mail + Code** (nicht Link, nicht Passwort). Passwort
      und Nickname legt der Nutzer weiterhin erst in der Desktop-App an.
- [ ] **Backup-Mail** mit dem Downloadlink → `DL_CFG.notifyEndpoint`. Bekommt
      `{ email }` gePOSTet. Leer lassen = keine Backup-Mail, der Flow funktioniert
      trotzdem.
- [ ] **Echten Gate-Schutz entscheiden.** Der Download-Link ist eine statische URL:
      wer sie kennt, lädt ohne Account. Die Registrierung ist damit vorerst
      Lead-Erfassung, keine Zugangskontrolle. Für echten Schutz bräuchte es einen
      Endpunkt, der das Clerk-Session-Token prüft und eine kurzlebige signierte URL
      ausstellt — auf GitHub Pages nur mit externem Dienst (z. B. Cloudflare Worker,
      die Domain liegt ohnehin bei Cloudflare).
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

- [x] ~~Tailwind und Lucide von der CDN lösen~~ — erledigt am 2026-08-19. Siehe
      Abschnitt „Build" unten. Das war zugleich der DSGVO-Blocker in der
      Datenschutzerklärung.

      **Einschränkung seit 2026-08-20:** Sobald `DL_CFG.publishableKey` gesetzt ist,
      lädt das Download-Modal Clerk nach — aber **erst beim Klick auf einen
      Download-Button**, nie beim reinen Betrachten der Seite. Wer nicht klickt,
      löst weiterhin keinen einzigen Drittanbieter-Request aus. Das ist bewusst so
      gebaut: das Skript ins `<head>` zu ziehen würde aus dem Modal einen Tracker
      auf jeder Unterseite machen. Nicht verschieben.
- [ ] **Fonts als WOFF2** — aktuell TTF (134 kB + 2× 141 kB), spart grob 60 %.
- [ ] **`noindex` entfernen** auf `privacy.html` und `withdrawal.html`, sobald geprüft.
- [ ] **Geräteliste pflegen:** `js/site.js` → `DEVICES`, `aliases` nicht vergessen.

## Copy — Tonalität

Die Pain-Spalte ist bewusst direkt gehalten („Rekordbox to DENON sucks") — von
Marcel am 2026-08-18 so bestätigt. Nicht eigenmächtig entschärfen. Einzelne Punkte
wurden später gezielt sachlicher gefasst, wo „sucks" zu unspezifisch war
(„Engine DJ sync & library issues", „Time-consuming playlist creation").

### Keine unbelegten Feature-Aussagen

Jede Funktionsaussage auf der Seite muss im Code belegbar sein. Zwei Fälle, die
bereits auffielen:

- **Analyse-Cache — gibt es NICHT.** In der FAQ stand „Analysis results are cached,
  so a track is only ever analyzed once". Falsch: `analyze_file` läuft bei jedem
  Durchgang neu, im Sidecar gibt es keinen Cache im Analysepfad. Der
  `song_key`-Zähler ist idempotent, betrifft aber nur das Free-Limit. Entfernt am
  2026-08-19. `cache_key()` in `contracts.py` ist nur der Mechanismus, kein Store.
Die Duplikaterkennung dagegen **gibt es** (Marcel, 2026-08-19) — im Writer über
`skip_duplicates`, durchgereicht bis in den Sidecar. Meine frühere Notiz, es gäbe
sie nicht, war falsch.

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
