import * as THREE from 'three';
import { sceneSetup } from '../core/SceneSetup.js';
import { economy } from '../logic/Economy.js';
import { events, ECON_EVENTS, EVENTS } from '../core/Events.js';
import { director } from '../core/Director.js';
import { createRowBoat } from './RowBoat.js';

export const HARBOR_EXIT_Z = 210;
export const DOCK_Z = 180; // Boot weiter vor den Steg setzen
const DOCK_SPACING = 14;
const SEA_BOUND_X = 140;
const SEA_BOUND_Z = HARBOR_EXIT_Z + 80; // Obergrenze, damit Boote im Wasser bleiben
const BOAT_WATERLINE_Y = 2.5; // Basishöhe der Boote über der Wasseroberfläche


const STATE = {
    WAITING_FOR_COMMAND: 0,
    LEAVING_DOCK: 1,
    MOVING_TO_FISH: 2,
    FISHING: 3,
    RETURNING: 4,
    DOCKING: 5,
    UNLOADING: 6,
    WAITING_FOR_DECISION: 7, // NEU: Wartet auf Skript-Events
    WAITING_FOR_SEQUENCE: 8, // NEU: Wartet auf Ende der Inszenierung
    BEING_UPGRADED: 9, // NEU: Motorboot wird bei Kian bearbeitet
    WAITING_FOR_CRATES: 10 // NEU: Wartet bis Kisten bei Gebäuden angekommen sind
};

class Boat {
    constructor(type, dockIndex) {
        this.type = type;
        this.dockIndex = dockIndex;
        this.mesh = null;
        this.netMesh = null;
        this.smokeGroup = null;
        this.leftOar = null;
        this.rightOar = null;
        this.leftOarPivot = null;
        this.rightOarPivot = null;

        this.state = STATE.WAITING_FOR_COMMAND;
        
        // Boote etwas weiter vor den Steg setzen und dichter an den Spieler holen
        this.dockX = (dockIndex - 0.5) * DOCK_SPACING;
        this.position = new THREE.Vector3(this.dockX, BOAT_WATERLINE_Y, DOCK_Z);
        
        this.waypoints = [];
        this.currentWaypointIdx = 0;
        
        this.timer = 0;
        this.fishingDuration = 3.0 + Math.random() * 2.0;
        // ÄNDERUNG: Entladezeit verkürzt für besseren Flow
        this.unloadDuration = (this.type === 'motor') ? 2.0 : 2.0;
        
        this.bobOffset = Math.random() * 10;
        this.wakeTimer = 0;
        this.lastRotY = 0;
        this.lanternGroup = null;
        this.baseScale = 3.2;
        this.targetScale = null;
        this.deckCrates = [];

        // NEU: Upgrade-Timer für Motorboot-Bearbeitung
        this.upgradeTimer = 0;
        this.upgradeDuration = 25.0; // 25 Sekunden Bearbeitungszeit
        this.waitingForCratesTimer = 0;
        this.upgradePhase = 0;
    }

    init() {
        this.mesh = new THREE.Group();
        this.mesh.scale.set(this.baseScale, this.baseScale, this.baseScale); // Größer für bessere Sichtbarkeit

        if (this.type === 'trawler') {
            this.buildTrawler();
        } else if (this.type === 'motor') {
            this.buildMotorBoat();
        } else {
            this.buildRowBoat();
        }

        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = Math.PI;

        this.mesh.userData = { type: 'boat_visual' }; // Visuals ignorieren

        // Riesige Hitbox (unsichtbar)
        // Deckt das Boot und etwas Wasser drumherum ab (20x10x12)
        const hitGeo = new THREE.BoxGeometry(16, 12, 22);

        // WICHTIG: visible: true, aber opacity: 0, damit der Raycaster das Objekt "sieht"
        // ÄNDERUNG: depthWrite: false hinzugefügt, um visuelle Artefakte zu verhindern
        const hitMat = new THREE.MeshBasicMaterial({
            visible: true,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide, // Hilft, Klicks von allen Seiten zu fangen
            depthWrite: false       // <--- NEU: Verhindert "Geister"-Umrisse im Wasser/Nebel
        });

        const hitbox = new THREE.Mesh(hitGeo, hitMat);

        hitbox.position.y = 4; // Leicht nach oben versetzt
        hitbox.userData = {
            type: 'boat',
            id: this.dockIndex,
            isInteractable: true
        };

        this.mesh.add(hitbox);

        // Hinweis: Wir registrieren immer noch this.mesh in SceneSetup, 
        // da der Raycaster rekursiv Kinder (die Hitbox) prüft.

        this.updateTechVisuals();
        this.createHintMesh();

        sceneSetup.scene.add(this.mesh);
        sceneSetup.registerInteractable(this.mesh); // Klickbar machen
    }

    createHintMesh() {
        // Gruppe für den gesamten Pfeil
        this.hintMesh = new THREE.Group();

        // Material: Neongelb, selbstleuchtend (BasicMaterial), damit Schatten es nicht verstecken
        const mat = new THREE.MeshBasicMaterial({ color: 0xFFEA00 });
        const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

        // 1. Schaft (Zylinder)
        const shaftGeo = new THREE.CylinderGeometry(0.4, 0.4, 2.5, 8);
        const shaft = new THREE.Mesh(shaftGeo, mat);
        shaft.position.y = 1.5; // Nach oben schieben
        this.hintMesh.add(shaft);

        // 2. Spitze (Kegel)
        const headGeo = new THREE.ConeGeometry(1.2, 2.0, 8);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = -0.5; // Unten am Schaft
        head.rotation.x = Math.PI; // Spitze nach unten drehen
        this.hintMesh.add(head);

        // Positionieren über dem Boot
        this.hintMesh.position.set(0, 12, 0); 
        this.hintMesh.visible = false;
        
        // Skalieren für bessere Sichtbarkeit
        this.hintMesh.scale.set(1.5, 1.5, 1.5);

        this.mesh.add(this.hintMesh);
    }

    setHintVisible(visible) {
        if (this.hintMesh) {
            this.hintMesh.visible = visible;
        }
    }

    startTrip() {
        this.clearDeck(); // Deck säubern beim Ablegen
        this.setHintVisible(false);

        const targetX = THREE.MathUtils.clamp((Math.random() - 0.5) * 240, -140, 140);
        const targetZ = THREE.MathUtils.clamp(210 + 40 + Math.random() * 60, 240, 290);

        this.waypoints = [
            new THREE.Vector3(this.dockX, BOAT_WATERLINE_Y, HARBOR_EXIT_Z),
            new THREE.Vector3(targetX, BOAT_WATERLINE_Y, targetZ)
        ];
        this.currentWaypointIdx = 0;

        // NEU: In BOOM-Phase wartet Boot erst auf Kisten-Ankunft
        const currentPhase = director?.currentPhaseId;
        if (currentPhase === 'BOOM') {
            this.state = STATE.WAITING_FOR_CRATES;
            this.waitingForCratesTimer = 0;
        } else {
            this.state = STATE.LEAVING_DOCK;
        }

        // Visueller "Pop"-Effekt beim Start
        if (this.mesh) {
            this.mesh.scale.set(
                this.baseScale * 1.2,
                this.baseScale * 0.8,
                this.baseScale * 1.2
            );
            this.targetScale = new THREE.Vector3(this.baseScale, this.baseScale, this.baseScale);
        }
    }

    startReturnTrip() {
        this.waypoints = [
            new THREE.Vector3(this.dockX * 0.5, BOAT_WATERLINE_Y, HARBOR_EXIT_Z),
            new THREE.Vector3(this.dockX, BOAT_WATERLINE_Y, DOCK_Z)
        ];
        this.currentWaypointIdx = 0;
        this.state = STATE.RETURNING;
    }

    // Kiste auf Deck spawnen
    addCrateToDeck() {
        if (!this.mesh) return;

        const geo = new THREE.BoxGeometry(1.0, 0.6, 0.8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true });
        const mesh = new THREE.Mesh(geo, mat);

        const x = (Math.random() - 0.5) * 2.5;
        const z = (Math.random() - 0.5) * 3.0;
        const rot = (Math.random() - 0.5);

        mesh.position.set(x, 1.2, z);
        mesh.rotation.y = rot;
        mesh.scale.set(0, 0, 0);
        
        this.mesh.add(mesh);
        this.deckCrates.push({ mesh, targetScale: 1.0 });
    }

    clearDeck() {
        if (this.deckCrates && this.mesh) {
            this.deckCrates.forEach(c => {
                this.mesh.remove(c.mesh);
                if (c.mesh.geometry) c.mesh.geometry.dispose();
                if (c.mesh.material) c.mesh.material.dispose();
            });
        }
        this.deckCrates = [];
    }

    update(dt, time) {
        if (!this.mesh) return;

        this.updateTechVisuals();

        let speed = 15;
        if (this.type === 'row') speed = 15; // Erhöht von 10 auf 15 (1,5x schneller)
        if (this.type === 'motor') speed = 21.6; // 20% schnelleres Motorboot
        if (this.type === 'trawler') speed = 20;

        const isCrisisMode = (economy.state.isSavingActive && economy.state.marketHealth < 0.2);
        if (isCrisisMode) {
            speed *= 0.6; // Crew erschöpft, Boot langsamer
        }

        if (economy.state.tech.engineType === 'steam' && this.type !== 'row') {
            speed *= 1.5;
        }

        switch (this.state) {
            case STATE.WAITING_FOR_COMMAND:
            case STATE.WAITING_FOR_DECISION:
                // Sanftes Schaukeln im Wasser
                this.mesh.rotation.x = Math.sin(time * 1.5) * 0.03;
                break;

            case STATE.BEING_UPGRADED:
                // NEU: Boot wird bei Kian bearbeitet (Motorboot-Upgrade)
                this.timer += dt;

                // Während des Bauens: Leichtes Wackeln (Hämmern)
                this.mesh.rotation.z = Math.sin(time * 20) * 0.05;

                // Nach 25 Sekunden: Fertigstellung (Fallback Logik)
                if (this.timer >= 25.0) {
                    this.state = STATE.WAITING_FOR_COMMAND;

                    // Finaler "Fertig"-Effekt (Pop!)
                    this.mesh.scale.set(this.baseScale * 1.5, this.baseScale * 1.5, this.baseScale * 1.5);
                    this.targetScale = new THREE.Vector3(this.baseScale, this.baseScale, this.baseScale);

                    // Flag setzen, dass Motorboot fertig ist
                    if (director && director.flags) {
                        director.flags.motorboatReady = true;
                    }

                    // ÄNDERUNG: Keine Nachrichten oder Hinweise mehr
                    // events.emit(EVENTS.TOAST, { message: 'Motorboot fertiggestellt! Bereit zum Ablegen.' });
                    // events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });
                }
                break;

            case STATE.WAITING_FOR_CRATES:
                // NEU: Boot wartet bis Kisten angekommen sind (ca. 1 Sekunde bei Speed 0.85)
                this.waitingForCratesTimer += dt;
                this.mesh.rotation.x = Math.sin(time * 1.5) * 0.03;

                // Nach 1.2 Sekunden (etwas länger als Kisten-Flug) ablegen
                if (this.waitingForCratesTimer >= 2) {
                    this.state = STATE.LEAVING_DOCK;
                    this.waitingForCratesTimer = 0;
                }
                break;

            case STATE.LEAVING_DOCK:
                if (this.navigatePath(dt, speed)) {
                    this.state = STATE.MOVING_TO_FISH;
                    this.currentWaypointIdx++;
                }
                break;

            case STATE.MOVING_TO_FISH:
                if (this.navigatePath(dt, speed)) {
                    this.state = STATE.FISHING;
                    this.timer = 0;
                }
                break;

            case STATE.FISHING:
                this.timer += dt;
                this.mesh.rotation.y += Math.sin(time) * 0.01;
                if (this.timer >= this.fishingDuration) {
                    this.startReturnTrip();
                }
                break;

            case STATE.RETURNING:
                if (this.navigatePath(dt, speed)) {
                    this.state = STATE.DOCKING;
                    this.currentWaypointIdx++;
                }
                break;

            case STATE.DOCKING:
                if (this.navigatePath(dt, speed * 0.6)) {
                    this.state = STATE.UNLOADING;
                    this.timer = 0;
                    this.mesh.rotation.y = Math.PI;
                    events.emit(EVENTS.BOAT_UNLOADING, { 
                        position: this.mesh.position.clone(), 
                        dockIndex: this.dockIndex, 
                        boatType: this.type 
                    });
                }
                break;

            case STATE.UNLOADING:
                this.timer += dt;
                if (this.timer >= this.unloadDuration) {

                    // --- TUTORIAL LOGIK ---
                    // Wir greifen auf den Director zu, um den Zustand zu prüfen
                    if (director.currentPhaseId === 'TUTORIAL') {

                        // Wenn das Tutorial-Einkommen noch NICHT eingesammelt wurde (Trip 1)
                        if (!director.flags.tutorialIncomeCollected) {
                            this.state = STATE.WAITING_FOR_DECISION;

                            // Event senden, damit Director die Dialoge startet
                            events.emit(ECON_EVENTS.TRIP_COMPLETED, {
                                revenue: 50,
                                catchAmount: 20,
                                isTutorial: true
                            });
                        }
                        // Für die automatischen Loop-Fahrten (Trip 2 & 3)
                        else {
                            // Event für Director Loop-Logik
                            events.emit(ECON_EVENTS.TRIP_COMPLETED, { revenue: 50, catchAmount: 15, isTutorialLoop: true });

                            // Sofort wieder losfahren für den Loop-Effekt
                            this.startTrip();
                        }

                    } else if (director.currentPhaseId === 'STAGNATION') {
                        // --- STAGNATION (Kapitel 1): Boot bleibt nach Abrechnung am Steg ---
                        economy.processFishingTrip(this.type);
                        // Wenn bereits Sparmaßnahmen laufen, wartet das Boot auf die Inszenierung.
                        // Falls Kapitel 1 gerade erst gestartet ist (kein Sparmodus), bleibt es am Steg
                        // und kann erneut angeklickt werden.
                        this.state = director.flags?.isSaving ? STATE.WAITING_FOR_SEQUENCE : STATE.WAITING_FOR_COMMAND;

                    } else if (director.currentPhaseId === 'GROWTH_TRAP') {
                        // --- GROWTH TRAP (Kapitel 4): Boot muss für die Inszenierung warten ---
                        const tripData = economy.processFishingTrip(this.type);

                        // Zwingender Stopp für die Story-Sequenz
                        this.state = STATE.WAITING_FOR_SEQUENCE;

                    } else {
                        // --- NORMALES SPIEL (andere Phasen) ---
                        const tripData = economy.processFishingTrip(this.type);

                        // Boot bleibt am Steg, wenn eine Crunch-Sequenz läuft ODER der Director es erzwingt (z.B. Kredit-Recall)
                        if (tripData.isCrunchSequence || (director.flags && director.flags.forceDockLock)) {
                            this.state = STATE.WAITING_FOR_SEQUENCE;
                        } else {
                            this.startTrip();
                        }
                    }
                }
                break;

            case STATE.WAITING_FOR_SEQUENCE:
                // Kapitel 4: Wenn das Schleppnetz gekauft ist, Boot automatisch wieder losschicken
                if (director.currentPhaseId === 'GROWTH_TRAP' &&
                    director.flags &&
                    director.flags.dredgePurchased &&
                    director.flags.growthTrapTripCount === 1) {
                    this.startTrip();
                    break;
                }
                // Boot dümpelt am Steg und wartet auf CMD_RELEASE_BOATS
                this.mesh.rotation.x = Math.sin(time * 1.5) * 0.03;
                break;
        }

        if (this.targetScale) {
            this.mesh.scale.lerp(this.targetScale, dt * 5);
        }

        this.spawnWake(dt);
        this.animateVisuals(dt, time);

        // Deck-Kisten Pop-In Animation
        if (this.deckCrates) {
            this.deckCrates.forEach(c => {
                if (c.mesh.scale.x < c.targetScale) {
                    c.mesh.scale.addScalar(dt * 5);
                    if (c.mesh.scale.x > c.targetScale) c.mesh.scale.setScalar(c.targetScale);
                }
            });
        }
        
        // Wartungsarme Boote wackeln leicht (zusätzlich zur Hauptanimation)
        if (economy.state.isSavingActive) {
            const jitter = Math.sin(time * 12) * 0.03;
            this.mesh.rotation.z += jitter;
            if (this.leftOarPivot) {
                this.leftOarPivot.rotation.x += jitter * 0.5;
            }
        }
        
        // HINWEIS ANIMATION (Hüpfen)
        if (this.hintMesh && this.hintMesh.visible) {
            // Starkes Hüpfen
            this.hintMesh.position.y = 12 + Math.sin(time * 6) * 2.5;
            // Langsame Rotation
            this.hintMesh.rotation.y += dt;
        }
    }

    navigatePath(dt, speed) {
        if (this.currentWaypointIdx >= this.waypoints.length) return true;

        const target = this.waypoints[this.currentWaypointIdx];
        const current = this.mesh.position;
        const dist = current.distanceTo(target);

        if (dist < 2.0) return true;

        const direction = new THREE.Vector3().subVectors(target, current).normalize();
        this.mesh.position.add(direction.multiplyScalar(speed * dt));
        // Safety: Stelle sicher, dass das Boot im Wasserbereich bleibt
        this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -SEA_BOUND_X, SEA_BOUND_X);
        this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, DOCK_Z, SEA_BOUND_Z);

        const targetAngle = Math.atan2(direction.x, direction.z);
        let rotDiff = targetAngle - this.mesh.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        this.mesh.rotation.y += rotDiff * 5.0 * dt;

        return false;
    }

    animateVisuals(dt, time) {
        const isCrisisMode = (economy.state.isSavingActive && economy.state.marketHealth < 0.2);
        const animTime = isCrisisMode ? time * 0.6 : time;

        const isMoving = ![
            STATE.WAITING_FOR_COMMAND,
            STATE.WAITING_FOR_DECISION,
            STATE.WAITING_FOR_SEQUENCE,
            STATE.FISHING,
            STATE.UNLOADING,
            STATE.BEING_UPGRADED,
            STATE.WAITING_FOR_CRATES
        ].includes(this.state);
        const waveHeight = isMoving ? 0.3 : 0.15;
        const bobFreq = isMoving ? 3.0 : 1.5;

        let currentWaterline = BOAT_WATERLINE_Y;
        if (this.deckCrates && this.deckCrates.length > 0) {
            currentWaterline -= this.deckCrates.length * 0.15;
        }
        if (isCrisisMode) currentWaterline -= 0.2; // Boot liegt tiefer

        this.mesh.position.y = currentWaterline + Math.sin(animTime * bobFreq + this.bobOffset) * waveHeight;
        this.mesh.rotation.z = Math.sin(animTime * 1.0 + this.bobOffset) * (isCrisisMode ? 0.1 : 0.05);

        if (isMoving) {
            this.mesh.rotation.x = Math.sin(animTime * 2.0) * 0.03 - 0.05;
        } else {
            this.mesh.rotation.x = 0;
        }

        if (this.hintMesh && this.hintMesh.visible) {
            this.hintMesh.position.y = 8 + Math.sin(animTime * 4) * 1.5;
        }

        // Rowing animation for row boats
        if (this.type === 'row' && (this.leftOarPivot || this.rightOarPivot)) {
            const movingStates = [
                STATE.LEAVING_DOCK,
                STATE.MOVING_TO_FISH,
                STATE.RETURNING,
                STATE.DOCKING
            ];
            const isRowing = movingStates.includes(this.state);
            const speedFactor = 3.2;
            const amplitude = 0.6;
            const verticalAmplitude = 0.35;

            if (isRowing) {
                const rowCycle = Math.sin(animTime * speedFactor);
                const verticalCycle = Math.cos(animTime * speedFactor);
                const applyOar = (pivot, isLeft) => {
                    if (!pivot) return;
                    const baseYaw = pivot.userData.baseYaw || 0;
                    const mirrorDir = isLeft ? -1 : 1;
                    pivot.rotation.y = baseYaw + rowCycle * amplitude * mirrorDir;
                    pivot.rotation.x = -0.15 + verticalCycle * verticalAmplitude;
                };
                applyOar(this.leftOarPivot, true);
                applyOar(this.rightOarPivot, false);
            } else {
                const restOar = (pivot) => {
                    if (!pivot) return;
                    pivot.rotation.y = pivot.userData.baseYaw || 0;
                    pivot.rotation.x = -0.25;
                };
                restOar(this.leftOarPivot);
                restOar(this.rightOarPivot);
            }
        }

        if (this.smokeGroup) {
            const hasSteam = (economy.state.tech.engineType === 'steam' || this.type === 'trawler' || this.type === 'motor');
            const shouldSmoke = hasSteam && isMoving;

            this.smokeGroup.visible = shouldSmoke;

            if (shouldSmoke) {
                this.smokeGroup.children.forEach((puff, i) => {
                    puff.position.y += dt * 3;
                    puff.scale.addScalar(dt * 0.5);
                    puff.material.opacity -= dt * 0.8;

                    if (puff.material.opacity <= 0) {
                        puff.position.set(0, 0, 0);
                        puff.scale.set(1, 1, 1);
                        puff.material.opacity = 0.6;
                    }
                });
            }
        }

        // NEU: Motor-Vibration für Motorboot
        if (this.type === 'motor' && this.meshContainer && isMoving) {
            this.meshContainer.position.set(
                Math.sin(time * 30) * 0.005,
                Math.sin(time * 40) * 0.005,
                0
            );
        } else if (this.meshContainer) {
            this.meshContainer.position.set(0, 0, 0);
        }

        // NEU: Laterne pendeln (Motorboot)
        if (this.type === 'motor' && this.lanternPivot) {
            this.lanternPivot.rotation.z = Math.sin(time * 0.8 + Math.PI) * 0.3;
            this.lanternPivot.rotation.x = Math.sin(time * 1.0 + Math.PI) * 0.2;
        }

        // NEU: Flagge im Wind (Motorboot)
        if (this.type === 'motor' && this.flagMesh) {
            const pos = this.flagMesh.geometry.attributes.position;
            for(let i=0; i<pos.count; i++){
                const x = pos.getX(i);
                if(x > 0) {
                    pos.setZ(i, Math.sin(x * 5 - time * 10) * (x * 0.3));
                }
            }
            pos.needsUpdate = true;
            this.flagMesh.geometry.computeVertexNormals();
        }

        // If moving, sway lantern opposite to movement (Ruderboot)
        if (this.lanternGroup) {
            const sway = Math.sin(time * 3) * 0.1;
            this.lanternGroup.rotation.z = sway + (this.mesh.rotation.y - (this.lastRotY || 0)) * -10;
            this.lanternGroup.rotation.x = Math.sin(time * 2) * 0.05;
        }
        this.lastRotY = this.mesh.rotation.y;
    }

    spawnWake(dt) {
        // Update existing wake particles first
        this.updateWake(dt);

        const isMoving = ![
            STATE.WAITING_FOR_COMMAND,
            STATE.WAITING_FOR_DECISION,
            STATE.WAITING_FOR_SEQUENCE,
            STATE.FISHING,
            STATE.UNLOADING,
            STATE.BEING_UPGRADED,
            STATE.WAITING_FOR_CRATES
        ].includes(this.state);
        if (!isMoving) {
            this.wakeTimer = 0;
            return;
        }

        // OPTIMIERUNG: Weniger Partikel für Tablets
        const interval = (this.type === 'row') ? 0.8 : 0.6;
        this.wakeTimer += dt;

        if (this.wakeTimer >= interval) {
            this.wakeTimer = 0;
            this.createWakeParticle();
        }
    }

    createWakeParticle() {
        // Prüfen, ob das Schleppnetz aktiv ist (Kapitel 4)
        const isDredge = economy.state.tech.netType === 'dredge';

        // Create a flat plane
        const geo = new THREE.PlaneGeometry(1, 1);

        // Farbe: Weiß für Gischt, Braun für aufgewirbeltes Sediment
        const color = isDredge ? 0x5D4037 : 0xFFFFFF;
        const opacity = isDredge ? 0.6 : 0.4; // Schlamm ist dichter

        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);

        // Position at the back of the boat, slightly at water level
        mesh.rotation.x = -Math.PI / 2;
        // Local to scene, not boat, so it stays behind
        mesh.position.copy(this.mesh.position);
        mesh.position.y = 0.1; // Just above water
        
        // Offset slightly behind boat based on rotation
        const offset = new THREE.Vector3(0, 0, -5).applyAxisAngle(new THREE.Vector3(0,1,0), this.mesh.rotation.y);
        mesh.position.add(offset);

        sceneSetup.scene.add(mesh);

        // OPTIMIERUNG: Kürzere Lebensdauer für Tablets (weniger gleichzeitige Partikel)
        mesh.userData = { life: 0.8 };
        if (!this.wakeParticles) this.wakeParticles = [];
        this.wakeParticles.push(mesh);
    }

    updateWake(dt) {
        if (!this.wakeParticles) return;
        
        for (let i = this.wakeParticles.length - 1; i >= 0; i--) {
            const p = this.wakeParticles[i];
            p.userData.life -= dt * 0.5; // 2 seconds life
            
            // Expand and fade
            const s = 1 + (1.0 - p.userData.life) * 4.0;
            p.scale.set(s, s, s);
            p.material.opacity = p.userData.life * 0.4;

            if (p.userData.life <= 0) {
                sceneSetup.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                this.wakeParticles.splice(i, 1);
            }
        }
    }

    updateTechVisuals() {
        if (this.netMesh) {
            this.netMesh.visible = (economy.state.tech.netType === 'dredge');
        }
    }

    buildRowBoat() {
        const rowBoat = createRowBoat();
        this.mesh.add(rowBoat);

        // Store animation pivots from the model
        this.leftOarPivot = rowBoat.userData.leftOarPivot || null;
        this.rightOarPivot = rowBoat.userData.rightOarPivot || null;
        this.leftOar = rowBoat.userData.leftOarHandle || null;
        this.rightOar = rowBoat.userData.rightOarHandle || null;
        this.lanternGroup = rowBoat.userData.lanternGroup || null;
    }

    buildMotorBoat() {
        // --- Materialien initialisieren ---
        const mat = (col, rough = 0.8) => new THREE.MeshStandardMaterial({
            color: col, flatShading: true, roughness: rough
        });

        const colors = {
            hullRed: 0x8a3324,
            hullStripe: 0xf0f0f0,
            deckWood: 0x8f5e38,
            cabinWhite: 0xeaeaea,
            roofGrey: 0x4a4a4a,
            glass: 0x2a4a5a,
            rust: 0x5c3a21,
            tire: 0x1a1a1a,
            rope: 0xc2a068
        };

        const materials = {
            hull: mat(colors.hullRed),
            stripe: mat(colors.hullStripe),
            deck: mat(colors.deckWood),
            cabin: mat(colors.cabinWhite),
            roof: mat(colors.roofGrey),
            glass: mat(colors.glass, 0.1),
            rust: mat(colors.rust),
            tire: mat(colors.tire),
            rope: mat(colors.rope),
            lanternGlow: new THREE.MeshStandardMaterial({
                color: 0xffffaa, emissive: 0xff9900, emissiveIntensity: 2
            }),
            flag: new THREE.MeshStandardMaterial({
                color: 0xff3333, side: THREE.DoubleSide, flatShading: true
            })
        };

        // Container für Vibrationen (Motor-Effekt)
        this.meshContainer = new THREE.Group();
        this.mesh.add(this.meshContainer);

        // === RUMPF ===
        const hullGeo = new THREE.BoxGeometry(3.2, 1.8, 7.5, 4, 3, 6);
        const pos = hullGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i);
            let y = pos.getY(i);
            let z = pos.getZ(i);

            if (z > 1) { x *= 0.6 * (1 - (z-1)/5); y += (z-1) * 0.3; } // Bug
            if (z < -2) { x *= 0.85; y -= 0.1; } // Heck
            if (y < 0) { x *= 0.7; z *= 0.95; } // Boden
            pos.setXYZ(i, x, y, z);
        }
        hullGeo.computeVertexNormals();
        const hull = new THREE.Mesh(hullGeo, materials.hull);
        hull.position.y = 0.6;
        hull.castShadow = true;
        hull.receiveShadow = true;
        this.meshContainer.add(hull);

        // Weißer Streifen
        const stripeGeo = new THREE.BoxGeometry(3.3, 0.25, 7.65, 4, 1, 6);
        const sPos = stripeGeo.attributes.position;
        for(let i=0; i<sPos.count; i++){
            let x = sPos.getX(i); let y = sPos.getY(i); let z = sPos.getZ(i);
            if(z > 1) { x *= 0.6 * (1 - (z-1)/5); y += (z-1)*0.3; }
            if(z < -2) x *= 0.88;
            sPos.setXYZ(i,x,y,z);
        }
        stripeGeo.computeVertexNormals();
        const stripe = new THREE.Mesh(stripeGeo, materials.stripe);
        stripe.position.y = 1.35;
        stripe.castShadow = true;
        this.meshContainer.add(stripe);

        // === DECK ===
        const deck = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.2, 6.4), materials.deck);
        deck.position.set(0, 1.51, 0.2);
        deck.receiveShadow = true;
        this.meshContainer.add(deck);

        // === KABINE ===
        const mainCabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.1, 2.5), materials.cabin);
        mainCabin.position.set(0, 2.5, -0.5);
        mainCabin.castShadow = true;
        this.meshContainer.add(mainCabin);

        const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.5), materials.cabin);
        bridge.position.set(0, 3.2, 0.9);
        bridge.castShadow = true;
        this.meshContainer.add(bridge);

        const glass = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 0.1), materials.glass);
        glass.position.set(0, 3.2, 1.15);
        this.meshContainer.add(glass);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 3.2), materials.roof);
        roof.position.set(0, 3.6, -0.4);
        roof.castShadow = true;
        this.meshContainer.add(roof);

        // === AUSPUFF ===
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2), materials.rust);
        pipe.position.set(0.8, 4, -1.8);
        pipe.rotation.set(-0.1, 0, -0.1);
        pipe.castShadow = true;
        this.meshContainer.add(pipe);

        // Rauchsystem
        this.createSmokeSystem(0.8, 4.2, -1.8);

        // === REIFEN (Fender) ===
        const tireGeo = new THREE.TorusGeometry(0.25, 0.1, 8, 16);
        const tPos = [{x:1.65, z:1.5}, {x:1.65, z:-0.5}, {x:-1.65, z:0.5}, {x:-1.65, z:-2.0}];
        tPos.forEach(p => {
            const tire = new THREE.Mesh(tireGeo, materials.tire);
            tire.position.set(p.x, 1.6, p.z);
            tire.rotation.y = Math.PI / 2;
            this.meshContainer.add(tire);

            const rope = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), materials.rope);
            rope.position.set(p.x > 0 ? p.x-0.1 : p.x+0.1, 1.9, p.z);
            this.meshContainer.add(rope);
        });

        // === WINDE ===
        const winchBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.8), materials.rust);
        winchBase.position.set(0, 1.8, -3);
        winchBase.castShadow = true;
        this.meshContainer.add(winchBase);

        const winchDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12), materials.rope);
        winchDrum.rotation.z = Math.PI / 2;
        winchDrum.position.set(0, 2.1, -3);
        this.meshContainer.add(winchDrum);

        // === MAST ===
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 5, 8), materials.roof);
        mast.position.set(0, 4, 1.5);
        mast.castShadow = true;
        this.meshContainer.add(mast);

        const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5), materials.roof);
        cross.rotation.z = Math.PI/2;
        cross.position.set(0, 5.5, 1.5);
        this.meshContainer.add(cross);

        // === LATERNE (mit Pivot) ===
        this.lanternPivot = new THREE.Group();
        this.lanternPivot.position.set(0.8, 5.5, 1.5);
        this.meshContainer.add(this.lanternPivot);

        const lRope = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.02), new THREE.MeshStandardMaterial({color:0x000000}));
        lRope.position.y = -0.25;
        this.lanternPivot.add(lRope);

        const lantern = new THREE.Group();
        lantern.position.y = -0.6;
        this.lanternPivot.add(lantern);
        lantern.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.3, 6), materials.rust));
        lantern.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 6), materials.lanternGlow));

        const light = new THREE.PointLight(0xff9900, 1, 4);
        lantern.add(light);

        // === FLAGGE ===
        const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5), materials.roof);
        flagPole.position.set(0, 6.5, 1.5);
        this.meshContainer.add(flagPole);

        const flagGeo = new THREE.PlaneGeometry(0.8, 0.5, 5, 3);
        this.flagMesh = new THREE.Mesh(flagGeo, materials.flag);
        this.flagMesh.position.set(0.4, 7, 1.5);
        this.meshContainer.add(this.flagMesh);

        // === DREDGE NET VISUAL (Schleppnetz Upgrade) ===
        // Ein aufgerolltes, schweres Netz am Heck hinter der Winde
        const netGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.8, 8);
        const netMat = new THREE.MeshStandardMaterial({
            color: 0x3E2723, // Dunkelbraun/Schlammig
            roughness: 1.0,
            flatShading: true
        });
        this.netMesh = new THREE.Mesh(netGeo, netMat);
        this.netMesh.rotation.z = Math.PI / 2;
        this.netMesh.position.set(0, 2.0, -4.2); // Am Heck positioniert
        this.netMesh.castShadow = true;
        this.netMesh.visible = false; // Standardmäßig unsichtbar
        this.meshContainer.add(this.netMesh);
    }

    buildTrawler() {
        // --- FARBPALETTE ---
        const colors = {
            hullRed: 0x7B241C,
            hullGrey: 0x4a5568,
            deckGrey: 0x2d3748,
            superstruct: 0xCBD5E0,
            rust: 0xA04000,
            hazard: 0xF1C40F,
            metalDark: 0x1A202C,
            glass: 0x3498DB,
            net: 0x17202A
        };

        // --- MATERIALIEN ---
        const mat = {
            hullRed: new THREE.MeshStandardMaterial({ color: colors.hullRed, flatShading: true, roughness: 0.8 }),
            hullGrey: new THREE.MeshStandardMaterial({ color: colors.hullGrey, flatShading: true, roughness: 0.7 }),
            deck: new THREE.MeshStandardMaterial({ color: colors.deckGrey, flatShading: true, roughness: 0.9 }),
            super: new THREE.MeshStandardMaterial({ color: colors.superstruct, flatShading: true, roughness: 0.6 }),
            metal: new THREE.MeshStandardMaterial({ color: colors.metalDark, flatShading: true, metalness: 0.5, roughness: 0.5 }),
            hazard: new THREE.MeshStandardMaterial({ color: colors.hazard, flatShading: true }),
            glass: new THREE.MeshStandardMaterial({ color: colors.glass, flatShading: true, metalness: 0.9, roughness: 0.1, emissive: colors.glass, emissiveIntensity: 0.1 }),
            net: new THREE.MeshStandardMaterial({ color: colors.net, flatShading: true, wireframe: false }),
            rust: new THREE.MeshStandardMaterial({ color: colors.rust, flatShading: true })
        };

        const trawler = new THREE.Group();

        // --- KONSTANTEN FÜR RUMPFGRÖSSE ---
        const hullLength = 18;
        const hullWidth = 6;
        const hullHeight = 4;
        const vertex = new THREE.Vector3(); // Temporärer Vektor für Vertex-Manipulation

        // ==========================================
        // 1. DER MASSIVE RUMPF (Hull Geometry Manipulation)
        // ==========================================
        let hullGeo = new THREE.BoxGeometry(hullWidth, hullHeight, hullLength, 12, 8, 24);
        const posAttr = hullGeo.getAttribute('position');

        for (let i = 0; i < posAttr.count; i++) {
            vertex.fromBufferAttribute(posAttr, i);
            const x = vertex.x; const y = vertex.y; const z = vertex.z;

            // Bug (Vorne): Spitzer und hoher
            if (z > 3) {
                const bowFactor = (z - 3) / 6;
                vertex.x *= (1 - bowFactor * 0.9);
                if (y > 0) vertex.y += bowFactor * 3;
                // Wulstbug unten
                if (y < -1 && z > 6) {
                    vertex.x *= (1 + bowFactor * 0.5);
                    vertex.z += 0.5;
                }
            }
            // Heck (Hinten): Flach und breit mit Rampe
            if (z < -2) {
                if (y > 1) vertex.y = 1; // Arbeitsdeck vertiefen
                // Rampe (Slipway) für Netze
                if (z < -8 && Math.abs(x) < 1.5 && y < 1.5 && y > -1) {
                    vertex.y -= (z + 8) * -0.3;
                }
            }
            // Allgemein
            if (y < 0 && z > -7 && z < 5) vertex.x *= 1.1; // Bauch
            if (y < -hullHeight/2 + 1) vertex.x *= 0.7; // Kiel

            posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        hullGeo.computeVertexNormals();

        // Oberer Rumpf (Grau)
        const hullTop = new THREE.Mesh(hullGeo, mat.hullGrey);
        hullTop.position.y = 1;
        hullTop.castShadow = true;
        hullTop.receiveShadow = true;
        trawler.add(hullTop);

        // Unterer Rumpf (Rot, leicht kleiner skaliert, um im Grauen zu liegen)
        const hullBot = new THREE.Mesh(hullGeo.clone(), mat.hullRed);
        hullBot.scale.set(0.99, 0.99, 0.99);
        hullBot.position.y = 0.8;
        trawler.add(hullBot);

        // Deck (angepasst an die Rumpfgeometrie)
        const deckGeo = new THREE.BoxGeometry(hullWidth * 0.95, 0.3, hullLength * 0.8);
        const deckPos = deckGeo.getAttribute('position');
        for(let i=0; i<deckPos.count; i++){
             vertex.fromBufferAttribute(deckPos, i);
             if(vertex.z > 3) vertex.x *= 0.4;
             if(vertex.z < -2) vertex.y -= 1.2; // Stufe zum Heckarbeitsdeck
             deckPos.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        deckGeo.computeVertexNormals();
        const deck = new THREE.Mesh(deckGeo, mat.deck);
        deck.position.y = 2.2;
        deck.receiveShadow = true;
        trawler.add(deck);

        // ==========================================
        // 2. DIE AUFBAUTEN (Superstructure/Bridge)
        // ==========================================
        const superGroup = new THREE.Group();
        superGroup.position.set(0, 2.5, 1.5);

        // Level 1: Wohnbereich
        const level1 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.8, 5), mat.super);
        level1.position.y = 0.9;
        level1.castShadow = true; level1.receiveShadow = true;
        superGroup.add(level1);

        // Brücke (Level 2)
        const bridgeGeo = new THREE.BoxGeometry(5, 1.6, 2.5);
        const bridgePos = bridgeGeo.getAttribute('position');
        for(let i=0; i<bridgePos.count; i++){
            vertex.fromBufferAttribute(bridgePos, i);
            // Fensterfront leicht neigen
            if(vertex.z > 0.8 && vertex.y < 0) vertex.z -= 0.4;
            bridgePos.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        bridgeGeo.computeVertexNormals();
        const bridge = new THREE.Mesh(bridgeGeo, mat.super);
        bridge.position.set(0, 2.5, 0.8);
        superGroup.add(bridge);

        // Fensterband
        const windowBand = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.6, 2.6), mat.glass);
        windowBand.position.set(0, 2.6, 0.8);
        superGroup.add(windowBand);

        // Schornsteine (Doppelt, massiv)
        const stackGeo = new THREE.CylinderGeometry(0.4, 0.5, 2.5, 8);
        const stack1 = new THREE.Mesh(stackGeo, mat.hullGrey);
        stack1.position.set(-1, 4, -1.5);
        stack1.castShadow = true;
        superGroup.add(stack1);

        const stack2 = stack1.clone();
        stack2.position.set(1, 4, -1.5);
        superGroup.add(stack2);

        // Radar & Mast
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 5, 6), mat.metal);
        mast.position.set(0, 5.5, 0.4);
        superGroup.add(mast);
        const radarBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.2), mat.super);
        radarBar.position.set(0, 2.5, 0);
        mast.add(radarBar); // Wird später in der Animation gedreht

        // Rettungsinseln
        for(let i=0; i<4; i++) {
            const raft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8), mat.super);
            raft.rotation.z = Math.PI/2;
            raft.position.set(i%2===0 ? -1.6 : 1.6, 4.5, 0.8 + (i<2?-0.4:0.4));
            superGroup.add(raft);
        }

        trawler.add(superGroup);

        // ==========================================
        // 3. INDUSTRIELLE MASCHINERIE
        // ==========================================

        // HECKGALGEN (A-Frame Gantry - Gelb)
        const gantryGroup = new THREE.Group();
        gantryGroup.position.set(0, 1.2, -6.5);

        const legGeo = new THREE.BoxGeometry(0.4, 5, 0.4);
        const legL = new THREE.Mesh(legGeo, mat.hazard);
        legL.position.set(-1.8, 2.5, 0);
        legL.rotation.z = 0.15;
        gantryGroup.add(legL);

        const legR = legL.clone();
        legR.position.set(1.8, 2.5, 0);
        legR.rotation.z = -0.15;
        gantryGroup.add(legR);

        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 0.6), mat.hazard);
        crossBar.position.set(0, 4.8, 0);
        gantryGroup.add(crossBar);

        // Suchscheinwerfer am Galgen (wird im Hauptskript beleuchtet)
        const lightBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), mat.super);
        lightBox.position.set(0, 4.6, 0.4);
        gantryGroup.add(lightBox);

        trawler.add(gantryGroup);

        // HAUPTWINDEN (Maschinengruppe)
        const winchGroup = new THREE.Group();
        winchGroup.position.set(0, 1.8, -0.8);
        function createWinch(xPos) {
            const grp = new THREE.Group();
            grp.position.set(xPos, 0, 0);
            const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 12), mat.metal);
            drum.rotation.z = Math.PI/2; drum.castShadow = true; grp.add(drum);
            const motor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.2), mat.hazard);
            motor.position.set(0, -0.2, 0.8); grp.add(motor);
            return grp;
        }
        winchGroup.add(createWinch(-1.2));
        winchGroup.add(createWinch(1.2));
        trawler.add(winchGroup);

        // Kran (Vorne)
        const craneGroup = new THREE.Group();
        craneGroup.position.set(2, 2.5, 3);
        const craneBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8), mat.hazard);
        craneBase.position.y = 0.6; craneGroup.add(craneBase);
        const craneArm1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), mat.hazard);
        craneArm1.position.set(0, 1.6, 0); craneArm1.rotation.x = -0.4; craneBase.add(craneArm1);
        trawler.add(craneGroup);

        // ==========================================
        // 4. KÜNSTLERISCHE DETAILS
        // ==========================================

        // Das NETZ (Haufen)
        const netGeo = new THREE.IcosahedronGeometry(1.2, 1);
        const netPos = netGeo.getAttribute('position');
        for(let i=0; i<netPos.count; i++){
            vertex.fromBufferAttribute(netPos, i);
            vertex.y *= 0.4;
            vertex.x *= 1.5;
            vertex.addScaledVector(new THREE.Vector3(Math.random()-0.5, Math.random()*0.5, Math.random()-0.5), 0.5);
            netPos.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        netGeo.computeVertexNormals();
        this.netMesh = new THREE.Mesh(netGeo, mat.net);
        this.netMesh.position.set(0, 1.4, -4.5);
        this.netMesh.visible = false;
        trawler.add(this.netMesh);

        // Füge den Trawler zum Haupt-Mesh hinzu
        this.mesh.add(trawler);

        // Rauchsystem (Position angepasst an neue Schornsteine)
        this.createSmokeSystem(0, 6.5, 0.4);
    }

    createSmokeSystem(x, y, z) {
        this.smokeGroup = new THREE.Group();
        const smokeGeo = new THREE.DodecahedronGeometry(0.5, 0);
        const smokeMat = new THREE.MeshStandardMaterial({ color: 0xBBDEFB, transparent: true, opacity: 0.6, flatShading: true });
        
        for(let i=0; i<6; i++) {
            const s = new THREE.Mesh(smokeGeo, smokeMat.clone());
            s.position.y = i * 0.5;
            this.smokeGroup.add(s);
        }
        this.smokeGroup.position.set(x, y, z);
        this.mesh.add(this.smokeGroup);
        this.smokeGroup.visible = false;
    }

    // Hinweis-System entfernt
}

export class BoatManager {
    constructor() {
        this.boats = [];
        this.constructionCloud = null;
    }

    init() {
        // Initiale Boote basierend auf Economy State erstellen
        for (let i = 0; i < economy.state.boatsRow; i++) this.addBoat('row');
        for (let i = 0; i < economy.state.boatsMotor; i++) this.addBoat('motor');
        for (let i = 0; i < economy.state.boatsTrawl; i++) this.addBoat('trawler');

        // WICHTIG: Duplikate entfernen (falls durch replaceBoatWithPoof bereits Boote existieren)
        // Dies verhindert, dass nach einem Kauf zwei identische Boote am selben Dock stehen
        this.removeDuplicateBoats();

        // Events
        events.on(ECON_EVENTS.BOAT_BOUGHT, (payload) => {
            // NEU: Wenn Motorboot gekauft wird, ersetze Ruderboot mit Puff-Effekt
            if (payload.type === 'motor' && this.boats.length > 0 && this.boats[0].type === 'row') {
                this.replaceBoatWithPoof(0, 'motor');
            } else {
                this.addBoat(payload.type);
                this.startBoat(this.boats.length - 1);
            }
        });

        events.on(ECON_EVENTS.UPGRADE_BOUGHT, (payload) => {
            if (payload.category === 'NETS' || payload.category === 'ENGINES') {
                this.boats.forEach(boat => boat.updateTechVisuals());
            }
        });

        // Start-Befehl (Klick oder Script)
        events.on(EVENTS.CMD_START_BOAT, (payload) => {
            const idx = (typeof payload?.id === 'number' && !isNaN(payload.id)) ? payload.id : 0;
            this.startBoat(idx);
        });

        // Hinweis sichtbar schalten (Tutorial)
        events.on(EVENTS.CMD_SHOW_BOAT_HINT, (payload) => {
            const idx = (typeof payload?.id === 'number' && !isNaN(payload.id)) ? payload.id : 0;
            const boat = this.boats[idx];
            if (boat && boat.setHintVisible) {
                boat.setHintVisible(!!payload.show);
            }
        });

        // Listener für Kisten, die zurück aufs Boot geworfen werden
        events.on('world:crate_landed_on_boat', (data) => {
            const boat = this.boats[data?.boatId || 0];
            if (boat && typeof boat.addCrateToDeck === 'function') {
                boat.addCrateToDeck();
            }
        });

        // Boote nach Inszenierung freigeben
        events.on(EVENTS.CMD_RELEASE_BOATS, () => {
            let blockedByDredge = false;

            this.boats.forEach(boat => {
                if (boat.state === STATE.WAITING_FOR_SEQUENCE) {
                    const hasDoneFirstGrowthTrapTrip = (director.flags?.growthTrapTripCount || 0) >= 1;
                    if (director.currentPhaseId === 'GROWTH_TRAP' && !director.flags?.dredgePurchased && hasDoneFirstGrowthTrapTrip) {
                        blockedByDredge = true;
                        return;
                    }
                    boat.startTrip();
                }
            });

            if (blockedByDredge) {
                events.emit(EVENTS.TOAST, {
                    message: 'Wir brauchen erst das Schleppnetz. Ab zur Werft!'
                });
                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });
            }
        });
    }

    addBoat(type) {
        const index = this.boats.length;
        const boat = new Boat(type, index);
        boat.init();
        this.boats.push(boat);
    }

    // NEU: Ersetzt ein Boot mit einem visuellen "Puff"-Effekt
    replaceBoatWithPoof(index, newType) {
        const oldBoat = this.boats[index];
        if (!oldBoat) return;

        // Position und Dock-Info des alten Bootes speichern
        const dockIndex = oldBoat.dockIndex;
        const position = oldBoat.mesh.position.clone();

        // Puff-Effekt erstellen
        this.createPoofEffect(position);

        // Altes Boot entfernen
        if (oldBoat.mesh) {
            sceneSetup.scene.remove(oldBoat.mesh);
            sceneSetup.unregisterInteractable(oldBoat.mesh);
        }

        // Neues Boot erstellen
        const newBoat = new Boat(newType, dockIndex);
        newBoat.init();

        // Boot im Array ersetzen
        this.boats[index] = newBoat;

        // Visuelles Pop-In (Boot startet klein aber sichtbar)
        if (newBoat.mesh) {
            newBoat.mesh.scale.set(0.1, 0.1, 0.1);
            newBoat.targetScale = new THREE.Vector3(newBoat.baseScale, newBoat.baseScale, newBoat.baseScale);
        }

        // UNTERSCHEIDUNG: Motorboot vs Trawler
        if (newType === 'motor') {
            // NEU: Boot in Upgrade-Zustand versetzen (Bearbeitungszeit bei Kian)
            newBoat.state = 9; // STATE.BEING_UPGRADED
            newBoat.timer = 0;

            // NEU: Boom-Effekt an Kians Werft auslösen
            events.emit('world:trigger_boom_expansion');

            // Bark von Kian: "Das Boot wird gerade fertiggestellt. Dauert nicht lange!"
            events.emit(EVENTS.SHOW_WORLD_BARK, {
                targetId: 'shipyard',
                speaker: 'Kian',
                text: 'Ich baue gerade dein Motorboot fertig. Das wird großartig!',
                icon: '🔧',
                isCrisis: false
            });
        } else if (newType === 'trawler') {
            // Trawler ist sofort einsatzbereit (kein Bau-Timer)
            newBoat.state = STATE.WAITING_FOR_COMMAND;

            // Gelben Pfeil-Hinweis anzeigen
            newBoat.setHintVisible(true);
        }
    }

    // Startet den Motorboot-Bau (ohne automatisches Beenden)
    startMotorBoatConstruction(index) {
        const oldBoat = this.boats[index];
        if (!oldBoat) return;

        const pos = oldBoat.mesh.position.clone();

        // Event feuern für Umgebung
        events.emit(EVENTS.START_BOOM_CONSTRUCTION);

        // Staubwolke erzeugen
        this.createConstructionCloud(pos);

        // Altes Boot entfernen
        sceneSetup.scene.remove(oldBoat.mesh);
        sceneSetup.unregisterInteractable(oldBoat.mesh);

        // Status setzen: Wird gebaut
        // Wir markieren den Slot mit dem alten Boot (für spätere Referenz)
        if (oldBoat) oldBoat.state = 9; // BEING_UPGRADED

        // KEIN setTimeout mehr hier! Der Director ruft finish auf.
    }

    // NEU: Explizite Methode zum Beenden des Motorboot-Baus
    finishMotorBoatConstruction(index) {
        const oldBoat = this.boats[index]; // Das ist noch das Referenz-Objekt (Ruderboot)
        if (!oldBoat) return;

        const dockIndex = oldBoat.dockIndex;
        const pos = oldBoat.position.clone(); // Original Position

        // 1. Wolke entfernen
        this.removeConstructionCloud();

        // 2. Daten aktualisieren
        if (economy) {
            if (economy.state.boatsRow > 0) economy.state.boatsRow--;
            economy.state.boatsMotor++;

            if (director && director.flags) {
                director.flags.hasMotorboat = true;
                director.flags.motorboatReady = true;
            }
        }

        // 3. Neues Boot erstellen
        const newBoat = new Boat('motor', dockIndex);
        newBoat.init();
        newBoat.state = 0; // WAITING_FOR_COMMAND

        this.boats[index] = newBoat;

        // 4. Splash Effekt (Drop In)
        newBoat.mesh.position.y = 10;
        const targetY = 2.5;

        let fallTime = 0;
        const fallAnim = setInterval(() => {
            fallTime += 0.05;
            newBoat.mesh.position.y = THREE.MathUtils.lerp(10, targetY, fallTime);

            if (fallTime >= 1) {
                clearInterval(fallAnim);
                newBoat.mesh.position.y = targetY;
                events.emit(EVENTS.BOAT_UNLOADING, { position: pos, dockIndex: 0, boatType: 'motor' });
            }
        }, 16);

        // 5. Boom-Animation beenden
        events.emit(EVENTS.END_BOOM_CONSTRUCTION);

        // 6. Pfeil anzeigen
        events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });
    }

    createConstructionCloud(pos) {
        this.constructionCloud = new THREE.Group();

        // Viele Low-Poly Kugeln (Icosahedron)
        const geo = new THREE.IcosahedronGeometry(1, 0);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xDDDDDD,
            transparent: true,
            opacity: 0.9,
            flatShading: true
        });

        for(let i=0; i<12; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            // Zufällige Verteilung in einer großen Kugelform
            mesh.position.set(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 5 + 3, // Etwas über Wasser
                (Math.random() - 0.5) * 8
            );
            mesh.scale.setScalar(2 + Math.random() * 3);

            // Individuelle Rotationsgeschwindigkeit speichern
            mesh.userData = {
                rotSpeed: new THREE.Vector3(
                    (Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2
                )
            };

            this.constructionCloud.add(mesh);
        }

        this.constructionCloud.position.copy(pos);
        sceneSetup.scene.add(this.constructionCloud);
    }

    removeConstructionCloud() {
        if(this.constructionCloud) {
            sceneSetup.scene.remove(this.constructionCloud);
            this.constructionCloud = null;
            // Hier könnte man noch "Auflöse-Partikel" spawnen
        }
    }

    // Erstellt einen Puff/Rauch-Effekt
    createPoofEffect(position) {
        const poofGroup = new THREE.Group();

        // Mehrere Rauch-Partikel
        for (let i = 0; i < 8; i++) {
            const geo = new THREE.SphereGeometry(1 + Math.random(), 6, 6);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xDDDDDD,
                transparent: true,
                opacity: 0.8
            });
            const mesh = new THREE.Mesh(geo, mat);

            const angle = (i / 8) * Math.PI * 2;
            const radius = 2;
            mesh.position.set(
                Math.cos(angle) * radius,
                Math.random() * 2,
                Math.sin(angle) * radius
            );

            mesh.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * 3,
                5 + Math.random() * 3,
                Math.sin(angle) * 3
            );

            poofGroup.add(mesh);
        }

        poofGroup.position.copy(position);
        sceneSetup.scene.add(poofGroup);

        // Animation
        const startTime = Date.now();
        const duration = 1500; // 1.5 Sekunden

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                sceneSetup.scene.remove(poofGroup);
                poofGroup.children.forEach(child => {
                    child.geometry.dispose();
                    child.material.dispose();
                });
                return;
            }

            poofGroup.children.forEach(mesh => {
                // Bewege nach oben und außen
                mesh.position.add(mesh.userData.velocity.clone().multiplyScalar(0.016));
                mesh.userData.velocity.y -= 0.2; // Gravitation

                // Größer werden
                const scale = 1 + progress * 2;
                mesh.scale.set(scale, scale, scale);

                // Verblassen
                mesh.material.opacity = 0.8 * (1 - progress);
            });

            requestAnimationFrame(animate);
        };

        animate();
    }

    startBoat(index) {
        const boat = this.boats[index];
        if (!boat) return;

        const canStartFromDecision = () => {
            if (boat.state !== STATE.WAITING_FOR_DECISION) return false;
            // Im Tutorial nur starten, wenn der Director den Abschluss erlaubt
            if (director.currentPhaseId === 'TUTORIAL') {
                return director.waitingForTutorialRelease || director.flags.tutorialManualStepComplete;
            }
            return true;
        };

        // WICHTIG: Wenn IRGENDEIN Boot im BEING_UPGRADED State ist, blockiere ALLE Boots-Starts
        const anyBoatBeingUpgraded = this.boats.some(b => b.state === STATE.BEING_UPGRADED);
        if (anyBoatBeingUpgraded) {
            events.emit(EVENTS.TOAST, {
                message: 'Warte, bis Kian das Motorboot fertiggestellt hat!'
            });
            return;
        }

        // NEU: In BOOM-Phase (Kapitel 2), wenn Motorboot noch nicht fertig ist, blockiere Start
        if (director.currentPhaseId === 'BOOM' && !director.flags.motorboatReady) {
            events.emit(EVENTS.TOAST, {
                message: 'Warte, bis Kian das Motorboot fertiggestellt hat!'
            });
            return;
        }

        // --- FIX FÜR KAPITEL 1 (STAGNATION) ---
        // Das Boot darf NICHT ablegen, bevor die Sparmaßnahmen im Kontor beschlossen wurden.
        if (director.currentPhaseId === 'STAGNATION' && !director.flags.isSaving) {
            events.emit(EVENTS.TOAST, {
                message: 'Wir haben kein Geld für Treibstoff! Geh ins Kontor.'
            });
            // Optional: Hinweis auf HQ verstärken
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'hq', show: true });
            return;
        }

        // Kapitel 4: Erste Runde ohne Netz erlauben, danach blocken bis Kauf
        const hasDoneFirstGrowthTrapTrip = (director.flags?.growthTrapTripCount || 0) >= 1;
        if (director.currentPhaseId === 'GROWTH_TRAP' && !director.flags?.dredgePurchased && hasDoneFirstGrowthTrapTrip) {
            events.emit(EVENTS.TOAST, {
                message: 'Kauf erst das Schleppnetz bei Kian, bevor wir wieder rausfahren.'
            });
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });
            return;
        }

        // Kapitel 5: Ohne Trawler-Kauf keine Fahrten
        if (director.currentPhaseId === 'EFFICIENCY' && !director.flags?.trawlerPurchased) {
            events.emit(EVENTS.TOAST, {
                message: 'Sterling verlangt den Trawler. Geh zur Werft.'
            });
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });
            return;
        }

        // Start aus Wartezuständen erlauben, aber im Tutorial gated
        if (boat.state === STATE.WAITING_FOR_COMMAND || canStartFromDecision()) {
            boat.startTrip();
        }
    }

    removeDuplicateBoats() {
        // Entfernt doppelte Boote vom selben Typ
        // Wird nach dem Init aufgerufen, um sicherzustellen, dass keine Duplikate existieren
        const seen = new Map(); // dockIndex -> boat
        const filtered = [];

        this.boats.forEach((boat) => {
            const key = `${boat.type}-${boat.dockIndex}`;
            if (!seen.has(key)) {
                seen.set(key, boat);
                filtered.push(boat);
            } else {
                // Duplikat gefunden - aus der Szene entfernen
                if (boat.mesh) {
                    sceneSetup.scene.remove(boat.mesh);
                    sceneSetup.unregisterInteractable(boat.mesh);
                }
            }
        });

        this.boats = filtered;
    }

    update(dt, time) {
        // Bestehende Updates...
        this.boats.forEach(boat => boat.update(dt, time));

        // Wolke animieren (Chaotisches Drehen)
        if (this.constructionCloud) {
            this.constructionCloud.children.forEach(puff => {
                puff.rotation.x += puff.userData.rotSpeed.x * dt;
                puff.rotation.y += puff.userData.rotSpeed.y * dt;

                // Pulsieren
                const s = puff.scale.x + Math.sin(time * 5) * 0.05;
                puff.scale.setScalar(s);
            });
        }
    }
}
