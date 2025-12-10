--- START OF FILE PROJECT_CONTEXT.md ---

# PROJECT CONTEXT: Capital Cove

**STATUS: DRAFT / IN DEVELOPMENT**
⚠️ **Hinweis:** Dieses Projekt befindet sich in der aktiven Entwurfsphase. Architekturentscheidungen und Modulgrenzen können sich ändern. Code-Generierung muss flexibel bleiben, aber bestehende Schnittstellen (insbesondere der Event-Bus) strikt einhalten, um Regressionen zu vermeiden.

---

## 1. Projektübersicht
**Titel:** Capital Cove: Die Wachstumsfalle (The Growth Paradox)
**Genre:** 3D Wirtschaftssimulation / Tycoon (Low Poly)
**Didaktisches Ziel:** Simulation des Wachstumszwangs durch Zinseszins. Der Spieler soll erleben, wie Schulden ("Gratis-Geld") dazu zwingen, ökologische Ressourcen (Fische) zu übernutzen, was zum Kollaps führt.

**Tech Stack:**
*   **Core:** Vanilla JavaScript (ES6 Modules, import/export).
*   **Render Engine:** Three.js (r160+ via CDN/ImportMap).
*   **UI:** HTML5 DOM Overlay + CSS3 (Kein Canvas-Rendering für UI!).
*   **Build:** None (Native Browser Support via LiveServer erforderlich).

---

## 2. Architektur-Design
Das Projekt folgt einem **Event-Driven Singleton Pattern**.

1.  **Singletons:** Kern-Systeme (Game, Economy, UI, Input, Director) existieren als einzelne Instanzen, die exportiert werden (z.B. export const game = new Game()).
2.  **Event Bus (Events.js):** Die Module sind entkoppelt. Logik (Economy) ruft UI nicht direkt auf, sondern emittiert Events (EVENTS.STATS_UPDATED). Der UIManager hört darauf.
3.  **Kein globaler State-Blob:** Der Zustand ist verteilt:
    *   Wirtschaftsdaten → Economy.js
    *   Story-Fortschritt → Director.js
    *   Visuelle Objekte → SceneSetup.js / Manager-Klassen.

---

## 3. Dateistruktur & Module

CapitalCove/
├── index.html            # Entry Point, UI Markup, ImportMap
├── style.css             # UI Styling (Overlay, Dialoge, Toast, Transitions)
├── PROJECT_CONTEXT.md    # Diese Datei
└── src/
    ├── main.js           # Bootstrapper (Init Game, Remove Loading Screen)
    ├── core/
    │   ├── Game.js       # Main Loop (tick), hält Manager-Instanzen
    │   ├── SceneSetup.js # Three.js Boilerplate (Camera, Renderer, Lights, Resize)
    │   ├── Input.js      # Raycaster & Camera Controls (Smoothed Orbit)
    │   ├── Events.js     # Globaler Event Bus (Pub/Sub)
    │   └── Director.js   # Narrative Engine (Verwaltet Acts & Cutscenes)
    ├── logic/
    │   └── Economy.js    # Mathe-Kern (Zinsen, Fangquoten, Tech-Tree, "The Trap")
    ├── world/
    │   ├── Water.js      # Custom Shader (Reagiert auf Verschmutzung/Events)
    │   ├── Island.js     # Prozedurale Terrain-Mesh Generierung
    │   └── Environment.js# Instanced Meshes (Bäume, Steine) & Deko
    ├── entities/
    │   ├── Boat.js       # BoatManager & Boat Class (State Machine: Idle->Fish->Dock)
    │   ├── Person.js     # PersonManager (NPCs auf der Insel)
    │   └── Buildings.js  # BuildingManager (Verwaltet Häuser, Party-Lights, States)
    └── ui/
        └── UIManager.js  # DOM Manipulation, Event-Listener, Dialog-Rendering

---

## 4. Kern-Logik & Datenmodelle

### A. Economy (src/logic/Economy.js)
Verwaltet das "Spiel gegen die Mathematik".
*   **Daten:** money, debt, fishStock (vs. maxFishStock), tech (Upgrades).
*   **Mechanik "Die Falle":**
    *   Spieler startet schuldenfrei (Phase 1).
    *   Nimmt Kredit auf -> "Grace Period" (90s zinsfrei, Party-Modus).
    *   Danach: Zinsen schlagen zu (5% pro Zyklus).
    *   Zwang: Um Zinsen zu zahlen, muss man Trawler (Schleppnetze) nutzen -> Ökologischer Kollaps.
*   **Automation:** isFishingActive (Globaler Schalter für die Flotte).

### B. Director (src/core/Director.js)
Steuert den narrativen Fluss.
*   **Acts:** INTRO, ACT_I_BALANCE, ACT_II_TEMPTATION (Banker), ACT_III_BOOM (Party), ACT_IV_TRAP (Crunch), GAME_OVER.
*   **Trigger:** Lauscht auf Events (z.B. TRIP_COMPLETED), zählt Trips oder prüft Schulden, um Dialoge (SCENE_DATA) auszulösen.

### C. Entities (src/entities/Boat.js)
*   **State Machine pro Boot:** IDLE -> LEAVING -> MOVING -> FISHING -> RETURNING -> DOCKING -> UNLOADING.
*   **Unloading:** Ruft economy.processFishingTrip() auf.

### D. Visuals (src/world/Water.js)
*   **Reaktiv:** Das Wasser ändert seine Farbe (Uniforms im Shader) basierend auf fishStock (Ressourcengesundheit) und Events (Öl-Puls bei Trawler-Nutzung).

---

## 5. Event-Schnittstellen (API Reference)
Neue Features müssen diese Events nutzen oder erweitern.

**Gesendet von Economy.js / Director.js:**
*   EVENTS.STATS_UPDATED: Payload { money, debt, fishStock, fleetSize, ... }
*   EVENTS.TOAST: Payload { message }
*   EVENTS.MONEY_CHANGED: Payload { amount, reason, details } (für Floating Text)
*   ECON_EVENTS.TRIP_COMPLETED: Payload { profit, revenue, expenses }
*   ECON_EVENTS.ECOLOGICAL_WARNING: Wenn Fischbestand kritisch wird.
*   ECON_EVENTS.GRACE_PERIOD_ENDED: Startet den "Ernst des Lebens".

**Gesendet von Input.js / Game.js:**
*   Interaktion mit 3D-Objekten (Klick) ruft game.handleObjectClick(obj) auf, was wiederum UI-Dialoge öffnet.

**Gesendet von UIManager.js:**
*   Steuert economy.toggleOperation(bool) (Flotten-Start/Stopp).

---

## 6. Coding-Richtlinien für KI-Assistenten

1.  **Keine direkten DOM-Zugriffe in Logik-Modulen:** Economy.js darf niemals document.getElementById aufrufen. Nutze events.emit.
2.  **Singleton-Instanzen nutzen:** Importiere economy, ui, game (kleingeschrieben), erstelle keine new Game().
3.  **Three.js Import:** Nutze import * as THREE from 'three';.
4.  **UI-Änderungen:** Passieren in UIManager.js oder style.css. Keine Canvas-Buttons zeichnen.
5.  **Raycasting:** Objekte müssen userData: { isInteractable: true, type: '...' } haben, um klickbar zu sein.

---

## 7. Aktueller Status & Nächste Schritte

**Fertiggestellt:**
*   [x] 3D Welt (Insel, Wasser Shader, Deko).
*   [x] Input System (Smoothed Camera, Raycasting).
*   [x] Grundlegende Economy (Fischen, Geld verdienen, Upgrades kaufen).
*   [x] Story Framework (Director, Dialog-System).
*   [x] "The Trap" Mechanik (Kreditaufnahme, Grace Period, Zinseszins).
*   [x] Automation (Start/Stopp Schalter für Boote).

**Offen / TODO:**
*   [ ] **Balancing:** Die Zahlen (Fischpreise vs. Zinsen) müssen feinjustiert werden, damit die Falle "fair aber unausweichlich" wirkt.
*   [ ] **End Game States:** Explizite "Game Over" Screens (Bankrott vs. Ökologischer Tod).
*   [ ] **Visual Polish:** Mehr Partikel bei Aktionen, Sound-Effekte (optional).
*   [ ] **Refactoring:** Game.js handleObjectClick ist noch sehr monolithisch und enthält UI-Logik (Dialog-Texte), die in Director oder Config-Dateien gehören könnte.

--- END OF FILE PROJECT_CONTEXT.md ---


