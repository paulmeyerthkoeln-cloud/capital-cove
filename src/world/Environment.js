import * as THREE from 'three';
import { sceneSetup } from '../core/SceneSetup.js';
import { events, DIRECTOR_EVENTS } from '../core/Events.js';

export class Environment {
    constructor() {
        this.clouds = [];
        this.cloudMaterials = [];
        this.dummy = new THREE.Object3D(); 
        this.buildingPositions = [];

        this.meshLeavesBottom = null;
        this.meshLeavesTop = null;
        this.sunMesh = null;

        this.PALETTES = {
            TREES_HEALTHY: new THREE.Color(0x43A047),
            TREES_DRY: new THREE.Color(0xAFB42B),
            TREES_DEAD: new THREE.Color(0x5D4037),
            CLOUD_WHITE: new THREE.Color(0xFFFFFF),
            CLOUD_GREY: new THREE.Color(0x90A4AE),
            SUN_BRIGHT: new THREE.Color(0xFFD54F),
            SUN_DIM: new THREE.Color(0xFF8F00)
        };
    }

    init(buildings = null) {
        if (buildings) this.registerBuildings(buildings);
        this.createTreesInstanced();
        this.createRocksInstanced();
        this.createClouds();
        this.createSun();
        
        events.on(DIRECTOR_EVENTS.PHASE_CHANGED, (data) => this.handlePhaseChange(data.phaseId));
    }

    registerBuildings(buildings) {
        this.buildingPositions = [];
        if (!buildings) return;
        const maybeAdd = (group) => { if (group) this.buildingPositions.push(group.position.clone()); };
        maybeAdd(buildings.hqGroup);
        maybeAdd(buildings.tavernGroup);
        maybeAdd(buildings.shipyardGroup);
        maybeAdd(buildings.bankGroup);
        maybeAdd(buildings.tentGroup);
    }

    // KORRIGIERTE HÖHENFUNKTION (wie Island.js, inkl. Plateau)
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

    createSun() {
        // Matches direction of SceneSetup dirLight (-150, 200, 100)
        // We push it far out (multiplier x4) so it looks like it's in the sky
        const pos = new THREE.Vector3(-600, 800, 400); 

        const geometry = new THREE.IcosahedronGeometry(60, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFFF176, // Bright Yellow
            fog: false // Sun shouldn't be affected by fog
        });

        this.sunMesh = new THREE.Mesh(geometry, material);
        this.sunMesh.position.copy(pos);
        
        // Add a glow effect (billboard sprite)
        const canvas = document.createElement('canvas');
        canvas.width = 128; 
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.2, 'rgba(255, 241, 118, 0.6)');
        gradient.addColorStop(0.5, 'rgba(255, 241, 118, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 241, 118, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0,0,128,128);
        
        const spriteMat = new THREE.SpriteMaterial({ 
            map: new THREE.CanvasTexture(canvas), 
            color: 0xffffff, 
            transparent: true, 
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fog: false
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(400, 400, 1);
        this.sunMesh.add(sprite);

        sceneSetup.scene.add(this.sunMesh);
    }

    createTreesInstanced() {
        const treeCount = 40;
        
        const trunkGeo = new THREE.CylinderGeometry(1.5, 2.5, 8, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, flatShading: true });

        const leafGeo = new THREE.ConeGeometry(7, 10, 6);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, flatShading: true }); 

        const meshTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
        this.meshLeavesBottom = new THREE.InstancedMesh(leafGeo, leafMat, treeCount);
        this.meshLeavesTop = new THREE.InstancedMesh(leafGeo, leafMat, treeCount);

        meshTrunks.castShadow = true;
        meshTrunks.receiveShadow = true;
        this.meshLeavesBottom.castShadow = true;
        this.meshLeavesBottom.receiveShadow = true;
        this.meshLeavesTop.castShadow = true;
        this.meshLeavesTop.receiveShadow = true;

        let index = 0;
        const color = new THREE.Color();

        for (let i = 0; i < treeCount * 3; i++) {
            if (index >= treeCount) break;

            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 140;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            // SCHUTZZONE: Dorfplatz und Steg-Zugang freihalten
            if (r < 75) continue;
            if (z > 50 && Math.abs(x) < 20) continue;

            // NEU: Zusätzliche Schutzzone explizit für Mo's Taverne (x: -60, z: 0)
            // Verhindert Clipping durch den breiten Anbau (foundation: 37.4x30.8 skaliert)
            if (x < -30 && x > -90 && Math.abs(z) < 30) continue;

            // NEU: Zusätzliche Schutzzone für HQ / Fischerhaus (x: 0, z: -60)
            // Verhindert Clipping durch Porch (foundation: 31.2x33.6, porch ragt vor)
            if (Math.abs(x) < 20 && z < -40 && z > -80) continue;

            const y = this.getGroundHeight(x, z);

            if (y < 4) continue;

            const tooCloseToBuilding = this.buildingPositions.some(pos => {
                const dx = pos.x - x;
                const dz = pos.z - z;
                return Math.sqrt(dx * dx + dz * dz) < 15;
            });
            if (tooCloseToBuilding) continue;

            const s = 0.8 + Math.random() * 0.4;

            this.dummy.position.set(x, y + 4 * s, z);
            this.dummy.rotation.set(0, Math.random() * Math.PI, 0);
            this.dummy.scale.set(s, s, s);
            this.dummy.updateMatrix();
            meshTrunks.setMatrixAt(index, this.dummy.matrix);

            this.dummy.position.set(x, y + 10 * s, z);
            this.dummy.updateMatrix();
            this.meshLeavesBottom.setMatrixAt(index, this.dummy.matrix);

            this.dummy.position.set(x, y + 15 * s, z);
            this.dummy.scale.set(s * 0.8, s * 0.8, s * 0.8);
            this.dummy.updateMatrix();
            this.meshLeavesTop.setMatrixAt(index, this.dummy.matrix);

            const variant = Math.random() * 0.1;
            color.copy(this.PALETTES.TREES_HEALTHY);
            color.r += variant;
            color.g += variant;
            
            this.meshLeavesBottom.setColorAt(index, color);
            this.meshLeavesTop.setColorAt(index, color);

            index++;
        }

        this.meshLeavesBottom.instanceColor.needsUpdate = true;
        this.meshLeavesTop.instanceColor.needsUpdate = true;

        sceneSetup.scene.add(meshTrunks);
        sceneSetup.scene.add(this.meshLeavesBottom);
        sceneSetup.scene.add(this.meshLeavesTop);
    }

    createRocksInstanced() {
        const rockCount = 60;
        const geometry = new THREE.DodecahedronGeometry(1, 0);
        const material = new THREE.MeshStandardMaterial({ color: 0x90A4AE, flatShading: true });

        const meshRocks = new THREE.InstancedMesh(geometry, material, rockCount);
        meshRocks.castShadow = true;
        meshRocks.receiveShadow = true;

        let index = 0;
        for (let i = 0; i < rockCount * 3; i++) {
            if (index >= rockCount) break;

            const angle = Math.random() * Math.PI * 2;
            const r = 30 + Math.random() * 120;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            // Gleiche Schutzzone wie bei Bäumen
            if (r < 75) continue;
            if (z > 50 && Math.abs(x) < 20) continue;

            const y = this.getGroundHeight(x, z);
            
            if (y < -2) continue;

            const s = 2 + Math.random() * 5;

            this.dummy.position.set(x, y + (s * 0.3), z);
            this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            this.dummy.scale.set(s, s, s);
            this.dummy.updateMatrix();

            meshRocks.setMatrixAt(index, this.dummy.matrix);
            index++;
        }

        sceneSetup.scene.add(meshRocks);
    }

    createClouds() {
        // OPTIMIERUNG: Sphere-Segmente von 7,7 auf 5,5 reduziert für Tablets
        // Gibt immer noch einen schönen Low-Poly Look mit weniger Vertices
        const puffGeo = new THREE.SphereGeometry(1, 5, 5);
        
        // Create 8 Cloud Clusters
        for(let i=0; i<8; i++) {
            const group = new THREE.Group();
            
            const mat = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF, 
                flatShading: true,
                roughness: 0.9,
                metalness: 0.0
            });
            this.cloudMaterials.push(mat);

            // Each cloud consists of a main puff and several smaller puffs attached
            const mainScale = 8 + Math.random() * 8;
            const mainPuff = new THREE.Mesh(puffGeo, mat);
            mainPuff.scale.set(mainScale, mainScale, mainScale);
            group.add(mainPuff);

            const numSubPuffs = 2 + Math.floor(Math.random() * 2);
            for(let j=0; j<numSubPuffs; j++) {
                const subPuff = new THREE.Mesh(puffGeo, mat);
                const subScale = mainScale * (0.4 + Math.random() * 0.5);
                subPuff.scale.set(subScale, subScale, subScale);
                
                // Offset around the main puff
                const theta = Math.random() * Math.PI * 2;
                const phi = (Math.random() - 0.5) * Math.PI; // Keep somewhat horizontal
                const r = mainScale * 0.6; 
                
                subPuff.position.set(
                    r * Math.cos(theta) * Math.cos(phi),
                    r * Math.sin(phi) * 0.5, // Flatten vertically a bit
                    r * Math.sin(theta) * Math.cos(phi)
                );
                
                group.add(subPuff);
            }

            // Random positions in the sky
            group.position.set(
                (Math.random()-0.5)*800, 
                90 + Math.random()*60, 
                (Math.random()-0.5)*600 - 100 // biased towards back
            );

            // Random rotation for variety
            group.rotation.y = Math.random() * Math.PI;

            // Individual speed property
            group.userData = { speed: 2 + Math.random() * 3 };

            sceneSetup.scene.add(group);
            this.clouds.push(group);
        }
    }

    update(deltaTime) {
        this.clouds.forEach(cloud => {
            // Move clouds
            cloud.position.x += cloud.userData.speed * deltaTime;
            
            // Loop around world
            if(cloud.position.x > 500) {
                cloud.position.x = -500;
                cloud.position.z = (Math.random()-0.5)*600;
            }
        });
    }

    handlePhaseChange(phaseId) {
        switch (phaseId) {
            case 'EFFICIENCY':
            case 'CANNIBALIZATION':
                this.updateTreeColors(this.PALETTES.TREES_DRY);
                break;
            case 'COLLAPSE':
                this.updateTreeColors(this.PALETTES.TREES_DEAD);
                this.updateCloudColors(this.PALETTES.CLOUD_GREY);
                if (this.sunMesh) this.sunMesh.material.color.setHex(0xFFCC80); // Dimmer Sun
                break;
            default:
                break;
        }
    }

    updateTreeColors(targetColor) {
        if (!this.meshLeavesBottom || !this.meshLeavesTop) return;

        const count = this.meshLeavesBottom.count;
        const color = new THREE.Color();

        for (let i = 0; i < count; i++) {
            color.copy(targetColor);
            const variant = (Math.random() - 0.5) * 0.1;
            color.r += variant;
            color.g += variant;
            color.b += variant;

            this.meshLeavesBottom.setColorAt(i, color);
            this.meshLeavesTop.setColorAt(i, color);
        }

        this.meshLeavesBottom.instanceColor.needsUpdate = true;
        this.meshLeavesTop.instanceColor.needsUpdate = true;
    }

    updateCloudColors(targetColor) {
        this.cloudMaterials.forEach(mat => {
            mat.color.copy(targetColor);
        });
    }
}
