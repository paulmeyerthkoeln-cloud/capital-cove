/*** START OF FILE src/entities/Person.js ***/

import * as THREE from 'three';
import { sceneSetup } from '../core/SceneSetup.js';
import { events, EVENTS, DIRECTOR_EVENTS } from '../core/Events.js';
import { economy } from '../logic/Economy.js';
import { DOCK_Z } from './Boat.js';

const PERSON_STATE = {
    IDLE: 'IDLE',
    WALKING: 'WALKING',
    WORKING: 'WORKING',
    INSIDE: 'INSIDE',
    WAITING: 'WAITING',
    DESPAWN: 'DESPAWN'
};

const ROLE_COLORS = {
    fisher: { body: 0xf5d142, legs: 0x1e4b99, skin: 0xffcba4 },
    shipyard: { body: 0x8d6e63, legs: 0x90a4ae, skin: 0xe9cbb2 },
    citizen: { body: null, legs: 0x546e7a, skin: 0xf2c9a2 },
    rani: { body: 0x66BB6A, legs: 0x2E7D32, skin: 0xA1887F } // Rani: Grüne Kleidung, Naturnah
};

const CITIZEN_COLORS = [0x4ecdc4, 0xffb347, 0xff6b6b, 0x6c5ce7, 0x2ec4b6, 0xe17055];

class Person {
    constructor(role = 'citizen') {
        this.role = role;
        this.mesh = null;
        this.leftLegPivot = null;
        this.rightLegPivot = null;
        this.leftArmPivot = null;
        this.rightArmPivot = null;
        this.crate = null;

        this.state = PERSON_STATE.IDLE;
        this.behavior = 'idle';
        this.path = [];
        this.pathIndex = 0;
        this.onPathComplete = null;
        this.walkSpeed = 4 + Math.random() * 2;
        this.insideTimer = 0;
        this.waitTimer = 0;
    }

    init() {
        const colors = ROLE_COLORS[this.role] || ROLE_COLORS.citizen;
        const bodyColor = colors.body ?? CITIZEN_COLORS[Math.floor(Math.random() * CITIZEN_COLORS.length)];
        const legColor = colors.legs;
        const skinColor = colors.skin;

        const group = new THREE.Group();

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 2.6, 1.1),
            new THREE.MeshStandardMaterial({ color: bodyColor, flatShading: true })
        );
        body.position.y = 2.4;
        body.castShadow = true;
        group.add(body);

        const head = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1.2, 1.2),
            new THREE.MeshStandardMaterial({ color: skinColor, flatShading: true })
        );
        head.position.set(0, 2.4, 0);
        head.castShadow = true;
        body.add(head);

        const armGeo = new THREE.BoxGeometry(0.5, 1.2, 0.6);
        this.leftArmPivot = new THREE.Group();
        this.leftArmPivot.position.set(-1.1, 1.8, 0);
        const leftArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: bodyColor, flatShading: true }));
        leftArm.position.y = -0.6;
        leftArm.castShadow = true;
        this.leftArmPivot.add(leftArm);
        body.add(this.leftArmPivot);

        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set(1.1, 1.8, 0);
        const rightArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: bodyColor, flatShading: true }));
        rightArm.position.y = -0.6;
        rightArm.castShadow = true;
        this.rightArmPivot.add(rightArm);
        body.add(this.rightArmPivot);

        const legGeo = new THREE.BoxGeometry(0.6, 1.8, 0.7);
        this.leftLegPivot = new THREE.Group();
        this.leftLegPivot.position.set(-0.4, 0.9, 0);
        const leftLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: legColor, flatShading: true }));
        leftLeg.position.y = -0.9;
        leftLeg.castShadow = true;
        this.leftLegPivot.add(leftLeg);
        group.add(this.leftLegPivot);

        this.rightLegPivot = new THREE.Group();
        this.rightLegPivot.position.set(0.4, 0.9, 0);
        const rightLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: legColor, flatShading: true }));
        rightLeg.position.y = -0.9;
        rightLeg.castShadow = true;
        this.rightLegPivot.add(rightLeg);
        group.add(this.rightLegPivot);

        // Optional crate for market runners
        this.crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.9, 0.9),
            new THREE.MeshStandardMaterial({ color: 0xb08a63, flatShading: true })
        );
        this.crate.position.set(0.2, -1.0, 0.8);
        this.crate.visible = false;
        this.rightArmPivot.add(this.crate);

        this.mesh = group;
        sceneSetup.scene.add(this.mesh);
    }

    setCarryingCrate(isCarrying) {
        if (this.crate) this.crate.visible = isCarrying;
    }

    setPosition(vec3) {
        if (!this.mesh) return;
        this.mesh.position.copy(vec3);
        this.mesh.position.y = this.getGroundHeight(this.mesh.position.x, this.mesh.position.z);
    }

    setPath(points, onComplete = null) {
        this.path = points.map(p => p.clone());
        this.pathIndex = 0;
        this.onPathComplete = onComplete;
        this.state = PERSON_STATE.WALKING;
    }

    // KORRIGIERTE HÖHENFUNKTION (Deckungsgleich mit Island.js Plateau)
    getGroundHeight(x, z) {
        const dist = Math.sqrt(x * x + z * z);
        const noise = Math.sin(x * 0.07) * Math.cos(z * 0.07) * 2 + Math.sin(x * 0.15 + z * 0.1) * 1;
        if (dist < 70) return 6.0;
        if (dist < 100) {
            const t = (dist - 70) / 30;
            const hillHeight = Math.cos(dist * 0.015) * 25 + noise;
            return 6.0 * (1 - t) + hillHeight * t;
        }
        if (dist < 150) return Math.max(0, Math.cos(dist * 0.015) * 25 + noise);
        return -5;
    }

    update(dt, time, buildings = null) {
        if (!this.mesh) return;

        if (this.state === PERSON_STATE.WALKING && this.path.length) {
            const target = this.path[this.pathIndex];
            const current = this.mesh.position;
            const dist = current.distanceTo(target);

            const dir = new THREE.Vector3().subVectors(target, current).normalize();
            this.mesh.position.add(dir.multiplyScalar(this.walkSpeed * dt));
            this.mesh.position.y = this.getGroundHeight(this.mesh.position.x, this.mesh.position.z);
            this.mesh.lookAt(target.x, this.mesh.position.y, target.z);

            const cycle = Math.sin(time * this.walkSpeed * 2);
            this.leftLegPivot.rotation.x = cycle * 0.7;
            this.rightLegPivot.rotation.x = -cycle * 0.7;
            this.leftArmPivot.rotation.x = -cycle * 0.4;
            this.rightArmPivot.rotation.x = cycle * 0.4;

            // Kollisionserkennung mit Gebäuden
            if (buildings) {
                this.checkBuildingCollision(buildings);
            }

            if (dist < 0.6) {
                if (this.pathIndex < this.path.length - 1) {
                    this.pathIndex++;
                } else {
                    this.state = PERSON_STATE.IDLE;
                    if (this.onPathComplete) this.onPathComplete(this);
                }
            }
        } else if (this.state === PERSON_STATE.WORKING) {
            this.leftLegPivot.rotation.x = 0;
            this.rightLegPivot.rotation.x = 0;
            this.leftArmPivot.rotation.x = -0.2;
            this.rightArmPivot.rotation.x = Math.sin(time * 10) * 0.8;
        } else {
            // Idle/Waiting/Inside
            this.leftLegPivot.rotation.x *= 0.9;
            this.rightLegPivot.rotation.x *= 0.9;
            this.leftArmPivot.rotation.x *= 0.9;
            this.rightArmPivot.rotation.x *= 0.9;
        }

        if (this.state === PERSON_STATE.INSIDE) {
            this.mesh.visible = false;
        } else {
            this.mesh.visible = true;
        }
    }

    checkBuildingCollision(buildings) {
        if (!this.mesh || !buildings) return;

        const pos = this.mesh.position;
        const collisionRadius = 2; // Radius um die Person

        // Definiere Gebäude-Bounding-Boxen (ungefähre Positionen und Größen)
        const buildingBounds = [
            { name: 'tavern', group: buildings.tavernGroup, size: { x: 25, z: 20 } },
            { name: 'shipyard', group: buildings.shipyardGroup, size: { x: 20, z: 25 } },
            { name: 'hq', group: buildings.hqGroup, size: { x: 22, z: 22 } },
            { name: 'bank', group: buildings.bankGroup, size: { x: 20, z: 20 } }
        ];

        for (const building of buildingBounds) {
            if (!building.group) continue;

            const bPos = building.group.position;
            const halfX = building.size.x / 2;
            const halfZ = building.size.z / 2;

            // Prüfe ob Person innerhalb der Gebäude-Bounding-Box ist
            if (pos.x >= bPos.x - halfX - collisionRadius &&
                pos.x <= bPos.x + halfX + collisionRadius &&
                pos.z >= bPos.z - halfZ - collisionRadius &&
                pos.z <= bPos.z + halfZ + collisionRadius) {

                // Person ist im Gebäude - lasse sie verschwinden
                this.mesh.visible = false;
                return;
            }
        }
    }
}

// PERFORMANCE-HINWEIS für Tablets:
// Object Pooling könnte hier die Garbage Collection reduzieren:
// Statt Personen zu löschen und neu zu erstellen (new Person), könnten
// inaktive Personen in einem Pool gespeichert und wiederverwendet werden.
// Implementierung: Füge einen personPool[] Array hinzu und recycle() Methode.
// Dies würde Mikro-Ruckler durch Garbage Collection bei langen Sessions reduzieren.

export class PersonManager {
    constructor(buildings = null) {
        this.people = [];
        this.buildings = buildings;
        this.shipyardWorker = null;
        this.visitorTimer = 3;
        this.defaultDock = new THREE.Vector3(0, 0, 120);
        this.navPoints = {};
        this.visitorRoutes = [];
        this.visitorExitRoutes = [];
        this.runnerRoutes = { toHq: [], toDock: [] };
    }

    spawnPartyRunners(count, fromPos, toPos) {
        if (!fromPos || !toPos) return;

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const person = new Person('citizen'); // Oder 'shipyard' für Arbeiter
                person.init();
                person.walkSpeed = 8.0; // Doppelt so schnell! (Rennen)
                
                // Start mit leichtem Jitter
                const start = fromPos.clone();
                start.x += (Math.random() - 0.5) * 5;
                start.z += (Math.random() - 0.5) * 5;
                start.y = this.getGroundHeight(start.x, start.z); // Sicherstellen, dass sie auf Boden sind
                
                person.setPosition(start);
                
                // Pfad direkt zum Ziel
                person.setPath([toPos], (p) => {
                    // Am Ziel angekommen: Tanzen oder Despawn
                    p.state = 'DESPAWN'; // Einfachheitshalber despawn
                });
                
                this.people.push(person);
            }, i * 300); // Alle 300ms einer
        }
    }

    getVisitorInterval() {
        const health = economy?.state?.marketHealth ?? 1.0;
        if (health < 0.2) return 20 + Math.random() * 10;      // Geisterstadt, keine neuen Besucher
        if (health < 0.5) return 15 + Math.random() * 10;      // Kaum Besucher
        if (health >= 0.95) return 6 + Math.random() * 4;      // Viele Besucher (reduziert von 2-4 auf 6-10)
        return 10 + Math.random() * 8;                         // Normal (reduziert von 5-10 auf 10-18)
    }

    setBuildings(buildings) {
        this.buildings = buildings;
        this.rebuildNavPoints();
    }

    // Gemeinsame Höhenfunktion, damit alle Pfade sicher auf der Insel bleiben
    getGroundHeight(x, z) {
        const dist = Math.sqrt(x * x + z * z);
        const noise = Math.sin(x * 0.07) * Math.cos(z * 0.07) * 2 + Math.sin(x * 0.15 + z * 0.1) * 1;
        if (dist < 70) return 6.0;
        if (dist < 100) {
            const t = (dist - 70) / 30;
            const hillHeight = Math.cos(dist * 0.015) * 25 + noise;
            return 6.0 * (1 - t) + hillHeight * t;
        }
        if (dist < 150) return Math.max(0, Math.cos(dist * 0.015) * 25 + noise);
        return -5;
    }

    clampToIsland(vec, maxRadius = 95) {
        const v = vec.clone();
        const dist = Math.sqrt(v.x * v.x + v.z * v.z);
        if (dist > maxRadius && dist > 0.001) {
            const t = maxRadius / dist;
            v.x *= t;
            v.z *= t;
        }
        v.y = this.getGroundHeight(v.x, v.z);
        // Sicherheitsprüfung: Falls unter Wasser, setze auf Plateau-Höhe
        if (v.y < 0) {
            v.y = 6.0;
        }
        return v;
    }

    rebuildNavPoints() {
        const tavernPos = this.buildings?.tavernGroup?.position ?? new THREE.Vector3(-60, 0, 0);
        const shipyardPos = this.buildings?.shipyardGroup?.position ?? new THREE.Vector3(0, 0, 60);
        const hqPos = this.buildings?.hqGroup?.position ?? new THREE.Vector3(0, 0, -60);
        const bankPos = this.buildings?.bankGroup?.position ?? new THREE.Vector3(60, 0, 0);

        this.navPoints = {
            plaza: this.clampToIsland(new THREE.Vector3(0, 0, 0)),
            plazaNorth: this.clampToIsland(new THREE.Vector3(0, 0, -28)),
            plazaSouth: this.clampToIsland(new THREE.Vector3(0, 0, 28)),
            plazaEast: this.clampToIsland(new THREE.Vector3(26, 0, 0)),
            plazaWest: this.clampToIsland(new THREE.Vector3(-26, 0, 0)),
            marketCorner: this.clampToIsland(new THREE.Vector3(-18, 0, 12)),
            dock: this.clampToIsland(new THREE.Vector3(0, 0, 100)),
            shipyardFront: this.clampToIsland(shipyardPos.clone().add(new THREE.Vector3(0, 0, -18))),
            hqPorch: this.clampToIsland(hqPos.clone().add(new THREE.Vector3(0, 0, 18))),
            tavernPorch: this.clampToIsland(tavernPos.clone().add(new THREE.Vector3(12, 0, 8))),
            tavernExit: this.clampToIsland(tavernPos.clone().add(new THREE.Vector3(-10, 0, -14))),
            bankFront: this.clampToIsland(bankPos.clone().add(new THREE.Vector3(-12, 0, 6))),
            westEntry: this.clampToIsland(new THREE.Vector3(-75, 0, -6)),
            eastEntry: this.clampToIsland(new THREE.Vector3(75, 0, 8)),
            northEntry: this.clampToIsland(new THREE.Vector3(-4, 0, -78)),
            southEntry: this.clampToIsland(new THREE.Vector3(6, 0, 80))
        };

        this.defaultDock = this.navPoints.dock.clone();

        this.visitorRoutes = [
            ['westEntry', 'plazaWest', 'plaza', 'tavernPorch'],
            ['southEntry', 'shipyardFront', 'plazaSouth', 'plaza', 'tavernPorch'],
            ['northEntry', 'hqPorch', 'plazaNorth', 'plaza', 'tavernPorch'],
            ['eastEntry', 'bankFront', 'plazaEast', 'plaza', 'tavernPorch']
        ];

        this.visitorExitRoutes = [
            ['tavernExit', 'plaza', 'westEntry'],
            ['tavernExit', 'plazaSouth', 'southEntry'],
            ['tavernExit', 'plaza', 'eastEntry'],
            ['tavernExit', 'plazaNorth', 'northEntry']
        ];

        this.runnerRoutes = {
            toHq: ['dock', 'shipyardFront', 'plazaSouth', 'plaza', 'hqPorch'],
            toDock: ['hqPorch', 'plaza', 'shipyardFront', 'dock']
        };
    }

    cloneNavPoint(key, jitter = 0) {
        const base = this.navPoints[key];
        if (!base) return null;
        const p = base.clone();
        if (jitter > 0) {
            p.x += (Math.random() - 0.5) * jitter * 2;
            p.z += (Math.random() - 0.5) * jitter * 2;
        }
        return this.clampToIsland(p);
    }

    buildPathFromKeys(keys = [], options = {}) {
        const { jitter = 0, skipFirst = false } = options;
        const points = [];
        keys.forEach((k, idx) => {
            if (skipFirst && idx === 0) return;
            const p = this.cloneNavPoint(k, jitter);
            if (p) points.push(p);
        });
        return points;
    }

    init(buildings = null) {
        if (buildings) this.setBuildings(buildings);
        if (!this.navPoints || Object.keys(this.navPoints).length === 0) {
            this.rebuildNavPoints();
        }
        this.spawnShipyardWorker();
        events.on(EVENTS.BOAT_UNLOADING, (data) => this.spawnMarketRunner(data?.position));
        
        // Listener für Rani Spawn in Kapitel 4
        events.on(DIRECTOR_EVENTS.SCENE_START, (data) => {
            if (data.sceneId === 'D4_RANI_INTRO') {
                this.spawnRani();
            }
        });
    }

    update(dt, time) {
        this.visitorTimer -= dt;
        if (this.visitorTimer <= 0) {
            this.spawnVisitor();
            this.visitorTimer = this.getVisitorInterval();
        }

        this.people.forEach(p => p.update(dt, time, this.buildings));

        this.people.forEach(p => {
            if (p.behavior === 'visitor') {
                if (p.state === PERSON_STATE.INSIDE) {
                    p.insideTimer -= dt;
                    if (p.insideTimer <= 0) {
                        const exitPath = this.buildPathFromKeys(p.exitRouteKeys, { jitter: 3 }) ?? [];
                        const fallback = p.exitTarget ? [p.exitTarget] : [];
                        const finalPath = exitPath.length ? exitPath : fallback;
                        if (finalPath.length) {
                            p.state = PERSON_STATE.WALKING;
                            p.mesh.visible = true;
                            p.setPath(finalPath, (person) => { person.state = PERSON_STATE.DESPAWN; });
                        }
                    }
                }
            } else if (p.behavior === 'runner') {
                if (p.state === PERSON_STATE.WAITING) {
                    p.waitTimer -= dt;
                    if (p.waitTimer <= 0) {
                        const returnPath = this.buildPathFromKeys(p.returnRouteKeys, { jitter: 2, skipFirst: true }) ?? [];
                        const fallback = p.returnTarget ? [p.returnTarget] : [];
                        const finalPath = returnPath.length ? returnPath : fallback;
                        if (finalPath.length) {
                            p.setPath(finalPath, (person) => { person.state = PERSON_STATE.DESPAWN; });
                            p.state = PERSON_STATE.WALKING;
                        }
                    }
                }
            }
        });

        // Cleanup despawned
        for (let i = this.people.length - 1; i >= 0; i--) {
            if (this.people[i].state === PERSON_STATE.DESPAWN) {
                sceneSetup.scene.remove(this.people[i].mesh);
                this.people.splice(i, 1);
            }
        }
    }

    spawnShipyardWorker() {
        if (!this.buildings || !this.buildings.shipyardGroup) return;
        const worker = new Person('shipyard');
        worker.init();
        worker.behavior = 'shipyardWorker';
        worker.state = PERSON_STATE.WORKING;

        const anchor = this.buildings.shipyardGroup.position.clone();
        anchor.add(new THREE.Vector3(-6 + Math.random() * 4, 0, 4 + Math.random() * 2));
        worker.setPosition(anchor);

        this.people.push(worker);
        this.shipyardWorker = worker;
    }

    dismissShipyardWorkers() {
        if (!this.navPoints) return;
        
        // Ausgangspunkt (Westen oder weit weg)
        const exit = this.navPoints.westEntry || new THREE.Vector3(-120, 0, 0);
        let count = 0;

        this.people.forEach(p => {
            // Wir feuern alle Werftarbeiter (auch den stationären Worker)
            if (p.role === 'shipyard' || p.behavior === 'shipyardWorker') {
                
                // Status erzwingen, damit sie aufhören zu arbeiten
                p.state = 'WALKING'; 
                
                // Laufweg zum Ausgang, dann Despawn
                p.setPath([exit], (person) => {
                    person.state = 'DESPAWN';
                });
                
                count++;
            }
        });

        console.log(`📉 [PERSON] ${count} Werftarbeiter wurden entlassen.`);
        if (count > 0) {
            events.emit(EVENTS.TOAST, { message: 'Die Werftarbeiter verlassen die Insel.' });
        }
    }

    spawnVisitor() {
        if (!this.buildings || !this.buildings.tavernGroup) return;

        const marketHealth = economy?.state?.marketHealth ?? 1.0;
        // Geisterstadt: keine Besucher mehr
        if (marketHealth < 0.2) return;
        // Kaum Besucher bei schwacher Wirtschaft
        if (marketHealth < 0.5 && Math.random() > 0.25) return;

        const visitorRoute = this.visitorRoutes[Math.floor(Math.random() * this.visitorRoutes.length)] ?? null;
        if (!visitorRoute || visitorRoute.length < 2) return;
        const visitor = new Person('citizen');
        visitor.init();
        visitor.behavior = 'visitor';
        visitor.walkSpeed = 3.5 + Math.random();

        const start = this.cloneNavPoint(visitorRoute[0], 6);
        visitor.setPosition(start);

        const toTavernPath = this.buildPathFromKeys(visitorRoute, { skipFirst: true, jitter: 4 });
        const safeTavernPath = toTavernPath.length ? toTavernPath : [this.cloneNavPoint('tavernPorch')];
        visitor.setPath(safeTavernPath, (person) => {
            person.state = PERSON_STATE.INSIDE;
            person.insideTimer = 3 + Math.random() * 4;
        });

        const exitOptions = this.visitorExitRoutes.filter(r => r[r.length - 1] !== visitorRoute[0]);
        const exitPool = exitOptions.length ? exitOptions : this.visitorExitRoutes;
        const exitRoute = exitPool[Math.floor(Math.random() * exitPool.length)];
        visitor.exitRouteKeys = exitRoute;

        visitor.exitTarget = this.randomRingPosition(120, 150);
        this.people.push(visitor);
    }

    spawnMarketRunner(dockPosition = null) {
        if (!this.buildings || !this.buildings.hqGroup) return;
        const runner = new Person('fisher');
        runner.init();
        runner.behavior = 'runner';
        runner.walkSpeed = 4.5 + Math.random() * 1.5;
        runner.setCarryingCrate(true);

        let start = dockPosition ? dockPosition.clone() : this.defaultDock.clone();
        if (!start) start = new THREE.Vector3(0, 0, DOCK_Z);
        start = this.clampToIsland(start);
        runner.setPosition(start);

        const hqPath = this.buildPathFromKeys(this.runnerRoutes.toHq, { jitter: 2, skipFirst: true });
        const safeHqPath = hqPath.length ? hqPath : [this.buildings.hqGroup.position.clone().add(new THREE.Vector3(6, 0, -6))];
        runner.setPath(safeHqPath, (person) => {
            person.state = PERSON_STATE.WAITING;
            person.waitTimer = 1.5 + Math.random() * 1.5;
        });

        runner.returnRouteKeys = this.runnerRoutes.toDock;
        runner.returnTarget = this.clampToIsland(start.clone().add(new THREE.Vector3(-4 + Math.random() * 8, 0, -6)));
        this.people.push(runner);
    }

    randomRingPosition(inner, outer) {
        const angle = Math.random() * Math.PI * 2;
        // Begrenze auf maximal 90 (sicher innerhalb der Insel, Radius < 100)
        const safeOuter = Math.min(outer, 90);
        const safeInner = Math.min(inner, 85);
        const r = safeInner + Math.random() * (safeOuter - safeInner);
        return this.clampToIsland(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
    }

    spawnRani() {
        if (!this.navPoints.dock) return;

        // Position am Steg (etwas seitlich versetzt, damit sie nicht im Weg steht)
        const pos = this.navPoints.dock.clone();
        pos.x += 5;
        pos.z -= 5; // Etwas zurück, damit sie nicht ins Wasser fällt

        const rani = new Person('rani');
        rani.init();
        rani.setPosition(pos);

        // Sie schaut aufs Meer hinaus (Positive Z-Achse)
        rani.mesh.lookAt(pos.x, pos.y, pos.z + 50);

        // Rani bleibt stationär
        rani.state = PERSON_STATE.IDLE;

        this.people.push(rani);
        console.log("🌿 [PERSON] Rani am Steg gespawnt.");
    }
}

/*** END OF FILE src/entities/Person.js ***/
