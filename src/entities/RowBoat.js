/*** START OF FILE src/entities/RowBoat.js ***/

import * as THREE from 'three';

// Design Constants
const BOAT_LENGTH = 12.0;
const BOAT_WIDTH = 4.2;
const BOAT_DEPTH = 1.6;

// Der "Bauplan" des Rumpfes.
const HULL_SLICES = [
    { z: -6.0, w: 0.5, h: 1.15, y: 0.6 }, // Heck
    { z: -4.0, w: 0.92, h: 0.95, y: 0.15 },
    { z:  0.0, w: 1.0,  h: 0.85, y: 0.0 }, // Mitte
    { z:  3.5, w: 0.85, h: 0.95, y: 0.15 },
    { z:  5.5, w: 0.4,  h: 1.2,  y: 0.5 },
    { z:  6.0, w: 0.01, h: 1.35, y: 0.8 }  // Bug
];

function getHullInfo(z) {
    let s1 = HULL_SLICES[0];
    let s2 = HULL_SLICES[HULL_SLICES.length - 1];
    
    for (let i = 0; i < HULL_SLICES.length - 1; i++) {
        if (z >= HULL_SLICES[i].z && z <= HULL_SLICES[i+1].z) {
            s1 = HULL_SLICES[i];
            s2 = HULL_SLICES[i+1];
            break;
        }
    }

    const t = (z - s1.z) / (s2.z - s1.z || 1);
    
    const wFactor = s1.w + (s2.w - s1.w) * t;
    const hFactor = s1.h + (s2.h - s1.h) * t;
    const yOffset = s1.y + (s2.y - s1.y) * t;

    const currentHalfWidth = (BOAT_WIDTH / 2) * wFactor;
    const currentGunwaleY = (BOAT_DEPTH * hFactor) + yOffset;
    
    // FIX: Der Innenboden (Floor) muss HÖHER als die Wellen sein (ca 0.2).
    // Der Kiel (Außen) bleibt tief, damit das Boot im Wasser sitzt.
    const currentFloorY = 0.25 + (yOffset * 0.5); // Trockenes Deck

    return { w: currentHalfWidth, topY: currentGunwaleY, floorY: currentFloorY, yOff: yOffset };
}

export function createRowBoat() {
    const group = new THREE.Group();
    group.name = 'RowBoat';

    // Materials
    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.9, flatShading: true, side: THREE.DoubleSide });
    const woodLightMat = new THREE.MeshStandardMaterial({ color: 0x8D6E63, roughness: 0.8, flatShading: true });
    const woodReddishMat = new THREE.MeshStandardMaterial({ color: 0x6D4C41, roughness: 0.8, flatShading: true });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x78909C, metalness: 0.6, roughness: 0.4, flatShading: true });
    const lanternGlassMat = new THREE.MeshStandardMaterial({ color: 0xFFEB3B, emissive: 0xFFA000, emissiveIntensity: 0.6, transparent: true, opacity: 0.8, flatShading: true });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xC5A065, roughness: 1.0, flatShading: true });


    // 1. Rumpf (mit doppeltem Boden Logik in buildAdaptiveHullGeometry)
    const hullGeo = buildAdaptiveHullGeometry();
    const hull = new THREE.Mesh(hullGeo, woodDarkMat);
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);


    // 2. Spanten (Ribs)
    for (let z = -4.5; z <= 4.5; z += 1.5) {
        if (Math.abs(z - 3.0) < 0.5 || Math.abs(z) < 0.5 || Math.abs(z + 3.2) < 0.5) continue;

        const info = getHullInfo(z);
        const ribThickness = 0.15;
        const ribDepth = 0.15;
        const wInner = info.w - 0.05; 
        const hInner = info.topY - 0.1;
        
        // Boden-Spant (liegt jetzt auf dem erhöhten Boden)
        const floorW = wInner * 0.8;
        const ribFloor = new THREE.Mesh(new THREE.BoxGeometry(floorW * 1.5, ribThickness, ribDepth), woodLightMat);
        ribFloor.position.set(0, info.floorY + 0.08, z); 
        group.add(ribFloor);

        // Seiten-Spanten
        const sideH = hInner - (info.floorY + 0.1);
        const ribSideGeo = new THREE.BoxGeometry(ribThickness, sideH * 1.2, ribDepth);
        
        const leftRib = new THREE.Mesh(ribSideGeo, woodLightMat);
        leftRib.position.set(-wInner + 0.2, info.floorY + sideH * 0.6, z);
        leftRib.rotation.z = -0.25;
        group.add(leftRib);

        const rightRib = new THREE.Mesh(ribSideGeo, woodLightMat);
        rightRib.position.set(wInner - 0.2, info.floorY + sideH * 0.6, z);
        rightRib.rotation.z = 0.25;
        group.add(rightRib);
    }


    // 3. Bodenplanken (liegen auf dem erhöhten Boden)
    for(let z = -3; z <= 3; z+=1.2) {
        const info = getHullInfo(z);
        const pGeo = new THREE.BoxGeometry(1.4, 0.05, 1.0);
        const plank = new THREE.Mesh(pGeo, woodLightMat);
        plank.position.set(0, info.floorY + 0.03, z);
        plank.receiveShadow = true;
        group.add(plank);
    }


    // 4. Sitzbänke
    const createBench = (zPos) => {
        const info = getHullInfo(zPos);
        const width = (info.w * 2) + 0.2; 
        const heightPos = info.topY - 0.25;
        const bench = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, 0.8), woodReddishMat);
        bench.position.set(0, heightPos, zPos);
        bench.castShadow = true;
        group.add(bench);
    };
    createBench(3.0);
    createBench(0.0);
    createBench(-3.2);


    // 5. Reling
    const rimGeo = buildGunwaleGeometry();
    const rim = new THREE.Mesh(rimGeo, woodReddishMat);
    rim.castShadow = true;
    group.add(rim);


    // 6. Ruderdollen
    const oarZ = 0.8; 
    const hullAtOar = getHullInfo(oarZ);
    const lockX = hullAtOar.w; 
    const lockY = hullAtOar.topY;

    function createRowLock() {
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.1), metalMat);
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.05), metalMat);
        pin.position.y = 0.2;
        g.add(base, pin);
        return g;
    }
    
    const lockLeft = createRowLock();
    lockLeft.position.set(-lockX, lockY, oarZ);
    lockLeft.rotation.z = 0.2;
    group.add(lockLeft);

    const lockRight = createRowLock();
    lockRight.position.set(lockX, lockY, oarZ);
    lockRight.rotation.z = -0.2;
    group.add(lockRight);


    // 7. Ruder (FIX: Linkes Ruder korrekt gespiegelt)
    const leftOarData = createOar(woodLightMat, woodReddishMat);
    const rightOarData = createOar(woodLightMat, woodReddishMat);

    leftOarData.pivot.position.set(-lockX - 0.1, lockY + 0.2, oarZ);
    rightOarData.pivot.position.set(lockX + 0.1, lockY + 0.2, oarZ);

    // FIX: Linkes Ruder um 180 Grad drehen, Z-Winkel invertieren
    leftOarData.pivot.rotation.set(0, Math.PI - 0.2, -0.4); 
    // Rechtes Ruder normal
    rightOarData.pivot.rotation.set(0, 0.2, 0.4); 

    leftOarData.pivot.userData.baseYaw = Math.PI - 0.2;
    rightOarData.pivot.userData.baseYaw = 0.2;

    group.add(leftOarData.pivot);
    group.add(rightOarData.pivot);


    // 8. Angel
    const rodPivot = new THREE.Group();
    const sternInfo = getHullInfo(3.0);
    rodPivot.position.set(sternInfo.w - 0.2, sternInfo.topY, 3.5);
    rodPivot.rotation.set(-0.5, 0.2, 0.3);

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 4.5, 5), woodLightMat);
    rod.position.y = 2.25;
    rodPivot.add(rod);

    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.15, 8), metalMat);
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0, 0.8, 0.1);
    rodPivot.add(reel);

    const lineGeo = new THREE.CylinderGeometry(0.005, 0.005, 1.5, 3);
    const line = new THREE.Mesh(lineGeo, new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
    line.position.set(0, 3.8, 0.6); 
    line.rotation.x = -0.4; 
    rodPivot.add(line);

    const bobber = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshStandardMaterial({ color: 0xFF5252 }));
    bobber.position.set(0, 3.2, 1.0);
    rodPivot.add(bobber);
    group.add(rodPivot);


    // 9. Laterne
    const lanternGroup = new THREE.Group();
    const bowInfo = getHullInfo(5.5);
    lanternGroup.position.set(0, bowInfo.topY + 0.2, 5.5);
    
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), woodDarkMat);
    stick.rotation.x = 0.8;
    stick.position.z = -0.4;
    lanternGroup.add(stick);

    const lanBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.6, 6), metalMat);
    lanBody.position.y = -0.4;
    lanternGroup.add(lanBody);
    
    const lanGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 6), lanternGlassMat);
    lanGlass.position.y = -0.4;
    lanternGroup.add(lanGlass);
    
    const light = new THREE.PointLight(0xFF9800, 1.0, 8);
    light.position.y = -0.4;
    lanternGroup.add(light);
    group.add(lanternGroup);


    // 10. Seil
    const ropeTorus = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 5, 10), ropeMat);
    ropeTorus.rotation.x = Math.PI / 2;
    ropeTorus.rotation.z = 0.5;
    ropeTorus.position.set(0.3, bowInfo.floorY + 0.15, 4.5); 
    group.add(ropeTorus);


    // Exports
    group.userData.leftOarPivot = leftOarData.pivot;
    group.userData.rightOarPivot = rightOarData.pivot;
    group.userData.leftOarHandle = leftOarData.handle;
    group.userData.rightOarHandle = rightOarData.handle;
    group.userData.lanternGroup = lanternGroup;

    return group;
}

function buildAdaptiveHullGeometry() {
    const positions = [];
    const indices = [];
    const segments = HULL_SLICES.length - 1;

    for (let i = 0; i < segments; i++) {
        const s1 = HULL_SLICES[i];
        const s2 = HULL_SLICES[i+1];

        const makeRing = (slice) => {
            const z = slice.z;
            const w = (BOAT_WIDTH / 2) * slice.w;
            const h = (BOAT_DEPTH * slice.h) + slice.y;
            const yOff = slice.y;

            // FIX: Doppelter Boden Logik
            // floorY höher halten, damit das Deck trocken bleibt.
            // keelY tief lassen, damit der Rumpf weiterhin unter Wasser sichtbar ist.
            
            const floorY = 0.55 + (yOff * 0.5); 
            const keelY = -0.8 + (yOff * 0.2); 

            return [
                -w, h, z, // 0 Top Left
                -w * 0.7, floorY, z, // 1 Side Left (Innenboden-Höhe)
                -0.1, keelY, z, // 2 Keel Left (Tief)
                0.1, keelY, z, // 3 Keel Right (Tief)
                w * 0.7, floorY, z, // 4 Side Right (Innenboden-Höhe)
                w, h, z // 5 Top Right
            ];
        };

        const r1 = makeRing(s1);
        const r2 = makeRing(s2);
        const startIdx = positions.length / 3;
        
        positions.push(...r1);
        positions.push(...r2);

        for(let j=0; j<5; j++) {
            const a = startIdx + j;
            const b = startIdx + j + 6;
            const c = startIdx + j + 6 + 1;
            const d = startIdx + j + 1;
            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    // Heck schließen
    {
        const s = HULL_SLICES[0];
        const w = (BOAT_WIDTH / 2) * s.w;
        const h = (BOAT_DEPTH * s.h) + s.y;
        const keelY = -0.8 + (s.y * 0.2);
        
        const idx = positions.length / 3;
        positions.push(-w, h, s.z);
        positions.push(w, h, s.z);
        positions.push(0, keelY, s.z); 
        indices.push(idx, idx+2, idx+1);
    }
    
    // Bug schließen
    {
        const s = HULL_SLICES[HULL_SLICES.length - 1];
        const w = (BOAT_WIDTH / 2) * s.w;
        const h = (BOAT_DEPTH * s.h) + s.y;
        const keelY = -0.8 + (s.y * 0.2);

        const idx = positions.length / 3;
        positions.push(-w, h, s.z);
        positions.push(w, h, s.z);
        positions.push(0, keelY, s.z);
        indices.push(idx, idx+1, idx+2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

function buildGunwaleGeometry() {
    const positions = [];
    const indices = [];
    const width = 0.2; 
    const height = 0.12;

    for (let i = 0; i < HULL_SLICES.length - 1; i++) {
        const s1 = HULL_SLICES[i];
        const s2 = HULL_SLICES[i+1];

        const makeCap = (slice) => {
            const z = slice.z;
            const wOuter = (BOAT_WIDTH / 2) * slice.w + 0.05; 
            const wInner = wOuter - width;
            const h = (BOAT_DEPTH * slice.h) + slice.y;
            
            return {
                left: [
                    -wOuter, h, z, -wInner, h, z,
                    -wOuter, h - height, z, -wInner, h - height, z
                ],
                right: [
                    wInner, h, z, wOuter, h, z,
                    wInner, h - height, z, wOuter, h - height, z
                ]
            };
        };

        const r1 = makeCap(s1);
        const r2 = makeCap(s2);

        // Linke Seite
        let baseIdx = positions.length / 3;
        positions.push(...r1.left, ...r2.left);
        const l0=baseIdx, l1=baseIdx+1, l2=baseIdx+2, l3=baseIdx+3;
        const l4=baseIdx+4, l5=baseIdx+5, l6=baseIdx+6, l7=baseIdx+7;
        
        indices.push(l0, l4, l1); indices.push(l4, l5, l1);
        indices.push(l2, l0, l6); indices.push(l0, l4, l6);
        indices.push(l1, l3, l5); indices.push(l3, l7, l5);
        indices.push(l3, l2, l7); indices.push(l2, l6, l7);

        // Rechte Seite
        baseIdx = positions.length / 3;
        positions.push(...r1.right, ...r2.right);
        const r0=baseIdx, r1b=baseIdx+1, r2b=baseIdx+2, r3=baseIdx+3;
        const r4=baseIdx+4, r5=baseIdx+5, r6=baseIdx+6, r7=baseIdx+7;
        
        indices.push(r0, r4, r1b); indices.push(r4, r5, r1b);
        indices.push(r1b, r5, r3); indices.push(r5, r7, r3);
        indices.push(r2b, r0, r6); indices.push(r0, r4, r6);
        indices.push(r3, r2b, r7); indices.push(r2b, r6, r7);
    }
    
    // Heck
    {
        const s = HULL_SLICES[0];
        const w = (BOAT_WIDTH / 2) * s.w + 0.05;
        const h = (BOAT_DEPTH * s.h) + s.y;
        const idx = positions.length / 3;
        positions.push(-w, h, s.z, -w, h-height, s.z, w, h, s.z, w, h-height, s.z);
        indices.push(idx, idx+2, idx+1); indices.push(idx+2, idx+3, idx+1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
}

function createOar(shaftMat, bladeMat) {
    const pivot = new THREE.Group();
    // Ruder-Geometrie zeigt nach +X
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 4.0, 6), shaftMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = 1.6; 
    shaft.castShadow = true;
    pivot.add(shaft);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), shaftMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.x = -0.3; 
    pivot.add(handle);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.35), bladeMat);
    blade.position.x = 3.8; 
    blade.castShadow = true;
    pivot.add(blade);
    return { pivot, handle: shaft };
}
