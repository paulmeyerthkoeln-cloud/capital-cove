import * as THREE from 'three';

class SceneSetup {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        this.fog = null;
        this.hemiLight = null;
        this.dirLight = null;
        
        this.sunDirection = new THREE.Vector3();
        
        this.interactableObjects = [];
    }

    init() {
        const container = document.getElementById('canvas-container');

        this.scene = new THREE.Scene();
        
        // NEW: Sky Blue Background
        const skyColor = 0x87CEEB; 
        this.scene.background = new THREE.Color(skyColor);

        // UPDATED: Fog matches sky color for seamless horizon
        this.fog = new THREE.Fog(skyColor, 400, 1600);
        this.scene.fog = this.fog;

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 3000);
        this.camera.position.set(280, 180, 280); 
        this.camera.lookAt(0, 10, 0);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: false, // Changed to false to show background color
            powerPreference: "high-performance"
        });
        
        // OPTIMIERUNG: PixelRatio auf max 1.5 begrenzen für Tablets
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.renderer.shadowMap.enabled = true;
        // OPTIMIERUNG: BasicShadowMap statt PCFSoftShadowMap für bessere Performance
        this.renderer.shadowMap.type = THREE.BasicShadowMap;

        if (container) {
            container.innerHTML = '';
            container.appendChild(this.renderer.domElement);
        }

        this.createLights();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    createLights() {
        // Warmer sunlight
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xffeeb1, 0.6);
        this.scene.add(this.hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.3);
        // Position matches where we will put the visual Sun in Environment.js
        this.dirLight.position.set(-150, 200, 100);
        this.dirLight.castShadow = true;

        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 1000;
        
        const d = 350; 
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        
        // Schatten-Bias anheben, um Shadow Acne zu reduzieren
        this.dirLight.shadow.bias = -0.001;
        this.dirLight.shadow.normalBias = 0.05;

        this.scene.add(this.dirLight);

        this.sunDirection.copy(this.dirLight.position).normalize();
    }

    registerInteractable(object3D) {
        if (!object3D) return;

        if (object3D.userData && object3D.userData.isInteractable) {
            this.interactableObjects.push(object3D);
        }
    }

    unregisterInteractable(object3D) {
        this.interactableObjects = this.interactableObjects.filter(obj => obj !== object3D);
    }

    getInteractableObjects() {
        return this.interactableObjects;
    }

    // Optional: Dynamic weather changes
    updateAtmosphere(params) {
        if (params.fogColor && this.fog) {
            this.fog.color.setHex(params.fogColor);
            this.scene.background.setHex(params.fogColor);
        }
        if (params.fogNear !== undefined && this.fog) this.fog.near = params.fogNear;
        if (params.fogFar !== undefined && this.fog) this.fog.far = params.fogFar;

        if (this.hemiLight) {
            if (params.skyColor) this.hemiLight.color.setHex(params.skyColor);
            if (params.groundColor) this.hemiLight.groundColor.setHex(params.groundColor);
        }

        if (this.dirLight && params.sunIntensity !== undefined) {
            this.dirLight.intensity = params.sunIntensity;
        }
    }

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

export const sceneSetup = new SceneSetup();
