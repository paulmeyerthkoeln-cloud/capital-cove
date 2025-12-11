# Capital Cove - Game Design & Didaktik-Dokumentation

## Übersicht

**Genre:** Serious Game / Wirtschaftssimulation
**Zielgruppe:** Schüler:innen ab 10. Klasse (Wirtschaft, Geographie, Politik)
**Spielzeit:** 30-45 Minuten
**Plattform:** Web (Tablets & Desktop)
**Thema:** Wirtschaftskreisläufe, Kreditwirtschaft, ökologische Grenzen

---

## Didaktische Zielsetzung

### Hauptlernziele

1. **Wirtschaftskreislauf verstehen**
   - Ausgaben des einen sind Einnahmen des anderen
   - Geld zirkuliert, es wird nicht "verbraucht"
   - Sparmaßnahmen können kontraproduktiv sein (Paradox der Sparsamkeit)

2. **Kreditdynamiken erleben**
   - Kredite ermöglichen kurzfristiges Wachstum
   - Zinslasten können zu Zwangsinvestitionen führen
   - Refinanzierung verschärft oft das Grundproblem

3. **Ökologische Grenzen erkennen**
   - Technologischer Fortschritt kann Ressourcen zerstören
   - Kurzfristiges Wachstumsdenken vs. Nachhaltigkeit
   - Kipppunkte in natürlichen Systemen

4. **Systemisches Denken fördern**
   - Feedback-Schleifen erkennen (positiv & negativ)
   - Verzögerte Auswirkungen von Entscheidungen
   - Trade-offs zwischen ökonomischen und ökologischen Zielen

---

## Narrative Struktur

### Setting

Eine kleine Fischerinsel mit **4 Charakteren**:
- **Kapitän** (Spieler) - Besitzt das Fischerboot
- **Mo** - Tavernenwirt, kauft Fisch für Gäste
- **Kian** - Werftbesitzer, repariert Boote
- **Lale** - Buchhalterin im Kontor (HQ), neutrale Beobachterin
- **Sterling** - Bankier vom Festland (erscheint in Kapitel 1)
- **Rani** - Meeresbiologin (erscheint in Kapitel 4)

### Dramaturgie: 7-Akt-Struktur

Das Spiel folgt einer klassischen Tragödie mit zunehmender Eskalation:

```
Wohlstand
    │
    │ ╭─ K2: BOOM
    │╱
────┼──────── K0: TUTORIAL (Gleichgewicht)
    │╲
    │ ╲
    │  ╰─ K1: STAGNATION (Sparen)
    │    ╲
    │     ╰─ K3: CRUNCH (Rezession)
    │       ╲
    │        ╰─ K4: GROWTH TRAP
    │          ╲
    │           ╰─ K5: EFFICIENCY
    │             ╲
    │              ╰─ K6: CANNIBALIZATION
    │                ╲
    │                 ╰─ K7: COLLAPSE
    V
Kollaps
```

---

## Kapitelverlauf & Didaktik

### **Kapitel 0: Der perfekte Kreis** (Tutorial)

**Lernziel:** Wirtschaftskreislauf als geschlossenes System verstehen

#### Spielmechanik
- 3 Fahrten mit dem **Ruderboot**
- Jede Fahrt: 50 Fische fangen, 50 Gold einnehmen, 50 Gold ausgeben
- Startkapital: 100 Gold
- Endkapital: 100 Gold (Nullsumme)

#### Narrative Beats
1. **Boot startet** → Fisch fangen
2. **Einnahmen:**
   - Mo kauft 30 Gold Fisch (für Taverne)
   - Kian kauft 20 Gold Fisch (Privatbedarf)
3. **Ausgaben:**
   - Kian: 30 Gold Reparatur
   - Mo: 20 Gold Verpflegung der Crew
4. **Lale erklärt:** "100 → 150 → 100. Geld ist zurück. Niemand hat gewonnen, niemand verloren."

#### Didaktischer Mechanismus
- **Münzanimationen:** Goldmünzen "fliegen" visuell von Person zu Person
- **Kreislaufdiagramm:** Am Ende des Kapitels wird visualisiert:
  ```
  Käpt'n (100g)
     │ Einnahmen ↓
  Mo (30g) + Kian (20g)
     │ Ausgaben ↑
  Käpt'n (100g) ← Kreis geschlossen
  ```
- **Erkenntnismoment:** "Ausgaben sind Einkommen anderer Leute"

---

### **Kapitel 1: Der Stillstand** (Stagnation)

**Lernziel:** Paradox der Sparsamkeit erleben

#### Auslöser
- **Sterling** erscheint vom Festland
- Fordert "Wachstum statt Stillstand"
- Verlangt Kauf eines **Motorboots** (200 Gold)

#### Problem
- Motorboot kostet 200 Gold
- Spieler hat nur 100 Gold
- Kian vergibt keinen Kredit

#### Sparmaßnahme (Sparbuch)
Im **Kontor (HQ)** öffnet sich ein Interface:
- Lohnkürzungen für Mo: 30g → 20g
- Lohnkürzungen für Kian: 20g → 5g
- Ziel: 200 Gold ansparen

#### Konsequenz (nach 2-3 Fahrten)
1. **Trip 1:** Mo sagt "Du hast an uns gespart – jetzt haben wir weniger Geld." 💸
2. **Trip 2:**
   - Kian entlässt Werftarbeiter (visuell sichtbar)
   - Mo: "Werftcrew bleibt weg. Weniger Gäste, weniger Fisch."
3. **Trip 3:**
   - Mo & Kian kaufen **keinen** Fisch mehr (0 Einnahmen)
   - Lale: "Der Kreislauf ist zusammengebrochen."

#### Kreislaufdiagramm "Broken"
```
Käpt'n spart
   ↓ Löhne ↓
Mo & Kian verarmen
   ↓ Kaufkraft ↓
Niemand kauft Fisch
   ↓ Einnahmen ↓
Käpt'n kann nicht sparen ← Teufelskreis
```

#### Didaktischer Mechanismus
- **Show, don't tell:** Spieler erlebt die Rezession aktiv
- **Feedback-Schleife:** Sparen → Kaufkraftverlust → Umsatzeinbruch
- **Kein Moralisieren:** Sterling wird nicht als "Bösewicht" dargestellt
- **Erkenntnismoment:** "Meine Ausgaben sind die Einkommen meiner Kunden"

---

### **Kapitel 2: Goldregen vom Festland** (Boom)

**Lernziel:** Externe Liquidität als kurzfristige Lösung verstehen

#### Sterlings Angebot
- **200 Gold Kredit** (flexible Rückzahlung)
- **10% Zinsen** (20 Gold)
- Bedingung: "Ich fordere zurück, sobald Sie liquide sind"

#### Wirtschaftlicher Aufschwung
1. **Kauf des Motorboots** (200g → an Kian)
2. **Kian stellt Leute ein** (visuell: Werftarbeiter kehren zurück)
3. **Mo hat volle Tische** (Partymode aktiviert)
4. **3 profitable Fahrten:**
   - Motorboot fängt 80 Fische (statt 50)
   - Einnahmen: 80 Gold / Fahrt
   - Kosten: 50 Gold / Fahrt
   - **Profit: +30 Gold / Fahrt**

#### Rückforderung (nach Trip 3)
- Sterling: "Exzellente Liquidität. Ich fordere 220 Gold zurück."
- Spieler zahlt → **60 Gold verbleibend**

#### Didaktischer Mechanismus
- **Externes Geld** belebt die Wirtschaft sofort
- **Kreditillusion:** "Wir sind gerettet!" (kurzfristig wahr)
- **Versteckter Preis:** Zinsen + Rückforderung entziehen Liquidität
- **Erkenntnismoment:** "Kredite sind kein Geschenk, sondern geliehene Zeit"

---

### **Kapitel 3: Die Abrechnung** (Crunch)

**Lernziel:** Liquiditätsschock nach Schuldenabbau erleben

#### Ausgangslage
- Nur noch **60 Gold** (nach Kreditrückzahlung)
- Motorboot kostet **50 Gold / Fahrt** (Sprit, Crew)
- **Gewinn: nur 10 Gold / Fahrt** (statt 30 im Boom)

#### Rezessionsspirale
1. **Trip 1:**
   - Kapitän: "Kredit gezahlt, Kasse leer. Kosten runter."
   - Spieler zahlt nur **Teilbeträge** an Mo/Kian
2. **Trip 2:**
   - Kian feuert Leute wieder (visuell)
   - Mo: "Werftcrew bleibt weg. Weniger Gäste."
   - Sterling: "Keine Aufträge → keine Löhne → Konsumeinbruch."
3. **Trip 3:**
   - Mo & Kian **pleite** (kaufen nichts)
   - Lale: "Mo und Kian sind pleite. Niemand kauft deinen Fisch."
   - **Stillstand**

#### Sterlings Lösung: Umschuldung
- **500 Gold Refinanzierung**
- **Zinslast: 50 Gold / Fahrt**
- Versprechen: "Wachsen Sie aus der Krise heraus"

#### Didaktischer Mechanismus
- **Schuldenabbau = Geldvernichtung** (wenn nicht kompensiert)
- **Boom-Bust-Zyklus:** Kredit → Aufschwung → Rückzahlung → Absturz
- **Systemische Falle:** Mehr Schulden als "Lösung" für Schuldenkrise
- **Erkenntnismoment:** "Ohne externes Geld kollabiert die Wirtschaft"

---

### **Kapitel 4: Die Wachstumsfalle** (Growth Trap)

**Lernziel:** Zinslast erzwingt riskante Investitionen

#### Problem
- **Motorboot:** +30 Gold Gewinn / Fahrt
- **Zinslast:** -50 Gold / Fahrt
- **Netto:** -20 Gold / Fahrt (Verlust!)

#### Lales Analyse
"Das Motorboot bringt 30g, aber Sterling zieht 50g Zinsen. Wir verbrennen 20g pro Fahrt!"

#### Sterlings "Lösung": Schleppnetz
- **Kostenpunkt:** 350 Gold
- **Effekt:** Doppelter Fang (160 Fische statt 80)
- **Problem:** Zerstört Meeresgrund

#### Rani erscheint (Meeresbiologin)
- "Sie pflügen den Boden um. Korallen, Jungfische..."
- **Warnung:** Fischbestand sinkt um 12% / Fahrt

#### Sterling kontert
- "Ignorieren Sie das. Wir schreiben schwarze Zahlen!"
- "Das System ist stabil."

#### Didaktischer Mechanismus
- **Zinslast als Wachstumszwang:** Gewinn muss Zinsen übersteigen
- **Kurzfrist- vs. Langfristdenken**
- **Externalisierung von Kosten:** Ökologie wird ignoriert
- **Erkenntnismoment:** "Profit entsteht auf Kosten der Zukunft"

---

### **Kapitel 5: Mehr Technik, weniger Fische** (Efficiency)

**Lernziel:** Effizienzsteigerung zerstört eigene Grundlage

#### Weitere Eskalation
- **Schleppnetz-Upgrade:** Noch größere Netze
- **Fischbestand:** Sinkt kontinuierlich (13% / Fahrt)
- **Visuelle Effekte:**
  - Wasser wird **trüber** (grünlich)
  - Fische werden **kleiner** (Jungfische statt adulte Tiere)

#### Ranis Warnungen werden drängender
- "12% Bestandsabbau" → "25%" → "38%"
- "Das Ökosystem kollabiert!"

#### Sterling ignoriert weiter
- "Die Zahlen stimmen. Weitermachen."

#### Didaktischer Mechanismus
- **Technologie-Falle:** Mehr Output ≠ nachhaltiger Wohlstand
- **Verzögerte Konsequenzen:** Schaden wird erst später sichtbar
- **Erkenntnismoment:** "Wir sägen am Ast, auf dem wir sitzen"

---

### **Kapitel 6: Wenn das Meer ausblutet** (Cannibalization)

**Lernziel:** Kipppunkt in natürlichen Systemen erleben

#### Ökologischer Kollaps
- **Fischbestand:** < 25% (kritische Schwelle)
- **Fänge:** Nur noch 20-30 Fische (statt 160)
- **Wasser:** Dunkelgrün, fast schwarz
- **Bäume:** Braun, verdorrt

#### Wirtschaftlicher Zusammenbruch
- Einnahmen reichen nicht mehr für Kosten
- **Insolvenz droht**
- Sterling zieht sich zurück: "Ich kann hier nichts mehr retten"

#### Didaktischer Mechanismus
- **Tipping Point:** Ökosystem kippt irreversibel
- **Positive Feedback-Schleife:** Weniger Fisch → mehr Aufwand → noch weniger Fisch
- **Erkenntnismoment:** "Manche Schäden sind nicht mehr reparabel"

---

### **Kapitel 7: Das Ende der Inselwirtschaft** (Collapse)

**Lernziel:** Systemkollaps reflektieren

#### Finale Sequenz
- **Zwangsversteigerung** des Bootes (Sterling)
- **Epilog-Dialog:** Reflektion der Ereignisse
- **Analysediagramme:**
  - Schuldenentwicklung
  - Fischbestandskurve
  - Wirtschaftskreislauf-Zusammenbruch

#### Abschlussfragen (für Unterricht)
1. War der Kollaps vermeidbar?
2. Wer trägt Verantwortung? (Kapitän, Sterling, System?)
3. Welche Alternativen gab es?
4. Was sagt das über reale Wirtschaftssysteme?

#### Didaktischer Mechanismus
- **Keine einfache Moral:** Kein "Du hättest X tun sollen"
- **Systemische Zwänge sichtbar machen**
- **Transfer zur Realität:** Klimakrise, Überfischung, Schuldenkrise
- **Erkenntnismoment:** "Wachstumszwang + endliche Ressourcen = Kollaps"

---

## Didaktische Mechanismen & Vermittlungsstrategien

### 1. Learning by Doing (Erfahrungslernen)

**Prinzip:** Nicht erklären, sondern erleben lassen

#### Beispiele:
- **Sparparadox:** Spieler erleidet Rezession, bevor Lale es erklärt
- **Zinslasten:** Spieler sieht Geld verschwinden, bevor Mechanik erläutert wird
- **Ökologischer Kollaps:** Wasser wird visuell trüber, bevor Rani warnt

**Pädagogische Grundlage:**
- Kolbs Lernzyklus (Concrete Experience → Reflective Observation)
- Konstruktivismus: Wissen durch Handlung konstruieren

---

### 2. Narrative Rahmung (Storytelling)

**Prinzip:** Abstrakte Konzepte in konkrete Geschichten einbetten

#### Charakterisierung:
- **Sterling** = Finanzkapital (rational, systemisch, nicht "böse")
- **Lale** = Kritisches Bewusstsein (analysiert, warnt, bleibt neutral)
- **Rani** = Ökologisches Gewissen (mahnt, wird ignoriert)
- **Mo & Kian** = Realwirtschaft (leiden als Erste unter Krisen)

**Funktion:**
- **Perspektivenvielfalt:** Kein moralischer Zeigefinger
- **Identifikation:** Spieler ist Teil des Systems, nicht außerhalb
- **Emotionale Bindung:** Charaktere machen Zahlen greifbar

---

### 3. Visualisierung (Show, don't tell)

#### Wirtschaftliche Prozesse:
- **Münzanimationen:** Geldfluss zwischen Akteuren sichtbar
- **Billboards:** Einnahmen/Ausgaben als Popup über Gebäuden
- **Kreislaufdiagramme:** Feedback-Schleifen grafisch darstellen

#### Ökologische Degradation:
- **Wasserfärbung:** Türkis → Grün → Schwarz
- **Baumsterben:** Grün → Braun
- **Fischgröße:** Große Schwärme → Einzelne Jungfische
- **Sounddesign:** Möwenrufe verschwinden, Stille breitet sich aus

**Funktion:**
- **Multisensorisches Lernen:** Visuell + auditiv + haptisch (Klicks)
- **Abstrakte Konzepte greifbar machen**
- **Unmittelbare Feedbackschleifen**

---

### 4. Systemisches Denken fördern

#### Feedback-Schleifen erkennbar machen:

**Positive Feedback (Verstärkung):**
```
Kredit → Investition → Wachstum → mehr Kredit
  ↑___________________________________|

Fischsterben → weniger Fang → mehr Aufwand → mehr Schaden
  ↑________________________________________________|
```

**Negative Feedback (Dämpfung):**
```
Sparen → weniger Konsum → weniger Einnahmen → kann nicht sparen
  ↑__________________________________________________|
```

#### Verzögerungen sichtbar machen:
- **Ökologische Schäden:** Treten verzögert auf (3-4 Fahrten später sichtbar)
- **Wirtschaftliche Krisen:** Folgen erst nach Schuldentilgung

**Funktion:**
- **Kausalketten verstehen:** A → B → C → A (Zirkelkausalität)
- **Nichtlinearität:** Kleine Ursachen, große Wirkung (Kipppunkte)
- **Zeitverzögerungen:** Heute handeln, morgen leiden

---

### 5. Dilemma-Design (Keine "richtigen" Lösungen)

**Prinzip:** Spieler in unlösbare Situationen bringen

#### Beispiel Kapitel 4:
- **Option A:** Schleppnetz kaufen → Zinsen zahlen, aber Meer zerstören
- **Option B:** Nicht kaufen → Insolvenz durch Zinslast
- **Ergebnis:** Beide Optionen führen zu Schäden

**Pädagogischer Wert:**
- **Ambiguitätstoleranz:** Es gibt nicht immer Win-Win-Lösungen
- **Systemische Zwänge:** Individuelle Rationalität ≠ kollektive Rationalität
- **Transfer:** Klimakrise, Wachstumszwang in der Realität

---

### 6. Reflexionspausen (Metakognition)

#### Eingebaute Reflexionspunkte:

1. **Kreislaufdiagramme:** Nach Kapitel 0, 1, 3
   - Visualisierung + kurze Erklärung
   - "Was ist anders geworden?"

2. **Lales Analysen:** Neutrale Beobachterin
   - Keine Wertung, nur Fakten
   - "Sieh dir die Zahlen an"

3. **Ranis Warnungen:** Wissenschaftliche Perspektive
   - Daten statt Moral
   - "12% Bestandsabbau pro Fahrt"

**Funktion:**
- **Metakognition:** Über eigenes Denken nachdenken
- **Perspektivwechsel:** Verschiedene Rollen einnehmen
- **Erkenntnisgewinnung:** "Aha-Momente" bewusst herbeiführen

---

## Unterrichtseinbindung

### Vor dem Spiel (15 Min)

**Aktivierung Vorwissen:**
- "Was ist ein Wirtschaftskreislauf?"
- "Woher kommt Geld in einer geschlossenen Wirtschaft?"
- "Was passiert, wenn eine Bank Kredite vergibt?"

**Hypothesenbildung:**
- "Was glaubt ihr, passiert auf einer Insel mit 4 Personen?"
- Tafelanschrieb: Vermutungen sammeln

---

### Während des Spiels (30-45 Min)

**Spielmodi:**

#### Option A: Einzelspiel
- Jede:r Schüler:in spielt allein (Tablets)
- Notizen zu Schlüsselmomenten

#### Option B: Beamer-Gameplay
- Lehrer:in spielt, Klasse diskutiert Entscheidungen
- Abstimmung über Choices per Handzeichen

#### Option C: Gruppenarbeit
- 4er-Gruppen teilen sich ein Tablet
- Gemeinsame Entscheidungsfindung
- Rollenverteilung (Kapitän, Berater, Kritiker, Protokollant)

---

### Nach dem Spiel (30 Min)

#### Phase 1: Emotionale Entlastung (5 Min)
- "Wie fühlt ihr euch nach dem Ende?"
- "Was hat euch überrascht?"

#### Phase 2: Analytische Reflexion (15 Min)

**Leitfragen:**
1. **Kapitel 1:** Warum führte Sparen zu weniger Geld?
2. **Kapitel 2:** War der Kredit eine gute Idee?
3. **Kapitel 4:** Hättet ihr das Schleppnetz gekauft? Warum (nicht)?
4. **Kapitel 6:** War der Kollaps vermeidbar?

**Methodenvorschlag:**
- Think-Pair-Share
- Fishbowl-Diskussion
- Pro-Contra-Debatte

#### Phase 3: Transfer zur Realität (10 Min)

**Vergleiche mit:**
- **2008 Finanzkrise:** Schuldenblase → Platzen → Refinanzierung
- **Klimakrise:** Fossile Energien = Schleppnetz der Realität
- **Überfischung:** Reale Zusammenbrüche (z.B. Kabeljau vor Neufundland)
- **Wachstumszwang:** BIP-Dogma, Zinssystem

**Abschlussfrage:**
"Welche Strukturen in unserer Wirtschaft ähneln dem Spiel?"

---

## Besondere didaktische Stärken

### 1. Erfahrungsbasiertes Lernen
- Nicht dozieren, sondern **erleben lassen**
- Fehler sind Teil des Lernprozesses
- Emotionale Involviertheit → tieferes Verständnis

### 2. Perspektivenvielfalt
- **Ökonomisch:** Sterling's Logik ist rational (nicht böse)
- **Ökologisch:** Ranis Warnungen sind berechtigt
- **Sozial:** Mo & Kian leiden konkret
- **Neutral:** Lale dokumentiert ohne zu werten

### 3. Keine Moralisierung
- Spiel zeigt **Systemzwänge**, nicht individuelle Schuld
- Sterling ist kein Bösewicht, sondern Verkörperung eines Systems
- Spieler wird nicht verurteilt für seine Entscheidungen

### 4. Skalierbarkeit
- **Mikro-Ebene:** 4 Personen auf einer Insel (greifbar)
- **Makro-Transfer:** Funktioniert analog für Nationalstaaten
- **Abstraktion durch Konkretisierung**

### 5. Visuelle & narrative Einprägsamkeit
- **"Münzen fliegen"** = Geld ist Fluss, nicht Bestand
- **"Wasser wird schwarz"** = Grenzen des Wachstums
- **"Sterling lächelt"** = System ist unpersönlich

---

## Anschlussfähigkeit (Lehrplan-Bezüge)

### Wirtschaft
- Wirtschaftskreislauf (Volkswirtschaftslehre)
- Geldpolitik & Kreditwesen
- Konjunkturzyklen (Boom & Bust)
- Externalitäten & Marktversagen

### Geographie
- Nachhaltigkeit & Ressourcennutzung
- Ökosystem-Dienstleistungen
- Anthropogene Umweltveränderungen
- Tragfähigkeit & Overshoot

### Politik / Sozialwissenschaften
- Systemische Zwänge vs. Handlungsfreiheit
- Verteilungsgerechtigkeit
- Lobbyismus (Sterling als Finanzsektor)
- Regulierung vs. Marktfreiheit

### Ethik
- Generationengerechtigkeit
- Kurzfrist- vs. Langfristdenken
- Verantwortung in komplexen Systemen

---

## Technische Umsetzung der Didaktik

### Performance-Optimierungen für Tablets
- PixelRatio max 1.5
- Schatten: BasicShadowMap statt PCFSoftShadowMap
- Wasser-Geometrie: 64×64 Segmente (statt 128)
- Backdrop-Filter entfernt (GPU-Entlastung)

**Grund:** Schulgeräte müssen ohne Ruckeln laufen

### UI-Design für Lesbarkeit
- Hohe Deckkraft (rgba 0.95) statt Blur-Effekte
- Große Schrift (min. 1rem)
- Kontrastreiche Farben
- Touch-optimierte Buttons (min. 44×44px)

### Barrierefreiheit
- Keine reinen Farbcodierungen (Icons + Text)
- Klare Beschriftungen
- Pause jederzeit möglich
- Keine Zeitlimits

---

## Zusammenfassung: Kernbotschaften

### 1. Geld ist ein Kreislauf, kein Bestand
"Deine Ausgaben sind die Einkommen anderer"

### 2. Sparen kann kontraproduktiv sein
"Paradox der Sparsamkeit" live erlebt

### 3. Externe Liquidität ist keine Dauerlösung
"Kredite lösen keine strukturellen Probleme"

### 4. Zinslast erzwingt Wachstum
"System braucht Expansion, um stabil zu bleiben"

### 5. Wachstum auf endlichem Planeten führt zu Kollaps
"Ökonomie vs. Ökologie = Kollisionskurs"

### 6. Systemische Zwänge > individuelle Moral
"Niemand ist schuld, aber alle sind beteiligt"

---

## Evaluation & Assessment

### Lernstandserhebung

**Vor dem Spiel:**
- Fragebogen: "Was ist Wirtschaftskreislauf?"
- Hypothesen: "Was passiert bei Sparen?"

**Nach dem Spiel:**
- Reflektionsfragen (s.o.)
- Concept Map: Zusammenhänge zeichnen
- Essay: "Was habe ich gelernt?"

### Erfolgsindikatoren

**Kognitiv:**
- Kreisläufe erkennen können
- Feedback-Schleifen benennen
- Transfer zur Realität herstellen

**Affektiv:**
- Systemische Zusammenhänge würdigen
- Ambiguität aushalten
- Perspektiven wechseln können

**Behavioral:**
- Diskussionen in Klasse anstoßen
- Medienberichte hinterfragen
- Komplexität nicht vereinfachen

---

## Technische Metadaten

**Engine:** Three.js (WebGL)
**Sprache:** JavaScript (ES6)
**Architektur:**
- `src/core/` - Spiellogik (Director, Events, Economy)
- `src/entities/` - Boote, Gebäude, Personen
- `src/world/` - Wasser, Insel, Umwelt
- `src/ui/` - Interface, Dialoge, Visualisierungen
- `src/config/` - Szenen, Phasen, Balance

**Besonderheiten:**
- Münzanimationen mit Partikel-System
- Shader-basiertes Wasser (reagiert auf Gesundheit)
- Dynamische Kamerafahrten
- Event-basierte Architektur (lose Kopplung)

---

## Ausblick & Erweiterungen

### Mögliche Add-ons (Post-Launch)

1. **Multiplayer-Modus**
   - 4 Spieler:innen übernehmen je eine Rolle
   - Verhandlungen in Echtzeit
   - Konfliktlösungsmechanismen

2. **Alternative Enden**
   - "Gutes Ende": Kooperative Wirtschaft etablieren
   - "Pragmatisches Ende": Balance finden
   - "Realistisches Ende": Kollaps (wie jetzt)

3. **Sandbox-Modus**
   - Parameter anpassen (Zinsen, Fischbestand, etc.)
   - "Was-wäre-wenn"-Szenarien testen
   - Eigene Wirtschaftsmodelle bauen

4. **Datenbankintegration**
   - Spielstände vergleichen
   - Klassenstatistiken
   - Heatmaps: "Wo scheitern die meisten?"

---

**Letzte Aktualisierung:** Dezember 2024
**Version:** 1.0
**Autor:innen:** Paul J. & Claude (Anthropic)
**Lizenz:** Bildungsnutzung frei

---

## Kontakt & Feedback

Für Fragen, Bug-Reports oder didaktische Anregungen:
- GitHub Issues: [Link einfügen]
- E-Mail: [Kontakt einfügen]

---

*"Wir können eine Wirtschaft nicht unendlich wachsen lassen auf einem endlichen Planeten.
Capital Cove zeigt, was passiert, wenn wir es trotzdem versuchen."*
