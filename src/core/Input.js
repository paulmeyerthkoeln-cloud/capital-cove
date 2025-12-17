import * as THREE from 'three';
import { sceneSetup } from './SceneSetup.js';

class Input {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.enabled = true;
        this.locked = false;

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

        this.dampingFactor = 2.0; // Reduziert für weicheres Gefühl (Butter-Effekt)
        this.rotateSpeed = 0.003;
        this.zoomSpeed = 0.5;
        this.panSpeed = 0.5;

        this.targetLook = new THREE.Vector3(0, 10, 0);
        this.currentLook = new THREE.Vector3(0, 10, 0);

        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.dragStartPosition = { x: 0, y: 0 };

        this.onObjectClicked = null;

        // Touch-specific properties
        this.touches = new Map();
        this.initialPinchDistance = 0;
        this.isPinching = false;
        this.touchStartPosition = { x: 0, y: 0 };
    }

    init() {
        // Mouse events
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

        // Touch events
        document.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        document.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

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

    // =========================================================================
    // TOUCH CONTROLS
    // =========================================================================

    onTouchStart(event) {
        if (!this.enabled || this.locked) return;

        // Nur auf Canvas erlauben
        if (!this.isEventOnCanvas(event)) return;

        // Nur preventDefault für Canvas, nicht für UI-Elemente
        if (event.target.tagName === 'CANVAS') {
            event.preventDefault();
        }

        const touches = event.changedTouches;

        // Alle neuen Touches speichern
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            this.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY
            });
        }

        // Single touch: Dragging starten
        if (this.touches.size === 1) {
            const touch = Array.from(this.touches.values())[0];
            this.isDragging = true;
            this.previousMousePosition = { x: touch.x, y: touch.y };
            this.touchStartPosition = { x: touch.startX, y: touch.startY };
            this.isPinching = false;
        }

        // Two touches: Pinch-to-Zoom initialisieren
        if (this.touches.size === 2) {
            const touchArray = Array.from(this.touches.values());
            const dx = touchArray[0].x - touchArray[1].x;
            const dy = touchArray[0].y - touchArray[1].y;
            this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
            this.isPinching = true;
            this.isDragging = false;
        }
    }

    onTouchMove(event) {
        if (!this.enabled || this.locked) return;

        // Nur preventDefault für Canvas
        if (event.target.tagName === 'CANVAS') {
            event.preventDefault();
        }

        const touches = event.changedTouches;

        // Touch-Positionen aktualisieren
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (this.touches.has(touch.identifier)) {
                const stored = this.touches.get(touch.identifier);
                stored.x = touch.clientX;
                stored.y = touch.clientY;
            }
        }

        // Single touch dragging
        if (this.touches.size === 1 && this.isDragging && !this.isPinching) {
            const touch = Array.from(this.touches.values())[0];

            // Update mouse position für Raycasting
            this.mouse.x = (touch.x / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.y / window.innerHeight) * 2 + 1;

            const deltaMove = {
                x: touch.x - this.previousMousePosition.x,
                y: touch.y - this.previousMousePosition.y
            };

            this.targetAngle += deltaMove.x * this.rotateSpeed;
            this.targetHeight += deltaMove.y * this.panSpeed;

            this.targetHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.targetHeight));

            this.previousMousePosition = { x: touch.x, y: touch.y };
        }

        // Pinch-to-Zoom
        if (this.touches.size === 2 && this.isPinching) {
            const touchArray = Array.from(this.touches.values());
            const dx = touchArray[0].x - touchArray[1].x;
            const dy = touchArray[0].y - touchArray[1].y;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);

            const pinchDelta = this.initialPinchDistance - currentDistance;
            this.targetRadius += pinchDelta * 0.5;
            this.targetRadius = Math.max(this.minRadius, Math.min(this.maxRadius, this.targetRadius));

            this.initialPinchDistance = currentDistance;
        }
    }

    onTouchEnd(event) {
        if (!this.enabled) return;

        if (this.locked) {
            this.touches.clear();
            this.isDragging = false;
            this.isPinching = false;
            return;
        }

        // Nur preventDefault für Canvas
        if (event.target.tagName === 'CANVAS') {
            event.preventDefault();
        }

        const touches = event.changedTouches;

        // Entferne beendete Touches
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const stored = this.touches.get(touch.identifier);

            // Prüfe auf Tap (kurzer Touch ohne Bewegung)
            if (stored && !this.isPinching) {
                const dist = Math.sqrt(
                    Math.pow(touch.clientX - stored.startX, 2) +
                    Math.pow(touch.clientY - stored.startY, 2)
                );

                // Tap erkannt (< 10px Bewegung)
                if (dist < 10 && this.isEventOnCanvas(event)) {
                    this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
                    this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                    this.processClick();
                }
            }

            this.touches.delete(touch.identifier);
        }

        // Wenn noch ein Touch übrig ist, zurück zu Single-Touch-Dragging
        if (this.touches.size === 1) {
            const touch = Array.from(this.touches.values())[0];
            this.isDragging = true;
            this.previousMousePosition = { x: touch.x, y: touch.y };
            this.isPinching = false;
        } else {
            this.isDragging = false;
            this.isPinching = false;
        }

        // Alle Touches weg
        if (this.touches.size === 0) {
            this.isDragging = false;
            this.isPinching = false;
        }
    }

    update(dt) {
        if (!sceneSetup.camera) return;

        // FIX: dt begrenzen ("Clamp"). 
        // Verhindert Kamerasprünge bei kurzen Lags (Garbage Collection).
        // Wir nehmen maximal 0.05s (20 FPS) an, alles darüber wird ignoriert.
        const safeDt = Math.min(dt || 0.016, 0.05);

        // Exponentielle Glättung (Butterweich)
        const dampFactor = 1 - Math.exp(-this.dampingFactor * safeDt);

        // 1. Winkel interpolieren
        let angleDiff = this.targetAngle - this.currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        this.currentAngle += angleDiff * dampFactor;

        // 2. Höhe und Radius interpolieren
        this.currentHeight += (this.targetHeight - this.currentHeight) * dampFactor;
        this.currentRadius += (this.targetRadius - this.currentRadius) * dampFactor;

        // 3. Look-Target interpolieren (etwas schneller als die Position für besseren Fokus)
        // Wir nutzen hier einen eigenen Damping-Faktor (etwas straffer), damit das Ziel nicht "schwimmt"
        const lookDamp = 1 - Math.exp(-this.dampingFactor * 1.5 * safeDt);
        this.currentLook.lerp(this.targetLook, lookDamp);

        // 4. Position berechnen
        const x = this.currentRadius * Math.sin(this.currentAngle);
        const z = this.currentRadius * Math.cos(this.currentAngle);

        sceneSetup.camera.position.set(x, this.currentHeight, z);
        sceneSetup.camera.lookAt(this.currentLook);
    }
}

export const input = new Input();
