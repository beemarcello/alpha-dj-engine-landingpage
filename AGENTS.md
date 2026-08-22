# Briefing: Feature-Dokumentation für die Wissensbasis

Dieses Dokument richtet sich an den **Software-Agent**, der die Features von
Alpha-DJ-Engine dokumentiert. Wenn du dieser Agent bist: lies es vollständig,
bevor du etwas änderst.

---

## 1. Worum es geht

Du dokumentierst jedes Feature der Alpha-DJ-Engine-Software auf einer einzigen
Webseite. Aus dieser Seite wird eine **Vektordatenbank** gebaut, und ein
**AI-Support-Agent** beantwortet damit Kundenanfragen im First-Level-Support.

Dein Leser ist also keine Person, sondern eine Maschine, die deinen Text in
Stücke schneidet und einzeln wieder herausholt. Danach richtet sich alles
Weitere in diesem Dokument.

**Ein Feature, das nicht auf dieser Seite steht, kann nicht supportet werden.**

---

## 2. Repository und Zugang

| | |
|---|---|
| Repository | `beemarcello/alpha-dj-engine-landingpage` (GitHub, public) |
| Branch | `main` — es gibt keinen anderen |
| Hosting | GitHub Pages, direkt aus `main:/` |
| Live-URL | https://alpha-dj-engine.com/knowledgebase/ |

> **Jeder Push auf `main` geht sofort live.** Es gibt keine Staging-Umgebung und
> keinen Review-Schritt. Der Deploy dauert rund 20 bis 60 Sekunden.

Schreibrechte auf das Repository musst du von Marcel bekommen — sie sind in
diesem Dokument nicht enthalten.

---

## 3. Die einzige Datei, die du bearbeitest

```
knowledgebase/index.html
```

Nichts sonst. Konkret bedeutet das:

- **Kein** `npm install`, **kein** Build-Schritt. Du brauchst keine Toolchain.
- **Keine** Änderung an `css/`, `js/`, `assets/`, den anderen `.html`-Dateien,
  `sitemap.xml` oder `robots.txt`.
- **Keine** Änderung an den `?v=`-Nummern in den Script- und Style-Tags. Die
  gelten nur für CSS und JavaScript; HTML wird nicht zwischengespeichert.

Alles, was du zum Formatieren brauchst, existiert bereits als `.kb-*`-Klasse.
**Benutze keine Tailwind-Utility-Klassen** (`text-lg`, `mt-4`, `flex`, …) — die
sind wegoptimiert und würden nur wirken, wenn jemand den CSS-Build ausführt.

---

## 4. Ablauf

```bash
git clone https://github.com/beemarcello/alpha-dj-engine-landingpage.git
cd alpha-dj-engine-landingpage
```

Vor **jedem** Push:

```bash
git pull --rebase origin main
```

Das ist nicht optional. An diesem Repository arbeiten mehrere Beteiligte; ohne
Rebase wird dein Push abgelehnt oder du überschreibst fremde Arbeit.

```bash
git add knowledgebase/index.html
git commit -m "docs(kb): <Feature-Name> dokumentiert"
git push origin main
```

Niemals `git push --force`.

Lokal ansehen (optional, ohne Abhängigkeiten):

```bash
python3 -m http.server 4500
```

Dann http://localhost:4500/knowledgebase/ öffnen.

---

## 5. Die Regeln

Sie stehen auch als Kommentar am Anfang von `knowledgebase/index.html`. Hier
mit Begründung, damit du sie sinnvoll anwenden kannst, statt sie nur zu
befolgen.

### 5.1 Ein Feature = ein `<article class="kb-feature">`

Kopiere die Vorlage aus dem Kommentar unverändert. Erfinde keine eigenen
Klassen, keine eigene Reihenfolge der Blöcke.

### 5.2 Jede `<h3>` wiederholt den Feature-Namen

Das ist die wichtigste Regel.

✅ `<h3>Loudness Leveler settings</h3>`
❌ `<h3>Settings</h3>`

Die Vektordatenbank zerschneidet die Seite in Stücke und ruft sie **einzeln**
ab. Ein Stück mit der Überschrift „Settings" ist beim Abruf wertlos, weil nichts
darin sagt, wovon es handelt. Aus demselben Grund gilt das auch im Fließtext:

✅ „The Loudness Leveler writes a gain tag …"
❌ „It writes a gain tag …"

Lieber sperrig und eindeutig als elegant und mehrdeutig.

### 5.3 Stabile `id`

Kleinbuchstaben mit Bindestrichen: `id="loudness-leveler"`. Die `id` ist die
Zitieradresse des Support-Agents und darf sich **nie** ändern — auch dann nicht,
wenn das Feature umbenannt wird.

### 5.4 Eintrag ins Inhaltsverzeichnis

Jedes Feature bekommt eine Zeile in `<ul class="kb-toc__list">`. Linktext ist
exakt der Feature-Name.

### 5.5 `data`-Attribute füllen

| Attribut | Erlaubte Werte |
|---|---|
| `data-kb-status` | `available` · `beta` · `planned` · `removed` |
| `data-kb-since` | Versionsnummer der Einführung, z. B. `1.2.0` |
| `data-kb-category` | `analysis` · `sequencing` · `export` · `library` · `licensing` · `app` |
| `data-kb-platforms` | z. B. `macOS` |

Sie erlauben der Vektordatenbank, nach Status und Version zu filtern, ohne
Fließtext zu interpretieren. Der sichtbare Badge in `<p class="kb-meta">` muss
denselben Wert zeigen.

### 5.6 Tooltips und UI-Texte wortwörtlich

In `<span class="kb-verbatim">…</span>`.

Kunden schreiben „bei mir steht da …". Nur wenn der Text **exakt** so dasteht,
wie die App ihn zeigt, findet der Support-Agent die Stelle. Nicht glätten, nicht
übersetzen, nicht kürzen — auch Tippfehler und schiefe Formulierungen der App
bleiben unverändert stehen.

### 5.7 Der Block „does not do" ist Pflicht

Er verhindert, dass der Support-Agent Fähigkeiten erfindet. **Was dort nicht
ausgeschlossen ist, wird er im Zweifel behaupten.** Nimm besonders das auf, was
Kunden fälschlich erwarten.

### 5.8 Fragen so formulieren, wie Kunden sie stellen

✅ „Does the Loudness Leveler change my original files?"
❌ „Destructive processing"

Suchanfragen sind Fragen. Überschriften, die wie Fragen klingen, werden
zuverlässiger gefunden.

### 5.9 Nie andere Features löschen oder umsortieren

Nur den eigenen Block hinzufügen oder ändern. Wird ein Feature entfernt, setze
`data-kb-status="removed"` und schreibe dazu, was an seine Stelle tritt —
Kunden mit älteren Versionen fragen weiterhin danach.

### 5.10 Nichts Internes

Die Seite ist **öffentlich abrufbar und wird indexiert**. Nicht verlinkt heißt
nicht privat. Keine Kulanzregeln, keine internen Workarounds, keine
unveröffentlichte Roadmap, keine Preis-Ausnahmen, keine Kundennamen.

---

## 6. Zwei Dinge, die die Seite unbrauchbar machen

**Kein `noindex`, kein `Disallow`.** Der AI-Support-Agent kann nur indexierbare
Seiten crawlen. Wer der Seite ein `noindex` verpasst oder sie in `robots.txt`
sperrt, schaltet damit den kompletten First-Level-Support ab.

**Keine `--` in HTML-Kommentaren.** Zwei aufeinanderfolgende Bindestriche sind
in HTML-Kommentaren unzulässig. Browser verzeihen das, striktere Parser beenden
den Kommentar an dieser Stelle — dann landet auskommentierter Text als echter
Inhalt in der Vektordatenbank. Benutze `=` für Trennlinien.

---

## 7. Sprache

**Englisch**, wie die gesamte Website und die App. Sachlich und knapp, keine
Marketing-Sprache: der Text soll Fragen beantworten, nicht verkaufen.

---

## 8. Prüfliste vor dem Push

- [ ] Jede `<h3>` enthält den Feature-Namen
- [ ] Kein „it" / „this" ohne Bezug im Fließtext
- [ ] `id` gesetzt, eindeutig, in Kleinbuchstaben mit Bindestrichen
- [ ] Zeile im Inhaltsverzeichnis ergänzt
- [ ] Alle vier `data-kb-*`-Attribute gesetzt, Badge zeigt denselben Status
- [ ] Block „What the X does not do" vorhanden und ausgefüllt
- [ ] Block „Common questions about the X" vorhanden
- [ ] Tooltips wortwörtlich, in `<span class="kb-verbatim">`
- [ ] Keine Tailwind-Utility-Klassen verwendet
- [ ] Kein `--` in neu hinzugefügten Kommentaren
- [ ] Nichts außer `knowledgebase/index.html` geändert
- [ ] Nichts Internes im Text
- [ ] `git pull --rebase origin main` ausgeführt

---

## 9. Beim ersten echten Feature

Lösche den Beispiel-Artikel `id="example-feature"` **samt seiner Zeile im
Inhaltsverzeichnis**. Er ist nur eine ausgefüllte Illustration der Struktur und
soll nicht in der Wissensbasis landen.

Entkommentiere außerdem die Kategorie-Überschrift, unter der dein Feature steht
— sie stehen als `<!-- <h2 class="kb-category">…</h2> -->` bereit.
