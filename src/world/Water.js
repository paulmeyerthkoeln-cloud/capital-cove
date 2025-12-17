import * as THREE from 'three';
import { sceneSetup } from '../core/SceneSetup.js';
import { events, EVENTS, DIRECTOR_EVENTS } from '../core/Events.js';

// PERFORMANCE-OPTIMIERUNG:
// Die schwere Arbeit (Noise-Berechnungen) wurde in den Vertex Shader verschoben.
// Der Fragment Shader macht nur noch Farben mischen und Normalen berechnen (für Low-Poly Look).
// Das spart Millionen Rechenoperationen pro Frame.

const noiseFunction = `
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }
`;

const vertexShader = `
    uniform float uTime;
    varying float vElevation;
    varying vec3 vPosition;
    varying float vDist;
    // vFoam entfernt, da wir es pixelgenau berechnen müssen

    ${noiseFunction}

    void main() {
        vec3 pos = position;
        float dist = length(pos.xy);
        vDist = dist;

        float sinkMask = smoothstep(130.0, 155.0, dist);
        float depthOffset = -15.0 * (1.0 - sinkMask);

        float waveMask = smoothstep(140.0, 300.0, dist);
        float waveStrength = mix(0.0, 1.0, waveMask);

        // Noise Berechnung (teuer) bleibt im Vertex Shader (billig, da weniger Vertices als Pixel)
        float elevation = sin(pos.x * 0.02 + uTime * 0.5) * sin(pos.y * 0.02 + uTime * 0.4) * 1.5;
        elevation += snoise(vec2(pos.x * 0.03 + uTime * 0.3, pos.y * 0.03 + uTime * 0.2)) * 1.5;

        elevation *= waveStrength;
        pos.z += elevation + depthOffset;

        vElevation = elevation;
        vPosition = pos;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragmentShader = `
    uniform float uTime;
    uniform vec3 uColorDeep;
    uniform vec3 uColorShallow;
    uniform vec3 uColorFoam;
    uniform vec3 uSunDirection;

    varying float vElevation;
    varying vec3 vPosition;
    varying float vDist;

    void main() {
        // 1. Low Poly Look (Erhält die kristalline Optik)
        vec3 fNormal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
        vec3 lightDir = normalize(uSunDirection);
        float light = max(dot(fNormal, lightDir), 0.0);
        float shadow = mix(0.6, 1.0, light);

        // 2. Wasserfarbe
        float lagoonFactor = 1.0 - smoothstep(130.0, 300.0, vDist);
        vec3 col = mix(uColorDeep, uColorShallow, lagoonFactor);

        // 3. BRANDUNG (Der performante Trick)
        // Statt Noise nutzen wir billige Sinus-Verzerrung basierend auf der Position (vPosition.x/z).
        // Das bricht die perfekte Kreisform auf.
        float distortion = sin(vPosition.x * 0.1 + uTime) * 2.0 + cos(vPosition.y * 0.1 + uTime) * 2.0;

        // Wir addieren die Verzerrung zur Distanz
        float dist = vDist + distortion;

        // Wandernde Ringe (Sinus über Zeit) - zur Insel hin (+ statt -)
        float waveCycle = sin(dist * 0.5 + uTime * 2.5);

        // Harte Kanten für den Comic-Look (step Funktion ist extrem billig)
        float foamLines = step(0.4, waveCycle);

        // Maskierung: Schaum nur in Strandnähe (Radius 120 bis 160)
        // Wir subtrahieren vElevation, damit der Schaum mit den Wellen "schwappt"
        float shoreMask = smoothstep(120.0, 130.0, dist - vElevation * 2.0) * (1.0 - smoothstep(150.0, 160.0, dist));

        float isSurf = foamLines * shoreMask;

        // 4. Glanzlichter
        float highlight = smoothstep(0.95, 1.0, light);

        // Zusammenfügen
        col = mix(col, uColorFoam, highlight * 0.3); // Glanz
        col = mix(col, uColorFoam, isSurf);          // Schaum
        col *= shadow;                               // Schatten

        gl_FragColor = vec4(col, 0.95);
    }
`;

export class Water {
    constructor() {
        this.mesh = null;
        this.material = null;

        this.colorsHealthy = {
            deep: new THREE.Color('#2E86C1'),    // Klares Tiefblau
            shallow: new THREE.Color('#85C1E9'), // Helles Türkis
            foam: new THREE.Color('#FFFFFF')     // Weißer Schaum
        };

        this.colorsDead = {
            // Sumpfiges, öliges Dunkelgrün statt Schwarz
            deep: new THREE.Color('#2F3E30'),    
            
            // Trübes, schlammiges Braun-Gelb (aufgewühlter Sand)
            shallow: new THREE.Color('#8B8560'), 
            
            // Dreckiger, gelblicher Schaum
            foam: new THREE.Color('#C2B280')     
        };

        this.currentHealth = 1.0;
        this.targetHealth = 1.0;

        this.uniformColors = {
            deep: this.colorsHealthy.deep.clone(),
            shallow: this.colorsHealthy.shallow.clone(),
            foam: this.colorsHealthy.foam.clone()
        };
    }

    init() {
        // OPTIMIERUNG: 96 Segmente für bessere Brandungs-Darstellung (Kompromiss Performance/Optik)
        const geometry = new THREE.PlaneGeometry(1000, 1000, 96, 96);

        this.material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColorDeep: { value: this.uniformColors.deep },
                uColorShallow: { value: this.uniformColors.shallow },
                uColorFoam: { value: this.uniformColors.foam },
                uSunDirection: { value: new THREE.Vector3(1, 1, 1) }
            },
            transparent: true,
            side: THREE.DoubleSide,
            flatShading: true, // WICHTIG für den Look
            extensions: {
                derivatives: true // WICHTIG für dFdx/dFdy
            }
        });

        if (sceneSetup && sceneSetup.sunDirection) {
            this.material.uniforms.uSunDirection.value = sceneSetup.sunDirection;
        }

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = -1.5;

        if (sceneSetup && sceneSetup.scene) {
            sceneSetup.scene.add(this.mesh);
        }

        // Listener: Wasserqualität hängt direkt am Fischbestand
        events.on(EVENTS.STATS_UPDATED, (stats) => {
            // Verhältnis berechnen (1.0 = voll/sauber, 0.0 = leer/dreckig)
            let ratio = stats.fishStock / stats.maxFishStock;

            // Begrenzung
            ratio = Math.max(0, Math.min(1, ratio));

            this.targetHealth = ratio;
        });

        events.on(DIRECTOR_EVENTS.PHASE_CHANGED, (data) => {
            if (data.phaseId === 'COLLAPSE') {
                this.targetHealth = 0.0;
            }
        });
    }

    update(time) {
        if (!this.material) return;

        this.material.uniforms.uTime.value = time;

        // Sehr langsame, fließende Anpassung der Farbe (kein Pulsieren)
        const lerpSpeed = 0.005;
        this.currentHealth += (this.targetHealth - this.currentHealth) * lerpSpeed;

        this.updateColors(this.currentHealth);
    }

    updateColors(factor) {
        this.material.uniforms.uColorDeep.value.lerpColors(
            this.colorsDead.deep,
            this.colorsHealthy.deep,
            factor
        );

        this.material.uniforms.uColorShallow.value.lerpColors(
            this.colorsDead.shallow,
            this.colorsHealthy.shallow,
            factor
        );

        this.material.uniforms.uColorFoam.value.lerpColors(
            this.colorsDead.foam,
            this.colorsHealthy.foam,
            factor
        );
    }
}
