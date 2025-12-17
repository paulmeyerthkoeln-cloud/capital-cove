import * as THREE from 'three';
import { sceneSetup } from '../core/SceneSetup.js';
import { events, EVENTS } from '../core/Events.js';

// AGGRESSIVE PERFORMANCE-OPTIMIERUNGEN für Tablets:
// ✅ Geometry Caching: Alle Geometrien werden einmalig erstellt und geteilt
// ✅ Material Sharing: 4 Materialien für alle Kreaturen
// ✅ Keine Schatten: castShadow/receiveShadow = false
// ✅ matrixAutoUpdate = false für alle statischen Teile
// ✅ Quadratische Distanzberechnung (kein sqrt)
// ✅ Object Pool Pattern (5 Kreaturen wiederverwendet)

const CREATURE_TYPES = {
    WHALE: 'whale',
    DOLPHIN: 'dolphin'
};

class SeaCreature {
    /**
     * @param {string} type
     * @param {Object} assets - Enthält { mats: {...}, geos: {...} }
     */
    constructor(type, assets) {
        this.type = type;
        this.assets = assets; // Shared resources (Geometries & Materials)
        this.mesh = null;
        this.state = 'underwater';
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.timer = 0;
        this.jumpDuration = 0;
        this.pauseDuration = 0;
        this.targetDepth = -5;
        this.isActive = false;
    }

    init() {
        this.mesh = new THREE.Group();
        // Nur die Hauptgruppe braucht Matrix-Updates für Bewegung/Rotation
        this.mesh.matrixAutoUpdate = true;

        if (this.type === CREATURE_TYPES.WHALE) {
            this.buildWhale();
            this.jumpDuration = 3.5;
        } else if (this.type === CREATURE_TYPES.DOLPHIN) {
            this.buildDolphin();
            this.jumpDuration = 2.0;
        }

        this.mesh.visible = false;
        sceneSetup.scene.add(this.mesh);
    }

    /**
     * Helper zum Erstellen statischer Teile (keine Schatten, keine Matrix-Updates)
     */
    createPart(geometry, material, x, y, z, rotX = 0, rotY = 0, rotZ = 0) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        if (rotX || rotY || rotZ) {
            mesh.rotation.set(rotX, rotY, rotZ);
        }

        // PERFORMANCE: Schatten aus, Matrix-Updates aus
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix(); // Einmalig berechnen

        this.mesh.add(mesh);
    }

    buildWhale() {
        const { geos, mats } = this.assets;

        // Körper
        this.createPart(geos.whaleBody, mats.whaleBody, 0, 0, 0);

        // Schwanz
        this.createPart(geos.whaleTail, mats.whaleFin, 0, 0, -4.5, 0, Math.PI / 2, 0);

        // Flossen (Rückenflosse)
        this.createPart(geos.whaleFin, mats.whaleFin, 0, 1.8, -0.5, 0, 0, Math.PI);

        // Seitenflossen
        this.createPart(geos.whaleFin, mats.whaleFin, 2.2, 0, 1, 0, 0, Math.PI/2 + 0.3);
        this.createPart(geos.whaleFin, mats.whaleFin, -2.2, 0, 1, 0, 0, -Math.PI/2 - 0.3);

        // Augen (optional - können weggelassen werden für noch mehr Performance)
        this.createPart(geos.eye, mats.eye, 1, 0.6, 2.5);
        this.createPart(geos.eye, mats.eye, -1, 0.6, 2.5);

        this.mesh.scale.set(2, 2, 2);
    }

    buildDolphin() {
        const { geos, mats } = this.assets;

        // Körper
        this.createPart(geos.dolphinBody, mats.dolphinBody, 0, 0, 0);

        // Schwanz
        this.createPart(geos.dolphinTail, mats.dolphinFin, 0, 0.3, -3, 0.2, Math.PI / 2, 0);

        // Flossen (Rücken)
        this.createPart(geos.dolphinFin, mats.dolphinFin, 0, 1.2, -0.3, 0.3, 0, Math.PI);

        // Seitenflossen
        this.createPart(geos.dolphinFin, mats.dolphinFin, 1.2, 0, 0.8, 0, 0, Math.PI/2 + 0.5);
        this.createPart(geos.dolphinFin, mats.dolphinFin, -1.2, 0, 0.8, 0, 0, -Math.PI/2 - 0.5);

        // Augen
        this.createPart(geos.eyeSmall, mats.eyeDark, 0.6, 0.4, 1.8);
        this.createPart(geos.eyeSmall, mats.eyeDark, -0.6, 0.4, 1.8);

        this.mesh.scale.set(1.2, 1.2, 1.2);
    }

    spawn() {
        const angle = Math.random() * Math.PI * 2;
        // Spawnen weiter draußen (170-230), um Kollisionen mit Booten zu vermeiden
        const distance = 170 + Math.random() * 60;

        this.position.set(
            Math.cos(angle) * distance,
            this.targetDepth,
            Math.sin(angle) * distance
        );

        // Tangentiale Bewegung (im Kreis um die Insel)
        const targetAngle = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        const speed = this.type === CREATURE_TYPES.WHALE ? 10 : 15;

        this.velocity.set(
            Math.cos(targetAngle) * speed,
            0,
            Math.sin(targetAngle) * speed
        );

        this.mesh.position.copy(this.position);
        this.mesh.rotation.set(0, Math.atan2(this.velocity.x, this.velocity.z), 0);
        this.mesh.visible = true;
        this.isActive = true;
        this.state = 'underwater';
        this.timer = 0;
        this.pauseDuration = 0.5 + Math.random() * 1.5;
    }

    despawn() {
        this.mesh.visible = false;
        this.isActive = false;
        this.state = 'underwater';
        this.timer = 0;
    }

    update(dt) {
        if (!this.isActive) return;

        this.timer += dt;

        if (this.state === 'underwater') {
            // OPTIMIERUNG: addScaledVector statt clone().multiplyScalar()
            this.position.addScaledVector(this.velocity, dt);
            this.mesh.position.copy(this.position);

            // Sanftes Schaukeln (direkte Zuweisung)
            this.mesh.rotation.x = Math.sin(this.timer * 2) * 0.05;
            this.mesh.rotation.z = Math.sin(this.timer * 1.5) * 0.03;

            if (this.timer >= this.pauseDuration) {
                this.state = 'jumping';
                this.timer = 0;
            }
        } else if (this.state === 'jumping') {
            const progress = this.timer / this.jumpDuration;

            if (progress >= 1) {
                this.state = 'underwater';
                this.timer = 0;
                this.pauseDuration = 2 + Math.random() * 3;
                this.position.y = this.targetDepth;
                this.mesh.position.y = this.targetDepth;
                this.mesh.rotation.x = 0;
            } else {
                this.position.addScaledVector(this.velocity, dt);

                const maxHeight = this.type === CREATURE_TYPES.WHALE ? 8 : 6;
                this.position.y = this.targetDepth + Math.sin(progress * Math.PI) * maxHeight;

                this.mesh.position.copy(this.position);

                // Pitch-Rotation während Sprung
                const baseRotY = Math.atan2(this.velocity.x, this.velocity.z);
                const pitch = Math.sin(progress * Math.PI) * 0.4 - 0.2;
                this.mesh.rotation.set(pitch, baseRotY, 0);
            }
        }

        // OPTIMIERUNG: Quadratische Distanz (vermeidet sqrt)
        const distSq = this.position.x * this.position.x + this.position.z * this.position.z;
        // Despawn wenn zu weit draußen (>280) oder zu nah an Insel/Booten (<150)
        if (distSq > 78400 || distSq < 22500) { // 280^2=78400, 150^2=22500
            this.despawn();
        }
    }
}

export class SeaCreatureManager {
    constructor() {
        this.creatures = [];
        this.spawnTimer = 0;
        this.spawnInterval = 8;
        this.maxCreatures = 3;
        this.ecoHealth = 1.0; // Standardmäßig gesund (1.0 = 100%)
        this.assets = { mats: {}, geos: {} };
    }

    init() {
        this.initAssets();

        // Listener für Fischbestand (Öko-Gesundheit)
        events.on(EVENTS.STATS_UPDATED, (stats) => {
            // Berechne Verhältnis (0.0 bis 1.0)
            if (stats.maxFishStock > 0) {
                this.ecoHealth = stats.fishStock / stats.maxFishStock;
            } else {
                this.ecoHealth = 0;
            }
        });

        // Pool von Kreaturen erstellen (werden wiederverwendet)
        for (let i = 0; i < 5; i++) {
            const type = Math.random() < 0.4 ? CREATURE_TYPES.WHALE : CREATURE_TYPES.DOLPHIN;
            const creature = new SeaCreature(type, this.assets);
            creature.init();
            this.creatures.push(creature);
        }

        // Spawne sofort eine Kreatur für sofortige Sichtbarkeit
        const first = this.creatures[0];
        if (first) {
            setTimeout(() => first.spawn(), 2000);
        }
    }

    /**
     * Erstellt alle Materialien und Geometrien einmalig
     * Diese werden zwischen allen Kreaturen geteilt
     */
    initAssets() {
        // --- MATERIALS (Shared) ---
        this.assets.mats = {
            whaleBody: new THREE.MeshStandardMaterial({
                color: 0x2C3E50,
                flatShading: true,
                roughness: 0.8
            }),
            whaleFin: new THREE.MeshStandardMaterial({
                color: 0x1A252F,
                flatShading: true,
                roughness: 0.9
            }),
            dolphinBody: new THREE.MeshStandardMaterial({
                color: 0x5DADE2,
                flatShading: true,
                roughness: 0.6
            }),
            dolphinFin: new THREE.MeshStandardMaterial({
                color: 0x3498DB,
                flatShading: true,
                roughness: 0.7
            }),
            eye: new THREE.MeshBasicMaterial({ color: 0xFFFFFF }),
            eyeDark: new THREE.MeshBasicMaterial({ color: 0x2C3E50 })
        };

        // --- GEOMETRIES (Cached & Pre-Shaped) ---

        // 1. Whale Body (geformt)
        const whaleBody = new THREE.BoxGeometry(4, 2.5, 8, 2, 2, 3);
        this.shapeGeometry(whaleBody, (v) => {
            // Vorne spitzer
            if (v.z > 1) {
                const factor = (v.z - 1) / 3;
                v.x *= (1 - factor * 0.7);
                v.y *= (1 - factor * 0.4);
            }
            // Hinten schmaler
            if (v.z < -1) {
                const factor = Math.abs(v.z + 1) / 3;
                v.x *= (1 - factor * 0.8);
                v.y *= (1 - factor * 0.6);
            }
        });
        this.assets.geos.whaleBody = whaleBody;

        // 2. Whale Tail (geformt)
        const whaleTail = new THREE.BoxGeometry(4, 0.3, 1.5);
        this.shapeGeometry(whaleTail, (v) => {
            if (Math.abs(v.x) > 1) {
                v.z += (Math.abs(v.x) - 1) * 0.5;
            }
        });
        this.assets.geos.whaleTail = whaleTail;

        // 3. Whale Fin (Cone, 4 Segmente minimal)
        this.assets.geos.whaleFin = new THREE.ConeGeometry(0.6, 1.5, 4);

        // 4. Dolphin Body (geformt)
        const dolphinBody = new THREE.BoxGeometry(2, 1.5, 5, 2, 2, 3);
        this.shapeGeometry(dolphinBody, (v) => {
            // Schnauze
            if (v.z > 1) {
                const factor = (v.z - 1) / 1.5;
                v.x *= (1 - factor * 0.8);
                v.y *= (1 - factor * 0.5);
                if (v.y > 0) v.y += factor * 0.5;
            }
            // Schwanz
            if (v.z < -1) {
                const factor = Math.abs(v.z + 1) / 1.5;
                v.x *= (1 - factor * 0.9);
                v.y *= (1 - factor * 0.7);
            }
        });
        this.assets.geos.dolphinBody = dolphinBody;

        // 5. Dolphin Tail (einfache Box)
        this.assets.geos.dolphinTail = new THREE.BoxGeometry(2.5, 0.2, 1);

        // 6. Dolphin Fin (kleinerer Cone)
        this.assets.geos.dolphinFin = new THREE.ConeGeometry(0.4, 1.2, 4);

        // 7. Augen (minimal Poly)
        this.assets.geos.eye = new THREE.SphereGeometry(0.15, 3, 3);
        this.assets.geos.eyeSmall = new THREE.SphereGeometry(0.1, 3, 3);
    }

    /**
     * Helper um Geometrie einmalig zu verformen
     */
    shapeGeometry(geometry, modifierFn) {
        const pos = geometry.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < pos.count; i++) {
            vertex.fromBufferAttribute(pos, i);
            modifierFn(vertex);
            pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }

        geometry.computeVertexNormals();
    }

    update(dt) {
        // Dynamisches Limit basierend auf Öko-Gesundheit
        // > 80%: 3 Kreaturen
        // > 40%: 2 Kreaturen
        // > 10%: 1 Kreatur
        // < 10%: 0 Kreaturen (Ausgestorben)
        let allowedCreatures = 0;
        if (this.ecoHealth > 0.8) allowedCreatures = 3;
        else if (this.ecoHealth > 0.4) allowedCreatures = 2;
        else if (this.ecoHealth > 0.1) allowedCreatures = 1;

        let activeCount = 0;
        for (let i = 0; i < this.creatures.length; i++) {
            const c = this.creatures[i];
            if (c.isActive) {
                // Wenn wir über dem erlaubten Limit sind (z.B. plötzlicher Drop),
                // verschwindet die Kreatur sofort (stirbt/flieht)
                if (activeCount >= allowedCreatures) {
                    c.despawn();
                } else {
                    c.update(dt);
                    activeCount++;
                }
            }
        }

        // Spawn-Timer
        this.spawnTimer += dt;

        // Spawnen nur, wenn Limit nicht erreicht ist UND Gesundheit > 10%
        if (this.spawnTimer >= this.spawnInterval && activeCount < allowedCreatures) {
            const inactive = this.creatures.find(c => !c.isActive);
            if (inactive) {
                inactive.spawn();
                this.spawnTimer = 0;
                // Intervall wird größer, je schlechter die Gesundheit
                const healthFactor = 2 - this.ecoHealth; // 1.0 (gut) bis 2.0 (schlecht)
                this.spawnInterval = (8 + Math.random() * 7) * healthFactor;
            }
        }
    }

    dispose() {
        // Shared Materials aufräumen
        Object.values(this.assets.mats).forEach(mat => mat.dispose());

        // Shared Geometries aufräumen
        Object.values(this.assets.geos).forEach(geo => geo.dispose());

        // Kreaturen aus Szene entfernen
        this.creatures.forEach(creature => {
            if (creature.mesh) {
                sceneSetup.scene.remove(creature.mesh);
                // Geometrien/Materials werden nicht hier disposed (sind shared)
            }
        });

        this.creatures = [];
    }
}
