/*** START OF FILE src/entities/Buildings.js ***/

import * as THREE from 'three';
import { sceneSetup } from '../core/SceneSetup.js';
import { events, EVENTS, DIRECTOR_EVENTS, ECON_EVENTS } from '../core/Events.js';
import { game } from '../core/Game.js';
import { economy } from '../logic/Economy.js';

export class BuildingManager {
    constructor() {
        this.buildings = [];
        this.particles = [];
        this.props = []; 

        this.bankGroup = null;
        this.tentGroup = null;
        this.tavernGroup = null;
        this.shipyardGroup = null;
        this.hqGroup = null;
        this.hqSmokeGroup = null;
        this.tavernSmokeGroup = null;
        this.shipyardSparks = null; 

        this.tavernLights = null;
        this.lanternLights = [];
        this.tavernSignPivot = null;
        this.tavernMugs = [];
        this.craneArm = null;
        this.craneLine = null;
        this.craneHook = null;
        this.shipyardDustTimer = 0;
        this.bankCoin = null;
        this.bankOrigin = new THREE.Vector3();
        this.flowIntensity = 1.0;
        this.hints = new Map(); 
        this.shakingBuildings = new Map(); 
        this.activeFlashs = new Map(); 

        this.isPartyMode = false;
        this.isCollapsed = false;
        this.isEconomyActive = true;

        this.currentMarketHealth = 1.0;

        this.coinsEnabled = false;

        // State für die Boom-Animation (nur noch Partikel & Props, kein Dauer-Wackeln)
        this.boomState = {
            active: false,
            timer: 0,
            scaffold: null,
            dustCloud: null
        };
    }

    setEconomyState(health) {
        const wasActive = this.isEconomyActive;
        this.currentMarketHealth = health;

        const isThriving = health > 0.8; 
        const isNormal = health >= 0.5;  
        const isCrisis = health < 0.5;   
        const isCollapsing = health < 0.3; 

        if (this.tavernLights) {
            this.tavernLights.visible = isNormal;
        }

        if (this.lanternLights) {
            this.lanternLights.forEach(light => {
                const base = light.userData.baseIntensity || 0.8;
                light.intensity = isCollapsing ? 0 : (base * health);
            });
        }

        if (this.tavernMugs) {
            this.tavernMugs.forEach(mug => {
                mug.visible = isNormal;
            });
        }

        if (this.tavernSmokeGroup) {
            this.tavernSmokeGroup.visible = !isCollapsing;
            this.tavernSmokeGroup.children.forEach(p => {
                if(p.material) p.material.opacity = isCrisis ? 0.1 : 0.6;
            });
        }

        if (this.shipyardSparks) {
            this.shipyardSparks.visible = isNormal;
        }

        const groups = [this.hqGroup, this.tavernGroup, this.shipyardGroup, this.bankGroup];

        groups.forEach(group => {
            if (!group) return;
            group.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (child.userData.isHint || child.name === 'HintArrow' || child.userData.isDust) {
                        return;
                    }

                    if (!child.userData.originalColor) {
                        child.userData.originalColor = child.material.color.clone();
                    }

                    const targetColor = child.userData.originalColor.clone();

                    if (isCollapsing) {
                        // Reduce saturation heavily and keep lightness only slightly darker to avoid fully black visuals.
                        targetColor.offsetHSL(0, -0.7, -0.15);
                    } else if (isCrisis) {
                        targetColor.offsetHSL(-0.02, -0.3, -0.15);
                    }

                    child.material.color.copy(targetColor);
                }
            });
        });

        this.props.forEach(propData => {
            if (propData.mesh) {
                propData.mesh.visible = isNormal;
            }
        });

        this.isEconomyActive = isThriving;

        if (health >= 0.6 && wasActive === false) {
             if(this.shipyardGroup) this.spawnConstructionDust(this.shipyardGroup.position, 0xFFFFFF);
        }
    }

    init() {
        this.createHQ(); 
        this.createTavern();
        this.createShipyard();
        this.createDock();
        this.createBankTent(); 
        this.createBank();

        this.initBuildingHints();

        this.setEconomyState(this.currentMarketHealth);

        events.on(DIRECTOR_EVENTS.PHASE_CHANGED, (data) => this.handlePhaseChange(data.phaseId));
        
        events.on(EVENTS.CMD_SHOW_TENT, () => this.showTent());
        
        events.on('world:enable_coins', () => { this.coinsEnabled = true; });

        events.on(ECON_EVENTS.EXPENSES_PAID, (data) => {
            if (this.coinsEnabled) this.spawnCoinFlow('OUT', data.intensity);
        });
        
        events.on(ECON_EVENTS.INCOME_RECEIVED, (data) => {
            if (this.coinsEnabled) this.spawnCoinFlow('IN', data.intensity);
        });

        events.on(EVENTS.TRIGGER_COIN_LEG, (data) => this.spawnSpecificLeg(data.from, data.to));

        events.on(EVENTS.CMD_SHOW_BUILDING_HINT, (payload) => {
            this.setBuildingHint(payload.type, payload.show);
        });

        events.on('world:update_visuals', (data) => {
            this.setEconomyState(data.health);
        });

        events.on('world:visual_effect', (data) => {
            if (data.type === 'STALL') {
                console.log("📉 [BUILDINGS] Visual Effect: STALL (Sättigung runter)");
                this.setBuildingSaturation(0.4); // Reduzierte Sättigung
            } else if (data.type === 'RECOVER') {
                console.log("✅ [BUILDINGS] Visual Effect: RECOVER (Sättigung zurücksetzen)");
                this.setBuildingSaturation(1.0); // Reset
            } else if (data.type === 'ROTTEN_CRATES') {
                this.spawnRottenCrates(5);
            }
        });

        events.on(ECON_EVENTS.MARKET_HEALTH_CHANGED, (data) => {
            this.setEconomyState(data.health);
        });

        events.on(EVENTS.VISUAL_DELIVERY_START, (data) => {
            const targetPos = this.getBuildingPosition(data.target);
            const startPos = data.fromPos || new THREE.Vector3(0, 3, 180);
            this.spawnCrateFlow(startPos, targetPos, data.count || 1, false);
        });

        events.on(EVENTS.VISUAL_DELIVERY_RETURN, (data) => {
        });

        events.on(EVENTS.BUILDING_REACTION, (data) => {
            this.triggerBuildingReaction(data.target, data.type);
        });

        events.on('world:trigger_boom_expansion', () => {
            this.triggerBoomVisuals();
        });

        events.on('world:shipyard_expansion_phase1', () => {
            this.activateShipyardExpansion();
        });

        events.on('world:tavern_expansion_start', () => {
            this.startTavernExpansion();
        });

        events.on(EVENTS.START_BOOM_CONSTRUCTION, () => {
            console.log('🏗️ [BUILDINGS] START_BOOM_CONSTRUCTION empfangen');
            this.startBoomSequence();
        });
        events.on(EVENTS.END_BOOM_CONSTRUCTION, () => this.endBoomSequence());
    }

    // --- NEUE BOOM VISUALISIERUNGS-LOGIK ---

    // Phase 1: Werft rüstet auf (Material erscheint, Sack ist angekommen)
    triggerShipyardBoom() {
        console.log("🏗️ [BUILDINGS] triggerShipyardBoom() - Sack angekommen!");
        if (!this.shipyardGroup) return;

        // 1. Staubwolken (Impact)
        const base = this.shipyardGroup.position;
        this.spawnConstructionDust(this.shipyardGroup.position, 0xFFFFFF, true);

        setTimeout(() => {
            this.spawnConstructionDust(new THREE.Vector3(base.x - 10, base.y, base.z + 5), 0xDDDDDD, true);
        }, 300);

        setTimeout(() => {
            this.spawnConstructionDust(new THREE.Vector3(base.x + 10, base.y, base.z + 5), 0xDDDDDD, true);
        }, 600);

        // 2. Props spawnen
        this.spawnProp('wood_stack', new THREE.Vector3(base.x - 12, base.y, base.z + 5), 0);
        this.spawnProp('wood_stack', new THREE.Vector3(base.x + 12, base.y, base.z + 5), 0.2);
        this.spawnProp('wood_stack', new THREE.Vector3(base.x - 15, base.y, base.z + 8), 0.4);
        this.spawnProp('wood_stack', new THREE.Vector3(base.x + 15, base.y, base.z + 8), 0.6);
        this.spawnProp('barrel_stack', new THREE.Vector3(base.x - 8, base.y, base.z - 12), 0.8);
        this.spawnProp('barrel_stack', new THREE.Vector3(base.x + 8, base.y, base.z - 12), 1.0);

        // 3. WICHTIG: Das Gebäude reagiert JETZT (Impact), weil der Sack da ist
        this.triggerBuildingReaction('SHIPYARD', 'SUCCESS');
    }

    visualizeBigTransfer(fromType, toType, shouldTriggerBoom = false) {
        console.log("💰 [BUILDINGS] visualizeBigTransfer()", fromType, "->", toType);
        const start = this.getBuildingPosition(fromType);
        const end = this.getBuildingPosition(toType);
        if(!start || !end) return;

        const bagGeo = new THREE.DodecahedronGeometry(3.5, 1);
        const bagMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xffaa00,
            emissiveIntensity: 0.4
        });
        const bag = new THREE.Mesh(bagGeo, bagMat);
        bag.position.copy(start);
        bag.position.y += 10;
        bag.castShadow = true;
        sceneSetup.scene.add(bag);

        this.particles.push({
            mesh: bag,
            start: bag.position.clone(),
            end: end.clone(),
            progress: 0,
            speed: 0.3,
            arcHeight: 70,
            isBigTransfer: true,
            trailTimer: 0,
            rotationSpeed: 0.08,
            shouldTriggerBoom: shouldTriggerBoom,
            targetType: toType
        });
    }

    // Phase 3: Taverne explodiert vor Leben
    triggerTavernBoom() {
        console.log("🍺 [BUILDINGS] triggerTavernBoom() - Sack angekommen!");
        if (!this.tavernGroup) return;

        const base = this.tavernGroup.position;

        // 1. Staub
        this.spawnConstructionDust(this.tavernGroup.position, 0xFFD700, true);

        setTimeout(() => {
            this.spawnConstructionDust(new THREE.Vector3(base.x + 8, base.y, base.z + 8), 0xFFAA00, true);
        }, 200);

        setTimeout(() => {
            this.spawnConstructionDust(new THREE.Vector3(base.x + 8, base.y, base.z - 8), 0xFFCC44, true);
        }, 400);

        setTimeout(() => {
            this.spawnConstructionDust(new THREE.Vector3(base.x + 15, base.y + 5, base.z), 0xFFD700, false);
        }, 600);

        // 2. Party Mode
        this.setTavernPartyMode(true);

        // 3. Props
        this.spawnProp('party_table', new THREE.Vector3(base.x + 15, base.y, base.z + 8), 0);
        this.spawnProp('party_table', new THREE.Vector3(base.x + 15, base.y, base.z - 8), 0.2);
        this.spawnProp('party_table', new THREE.Vector3(base.x + 20, base.y, base.z + 4), 0.3);
        this.spawnProp('party_table', new THREE.Vector3(base.x + 20, base.y, base.z - 4), 0.4);
        this.spawnProp('pole', new THREE.Vector3(base.x + 20, base.y, base.z + 12), 0.5);
        this.spawnProp('pole', new THREE.Vector3(base.x + 20, base.y, base.z - 12), 0.6);
        this.spawnProp('barrel_stack', new THREE.Vector3(base.x + 12, base.y, base.z + 12), 0.7);
        this.spawnProp('barrel_stack', new THREE.Vector3(base.x + 12, base.y, base.z - 12), 0.8);

        // 4. WICHTIG: Das Gebäude reagiert JETZT (Impact)
        this.triggerBuildingReaction('TAVERN', 'SUCCESS');

        // Nachbeben
        setTimeout(() => {
            this.triggerBuildingReaction('TAVERN', 'SUCCESS');
        }, 800);
    }

    spawnProp(type, position, delay) {
        const group = new THREE.Group();
        group.position.copy(position);
        group.scale.set(0, 0, 0);

        if (type === 'wood_stack') {
            const mat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
            const box = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 8), mat);
            box.position.y = 1;
            box.castShadow = true;
            group.add(box);
            const box2 = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 6), mat);
            box2.position.set(0, 3, 0);
            box2.castShadow = true;
            group.add(box2);
        }
        else if (type === 'barrel_stack') {
            const mat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 8), mat);
            barrel.rotation.z = Math.PI / 2;
            barrel.position.y = 1.5;
            group.add(barrel);
            const b2 = barrel.clone();
            b2.position.set(0, 1.5, 3.2);
            group.add(b2);
            const b3 = barrel.clone();
            b3.position.set(0, 4.0, 1.6);
            group.add(b3);
        }
        else if (type === 'party_table') {
            const matWood = new THREE.MeshStandardMaterial({ color: 0xD7CCC8 });
            const table = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.5, 10), matWood);
            table.position.y = 2.5;
            table.castShadow = true;
            group.add(table);
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.5), matWood);
            leg.position.y = 1.25;
            group.add(leg);

            const mugGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 6);
            const mugMat = new THREE.MeshStandardMaterial({ color: 0xFFC107 });
            for(let i=0; i<3; i++) {
                const mug = new THREE.Mesh(mugGeo, mugMat);
                mug.position.set(Math.sin(i*2)*1.5, 3.0, Math.cos(i*2)*1.5);
                group.add(mug);
            }
        }
        else if (type === 'pole') {
            const mat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 10), mat);
            pole.position.y = 5;
            group.add(pole);
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial({ color: 0xFFEB3B }));
            bulb.position.y = 10;
            group.add(bulb);
        }

        sceneSetup.scene.add(group);

        this.props.push({
            mesh: group,
            delay: delay,
            targetScale: 1.0,
            animationTime: 0,
            isBoomProp: true 
        });
    }

    setTavernPartyMode(isActive) {
        this.isPartyMode = isActive;
        if (this.tavernLights) {
            this.tavernLights.visible = isActive && this.isEconomyActive;
        }
        if (this.tavernMugs && this.tavernMugs.length) {
            this.tavernMugs.forEach(m => { m.visible = isActive; });
        }
    }

    createCoin(startPos, endPos, delay = 0, options = {}) {
        if (!startPos || !endPos) return;

        const speed = options.speed || 0.15;
        const scale = options.scale || 1.0;
        const color = options.color || 0xFFD700;
        const metalness = options.metalness ?? 0.9;
        const roughness = options.roughness ?? 0.1;
        const emissive = options.emissive ?? 0x000000;
        const emissiveIntensity = options.emissiveIntensity ?? 0.5;

        const coinGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.5, 12); 
        const coinMat = new THREE.MeshStandardMaterial({ 
            color: color, 
            metalness: metalness, 
            roughness: roughness,
            emissive,
            emissiveIntensity
        });
        
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.position.copy(startPos);
        coin.rotation.x = Math.PI / 2;
        coin.scale.set(scale, scale, scale);
        
        if (delay > 0) coin.visible = false;

        coin.castShadow = false;
        
        sceneSetup.scene.add(coin);

        this.particles.push({
            mesh: coin,
            start: startPos.clone(),
            end: endPos.clone(),
            progress: 0,
            speed: speed,
            arcHeight: 50,
            delay: delay,
            isFlowCoin: true
        });
    }

    createClogParticle(startPos, endPos) {
        if (!startPos || !endPos) return;
        const mid = startPos.clone().lerp(endPos, 0.5);
        const geo = new THREE.SphereGeometry(2, 10, 10);
        const mat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, transparent: true, opacity: 0.85, roughness: 1.0, metalness: 0 });
        const puff = new THREE.Mesh(geo, mat);
        puff.position.copy(startPos);
        sceneSetup.scene.add(puff);

        this.particles.push({
            mesh: puff,
            start: startPos.clone(),
            end: mid,
            progress: 0,
            speed: 0.12,
            arcHeight: 8,
            delay: 0,
            isFlowCoin: true,
            maxProgress: 1,
            fadeOut: true
        });
    }

    getBuildingPosition(type) {
        if (type === 'HQ') return this.hqGroup ? this.hqGroup.position : null;
        if (type === 'SHIPYARD') return this.shipyardGroup ? this.shipyardGroup.position : null;
        if (type === 'TAVERN') return this.tavernGroup ? this.tavernGroup.position : null;
        if (type === 'BANK') return this.bankGroup ? this.bankGroup.position : null;
        return null;
    }

    getGroupByType(type) {
        if (type === 'TAVERN') return this.tavernGroup;
        if (type === 'SHIPYARD') return this.shipyardGroup;
        if (type === 'HQ') return this.hqGroup;
        if (type === 'BANK') return this.bankGroup;
        return null;
    }

    spawnCrateFlow(start, end, count, isReject) {
        if (!start || !end) return;

        const opts = {
            speed: 0.85,
            scale: 1.0,
            color: 0x8d6e63,
            isCrate: true,
            isReject: isReject
        };

        for (let i = 0; i < count; i++) {
            this.createCrate(start, end, i * 0.08, opts);
        }
    }

    createCrate(startPos, endPos, delay = 0, options = {}) {
        const geo = new THREE.BoxGeometry(3.5, 2.0, 2.5); 
       
        const color = options.isReject ? 0xc0392b : options.color;
        const mat = new THREE.MeshStandardMaterial({ 
            color: color, 
            roughness: 0.8,
            flatShading: true
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);
        
        if (delay > 0) mesh.visible = false;
        mesh.castShadow = true;
        
        sceneSetup.scene.add(mesh);

        this.particles.push({
            mesh: mesh,
            start: startPos.clone(),
            end: endPos.clone(),
            progress: 0,
            speed: options.speed || 0.2, 
            arcHeight: 55, 
            delay: delay,
            isCrate: true,
            rotationSpeed: new THREE.Vector3(Math.random(), Math.random(), Math.random())
        });
    }

    spawnRottenCrates(count = 3) {
        if (!sceneSetup.scene) return;
        
        // Position am Steg (Dock)
        const startZ = 160;
        const geo = new THREE.BoxGeometry(2.5, 2.0, 2.5);
        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshStandardMaterial({
                color: 0x556B2F,
                roughness: 1.0,
                flatShading: true,
                transparent: true,
                opacity: 1.0
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 6,
                3.5,
                startZ + (Math.random() * 20)
            );
            mesh.rotation.y = Math.random() * Math.PI * 2;
            mesh.castShadow = true;
            sceneSetup.scene.add(mesh);

            this.particles.push({
                mesh: mesh,
                material: mat,
                life: 4.0,
                isDust: false,
                isRotten: true,
                velocity: new THREE.Vector3(0, -0.5, 0)
            });
        }
    }

    triggerBuildingReaction(buildingType, reactionType) {
        console.log(`🏢 [BUILDINGS] triggerBuildingReaction(${buildingType}, ${reactionType})`);
        const group = this.getGroupByType(buildingType);
        if (!group) {
            console.warn(`⚠️ [BUILDINGS] Kein Gebäude gefunden für Typ: ${buildingType}`);
            return;
        }

        this.shakingBuildings.set(group.uuid, {
            group: group,
            baseY: group.position.y,
            baseRot: group.rotation.clone(),
            timer: 0.5,
            type: reactionType
        });
        console.log(`✅ [BUILDINGS] Shake registriert für ${buildingType}, baseY: ${group.position.y}`);

        let color;
        if (reactionType === 'REJECT') {
            color = 0xe74c3c; 
        } else if (reactionType === 'PARTIAL_PAYMENT') {
            color = 0xFF4500; 
        } else {
            color = 0x2ecc71; 
        }

        this.spawnFlashParticles(group.position, color);

        if (reactionType === 'REJECT') {
            if (buildingType === 'TAVERN' && this.tavernSmokeGroup) {
                this.tavernSmokeGroup.visible = false;
            }
            if (buildingType === 'SHIPYARD' && this.shipyardSparks) {
                this.shipyardSparks.visible = false;
            }
        }

        if (reactionType === 'PARTIAL_PAYMENT') {
            const shakeData = this.shakingBuildings.get(group.uuid);
            if (shakeData) {
                shakeData.timer = 1.0; 
                shakeData.intensity = 2.0; 
            }

            this.activeFlashs.set(group.uuid, {
                group: group,
                timer: 1.0,
                color: 0xFF0000, 
                originalMaterials: new Map()
            });

            if (buildingType === 'TAVERN' && this.tavernSmokeGroup) {
                this.tavernSmokeGroup.children.forEach(particle => {
                    if (particle.material && particle.material.opacity) {
                        particle.material.opacity = 0.2; 
                    }
                });
            }
            if (buildingType === 'SHIPYARD' && this.shipyardSparks) {
                this.shipyardSparks.children.forEach(particle => {
                    if (particle.material && particle.material.opacity) {
                        particle.material.opacity = 0.2; 
                    }
                });
            }
        }
    }

    spawnFlashParticles(pos, color) {
        const count = 8;
        const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const mat = new THREE.MeshBasicMaterial({ color: color });

        for(let i=0; i<count; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.position.y += 10;
            
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                10 + Math.random() * 10,
                (Math.random() - 0.5) * 15
            );

            sceneSetup.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                life: 1.0,
                velocity: vel,
                isDust: true
            });
        }
    }

    spawnSpecificLeg(fromType, toType) {
        const start = this.getBuildingPosition(fromType);
        const end = this.getBuildingPosition(toType);

        if (!start || !end) return;

        const cinematicOptions = {
            speed: 0.22,
            scale: 2.0,
            color: 0xffe066,
            metalness: 1.0,
            roughness: 0.05,
            emissive: 0x8c6d1f,
            emissiveIntensity: 0.65
        };

        const count = Math.floor(10 + Math.random() * 6); 

        for(let i = 0; i < count; i++) {
            this.createCoin(start, end, i * 0.12, cinematicOptions);
        }
    }

    startBoomSequence() {
        console.log('🏗️ [BUILDINGS] startBoomSequence() aufgerufen');
        this.boomState.active = true;
        this.boomState.timer = 0;

        this.isEconomyActive = true;
        this.setEconomyState(1.0);

        if (this.tavernGroup) {
            this.createScaffold(this.tavernGroup);
            this.setTavernPartyMode(true);
        }

        // HIER KEIN triggerBuildingReaction! Das soll erst passieren, wenn der Sack ankommt.
    }

    createScaffold(targetGroup) {
        if (this.boomState.scaffold) return;

        const scaffold = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
        
        const thickness = 0.6;
        const height = 14; 
        const width = 12;
        
        for(let x=0; x<=width; x+=6) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, thickness), mat);
            post.position.set(x, height/2, 0);
            scaffold.add(post);
            const post2 = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, thickness), mat);
            post2.position.set(x, height/2, 5); 
            scaffold.add(post2);
        }

        for(let y=3; y<height; y+=4) {
            const plank = new THREE.Mesh(new THREE.BoxGeometry(width + 2, 0.4, 1.5), mat);
            plank.position.set(width/2, y, 2.5); 
            plank.rotation.z = (Math.random() - 0.5) * 0.15; 
            scaffold.add(plank);
        }

        const tPos = targetGroup.position.clone();
        scaffold.position.set(tPos.x + 18, tPos.y, tPos.z - 5);

        this.boomState.scaffold = scaffold;
        sceneSetup.scene.add(scaffold);

        this.spawnConstructionDust(scaffold.position, 0x8d6e63, true);
    }

    endBoomSequence() {
        this.boomState.active = false;

        if (this.boomState.scaffold) {
            this.spawnConstructionDust(this.boomState.scaffold.position, 0x8d6e63, false);
            sceneSetup.scene.remove(this.boomState.scaffold);
            if(this.boomState.scaffold.traverse) {
                this.boomState.scaffold.traverse(c => {
                    if(c.geometry) c.geometry.dispose();
                });
            }
            this.boomState.scaffold = null;
        }

        // Rotation resetten zur Sicherheit
        if (this.tavernGroup) {
            this.tavernGroup.rotation.set(0, Math.PI / 2, 0);
            this.tavernGroup.position.y = this.tavernGroup.userData.baseY || 0;
        }
        if (this.shipyardGroup) {
            this.shipyardGroup.rotation.set(0, 0, 0);
            this.shipyardGroup.position.y = this.shipyardGroup.userData.baseY || 0;
        }
    }


    spawnWorkParticles(center, type) {
        const count = type === 'SPARK' ? 5 : 2;
        const color = type === 'SPARK' ? 0xFFFF00 : 0x8D6E63;
        const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3); 

        for(let i=0; i<count; i++) {
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color }));

            mesh.position.copy(center).add(new THREE.Vector3(
                (Math.random()-0.5)*10,
                2 + Math.random()*5,
                (Math.random()-0.5)*10
            ));

            sceneSetup.scene.add(mesh);

            const velocity = new THREE.Vector3(
                (Math.random()-0.5) * 10,
                10 + Math.random() * 10,
                (Math.random()-0.5) * 10
            );

            this.particles.push({
                mesh: mesh,
                life: 1.0,
                velocity: velocity,
                isDust: true, 
                isSpark: (type === 'SPARK')
            });
        }
    }

    spawnCoinFlow(direction, intensity = 1.0) {
        if (!this.coinsEnabled) return; 
        if (!this.hqGroup || !this.tavernGroup || !this.shipyardGroup) return;

        const dropChance = Math.max(0.2, intensity);

        if (Math.random() > this.flowIntensity) return; 
        if (Math.random() > dropChance) return; 

        let coinCount = 1;
        if (intensity >= 0.95) coinCount = 2; 
        
        const standardOps = { speed: 0.15, scale: 1.0 };
        
        if (direction === 'OUT') {
            for(let i=0; i<coinCount; i++) {
                const delay = i * 0.5;
                this.createCoin(this.hqGroup.position, this.shipyardGroup.position, delay, standardOps);
                this.createCoin(this.shipyardGroup.position, this.tavernGroup.position, delay + 1.2, standardOps);
            }
        } else {
            for(let i=0; i<coinCount; i++) {
                const delay = i * 0.5;
                this.createCoin(this.tavernGroup.position, this.hqGroup.position, delay, standardOps);
            }
        }
    }

    update(dt) {
        const speed = game.speedMultiplier > 0 ? game.speedMultiplier : 1;
        const unscaledDt = dt / speed;
        const time = performance.now() * 0.001;
        const economyActive = this.isEconomyActive && !this.isCollapsed;
        const isAlive = this.currentMarketHealth > 0.2;

        if (this.boomState.active) {
            this.boomState.timer += dt;

            // Partikel (Funken) weiterhin spawnen für Atmosphäre
            if (Math.floor(time * 2) > Math.floor((time - dt) * 2)) {
                if (this.shipyardGroup) {
                    this.spawnWorkParticles(this.shipyardGroup.position, 'SPARK');
                    this.spawnWorkParticles(this.shipyardGroup.position, 'WOOD');
                }
            }
        }
        
        this.hints.forEach((hint) => {
            if (hint.visible) {
                hint.position.y = (hint.userData.baseY || 0) + Math.sin(time * 5 + (hint.userData.animOffset || 0)) * 2.0;
                hint.rotation.y += dt;
            }
        });

        if (economy.state.isSavingActive) {
            this.flowIntensity -= dt * 0.18;
        } else {
            this.flowIntensity += dt * 1.0;
        }
        if (this.flowIntensity < 0) this.flowIntensity = 0;
        if (this.flowIntensity > 1) this.flowIntensity = 1;

        if (this.bankCoin && this.bankGroup.visible && !this.isCollapsed) {
            this.bankCoin.rotation.y += 1.5 * unscaledDt;
        }

        if (this.tavernSignPivot) {
            this.tavernSignPivot.rotation.z = Math.sin(time * 1.5) * 0.12;
        }

        if (this.lanternLights.length) {
            if (economyActive) {
                const healthFactor = Math.max(0, this.currentMarketHealth);
                const pulse = 1.0 + Math.sin(time * 2.5) * 0.3;
                this.lanternLights.forEach((light) => {
                    const base = light.userData.baseIntensity || 0.8;
                    light.intensity = Math.max(0, base * healthFactor * pulse);
                });
            } else {
                this.lanternLights.forEach((light) => { light.intensity = 0; });
            }
        }

        if (this.craneArm) {
            const baseRotX = this.craneArm.userData.baseRotationX ?? this.craneArm.rotation.x;
            this.craneArm.rotation.x = baseRotX;
            this.craneArm.rotation.y = economyActive ? Math.sin(time * 0.5) * 0.3 : 0;

            if (this.craneLine) {
                const basePos = this.craneLine.userData.basePosition || this.craneLine.position.clone();
                this.craneLine.position.copy(basePos);
                if (economyActive) {
                    this.craneLine.position.z = basePos.z + Math.sin(time * 1.1) * 0.45;
                }
            }

            if (this.craneHook) {
                const basePos = this.craneHook.userData.basePosition || this.craneHook.position.clone();
                this.craneHook.position.copy(basePos);
                if (economyActive) {
                    this.craneHook.position.y = basePos.y + Math.sin(time * 2.0) * 0.35;
                    this.craneHook.position.z = basePos.z + Math.cos(time * 1.1) * 0.25;
                }
            }
        }

        const marketHealthy = this.currentMarketHealth > 0.6;

        if (this.shipyardGroup && economyActive && marketHealthy) {
            this.shipyardDustTimer += unscaledDt;
            if (this.shipyardDustTimer > 0.2) {
                if (Math.random() > 0.3) this.spawnShipyardDust();
                this.shipyardDustTimer = 0;
            }
        } else {
            this.shipyardDustTimer = 0;
        }

        if (this.shipyardSparks && this.shipyardSparks.visible) {
            this.shipyardSparks.children.forEach(p => {
                p.position.add(p.userData.velocity);
                p.rotation.x += dt * 2;
                p.rotation.z += dt * 2;
                
                if (p.position.y > 8) {
                    p.position.y = 0;
                    p.position.x = (Math.random() - 0.5) * 10;
                    p.position.z = (Math.random() - 0.5) * 10;
                }
            });
        }

        if (this.hqSmokeGroup) {
            this.hqSmokeGroup.children.forEach((puff, i) => {
                puff.position.y += unscaledDt * 6;
                puff.position.x += Math.sin(time * 1.2 + i) * 0.02;
                puff.position.z += Math.cos(time * 0.9 + i) * 0.02;
                puff.scale.addScalar(unscaledDt * 0.25);
                puff.material.opacity -= unscaledDt * 0.35;
                if (puff.material.opacity <= 0.05) {
                    puff.position.set(0, 0, 0);
                    puff.scale.setScalar(1);
                    puff.material.opacity = 0.6 + Math.random() * 0.2;
                }
            });
        }

        if (this.tavernSmokeGroup) {
            const smokeActive = isAlive && !this.isCollapsed;
            this.tavernSmokeGroup.visible = smokeActive;
            
            if (smokeActive) {
                const smokeDensity = 0.6 * this.currentMarketHealth; 
                
                this.tavernSmokeGroup.children.forEach((puff, i) => {
                    puff.position.y += unscaledDt * 5.5;
                    puff.position.x += Math.sin(time * 1.1 + i) * 0.02;
                    puff.position.z += Math.cos(time * 1.0 + i) * 0.02;
                    puff.scale.addScalar(unscaledDt * 0.2);
                    
                    puff.material.opacity -= unscaledDt * 0.28;
                    
                    if (puff.material.opacity <= 0.05) {
                        puff.position.set(0, 0, 0);
                        puff.scale.setScalar(1);
                        puff.material.opacity = smokeDensity + Math.random() * 0.1;
                    }
                    
                    if (puff.material.opacity > smokeDensity) {
                         puff.material.opacity = smokeDensity;
                    }
                });
            } else {
                this.tavernSmokeGroup.children.forEach((puff) => {
                    puff.position.set(0, 0, 0);
                    puff.scale.setScalar(1);
                    if (puff.material) puff.material.opacity = 0.7;
                });
            }
        }

        if (this.isPartyMode && this.tavernLights && this.tavernLights.visible) {
            this.tavernLights.children.forEach((light, i) => {
                if (light.isPointLight) {
                    light.intensity = 1.5 + Math.sin(time * 3 + i) * 0.8;
                    const hue = (time * 0.2 + i * 0.2) % 1;
                    light.color.setHSL(hue, 0.8, 0.5);
                }
            });
        }

        if (this.tavernMugs && this.tavernMugs.length) {
            this.tavernMugs.forEach((mug, i) => {
                if (!mug.userData.basePosition) {
                    mug.userData.basePosition = mug.position.clone();
                }
                if (mug.userData.baseRotationY === undefined) {
                    mug.userData.baseRotationY = mug.rotation.y;
                }
                mug.visible = economyActive;
                const basePos = mug.userData.basePosition;
                if (!economyActive) {
                    mug.position.copy(basePos);
                    mug.rotation.y = mug.userData.baseRotationY || 0;
                    return;
                }

                const bob = Math.sin(time * 2 + i) * 0.12;
                const sway = Math.sin(time * 1.4 + i) * 0.15;
                mug.position.y = basePos.y + bob;
                mug.rotation.y = (mug.userData.baseRotationY || 0) + sway;
            });
        }

        this.shakingBuildings.forEach((data, uuid) => {
            data.timer -= unscaledDt;

            if (data.timer <= 0) {
                data.group.position.y = data.baseY;
                data.group.rotation.copy(data.baseRot);
                this.shakingBuildings.delete(uuid);
            } else {
                const intensity = data.timer;

                if (data.type === 'REJECT') {
                    data.group.rotation.y = data.baseRot.y + Math.sin(data.timer * 30) * 0.1 * intensity;
                } else {
                    // SUCCESS: Vertikales Hüpfen + Rotation für mehr Sichtbarkeit
                    data.group.position.y = data.baseY + Math.sin(data.timer * 20) * 2.5 * intensity;
                    data.group.rotation.x = data.baseRot.x + Math.sin(data.timer * 25) * 0.08 * intensity;
                    data.group.rotation.z = data.baseRot.z + Math.cos(data.timer * 25) * 0.08 * intensity;
                }
            }
        });

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.isCrate) {
                if (p.delay > 0) {
                    p.delay -= unscaledDt;
                    if (p.delay <= 0) p.mesh.visible = true;
                    else continue;
                }

                p.progress += unscaledDt * p.speed;
                
                if (p.progress >= 1) {
                    sceneSetup.scene.remove(p.mesh);
                    if (p.mesh.geometry) p.mesh.geometry.dispose(); 
                    this.particles.splice(i, 1);

                    if (p.isReject) {
                        events.emit('world:crate_landed_on_boat', { boatId: 0 });
                    }
                } else {
                    const t = p.progress;
                    p.mesh.position.x = (1 - t) * p.start.x + t * p.end.x;
                    p.mesh.position.z = (1 - t) * p.start.z + t * p.end.z;
                    
                    const baseY = (1 - t) * p.start.y + t * p.end.y;
                    const arc = p.arcHeight * 4 * t * (1 - t); 
                    p.mesh.position.y = baseY + arc;

                    p.mesh.rotation.x += p.rotationSpeed.x * 5 * unscaledDt;
                    p.mesh.rotation.y += p.rotationSpeed.y * 5 * unscaledDt;
                }
            } else if (p.isBigTransfer) {
                p.progress += dt * p.speed;
                if (p.progress >= 1) {
                    sceneSetup.scene.remove(p.mesh);
                    if(p.mesh.geometry) p.mesh.geometry.dispose();
                    this.particles.splice(i, 1);

                    if (p.shouldTriggerBoom) {
                        console.log("💰 [BUILDINGS] Geldsack angekommen bei:", p.targetType);

                        if (p.targetType === 'TAVERN') {
                            console.log("💰 [BUILDINGS] Triggere Taverne Boom!");
                            this.triggerTavernBoom();
                        } else if (p.targetType === 'SHIPYARD') {
                            console.log("💰 [BUILDINGS] Triggere Werft Boom!");
                            this.triggerShipyardBoom();
                        }

                        events.emit('world:money_transfer_arrived', { target: p.targetType });
                    }
                } else {
                    const t = p.progress;
                    p.mesh.position.x = (1 - t) * p.start.x + t * p.end.x;
                    p.mesh.position.z = (1 - t) * p.start.z + t * p.end.z;
                    const baseY = (1 - t) * p.start.y + t * p.end.y;
                    const arc = Math.sin(t * Math.PI) * p.arcHeight;
                    p.mesh.position.y = baseY + arc;
                    p.mesh.rotation.x += dt * 5;
                    p.mesh.rotation.z += dt * 3;

                    p.trailTimer += dt;
                    if (p.trailTimer > 0.05) {
                        this.spawnConstructionDust(p.mesh.position, 0xFFD700, false);
                        p.trailTimer = 0;
                    }
                }
            } else if (p.isFlowCoin) {
                if (p.delay > 0) {
                    p.delay -= unscaledDt;
                    if (p.delay <= 0) {
                        p.mesh.visible = true; 
                    } else {
                        continue; 
                    }
                }

                p.progress += unscaledDt * p.speed;

                const maxProgress = p.maxProgress || 1;
                if (p.progress >= maxProgress) {
                    sceneSetup.scene.remove(p.mesh);
                    if (p.mesh.geometry) p.mesh.geometry.dispose();
                    this.particles.splice(i, 1);
                } else {
                    const tRaw = p.progress;
                    const t = Math.min(1, tRaw / maxProgress);

                    p.mesh.position.x = (1 - t) * p.start.x + t * p.end.x;
                    p.mesh.position.z = (1 - t) * p.start.z + t * p.end.z;

                    const baseY = (1 - t) * p.start.y + t * p.end.y;
                    const arc = Math.sin(t * Math.PI) * p.arcHeight; 
                    
                    p.mesh.position.y = baseY + arc;

                    p.mesh.rotation.z += unscaledDt * 4; 
                    p.mesh.rotation.y += unscaledDt * 2;
                }
            } else if (p.isRotten) {
                p.life -= dt;

                if (p.life < 2.0) {
                    p.mesh.position.y -= dt * 0.5;
                    p.mesh.scale.multiplyScalar(0.99);
                    if (p.material) {
                        p.material.opacity = Math.max(0, p.life * 0.5);
                    }
                }

                if (p.life <= 0) {
                    sceneSetup.scene.remove(p.mesh);
                    if (p.mesh.geometry) p.mesh.geometry.dispose();
                    this.particles.splice(i, 1);
                }
            } else {
                const lifeDelta = p.isDust ? unscaledDt : dt;

                if (p.isSpark) {
                    p.life -= dt * 2.0; 
                } else {
                    p.life -= lifeDelta;
                }

                if (p.velocity) {
                    p.mesh.position.addScaledVector(p.velocity, lifeDelta);
                    if (p.isDust) {
                        p.velocity.y -= 9.8 * lifeDelta;
                    }
                } else {
                    p.mesh.position.y += lifeDelta * 2.0;
                }

                if (p.isDust) {
                    p.mesh.scale.multiplyScalar(0.98);
                } else {
                    p.mesh.scale.multiplyScalar(1.0 + dt);
                }

                if (p.material) {
                    p.material.opacity = Math.max(0, p.life);
                }
                if (p.life <= 0) {
                    sceneSetup.scene.remove(p.mesh);
                    if (p.mesh.geometry) p.mesh.geometry.dispose();
                    this.particles.splice(i, 1);
                }
            }
        }

        if (this.props.length > 0 && time % 1 < dt) { 
            console.log("🎨 [BUILDINGS UPDATE] Props werden animiert:", this.props.length);
        }
        this.props.forEach((prop, i) => {
            if (prop.delay > 0) {
                prop.delay -= dt;
                if (prop.delay <= 0 && time % 1 < dt) {
                    console.log("🎨 [BUILDINGS] Prop", i, "Delay abgelaufen, starte Animation");
                }
                return;
            }
            if (prop.mesh.scale.x < prop.targetScale) {
                prop.animationTime += dt * 3; 
                let s = prop.animationTime;
                let scale = 1 + Math.sin((s - 0.5) * Math.PI) * Math.pow(2, -5 * s);
                if (scale > 1.05) scale = 1.05; 
                if (s > 2) scale = 1; 

                prop.mesh.scale.setScalar(scale);

                if (time % 1 < dt && i === 0) { 
                    console.log("🎨 [BUILDINGS] Prop 0 animiert - scale:", scale.toFixed(3), "animTime:", s.toFixed(2));
                }
            }
        });

        if (this.boomState.active) {
            if (this.craneArm) this.craneArm.rotation.y += dt * 2;
        }
    }

    initBuildingHints() {
        const targets = [
            { type: 'hq', group: this.hqGroup, height: 35 },
            { type: 'shipyard', group: this.shipyardGroup, height: 30 },
            { type: 'tavern', group: this.tavernGroup, height: 32 },
            { type: 'bank', group: this.bankGroup, height: 35 }
        ];

        targets.forEach((t) => {
            if (!t.group) return;

            const hintMesh = new THREE.Group();
            const mat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 8, 8), mat);
            shaft.position.y = 5;
            shaft.userData.isHint = true;
            hintMesh.add(shaft);

            const head = new THREE.Mesh(new THREE.ConeGeometry(4, 7, 8), mat);
            head.position.y = -2.0;
            head.rotation.x = Math.PI;
            head.userData.isHint = true;
            hintMesh.add(head);

            hintMesh.position.set(0, t.height, 0);
            hintMesh.visible = false;
            hintMesh.userData = { baseY: t.height, animOffset: Math.random() * 10, isHint: true }; 

            t.group.add(hintMesh);
            this.hints.set(t.type, hintMesh);
        });
    }

    setBuildingHint(type, show) {
        const hint = this.hints.get(type);
        if (hint) hint.visible = !!show;
    }

    setBuildingSaturation(saturation) {
        const isActive = saturation > 0.5;

        // Partikel ausschalten bei niedriger Sättigung
        if (this.hqSmokeGroup) this.hqSmokeGroup.visible = isActive;
        if (this.tavernSmokeGroup) this.tavernSmokeGroup.visible = isActive;
        if (this.shipyardSparks) this.shipyardSparks.visible = isActive;

        // Lichter aus
        if (this.lanternLights) {
            this.lanternLights.forEach(light => {
                if (light) light.intensity = isActive ? (light.userData.baseIntensity || 0.8) : 0;
            });
        }
        if (this.tavernLights) {
            this.tavernLights.visible = isActive;
        }

        const groups = [this.hqGroup, this.tavernGroup, this.shipyardGroup, this.bankGroup];
        groups.forEach(group => {
            if (!group) return;
            group.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Originalfarbe speichern falls noch nicht geschehen
                    if (!child.userData.originalColor) {
                        child.userData.originalColor = child.material.color.clone();
                    }

                    const original = child.userData.originalColor;

                    // Graustufen berechnen
                    const greyVal = original.r * 0.3 + original.g * 0.59 + original.b * 0.11;
                    const greyColor = new THREE.Color(greyVal, greyVal, greyVal);

                    // Lerp zwischen Original und Grau basierend auf Saturation
                    // saturation 1.0 = Original, 0.0 = Grau
                    child.material.color.copy(greyColor).lerp(original, saturation);
                }
            });
        });
    }

    getGroupTopPosition(group, extraHeight = 0) {
        const bounds = new THREE.Box3().setFromObject(group);
        const top = bounds.max.y + extraHeight;
        const center = bounds.getCenter(new THREE.Vector3());
        return new THREE.Vector3(center.x, top, center.z);
    }

    handlePhaseChange(phaseId) {
        switch (phaseId) {
            case 'STAGNATION':
                break;
            case 'BOOM':
                this.constructBank();
                this.setTavernPartyMode(true);
                break;
            case 'COLLAPSE':
                this.setTavernPartyMode(false);
                this.isCollapsed = true;
                break;
        }
    }

    showTent() {
        if (!this.tentGroup || this.tentGroup.visible) return;

        this.tentGroup.visible = true;
        sceneSetup.registerInteractable(this.tentGroup);
        this.spawnConstructionDust(this.tentGroup.position, 0xFFFFFF, true);
        events.emit(EVENTS.TOAST, { message: 'Sterling hat sein Quartier bezogen.' });
    }

    constructBank() {
        if (this.tentGroup) {
            this.tentGroup.visible = false;
            sceneSetup.unregisterInteractable(this.tentGroup);
        }
        
        if (this.bankGroup) {
            this.bankGroup.position.copy(this.bankOrigin);
            this.bankGroup.visible = true;
            sceneSetup.registerInteractable(this.bankGroup);
            this.spawnConstructionDust(this.bankGroup.position, 0xFFD700);
            events.emit(EVENTS.TOAST, { message: 'Die Bank wurde eröffnet!' });
        }
    }

    spawnConstructionDust(pos, colorHex, isBig = false) {
        if (!pos) return;

        const count = isBig ? 25 : 15;
        const geo = new THREE.DodecahedronGeometry(1, 0);

        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshStandardMaterial({
                color: colorHex,
                transparent: true,
                opacity: 1.0,
                flatShading: true
            });

            const mesh = new THREE.Mesh(geo, mat);
            const spread = isBig ? 20 : 15;
            const offsetX = (Math.random() - 0.5) * spread;
            const offsetZ = (Math.random() - 0.5) * spread;
            const offsetY = Math.random() * 5;

            mesh.position.set(pos.x + offsetX, pos.y + offsetY, pos.z + offsetZ);
            const s = (1 + Math.random() * 2) * (isBig ? 1.5 : 1.0);
            mesh.scale.set(s, s, s);

            mesh.castShadow = false; 
            mesh.receiveShadow = false;

            sceneSetup.scene.add(mesh);

            this.particles.push({
                mesh,
                material: mesh.material,
                life: isBig ? 3.0 : 2.0,
                isFlowCoin: false,
                isDust: true,
                velocity: new THREE.Vector3(0, 8 + Math.random() * 8, 0)
            });
        }
    }

    addLevelUpIcon(group) {
        if (!group) return;

        const iconGroup = new THREE.Group();

        const starGeo = new THREE.ConeGeometry(3, 6, 4);
        const starMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const star1 = new THREE.Mesh(starGeo, starMat);
        star1.rotation.x = Math.PI;
        iconGroup.add(star1);

        const star2 = star1.clone();
        star2.rotation.z = Math.PI;
        iconGroup.add(star2);

        iconGroup.position.set(0, 35, 0);
        group.add(iconGroup);

        let time = 0;
        const animate = () => {
            time += 0.05;
            if (time > 3) {
                group.remove(iconGroup);
                return;
            }

            iconGroup.position.y = 35 + Math.sin(time * 5) * 3;
            iconGroup.rotation.y += 0.1;
            iconGroup.scale.setScalar(1 + Math.sin(time * 3) * 0.2);

            requestAnimationFrame(animate);
        };
        animate();
    }

    triggerBoomVisuals() {
        if (this.shipyardGroup) {
            this.spawnConstructionDust(this.shipyardGroup.position, 0xFFFFFF, true);

            const workInterval = setInterval(() => {
                if (Math.random() > 0.5) {
                    this.spawnConstructionDust(this.shipyardGroup.position, 0xFFFF00, false);
                }
            }, 600);

            setTimeout(() => clearInterval(workInterval), 8000);
        }

        if (this.tavernGroup) {
            const scaffoldGeo = new THREE.BoxGeometry(8, 12, 1);
            const scaffoldMat = new THREE.MeshStandardMaterial({
                color: 0x8d6e63,
                wireframe: true,
                transparent: true,
                opacity: 0.7
            });
            const scaffold = new THREE.Mesh(scaffoldGeo, scaffoldMat);
            scaffold.position.copy(this.tavernGroup.position);
            scaffold.position.x += 12; 
            scaffold.position.y += 6;
            sceneSetup.scene.add(scaffold);

            this.spawnConstructionDust(scaffold.position, 0x8d6e63, true);

            setTimeout(() => {
                sceneSetup.scene.remove(scaffold);
                scaffold.geometry.dispose();
                scaffold.material.dispose();
                this.setTavernPartyMode(true);
            }, 8000);
        }
    }

    activateShipyardExpansion() {
        if (!this.shipyardGroup) return;

        if (this.shipyardSparks) this.shipyardSparks.visible = true;

        let dustTimer = 0;
        const spawnDust = () => {
            if (dustTimer < 8) {
                this.spawnShipyardDust();
                dustTimer += 0.5;
                setTimeout(spawnDust, 500);
            }
        };
        spawnDust();

        const pos = this.shipyardGroup.position;
        this.spawnConstructionDust(pos, 0xFFA500, false);
    }

    startTavernExpansion() {
        if (!this.tavernGroup) return;

        const pos = this.tavernGroup.position;
        this.spawnConstructionDust(pos, 0x8B4513, true);

        let buildTimer = 0;
        const spawnBuildDust = () => {
            if (buildTimer < 8) {
                this.spawnConstructionDust(pos, 0xD4A373, false);
                buildTimer += 1;
                setTimeout(spawnBuildDust, 1000);
            }
        };
        spawnBuildDust();

        const scaffoldGeo = new THREE.BoxGeometry(8, 12, 3);
        const scaffoldMat = new THREE.MeshStandardMaterial({
            color: 0x8B6F47,
            transparent: true,
            opacity: 0.6,
            flatShading: true
        });
        const scaffold = new THREE.Mesh(scaffoldGeo, scaffoldMat);
        scaffold.position.set(pos.x + 12, pos.y + 6, pos.z);
        sceneSetup.scene.add(scaffold);

        setTimeout(() => {
            sceneSetup.scene.remove(scaffold);
        }, 8000);
    }

    spawnShipyardDust() {
        if (!this.shipyardGroup) return;

        const pos = this.shipyardGroup.position.clone().add(new THREE.Vector3(0, 4, 0));

        const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const mat = new THREE.MeshBasicMaterial({ color: 0xd7ccc8, transparent: true, opacity: 1.0 });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(
            pos.x + (Math.random() - 0.5) * 10,
            pos.y + Math.random() * 3,
            pos.z + (Math.random() - 0.5) * 4
        );

        sceneSetup.scene.add(mesh);

        this.particles.push({
            mesh: mesh,
            material: mesh.material,
            life: 1.0 + Math.random(),
            velocity: new THREE.Vector3((Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2),
            isFlowCoin: false,
            isDust: true
        });
    }

    createWorkParticles(pos) {
        const particleCount = 20;
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const mat = new THREE.MeshBasicMaterial({ color: 0xFFD54F }); 

        for(let i=0; i<particleCount; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 10,
                Math.random() * 5,
                (Math.random() - 0.5) * 10
            );
            mesh.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    0.1 + Math.random() * 0.2,
                    (Math.random() - 0.5) * 0.1
                ),
                resetY: Math.random() * 5
            };
            group.add(mesh);
        }
        
        group.position.copy(pos);
        sceneSetup.scene.add(group);
        return group;
    }

    createFoundation(width, depth, height = 8, color = 0x555b66) {
        const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
        const foundation = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
        foundation.position.y = -height * 0.5; 
        foundation.castShadow = true;
        foundation.receiveShadow = true;
        return foundation;
    }

    createWindow(width, height, color = 0x1f3b61) {
        const mat = new THREE.MeshStandardMaterial({ color, emissive: 0x0e1a2b, flatShading: true });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.4), mat);
        mesh.castShadow = true;
        return mesh;
    }

    createDoor(width, height, color = 0x8d6e63) {
        const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.6), mat);
        mesh.castShadow = true;
        return mesh;
    }

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
        return -10;
    }

    createHQ() {
        const x = 0; const z = -60;
        const y = this.getGroundHeight(x, z) + 0.8;
        
        const group = new THREE.Group();
        group.scale.set(1.2, 1.2, 1.2);
        group.userData = { type: 'hq', name: 'Fischerhaus', isInteractable: true };

        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf7e7d3, flatShading: true });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x4ecdc4, flatShading: true });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x3c5a73, flatShading: true });

        const foundation = this.createFoundation(26, 28, 8, 0x4a5568);
        group.add(foundation);

        const body = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 14), wallMat);
        body.position.y = 6; 
        body.castShadow = true; 
        group.add(body);

        [[-11, 6, -7], [11, 6, -7], [-11, 6, 7], [11, 6, 7]].forEach(pos => {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), woodMat);
            beam.position.set(pos[0], pos[1], pos[2]);
            beam.castShadow = true;
            group.add(beam);
        });

        const roof = new THREE.Mesh(new THREE.ConeGeometry(22, 10, 4), roofMat);
        roof.position.y = 16.5; 
        roof.rotation.y = Math.PI / 4; 
        roof.castShadow = true;
        group.add(roof);

        const chimney = new THREE.Mesh(new THREE.BoxGeometry(3, 7, 3), new THREE.MeshStandardMaterial({ color: 0x6b7b83, flatShading: true }));
        chimney.position.set(-6, 18, -3);
        chimney.castShadow = true;
        group.add(chimney);

        this.hqSmokeGroup = new THREE.Group();
        for (let i = 0; i < 4; i++) {
            const puff = new THREE.Mesh(
                new THREE.DodecahedronGeometry(1.3 + Math.random() * 0.4, 0),
                new THREE.MeshStandardMaterial({ color: 0xe8edf2, transparent: true, opacity: 0.7, flatShading: true })
            );
            puff.position.set(0, 0, 0);
            puff.castShadow = false;
            this.hqSmokeGroup.add(puff);
        }
        this.hqSmokeGroup.position.set(chimney.position.x, chimney.position.y + 3, chimney.position.z);
        group.add(this.hqSmokeGroup);

        const door = this.createDoor(3, 6, 0x8b5a3c);
        door.position.set(0, 3, 7.6);
        group.add(door);

        const windowPositions = [
            [-6, 6, 7.6], [6, 6, 7.6], 
            [-9, 6, 0], [9, 6, 0],     
            [0, 6, -7.6]
        ];
        windowPositions.forEach(pos => {
            const w = this.createWindow(3.5, 2.2);
            w.position.set(pos[0], pos[1], pos[2]);
            group.add(w);
        });

        const porch = new THREE.Mesh(new THREE.BoxGeometry(16, 1, 8), woodMat);
        porch.position.set(0, 0.5, 10.5);
        porch.castShadow = true;
        group.add(porch);

        [[-7, 3, 6.5], [7, 3, 6.5], [-7, 3, 12.5], [7, 3, 12.5]].forEach(pos => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 0.8), woodMat);
            post.position.set(pos[0], pos[1], pos[2]);
            post.castShadow = true;
            group.add(post);
        });

        const railFront = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 0.6), accentMat);
        railFront.position.set(0, 3.5, 12.5);
        group.add(railFront);

        const railBack = railFront.clone();
        railBack.position.z = 6.5;
        group.add(railBack);

        const awning = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x3cb5a3, flatShading: true }));
        awning.position.set(0, 8, 9);
        awning.rotation.x = -0.25;
        awning.castShadow = true;
        group.add(awning);

        const rackGroup = new THREE.Group();
        const rackPosts = [
            new THREE.Vector3(-12, 0, -4),
            new THREE.Vector3(-12, 0, 4)
        ];
        rackPosts.forEach(p => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 0.8), woodMat);
            post.position.set(p.x, p.y + 4, p.z);
            post.castShadow = true;
            rackGroup.add(post);
        });
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 8, 6), accentMat);
        line.rotation.x = Math.PI / 2;
        line.position.set(-12, 7.5, 0);
        rackGroup.add(line);
        for (let i = -1; i <= 1; i++) {
            const fish = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0xf4a261, flatShading: true }));
            fish.rotation.z = Math.PI;
            fish.position.set(-12, 6.5, i * 2.5);
            rackGroup.add(fish);
        }
        group.add(rackGroup);

        const crateMat = new THREE.MeshStandardMaterial({ color: 0xb08a63, flatShading: true });
        const cratePositions = [
            [4, 1, 6], [6, 2, 7.5], [2, 1.5, 8]
        ];
        cratePositions.forEach((p, idx) => {
            const crate = new THREE.Mesh(new THREE.BoxGeometry(3 + idx, 2 + idx * 0.5, 3), crateMat);
            crate.position.set(p[0], p[1], p[2]);
            crate.castShadow = true;
            group.add(crate);
        });

        group.position.set(x, y, z);
        group.rotation.y = 0;
        
        this.hqGroup = group; 
        
        sceneSetup.scene.add(group);
        sceneSetup.registerInteractable(group);
        this.buildings.push(group);
    }

    createBankTent() {
        const x = 60; const z = 0;
        const y = this.getGroundHeight(x, z) + 0.8;

        const group = new THREE.Group();
        const canvasMat = new THREE.MeshStandardMaterial({ color: 0xF5F5DC, flatShading: true }); 
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, flatShading: true });
        
        const tent = new THREE.Mesh(new THREE.ConeGeometry(8, 10, 4), canvasMat);
        tent.position.y = 5;
        tent.rotation.y = Math.PI / 4;
        tent.castShadow = true;
        group.add(tent);

        const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 2), woodMat);
        counter.position.set(0, 1.5, 6);
        counter.castShadow = true;
        group.add(counter);

        group.position.set(x, y, z);
        group.rotation.y = -Math.PI / 2;
        group.visible = false; 

        group.userData = { type: 'bank_tent', name: 'Sterlings Zelt', isInteractable: true };

        sceneSetup.scene.add(group);
        if (group.visible) sceneSetup.registerInteractable(group);
        this.buildings.push(group);
        this.tentGroup = group;
    }

    createBank() {
        const x = 60; const z = 0;
        const y = this.getGroundHeight(x, z) + 0.8;
        this.bankOrigin.set(x, y, z); 

        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, flatShading: true });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x455a64, flatShading: true });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.6, roughness: 0.3, flatShading: true });

        const foundation = this.createFoundation(34, 32, 9, 0x4f5961);
        group.add(foundation);

        const stairs = new THREE.Group();
        const stepMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, flatShading: true });
        [[20, 1, 6, 12], [22, 1, 5, 14], [24, 1, 4, 16]].forEach(cfg => {
            const s = new THREE.Mesh(new THREE.BoxGeometry(cfg[0], cfg[1], cfg[2]), stepMat);
            s.position.set(0, cfg[1] * 0.5 - 0.1, cfg[3]);
            s.castShadow = true;
            stairs.add(s);
        });
        group.add(stairs);

        const body = new THREE.Mesh(new THREE.BoxGeometry(26, 16, 20), stoneMat);
        body.position.y = 8; 
        body.castShadow = true; 
        group.add(body);

        const cornice = new THREE.Mesh(new THREE.BoxGeometry(28, 1.2, 22), goldMat);
        cornice.position.y = 16.6;
        cornice.castShadow = true;
        group.add(cornice);

        for(let i = -1; i <= 1; i += 2) {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 14, 12), stoneMat);
            p.position.set(i * 9, 7, 11); 
            p.castShadow = true; 
            group.add(p);
        }

        const pediment = new THREE.Mesh(new THREE.ConeGeometry(18, 6, 4), darkMat);
        pediment.position.y = 21; 
        pediment.rotation.y = Math.PI / 4; 
        pediment.castShadow = true; 
        group.add(pediment);

        const roofCap = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 12), goldMat);
        roofCap.position.y = 24.5;
        roofCap.castShadow = true;
        group.add(roofCap);

        const door = this.createDoor(4, 8, 0x5c6b73);
        door.position.set(0, 4, 10.6);
        group.add(door);

        const windowPositions = [
            [-8, 8, 10.6], [8, 8, 10.6],
            [-10, 8, -10.6], [10, 8, -10.6]
        ];
        windowPositions.forEach(pos => {
            const w = this.createWindow(3, 2.2, 0x1f2e45);
            w.position.set(pos[0], pos[1], pos[2]);
            group.add(w);
        });

        this.bankCoin = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 3, 0.7, 16), 
            new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.85, roughness: 0.18 }) 
        );
        this.bankCoin.rotation.x = Math.PI/2; 
        this.bankCoin.position.set(0, 27.5, 0); 
        group.add(this.bankCoin);

        group.position.set(x, -1000, z); 
        group.rotation.y = -Math.PI / 2;
        group.visible = false;

        group.userData = { type: 'bank', name: 'Inselbank', isInteractable: true };

        sceneSetup.scene.add(group);
        this.buildings.push(group);
        this.bankGroup = group;
    }

    createTavern() {
        const x = -60; const z = 0;
        const y = this.getGroundHeight(x, z) + 0.8;
        const group = new THREE.Group();
        group.scale.set(1.1, 1.1, 1.1);
        this.tavernMugs = [];
        this.tavernSignPivot = null;
        this.tavernSmokeGroup = null;
        
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2dfcc, flatShading: true });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, flatShading: true });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x32475b, flatShading: true });

        const foundation = this.createFoundation(34, 28, 8, 0x555b66);
        group.add(foundation);

        const hall = new THREE.Mesh(new THREE.BoxGeometry(28, 12, 18), wallMat);
        hall.position.y = 6;
        hall.castShadow = true;
        group.add(hall);

        const wing = new THREE.Mesh(new THREE.BoxGeometry(16, 10, 14), wallMat);
        wing.position.set(-12, 5, -12);
        wing.castShadow = true;
        group.add(wing);

        const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(30, 10, 4), roofMat);
        mainRoof.position.y = 16; 
        mainRoof.rotation.y = Math.PI / 4;
        mainRoof.castShadow = true;
        group.add(mainRoof);

        const wingRoof = new THREE.Mesh(new THREE.ConeGeometry(18, 8, 4), new THREE.MeshStandardMaterial({ color: 0xa91a1a, flatShading: true }));
        wingRoof.position.set(-12, 13, -12);
        wingRoof.rotation.y = Math.PI / 4;
        wingRoof.castShadow = true;
        group.add(wingRoof);

        [[-14, 6, -9], [14, 6, -9], [-14, 6, 9], [14, 6, 9]].forEach(pos => {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), woodMat);
            beam.position.set(pos[0], pos[1], pos[2]);
            beam.castShadow = true;
            group.add(beam);
        });

        const door = this.createDoor(4, 7, 0x7b4a2e);
        door.position.set(6, 3.5, 9.5);
        group.add(door);

        const windowPositions = [
            [0, 6, 9.5], [-6, 6, 9.5], [10, 6, 9.5],
            [10, 6, -9.5], [-10, 6, -9.5],
            [-18, 5, -6], [-6, 5, -18]
        ];
        windowPositions.forEach(pos => {
            const w = this.createWindow(3.5, 2.5);
            w.position.set(pos[0], pos[1], pos[2]);
            group.add(w);
        });

        this.tavernSignPivot = new THREE.Group();
        this.tavernSignPivot.position.set(6, 10, 9.6);
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x3e4a54, flatShading: true, metalness: 0.4, roughness: 0.6 });
        [-1.2, 1.2].forEach(offset => {
            const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.5, 6), chainMat);
            chain.position.set(offset, -1.2, 0);
            this.tavernSignPivot.add(chain);
        });
        const signBoard = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 0.6), new THREE.MeshStandardMaterial({ color: 0xffb74d, flatShading: true }));
        signBoard.position.set(0, -3.4, 0);
        this.tavernSignPivot.add(signBoard);
        group.add(this.tavernSignPivot);

        const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffd966, emissive: 0xffc107, emissiveIntensity: 1.4, flatShading: true });
        const lanternPositions = [
            [14, 9, 10], [-14, 9, 10], [14, 9, -10], [-14, 9, -10]
        ];
        this.lanternLights = [];

        lanternPositions.forEach(pos => {
            const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), lanternMat);
            cube.position.set(pos[0], pos[1], pos[2]);
            cube.castShadow = true;
            group.add(cube);
            const light = new THREE.PointLight(0xffc107, 0.8, 35);
            light.position.set(pos[0], pos[1], pos[2]);
            light.userData.baseIntensity = light.intensity;
            group.add(light);
            this.lanternLights.push(light);
        });

        this.tavernSmokeGroup = new THREE.Group();
        for (let i = 0; i < 3; i++) {
            const puff = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.4, 0),
                new THREE.MeshStandardMaterial({ color: 0xe8edf2, transparent: true, opacity: 0.5, flatShading: true })
            );
            puff.castShadow = false;
            puff.position.set(0, 0, 0);
            this.tavernSmokeGroup.add(puff);
        }
        this.tavernSmokeGroup.position.set(6, 17, -4);
        group.add(this.tavernSmokeGroup);

        const tableMaterial = new THREE.MeshStandardMaterial({ color: 0xa97455, flatShading: true });
        const stoolMaterial = new THREE.MeshStandardMaterial({ color: 0x7b4a2e, flatShading: true });
        const mugMat = new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xffd54f, emissiveIntensity: 0.2, flatShading: true });
        const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
        const tablePositions = [[-6, 10], [6, 4], [-10, -8]];
        tablePositions.forEach((p) => {
            const table = new THREE.Group();
            const top = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.8, 10), tableMaterial);
            top.position.y = 1;
            top.castShadow = true;
            table.add(top);

            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 2, 8), stoolMaterial);
            leg.position.y = 0;
            leg.castShadow = true;
            table.add(leg);

            const stools = [
                [4, 0, 0], [-3, 0, 2.5], [-3, 0, -2.5]
            ];
            stools.forEach(offset => {
                const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 8), stoolMaterial);
                seat.position.set(offset[0], 0.6, offset[2]);
                seat.castShadow = true;
                table.add(seat);
            });

            table.position.set(p[0], 0.6, p[1]);
            group.add(table);

            const numMugs = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numMugs; i++) {
                const mugGroup = new THREE.Group();
                const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.8, 6), mugMat);
                const mugFoam = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.3, 6), foamMat);
                mugFoam.position.y = 0.5;
                mugBody.castShadow = true;
                mugFoam.castShadow = true;
                mugGroup.add(mugBody);
                mugGroup.add(mugFoam);

                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * 1.5;
                mugGroup.position.set(p[0] + Math.cos(angle) * r, 2.2, p[1] + Math.sin(angle) * r);
                mugGroup.visible = true;
                mugGroup.userData.basePosition = mugGroup.position.clone();
                this.tavernMugs.push(mugGroup);
                group.add(mugGroup);
            }
        });

        this.tavernLights = new THREE.Group();
        this.tavernLights.visible = false;
        const bulbGeo = new THREE.SphereGeometry(0.7, 8, 8);
        for (let i = 0; i < 6; i++) {
            const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
            bulb.position.set(-12 + i * 4.5, 14 + Math.sin(i) * 0.5, 11);
            this.tavernLights.add(bulb);
            const light = new THREE.PointLight(0xffffff, 1, 32);
            light.position.copy(bulb.position);
            this.tavernLights.add(light);
        }
        group.add(this.tavernLights);

        group.position.set(x, y, z);
        group.rotation.y = Math.PI / 2;
        group.userData = { type: 'tavern', name: 'Zum lustigen Lachs', isInteractable: true, baseY: y };

        this.tavernGroup = group;

        sceneSetup.scene.add(group);
        sceneSetup.registerInteractable(group);
        this.buildings.push(group);
    }

    createShipyard() {
        const x = 0; const z = 60;
        const y = this.getGroundHeight(x, z) + 0.8;
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xa1887f, flatShading: true });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x7e8a94, flatShading: true, metalness: 0.2 });
        const tarpMat = new THREE.MeshStandardMaterial({ color: 0x4ecdc4, flatShading: true, roughness: 0.8 });
        group.scale.set(1.05, 1.05, 1.05);

        const foundation = this.createFoundation(34, 30, 8, 0x4d525d);
        group.add(foundation);

        const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 1, 26), new THREE.MeshStandardMaterial({ color: 0x7b6958, flatShading: true }));
        floor.position.y = 0.5;
        floor.receiveShadow = true;
        group.add(floor);

        const postPositions = [[-14, 0, -10], [14, 0, -10], [-14, 0, 10], [14, 0, 10]];
        postPositions.forEach(pos => {
            const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 16, 1.5), woodMat);
            p.position.set(pos[0], 8, pos[2]);
            p.castShadow = true;
            group.add(p);
        });

        const roof = new THREE.Mesh(new THREE.BoxGeometry(32, 2, 22), tarpMat);
        roof.position.y = 16.5;
        roof.rotation.z = -0.08;
        roof.castShadow = true;
        group.add(roof);

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(32, 6, 1.5), woodMat);
        backWall.position.set(0, 3, -13);
        backWall.castShadow = true;
        group.add(backWall);

        const keel = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 2), woodMat);
        keel.position.set(0, 2.5, 0);
        keel.castShadow = true;
        group.add(keel);

        for (let i = -2; i <= 2; i++) {
            const rib = new THREE.Mesh(new THREE.TorusGeometry(7, 0.5, 6, 16, Math.PI), woodMat);
            rib.rotation.set(Math.PI / 2, 0, 0);
            rib.position.set(i * 3.5, 4, 0);
            rib.castShadow = true;
            group.add(rib);
        }

        const supports = [[-8, 1, 5], [8, 1, -5]];
        supports.forEach(pos => {
            const block = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 3), woodMat);
            block.position.set(pos[0], pos[1], pos[2]);
            block.castShadow = true;
            group.add(block);
        });

        const craneBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 10, 8), metalMat);
        craneBase.position.set(12, 5, 8);
        craneBase.castShadow = true;
        group.add(craneBase);

        this.craneArm = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 12), metalMat);
        this.craneArm.position.set(12, 10.5, 1);
        this.craneArm.rotation.x = -0.2;
        this.craneArm.castShadow = true;
        group.add(this.craneArm);

        const craneLine = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8, 6), metalMat);
        craneLine.position.set(12, 6.5, -4.5);
        group.add(craneLine);

        const hook = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0xffd54f, flatShading: true, metalness: 0.6 }));
        hook.position.set(12, 2.5, -4.5);
        hook.castShadow = true;
        group.add(hook);
        this.craneLine = craneLine;
        this.craneHook = hook;
        this.craneArm.userData.baseRotationX = this.craneArm.rotation.x;
        this.craneLine.userData.basePosition = craneLine.position.clone();
        this.craneHook.userData.basePosition = hook.position.clone();

        const stackPositions = [[-12, 1, 11], [-8, 1.6, 11]];
        stackPositions.forEach((pos, idx) => {
            const stack = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5 + idx * 0.3, 3), woodMat);
            stack.position.set(pos[0], pos[1], pos[2]);
            stack.castShadow = true;
            group.add(stack);
        });

        const bench = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 3), woodMat);
        bench.position.set(0, 1, 12);
        bench.castShadow = true;
        group.add(bench);

        group.position.set(x, y, z);
        group.rotation.y = 0;
        group.userData = { type: 'shipyard', name: 'Werft', isInteractable: true, baseY: y };

        this.shipyardGroup = group;
        
        this.shipyardSparks = this.createWorkParticles(new THREE.Vector3(x, y + 2, z));

        sceneSetup.scene.add(group);
        sceneSetup.registerInteractable(group);
        this.buildings.push(group);
    }

    createDock() {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, flatShading: true });
        
        const startZ = 75;
        const length = 70;
        const centerZ = startZ + length / 2;

        const plank = new THREE.Mesh(new THREE.BoxGeometry(10, 1, length), woodMat);
        plank.position.set(0, 4, centerZ); 
        plank.castShadow = true; 
        plank.receiveShadow = true; 
        group.add(plank);

        for (let z = startZ; z <= startZ + length; z += 10) {
            [-4, 4].forEach((xOff) => {
                const p = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 15), woodMat);
                p.position.set(xOff, -2, z); 
                p.castShadow = true; 
                group.add(p);
            });
        }
        
        group.userData = { type: 'dock', isInteractable: false };
        sceneSetup.scene.add(group);
    }

    setBuildingActivity(type, isActive) {
        if (type === 'shipyard' && this.shipyardSparks) {
            this.shipyardSparks.visible = isActive;
        }
        if (type === 'tavern') {
            if (this.tavernLights) this.tavernLights.visible = isActive;
            if (!isActive) this.setTavernPartyMode(false);
        }
    }
}
