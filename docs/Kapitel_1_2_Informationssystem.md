# Informations- und Hinweissystem: Kapitel 1 & 2

## Übersicht

In **Capital Cove** gibt es keine klassischen Text-Billboards in der 3D-Welt. Stattdessen werden Informationen durch ein mehrschichtiges System aus UI-Elementen, visuellen Hinweisen und narrativen Dialogen vermittelt.

---

## Kapitel 1: Der Stillstand (STAGNATION)

### Narrative Ziele
- Den Spieler mit dem Konzept des "Spar-Paradoxons" konfrontieren
- Sterling als neuen Charakter einführen
- Zeigen, dass Sparen die Wirtschaft lähmt

### Informationsvermittlung

#### 1. **Story-Dialoge** (via `SCENE_DATA`)

**D1_STERLING_ARRIVAL**
- **Titel:** "Ein Neuer auf der Insel"
- **Sprecher:** Sterling (rechts)
- **Inhalt:** Sterling stellt sich vor und kündigt an, dass er sein Zelt aufschlagen wird
- **Funktion:** Einführung des Antagonisten
- **Kamera-Target:** `TENT`

**D1_STERLING_DIRECTIVE**
- **Titel:** "Wachstums-Potential"
- **Sprecher:** Sterling (rechts)
- **Inhalt:** Sterling kritisiert den Stillstand und fordert den Spieler auf, zur Werft zu gehen
- **Funktion:** Quest-Trigger - Spieler soll Motorboot prüfen
- **Kamera-Target:** `TENT`

**D1_PURCHASE_FAIL**
- **Titel:** "Zu teuer"
- **Sprecher:** Kian (rechts) & Kapt'n (links)
- **Inhalt:** Kian erklärt, dass das Motorboot 200 Gold kostet (Spieler hat nur 100)
- **Funktion:** Problem etablieren - nicht genug Geld
- **Kamera-Target:** `SHIPYARD`

**D1_SAVINGS_INTRO**
- **Titel:** "Sparmaßnahmen"
- **Sprecher:** Lale (links)
- **Inhalt:** Lale schlägt vor, zu sparen, um das Motorboot zu finanzieren
- **Funktion:** Leitet zum HQ-Kontor, wo das Sparbuch aktiviert werden kann
- **Kamera-Target:** `HQ`

**D1_REALIZATION**
- **Titel:** "Die Bilanz der Sparsamkeit"
- **Sprecher:** Lale (links)
- **Inhalt:** Erklärung des Spar-Paradoxons - "Unsere Kunden sind unsere Nachbarn"
- **Funktion:** Lehrbuch-Moment - Kreislauf ist zusammengebrochen
- **Kamera-Target:** `HQ`
- **Folgeaktion:** Zeigt Zyklus-Diagramm mit `show_cycle_visual` (Parameter: 'BROKEN')

#### 2. **Visuelle Gebäude-Hinweise** (Hint-Arrows)

Gesteuert über `EVENTS.CMD_SHOW_BUILDING_HINT`:

```javascript
events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, {
    type: 'shipyard',  // oder 'hq', 'bank', 'tavern'
    show: true
});
```

**Werft-Hinweis:**
- Erscheint nach Sterlings Aufforderung
- Pulsierender Pfeil über der Werft
- Verschwindet nach Interaktion mit der Werft

**HQ-Hinweis:**
- Erscheint nach Dialog `D1_PURCHASE_FAIL`
- Leitet Spieler zum Kontor, um Sparbuch zu öffnen

#### 3. **Persistente UI-Warnungen**

In der STAGNATION-Phase wird eine dauerhafte Warnung im UI angezeigt:

```javascript
ui.showPersistentWarning("Die Wirtschaft stagniert. Finde einen Weg zum Wachstum.");
```

#### 4. **Objectives Panel**

Phase: `STAGNATION`
- ✓ Prüfe den Preis für das Motorboot (Werft)
- ✓ Nutze das Sparbuch im Kontor (HQ)
- ○ Beobachte die Marktentwicklung

#### 5. **Wirtschaftliche Visualisierung**

**Farbänderungen der Gebäude:**
```javascript
setEconomyState(health) {
    // health < 0.5 = Crisis Mode
    // health < 0.3 = Collapsing
}
```

- Gebäude verlieren Farb-Sättigung
- Laternen dimmen
- Rauch aus der Taverne wird schwächer
- Krüge auf Tischen verschwinden

---

## Kapitel 2: Goldregen vom Festland (BOOM)

### Narrative Ziele
- Zeigen, wie externe Liquidität (Kredit) die Wirtschaft ankurbelt
- "Grace Period" - kurzfristige Prosperität
- Vorbereitung auf die kommende Krise (Kreditrückzahlung)

### Informationsvermittlung

#### 1. **Story-Dialoge** (via `SCENE_DATA`)

**D2_STERLING_INVITATION**
- **Titel:** "Eine Einladung"
- **Sprecher:** Sterling (rechts)
- **Inhalt:** Sterling lädt zur Bank ein und verspricht eine Lösung
- **Funktion:** Übergang zur Kreditaufnahme
- **Kamera-Target:** `null` (aktueller View)

**D2_STERLING_OFFER**
- **Titel:** "Das Kreditangebot"
- **Sprecher:** Sterling (rechts)
- **Inhalt:**
  - Kredit: 200 Gold
  - Zinsen: 10%
  - Konditionen: "Flexible Rückzahlung – sobald Sie liquide sind"
- **Funktion:** Spieler nimmt Kredit auf (+200g)
- **Kamera-Target:** `BANK`

**D2_BOAT_ORDER**
- **Titel:** "Die Bestellung"
- **Sprecher:** Kian (rechts)
- **Inhalt:**
  - Motorboot kostet 200 Gold
  - Bauzeit: 2 Tage (simuliert)
  - Fängt fast doppelt so viel Fisch
  - Altes Ruderboot wird verschrottet
- **Funktion:** Motorboot kaufen (-200g)
- **Kamera-Target:** `SHIPYARD`

**D2_ECONOMIC_RECOVERY**
- **Titel:** "Der Boom beginnt"
- **Sprecher:** Lale (links)
- **Inhalt:** "Kian hat 200 Gold bekommen. Er stellt Leute ein! Das frische Geld vom Festland bringt die Wirtschaft wieder in Gang."
- **Funktion:** Multiplikator-Effekt erklären
- **Kamera-Target:** `HQ`

**D2_STERLING_REMINDER**
- **Titel:** "Flexible Konditionen"
- **Sprecher:** Sterling (rechts)
- **Inhalt:** "Flexible Rückzahlung bedeutet, ich fordere den Kredit zurück, sobald ich sehe, dass Sie liquide sind."
- **Funktion:** Warnung vor kommender Rückzahlung
- **Kamera-Target:** `null`

**D2_MO_BOOM** (Ambient Bark)
- **Titel:** "Volles Haus"
- **Sprecher:** Mo (rechts)
- **Inhalt:** "Die Tische sind jeden Abend voll. Ich muss die Küche erweitern!"
- **Funktion:** Boom-Stimmung verstärken
- **Kamera-Target:** `TAVERN`

**D2_KIAN_BOOM** (Ambient Bark)
- **Titel:** "Auftragslage"
- **Sprecher:** Kian (rechts)
- **Inhalt:** "Ich komme kaum hinterher mit den Wartungen. Habe zwei neue Lehrlinge eingestellt."
- **Funktion:** Boom-Stimmung verstärken
- **Kamera-Target:** `SHIPYARD`

**D2_LOAN_RECALL**
- **Titel:** "Die Rückforderung"
- **Sprecher:** Sterling (rechts)
- **Inhalt:**
  - Kredit: 200 Gold
  - Zinsen: 20 Gold (10%)
  - Gesamt: 220 Gold
- **Funktion:** Rückzahlung erzwingen (-220g)
- **Kamera-Target:** `BANK`

**D2_AFTER_REPAYMENT**
- **Titel:** "Zahlung abgeschlossen"
- **Sprecher:** Sterling (rechts)
- **Inhalt:** "Die Zahlung ist verbucht. Das verbessert Ihr Rating erheblich."
- **Funktion:** Übergang zu Kapitel 3 (CRUNCH)
- **Kamera-Target:** `null`

#### 2. **Boom-Sequenz Visualisierung**

Die `playBoomSequence()` Funktion orchestriert eine große visuelle Show:

**Ablauf:**

1. **Event-Trigger:** `EVENTS.START_BOOM_CONSTRUCTION`

2. **Geld-Sack Animation (HQ → Werft)**
   ```javascript
   visualizeBigTransfer('HQ', 'SHIPYARD', true);
   ```
   - Goldener Geldsack fliegt in Bogen von HQ zur Werft
   - Bei Ankunft: Explosion aus Staubwolken

3. **Werft-Expansion** (`triggerShipyardBoom`)
   - Staubwolken an 3 Positionen (gestaffelt)
   - Props spawnen:
     - 4x Holzstapel (`wood_stack`)
     - 2x Fässerstapel (`barrel_stack`)
   - Gebäude wackelt (`triggerBuildingReaction('SHIPYARD', 'SUCCESS')`)

4. **Geld-Sack Animation (Werft → Taverne)**
   ```javascript
   visualizeBigTransfer('SHIPYARD', 'TAVERN', true);
   ```

5. **Taverne-Expansion** (`triggerTavernBoom`)
   - Goldene Staubwolken
   - Props spawnen:
     - 2x Bierfässer (`ale_barrel`)
     - 2x Kisten (`supply_crate`)
   - Laternen leuchten heller
   - Rauch intensiviert sich

6. **Floating Text**
   ```javascript
   ui.createFloatingText("BOOM!", position, '#FFD700');
   ```

7. **NPC-Reaktionen** (Mo & Kian Barks)

8. **Kamera-Reset**

#### 3. **Visuelle Gebäude-Hinweise**

**Bank-Hinweis:**
- Erscheint nach `D2_STERLING_INVITATION`
- Pulsierender Pfeil über der Bank
- Verschwindet nach Betreten der Bank

**Werft-Hinweis:**
- Erscheint während BOOM-Phase, wenn Spieler das Motorboot kaufen soll

#### 4. **Objectives Panel**

Phase: `BOOM`
- ✓ Nimm den Kredit von Sterling an
- ✓ Kaufe das Motorboot in der Werft (200g)
- ○ Absolviere 3 profitable Fahrten (1/3, 2/3, 3/3)
- ○ Beobachte die wirtschaftliche Erholung

**Fortschritt wird dynamisch aktualisiert:**
```javascript
director.boomProfitableTrips++;
director.updateObjectiveProgress('complete_trips', count, 3);
```

#### 5. **Wirtschaftliche Visualisierung**

**Farbänderungen der Gebäude:**
```javascript
setEconomyState(health) {
    // health > 0.8 = Thriving (Party Mode)
    // Volle Farben, Lichter an, Props sichtbar
}
```

- Gebäude mit voller Farbsättigung
- Laternen leuchten hell
- Rauch aus Taverne intensiv
- Krüge auf Tischen sichtbar
- Funken an der Werft

**Münzfluss-Animationen:**
```javascript
events.on(ECON_EVENTS.INCOME_RECEIVED, (data) => {
    buildingManager.spawnCoinFlow('IN', data.intensity);
});

events.on(ECON_EVENTS.EXPENSES_PAID, (data) => {
    buildingManager.spawnCoinFlow('OUT', data.intensity);
});
```

- Goldene Partikel fließen zwischen Gebäuden
- Intensität basiert auf Transaktionsvolumen

#### 6. **Props (Baustellenobjekte)**

**Wood Stack** (Holzstapel)
- Position: Um die Werft herum
- Farbe: Braun (#8d6e63)
- Anzahl: 4 Stück

**Barrel Stack** (Fässerstapel)
- Position: Neben der Werft
- Farbe: Dunkelbraun (#5d4037)
- Anzahl: 2 Stück

**Ale Barrel** (Bierfässer)
- Position: Neben der Taverne
- Farbe: Golden (#c9a227)
- Anzahl: 2 Stück

**Supply Crate** (Kisten)
- Position: Neben der Taverne
- Farbe: Beige (#b8956a)
- Anzahl: 2 Stück

Diese Props erscheinen während der Boom-Phase und verschwinden bei Wirtschaftskrisen.

#### 7. **Spezialeffekte**

**Party Lights** (während Grace Period)
- Farbige Lichter pulsieren über den Gebäuden
- Musik (optional, falls implementiert)

**Construction Dust** (Staubwolken)
- Weiße/goldene Partikel beim Impact
- Simulieren Bauaktivität

**Building Shake** (Gebäude-Wackeln)
- Kurzes Rütteln bei Impact
- Verstärkt den "BOOM"-Effekt

---

## Technische Implementierung

### Event-System

Alle Informationsvermittlung läuft über das zentrale Event-System:

```javascript
// Story triggern
events.emit(DIRECTOR_EVENTS.SCENE_START, {
    type: 'narrative',
    id: 'D1_STERLING_ARRIVAL'
});

// Gebäude-Hinweis zeigen
events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, {
    type: 'shipyard',
    show: true
});

// Wirtschaftsstatus aktualisieren
events.emit('world:update_visuals', {
    health: 0.5
});

// Boom-Sequenz starten
events.emit('world:trigger_boom_expansion');
```

### Kamera-Steuerung

Dialoge können automatisch die Kamera schwenken:

```javascript
cameraTarget: 'SHIPYARD'  // Oder: 'HQ', 'TAVERN', 'BANK', 'TENT', 'OVERVIEW'
```

**Kamera-Positionen:**
- `HQ`: Kontor (Zentrum der Insel)
- `TAVERN`: "Zum lustigen Lachs"
- `SHIPYARD`: Werft (Kian)
- `BANK`: Sterling's Bank
- `TENT`: Sterling's Zelt (vor Bankbau)
- `OVERVIEW`: Vogelperspektive über die gesamte Insel
- `BOAT`: Fokus auf das Boot

### UI-Komponenten

**Narrative Dialog** (style.css: `#narrative-ui`)
- Overlay über 3D-Szene
- Zwei Sprecher-Slots (links/rechts)
- Title + Text + Choices
- Glasmorphism-Effekt

**Toast Messages** (style.css: `#toast-container`)
- Kurze Pop-up Nachrichten
- Auto-Hide nach 3 Sekunden
- Erscheint oben-mittig

**Persistent Warning** (style.css: `.persistent-warning`)
- Dauerhaft sichtbar bis explizit ausgeblendet
- Roter Balken am oberen Bildschirmrand

**Objectives Panel** (style.css: `#objectives-panel`)
- Kapitel-Titel
- Liste der Ziele
- Checkboxen (✓ = erledigt, ○ = offen)
- Fortschrittsanzeige für Zähl-Ziele (z.B. "1/3")

**Floating Text** (3D-Raum via Canvas-Overlay)
- Kurze Texte im 3D-Raum (z.B. "BOOM!")
- Erscheinen über Gebäuden
- Faden nach oben aus

---

## Zusammenfassung

### Kapitel 1: Der Stillstand
**Kernbotschaft:** "Sparen lähmt die Wirtschaft"

**Informationskanäle:**
1. Sterling's Dialoge (Problemstellung)
2. Visuelle Hinweise (Pfeile zu Werft/HQ)
3. Gebäude-Desaturation (Wirtschaftskrise visualisiert)
4. Objectives Panel (Quest-Tracking)
5. Broken Cycle Diagram (Lehrbuch-Moment)

### Kapitel 2: Goldregen vom Festland
**Kernbotschaft:** "Externe Liquidität schafft kurzfristigen Boom"

**Informationskanäle:**
1. Sterling's Kreditangebot (Lösung)
2. Boom-Sequenz (cinematische Visualisierung)
3. Props & Partikel (Expansion zeigen)
4. NPC-Barks (Stimmung verstärken)
5. Gebäude-Saturation (Prosperität visualisiert)
6. Münzfluss-Animationen (Geldkreislauf zeigen)

---

## Dateireferenzen

- **Story-Definitionen:** [Scenes.js:177-373](src/config/Scenes.js#L177-L373)
- **Hint-System:** [Buildings.js:26,857-858,1897-1908](src/entities/Buildings.js)
- **Boom-Sequenz:** [Director.js:640-737](src/core/Director.js#L640-L737)
- **Visualisierung:** [Buildings.js:213-299](src/entities/Buildings.js#L213-L299)
- **Objectives:** [Phases.js:9-28](src/config/Phases.js#L9-L28)
- **Event-Definitionen:** [Events.js](src/core/Events.js)
