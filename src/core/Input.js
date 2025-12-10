import * as THREE from 'three';
import { sceneSetup } from './SceneSetup.js';

class Input {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.enabled = true;
        this.locked = false;
        this.lastTime = performance.now();

        this.targetRadius = 400;
        this.currentRadius = 400;
        this.minRadius = 150;
        this.maxRadius = 600;

        this.targetAngle = 0.78;
        this.currentAngle = 0.78;

        this.targetHeight = 220;
        this.currentHeight = 220;
        this.minHeight = 50;
        this.maxHeight = 500;

        this.dampingFactor = 5.0;
        this.rotateSpeed = 0.004;
        this.zoomSpeed = 0.5;
        this.panSpeed = 0.5;

        this.targetLook = new THREE.Vector3(0, 10, 0);
        this.currentLook = new THREE.Vector3(0, 10, 0);
        
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.dragStartPosition = { x: 0, y: 0 };

        this.onObjectClicked = null;
    }

    init() {
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // ... (restliche Methoden bleiben gleich bis onMouseDown)

    setEnabled(isEnabled) {
        this.enabled = isEnabled;
        if (!isEnabled) {
            this.isDragging = false;
        }
    }

    setLocked(isLocked) {
        this.locked = isLocked;
        this.isDragging = false;
    }

    setLookTarget(vec3) {
        console.log('🖱️ [DEBUG] Input.setLookTarget empfangen:', vec3);
        this.targetLook.copy(vec3);
    }

    moveCameraTo(vec3) {
        if (!vec3) return;
        this.setLookTarget(vec3);
    }

    isEventOnCanvas(event) {
        // Prüft, ob das Ziel ein Canvas ist. Wenn nicht (z.B. Button, Div), blockieren wir 3D-Input.
        return event.target.tagName === 'CANVAS';
    }

    onMouseDown(event) {
        if (!this.enabled || this.locked) return;
        
        // FIX: Klick-Durchschlag verhindern
        if (!this.isEventOnCanvas(event)) return;

        if (event.button !== 0 && event.button !== 2) return;

        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
        this.dragStartPosition = { x: event.clientX, y: event.clientY };
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (!this.enabled || !this.isDragging || this.locked) return;

        const deltaMove = {
            x: event.clientX - this.previousMousePosition.x,
            y: event.clientY - this.previousMousePosition.y
        };

        this.targetAngle += deltaMove.x * this.rotateSpeed;
        this.targetHeight += deltaMove.y * this.panSpeed;
        
        this.targetHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.targetHeight));

        this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    onMouseUp(event) {
        if (!this.enabled) return;
        
        if (this.locked) {
             this.isDragging = false;
             return; 
        }

        // Wenn wir nicht auf dem Canvas loslassen, Interaktion abbrechen
        const wasOnCanvas = this.isEventOnCanvas(event);
        
        this.isDragging = false;

        if (!wasOnCanvas) return;

        const dist = Math.sqrt(
            Math.pow(event.clientX - this.dragStartPosition.x, 2) +
            Math.pow(event.clientY - this.dragStartPosition.y, 2)
        );

        if (dist < 5) {
            this.processClick();
        }
    }

    onWheel(event) {
        if (!this.enabled || this.locked) return;
        // Scrollen auch nur auf Canvas erlauben
        if (!this.isEventOnCanvas(event)) return;
        
        event.preventDefault();

        this.targetRadius += event.deltaY * this.zoomSpeed;
        this.targetRadius = Math.max(this.minRadius, Math.min(this.maxRadius, this.targetRadius));
    }

    processClick() {
        if (!sceneSetup.camera) return;

        this.raycaster.setFromCamera(this.mouse, sceneSetup.camera);

        const interactables = sceneSetup.getInteractableObjects();
        const intersects = this.raycaster.intersectObjects(interactables, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            let obj = hit.object;

            let foundInteractable = null;
            let depth = 0;
            
            while(obj && depth < 5) { 
                if (obj.userData && obj.userData.isInteractable) {
                    foundInteractable = obj;
                    break;
                }
                obj = obj.parent;
                depth++;
            }

            if (foundInteractable && this.onObjectClicked) {
                this.onObjectClicked(foundInteractable);
            }
        }
    }

    update() {
        if (!sceneSetup.camera) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); 
        this.lastTime = now;
        
        const lerpFactor = this.dampingFactor * dt;

        // Kürzesten Weg für Rotation wählen (Winkel normalisieren)
        let angleDiff = this.targetAngle - this.currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.currentAngle += angleDiff * lerpFactor;
        this.currentHeight += (this.targetHeight - this.currentHeight) * lerpFactor;
        this.currentRadius += (this.targetRadius - this.currentRadius) * lerpFactor;
        this.currentLook.lerp(this.targetLook, lerpFactor);

        const x = this.currentRadius * Math.sin(this.currentAngle);
        const z = this.currentRadius * Math.cos(this.currentAngle);

        sceneSetup.camera.position.set(x, this.currentHeight, z);
        sceneSetup.camera.lookAt(this.currentLook);
    }
}

export const input = new Input();
