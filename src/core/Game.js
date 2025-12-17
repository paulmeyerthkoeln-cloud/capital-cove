import * as THREE from 'three';
import { sceneSetup } from './SceneSetup.js';
import { input } from './Input.js';
import { events, EVENTS } from './Events.js';

import { economy } from '../logic/Economy.js';
import { director } from './Director.js';
import { ui } from '../ui/UIManager.js';

import { Water } from '../world/Water.js';
import { Island } from '../world/Island.js';
import { Environment } from '../world/Environment.js';
import { SeaCreatureManager } from '../world/SeaCreatures.js';
import { BuildingManager } from '../entities/Buildings.js';
import { BoatManager } from '../entities/Boat.js';
import { PersonManager } from '../entities/Person.js'; 

class Game {
    constructor() {
        this.isRunning = false;
        this.lastFrameTimeMs = 0;

        this.speedMultiplier = 1;

        this.tickLengthMs = 500;
        this.tickAccumulatorMs = 0;
        this.tickCount = 0;

        // OPTIMIERUNG: FPS-Limiter für sehr alte Tablets (standardmäßig deaktiviert)
        // Setze z.B. auf 30 um auf 30 FPS zu limitieren: this.fpsLimit = 30
        this.fpsLimit = 30; // Stabilisiert Performance auf Schultablets
        this.frameMinMs = this.fpsLimit ? 1000 / this.fpsLimit : 0;

        this.water = null;
        this.island = null;
        this.environment = null;
        this.seaCreatures = null;
        this.buildings = null;
        this.boatManager = null;
        this.personManager = null;
    }

    async init() {
        sceneSetup.init();

        this.water = new Water();
        this.water.init();
        
        this.island = new Island();
        this.island.init();

        this.buildings = new BuildingManager();
        this.buildings.init();

        this.environment = new Environment();
        this.environment.init(this.buildings);

        this.seaCreatures = new SeaCreatureManager();
        this.seaCreatures.init();

        this.boatManager = new BoatManager();
        this.boatManager.init(); 

        this.personManager = new PersonManager(this.buildings);
        this.personManager.init(this.buildings);   

        economy.init();
        ui.init();
        director.init();
        // Übergib die Gebäude-Instanz an den Director, damit Phase 1 Krisen-Schilder korrekt platziert.
        director.setBuildings(this.buildings);
        
        input.init();
        input.onObjectClicked = (obj) => this.handleObjectClick(obj);
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTimeMs = performance.now();
        
        requestAnimationFrame((now) => this.animate(now));
    }

    stop() {
        this.isRunning = false;
    }

    setSpeed(multiplier) {
        if (multiplier >= 0 && multiplier <= 10) {
            this.speedMultiplier = multiplier;
        }
    }

    animate(nowMs) {
        if (!this.isRunning) return;

        requestAnimationFrame((now) => this.animate(now));

        const deltaMs = nowMs - this.lastFrameTimeMs;

        // FPS-Limiter entfernt - verursachte Ruckeln durch Frame-Skipping
        // (Die Render-Loop läuft jetzt ohne künstliche Limitierung)

        this.lastFrameTimeMs = nowMs;

        this.tickAccumulatorMs += deltaMs * this.speedMultiplier;

        while (this.tickAccumulatorMs >= this.tickLengthMs) {
            this.tick();
            this.tickAccumulatorMs -= this.tickLengthMs;
        }

        const deltaSecUnscaled = deltaMs / 1000;
        const deltaSec = deltaSecUnscaled * this.speedMultiplier;
        const totalTime = nowMs / 1000;

        this.updateVisuals(deltaSec, totalTime, deltaSecUnscaled);
        sceneSetup.render();
    }

    tick() {
        this.tickCount++;
        
        economy.tick();
        director.tick();

        events.emit(EVENTS.GAME_TICK, { 
            tickCount: this.tickCount,
            totalTimeInGame: this.tickCount * this.tickLengthMs
        });
    }

    updateVisuals(deltaSec, totalTime, deltaSecUnscaled) {
        if (this.water) this.water.update(totalTime);
        if (this.environment) this.environment.update(deltaSec);
        if (this.buildings) this.buildings.update(deltaSec);
        if (this.seaCreatures) this.seaCreatures.update(deltaSec);

        if (this.boatManager) this.boatManager.update(deltaSec, totalTime);
        if (this.personManager) this.personManager.update(deltaSec, totalTime);

        input.update(deltaSecUnscaled);
    }

    handleObjectClick(obj) {
        if (!obj || !obj.userData || !obj.userData.isInteractable) return;
        
        if (document.getElementById('dialog-overlay') && !document.getElementById('dialog-overlay').classList.contains('hidden')) {
            return;
        }

        const type = obj.userData.type;
        const id = (obj.userData.id ?? null);

        director.onBuildingClicked(type, id);
    }
}

export const game = new Game();
