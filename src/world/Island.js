import * as THREE from 'three';
import { sceneSetup } from '../core/SceneSetup.js';
import { events, DIRECTOR_EVENTS } from '../core/Events.js';

export class Island {
    constructor() {
        this.mesh = null;
        this.geometry = null;

        this.PALETTES = {
            SAND: new THREE.Color(0xF4E1C1),
            GRASS_HEALTHY: new THREE.Color(0x7CB342),
            GRASS_DRY: new THREE.Color(0xC0CA33),
            GRASS_DEAD: new THREE.Color(0x5D4037)
        };

        this.currentGrassColor = this.PALETTES.GRASS_HEALTHY.clone();
    }

    init() {
        const group = new THREE.Group();
        sceneSetup.scene.add(group);

        this.geometry = new THREE.PlaneGeometry(350, 350, 64, 64);
        this.geometry.rotateX(-Math.PI / 2);

        this.updateTerrainHeight();
        this.updateTerrainColors('HEALTHY');

        this.geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 1.0,
            flatShading: true
        });

        this.mesh = new THREE.Mesh(this.geometry, material);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        
        this.mesh.userData = { type: 'ground', isInteractable: false };

        group.add(this.mesh);

        events.on(DIRECTOR_EVENTS.PHASE_CHANGED, (data) => this.handlePhaseChange(data.phaseId));
    }

    // --- NEUE HÖHENBERECHNUNG (PLATEAU) ---
    getHeightAt(x, z) {
        const dist = Math.sqrt(x * x + z * z);
        
        // Grundlegendes Rauschen
        const noise = Math.sin(x * 0.07) * Math.cos(z * 0.07) * 2 + 
                      Math.sin(x * 0.15 + z * 0.1) * 1;

        let height = 0;

        // PLATEAU-LOGIK:
        // Im Radius von 70 (Dorfplatz) ist die Höhe konstant 6.
        // Zwischen 70 und 100 blenden wir sanft in die normale Inselform über.
        if (dist < 70) {
            height = 6.0; // Flacher Dorfplatz
        } else if (dist < 100) {
            // Smoothstep Interpolation vom Plateau zum Hügel
            const t = (dist - 70) / 30; // 0..1
            const hillHeight = Math.cos(dist * 0.015) * 25 + noise;
            height = 6.0 * (1 - t) + hillHeight * t;
        } else if (dist < 150) {
            height = Math.cos(dist * 0.015) * 25;
            if (height < 0) height = 0;
            height += noise;
        } else {
            height = -10;
        }
        return height;
    }

    updateTerrainHeight() {
        const count = this.geometry.attributes.position.count;
        const positions = this.geometry.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
            vertex.fromBufferAttribute(positions, i);
            const h = this.getHeightAt(vertex.x, vertex.z);
            positions.setY(i, h);
        }
        
        positions.needsUpdate = true;
    }

    updateTerrainColors(mode) {
        const count = this.geometry.attributes.position.count;
        
        if (!this.geometry.attributes.color) {
            this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        }

        const positions = this.geometry.attributes.position;
        const colors = this.geometry.attributes.color;
        const color = new THREE.Color();

        let targetGrass;
        switch (mode) {
            case 'DRY': targetGrass = this.PALETTES.GRASS_DRY; break;
            case 'DEAD': targetGrass = this.PALETTES.GRASS_DEAD; break;
            default: targetGrass = this.PALETTES.GRASS_HEALTHY; break;
        }

        for (let i = 0; i < count; i++) {
            const height = positions.getY(i);
            
            const colorNoise = (Math.random() - 0.5) * 0.1;
            
            let t = Math.max(0, Math.min(1, (height - 2) / 6));
            t = t * t * (3 - 2 * t);

            color.lerpColors(this.PALETTES.SAND, targetGrass, t);
            
            color.r += colorNoise;
            color.g += colorNoise;
            color.b += colorNoise;

            colors.setXYZ(i, color.r, color.g, color.b);
        }

        colors.needsUpdate = true;
    }

    handlePhaseChange(phaseId) {
        switch (phaseId) {
            case 'EFFICIENCY':
            case 'CANNIBALIZATION':
                this.updateTerrainColors('DRY');
                break;
            case 'COLLAPSE':
                this.updateTerrainColors('DEAD');
                break;
            default:
                break; 
        }
    }
}
