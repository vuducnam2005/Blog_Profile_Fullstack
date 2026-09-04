import * as THREE from 'three';

const X_AXIS = new THREE.Vector3(1, 0, 0);

function createSeededRandom(initialSeed) {
    let state = initialSeed >>> 0;
    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function createRockGeometry(radius, detail, random) {
    const geometry = new THREE.IcosahedronGeometry(radius, detail);
    const positions = geometry.attributes.position;
    const point = new THREE.Vector3();

    for (let index = 0; index < positions.count; index++) {
        point.fromBufferAttribute(positions, index);
        const direction = point.clone().normalize();
        const broadShape = 0.86
            + Math.sin(direction.x * 4.2 + direction.z * 2.5) * 0.09
            + Math.sin(direction.y * 6.8 - direction.x * 2.1) * 0.05;
        const chippedSurface = (random() - 0.5) * 0.18;
        point.copy(direction).multiplyScalar(radius * (broadShape + chippedSurface));
        point.x *= 1.1;
        point.y *= 0.94;
        positions.setXYZ(index, point.x, point.y, point.z);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
}

function createScreenRockMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uHeat: { value: 0 },
            uOpacity: { value: 0 },
            uHeatDirection: { value: new THREE.Vector3(0, 0, 1) },
        },
        vertexShader: `
            varying vec3 vObjectPosition;
            varying vec3 vNormalView;
            varying vec3 vViewDirection;

            void main() {
                vObjectPosition = position;
                vec4 localPosition = vec4(position, 1.0);
                vec3 localNormal = normal;
                #ifdef USE_INSTANCING
                    localPosition = instanceMatrix * localPosition;
                    localNormal = mat3(instanceMatrix) * localNormal;
                #endif
                vNormalView = normalize(normalMatrix * localNormal);
                vec4 viewPosition = modelViewMatrix * localPosition;
                vViewDirection = normalize(-viewPosition.xyz);
                gl_Position = projectionMatrix * viewPosition;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uHeat;
            uniform float uOpacity;
            uniform vec3 uHeatDirection;
            varying vec3 vObjectPosition;
            varying vec3 vNormalView;
            varying vec3 vViewDirection;

            float hash31(vec3 p) {
                p = fract(p * 0.1031);
                p += dot(p, p.yzx + 33.33);
                return fract((p.x + p.y) * p.z);
            }

            float valueNoise(vec3 p) {
                vec3 cell = floor(p);
                vec3 local = fract(p);
                local = local * local * (3.0 - 2.0 * local);
                float n000 = hash31(cell + vec3(0.0, 0.0, 0.0));
                float n100 = hash31(cell + vec3(1.0, 0.0, 0.0));
                float n010 = hash31(cell + vec3(0.0, 1.0, 0.0));
                float n110 = hash31(cell + vec3(1.0, 1.0, 0.0));
                float n001 = hash31(cell + vec3(0.0, 0.0, 1.0));
                float n101 = hash31(cell + vec3(1.0, 0.0, 1.0));
                float n011 = hash31(cell + vec3(0.0, 1.0, 1.0));
                float n111 = hash31(cell + vec3(1.0, 1.0, 1.0));
                float nx00 = mix(n000, n100, local.x);
                float nx10 = mix(n010, n110, local.x);
                float nx01 = mix(n001, n101, local.x);
                float nx11 = mix(n011, n111, local.x);
                return mix(mix(nx00, nx10, local.y), mix(nx01, nx11, local.y), local.z);
            }

            void main() {
                if (uOpacity < 0.005) discard;
                vec3 normal = normalize(vNormalView);
                vec3 fillDirection = normalize(vec3(-0.35, 0.55, 0.82));
                vec3 heatDirection = normalize(uHeatDirection);
                float heatFacing = max(dot(normal, heatDirection), 0.0);
                float diffuse = 0.18 + max(dot(normal, fillDirection), 0.0) * 0.45 + heatFacing * (0.3 + uHeat * 0.6);
                float rim = pow(1.0 - max(dot(normal, normalize(vViewDirection)), 0.0), 2.2);

                vec3 rockSpace = normalize(vObjectPosition) * 6.0;
                float surface = valueNoise(rockSpace * 1.4) + valueNoise(rockSpace * 3.2 + 15.0) * 0.4;
                float cracks = smoothstep(0.42, 0.58, surface + uHeat * 0.15);

                vec3 coldRock = mix(vec3(0.02, 0.015, 0.01), vec3(0.16, 0.09, 0.05), surface * 0.6);
                vec3 bakedRock = mix(coldRock, vec3(0.35, 0.08, 0.01), uHeat * 0.85);
                vec3 ember = mix(vec3(1.0, 0.22, 0.01), vec3(1.0, 0.92, 0.55), pow(uHeat, 2.0));
                float heatPulse = 0.92 + sin(uTime * 12.0 + surface * 16.0) * 0.08 * uHeat;
                float leadingHeat = pow(heatFacing, 2.1) * pow(uHeat, 1.8);

                vec3 color = bakedRock * diffuse;
                color += ember * cracks * (1.5 + uHeat * 4.5) * heatPulse;
                color += ember * leadingHeat * 2.2;
                color += vec3(1.0, 0.45, 0.08) * rim * uHeat * 0.55;
                gl_FragColor = vec4(color, uOpacity);
            }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: true,
    });
}

function createScreenTrailGeometry(segmentCount) {
    const vertexCount = segmentCount * 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = [];

    for (let segment = 0; segment < segmentCount; segment++) {
        const progress = segment / (segmentCount - 1);
        const vertex = segment * 2;
        uvs.set([progress, 0, progress, 1], vertex * 2);
        if (segment < segmentCount - 1) {
            const next = vertex + 2;
            indices.push(vertex, vertex + 1, next, vertex + 1, next + 1, next);
        }
    }

    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positionAttribute);
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
}

function createScreenTrailMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uHeat: { value: 0 },
            uOpacity: { value: 0 },
        },
        vertexShader: `
            varying float vAlong;
            varying float vAcross;
            void main() {
                vAlong = uv.x;
                vAcross = uv.y;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uHeat;
            uniform float uOpacity;
            varying float vAlong;
            varying float vAcross;

            void main() {
                float across = vAcross * 2.0 - 1.0;
                float centered = 1.0 - abs(across);
                float nearBody = 1.0 - smoothstep(0.02, 0.65, vAlong);
                float tailFade = 1.0 - smoothstep(0.4, 1.0, vAlong);

                float wave = sin(vAlong * 48.0 - uTime * 18.0 + across * 6.0);
                float flameShape = pow(max(centered, 0.0), 3.0) * (0.8 + wave * 0.2);
                float core = pow(max(centered, 0.0), 12.0) * nearBody;

                vec3 deepOrange = vec3(1.0, 0.15, 0.01);
                vec3 gold = vec3(1.0, 0.62, 0.08);
                vec3 whiteHot = vec3(1.0, 0.98, 0.85);

                vec3 color = mix(deepOrange, gold, smoothstep(0.1, 0.6, uHeat));
                color = mix(color, whiteHot, core * smoothstep(0.5, 1.0, uHeat));

                float alpha = (flameShape * 0.65 + core * 0.9) * tailFade * uOpacity;
                gl_FragColor = vec4(color * (1.2 + core * 1.8), alpha);
            }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
}

export function createScreenMeteorSystem({
    scene,
    camera,
    starTexture,
    isMobile = false,
    prefersReducedMotion = false,
    onScreenImpact = null,
}) {
    const random = createSeededRandom(0x3B9F14);
    const bodyRadius = isMobile ? 0.48 : 0.68;
    const root = new THREE.Group();
    root.visible = false;
    scene.add(root);

    // 1. Core rock
    const rockGeo = createRockGeometry(bodyRadius, isMobile ? 1 : 2, random);
    const rockMat = createScreenRockMaterial();
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    rockMesh.frustumCulled = false;
    root.add(rockMesh);

    // 2. Glow sprites
    const glowMat = new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xff5a10,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.setScalar(bodyRadius * 5.5);
    root.add(glowSprite);

    const hotGlowMat = new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xffe2a0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
    });
    const hotGlowSprite = new THREE.Sprite(hotGlowMat);
    hotGlowSprite.scale.setScalar(bodyRadius * 2.9);
    root.add(hotGlowSprite);

    // 3. Trail
    const trailSegments = isMobile ? 22 : 32;
    const trailGeo = createScreenTrailGeometry(trailSegments);
    const trailMat = createScreenTrailMaterial();
    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
    trailMesh.frustumCulled = false;
    trailMesh.visible = false;
    scene.add(trailMesh);

    // 4. Shards bouncing off glass on impact
    const shardCount = isMobile ? 24 : 36;
    const shardGeo = createRockGeometry(bodyRadius * 0.32, 0, random);
    const shardMat = createScreenRockMaterial();
    const shardMesh = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    shardMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    shardMesh.frustumCulled = false;
    shardMesh.visible = false;
    scene.add(shardMesh);

    const shardPositions = Array.from({ length: shardCount }, () => new THREE.Vector3());
    const shardVelocities = Array.from({ length: shardCount }, () => new THREE.Vector3());
    const shardRotations = Array.from({ length: shardCount }, () => new THREE.Euler());
    const shardSpins = Array.from({ length: shardCount }, () => new THREE.Vector3());
    const shardScales = new Float32Array(shardCount);
    const shardLives = new Float32Array(shardCount);

    // 5. Impact flash sprite
    const flashMat = new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
    });
    const flashSprite = new THREE.Sprite(flashMat);
    flashSprite.visible = false;
    scene.add(flashSprite);

    // 6. Kinetic Shockwave Ring on Screen
    const shockRingGeo = new THREE.RingGeometry(0.08, 0.28, 36);
    const shockRingMat = new THREE.MeshBasicMaterial({
        color: 0xffc466,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthTest: false,
    });
    const shockRing = new THREE.Mesh(shockRingGeo, shockRingMat);
    shockRing.visible = false;
    scene.add(shockRing);

    // 7. Kinetic 3D Spark Points Burst
    const sparkBurstCount = isMobile ? 35 : 60;
    const sparkBurstPositions = new Float32Array(sparkBurstCount * 3);
    const sparkBurstVelocities = Array.from({ length: sparkBurstCount }, () => new THREE.Vector3());
    const sparkBurstGeo = new THREE.BufferGeometry();
    const sparkBurstPosAttr = new THREE.BufferAttribute(sparkBurstPositions, 3);
    sparkBurstPosAttr.setUsage(THREE.DynamicDrawUsage);
    sparkBurstGeo.setAttribute('position', sparkBurstPosAttr);

    const sparkBurstMat = new THREE.PointsMaterial({
        map: starTexture,
        color: 0xffb833,
        size: isMobile ? 0.35 : 0.52,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: false,
    });
    const sparkBurstPoints = new THREE.Points(sparkBurstGeo, sparkBurstMat);
    sparkBurstPoints.visible = false;
    scene.add(sparkBurstPoints);

    // Trail buffer vectors
    const trailCenters = Array.from({ length: trailSegments }, () => new THREE.Vector3());
    const dummy = new THREE.Object3D();
    const pStart = new THREE.Vector3();
    const pMid = new THREE.Vector3();
    const pEnd = new THREE.Vector3();
    const currentPos = new THREE.Vector3();
    const prevPos = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const viewDir = new THREE.Vector3();
    const sideVec = new THREE.Vector3();

    let active = false;
    let eventAge = 0;
    let eventDuration = 4.6; // Slower cinematic flight duration in seconds
    let nextEventTime = 6.0; // First meteor strikes after 6s for quick preview
    let ndcX = 0;
    let ndcY = 0;
    let shardsActive = false;
    let shardAge = 0;
    let flashAge = 0;
    let shockRingAge = 0;
    let sparksBurstActive = false;
    let sparkBurstAge = 0;

    function hideShards() {
        dummy.position.set(0, 0, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        for (let i = 0; i < shardCount; i++) {
            shardMesh.setMatrixAt(i, dummy.matrix);
        }
        shardMesh.instanceMatrix.needsUpdate = true;
    }
    hideShards();

    const _targetCamOffset = new THREE.Vector3();
    const impactDistance = 0.72;

    function updateImpactPoint() {
        // Compute frustum dimensions at impact distance in front of camera
        const halfFovRad = THREE.MathUtils.degToRad(camera.fov * 0.5);
        const halfH = impactDistance * Math.tan(halfFovRad);
        const halfW = halfH * (camera.aspect || (window.innerWidth / window.innerHeight));

        const xCam = ndcX * halfW;
        const yCam = ndcY * halfH;

        // In camera coordinates: (xCam, yCam, -impactDistance)
        // Transform to scene space using camera.quaternion and camera.position
        _targetCamOffset.set(xCam, yCam, -impactDistance).applyQuaternion(camera.quaternion);
        pEnd.copy(camera.position).add(_targetCamOffset);
    }

    function computeImpactTarget() {
        // User requirement: meteor flies predominantly into center of screen with subtle natural variation
        if (random() < 0.75) {
            ndcX = (random() - 0.5) * 0.08; // -0.04 to +0.04 (tight center)
            ndcY = (random() - 0.5) * 0.06; // -0.03 to +0.03 (tight center)
        } else {
            ndcX = (random() - 0.5) * 0.16; // -0.08 to +0.08
            ndcY = (random() - 0.5) * 0.12; // -0.06 to +0.06
        }

        updateImpactPoint();

        // Start point: deep in cosmos, slightly to one side of the black hole
        const sideSign = random() < 0.5 ? -1 : 1;
        pStart.set(
            sideSign * (6 + random() * 10),
            1.5 + random() * 5,
            -18 - random() * 14
        );

        // Mid point: sweeping arc slingshot
        pMid.set(
            sideSign * (2 + random() * 4),
            0.5 + random() * 3,
            -4 - random() * 5
        );
    }

    function evaluateBezier(t, out) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        out.set(0, 0, 0);
        out.addScaledVector(pStart, uu);
        out.addScaledVector(pMid, 2 * u * t);
        out.addScaledVector(pEnd, tt);
        return out;
    }

    function trigger() {
        if (active) return;
        computeImpactTarget();
        eventAge = 0;
        eventDuration = isMobile ? 5.2 : 4.6;
        evaluateBezier(0, prevPos);
        active = true;
        root.visible = true;
        trailMesh.visible = !prefersReducedMotion;
        rockMat.uniforms.uOpacity.value = 1;
    }

    function onHitScreen() {
        active = false;
        root.visible = false;
        trailMesh.visible = false;

        // Trigger flash
        flashSprite.position.copy(pEnd);
        flashSprite.scale.setScalar(bodyRadius * 11.0);
        flashMat.opacity = 1.0;
        flashSprite.visible = true;
        flashAge = 0;

        // Trigger 3D shockwave ring
        shockRing.position.copy(pEnd);
        shockRing.quaternion.copy(camera.quaternion);
        shockRing.scale.setScalar(1.0);
        shockRingMat.opacity = 0.95;
        shockRing.visible = true;
        shockRingAge = 0;

        // Exact screen projection matching pEnd (0 to 1, top-left origin)
        const actualScreenX = (ndcX + 1) * 0.5;
        const actualScreenY = (1 - ndcY) * 0.5;

        // Notify UI overlay of impact at the exact screen coordinate
        if (typeof onScreenImpact === 'function') {
            onScreenImpact({
                screenX: actualScreenX,
                screenY: actualScreenY,
                intensity: 1.0,
            });
        }

        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

        // Scatter 3D shards bouncing off camera plane
        shardsActive = true;
        shardAge = 0;
        shardMesh.visible = true;

        for (let i = 0; i < shardCount; i++) {
            const angle = (i / shardCount) * Math.PI * 2 + (random() - 0.5) * 0.6;
            const speed = 2.2 + random() * 4.4;
            shardPositions[i].copy(pEnd);

            // Rebound shards laterally and back away into space
            shardVelocities[i].set(0, 0, 0)
                .addScaledVector(camRight, Math.cos(angle) * speed)
                .addScaledVector(camUp, Math.sin(angle) * speed)
                .addScaledVector(camForward, 0.4 + random() * 1.4);

            shardScales[i] = (0.6 + random() * 0.9);
            shardLives[i] = 1.0;
            shardRotations[i].set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
            shardSpins[i].set((random() - 0.5) * 14, (random() - 0.5) * 14, (random() - 0.5) * 14);
        }

        // Scatter 3D fiery sparks burst
        for (let i = 0; i < sparkBurstCount; i++) {
            const i3 = i * 3;
            sparkBurstPositions[i3] = pEnd.x;
            sparkBurstPositions[i3 + 1] = pEnd.y;
            sparkBurstPositions[i3 + 2] = pEnd.z;
            const spAngle = (i / sparkBurstCount) * Math.PI * 2 + (random() - 0.5) * 0.5;
            const spSpeed = 3.2 + random() * 6.8;
            sparkBurstVelocities[i].set(0, 0, 0)
                .addScaledVector(camRight, Math.cos(spAngle) * spSpeed)
                .addScaledVector(camUp, Math.sin(spAngle) * spSpeed)
                .addScaledVector(camForward, 0.5 + random() * 1.5);
        }
        sparkBurstPosAttr.needsUpdate = true;
        sparkBurstMat.opacity = 1.0;
        sparkBurstPoints.visible = true;
        sparksBurstActive = true;
        sparkBurstAge = 0;

        // Periodic interval: 15 - 20 seconds
        nextEventTime = 15.0 + random() * 5.0;
    }

    function update(dt, elapsedTime) {
        if (!active) {
            nextEventTime -= dt;
            if (nextEventTime <= 0) {
                trigger();
            }
        }

        // Update flash
        if (flashSprite.visible) {
            flashAge += dt;
            const flashFade = Math.max(0, 1 - flashAge * 5.0);
            flashMat.opacity = flashFade;
            flashSprite.scale.multiplyScalar(1 + dt * 2.5);
            if (flashFade <= 0.001) {
                flashSprite.visible = false;
            }
        }

        // Update shockwave ring
        if (shockRing.visible) {
            shockRingAge += dt;
            const sProg = shockRingAge / 0.45;
            if (sProg >= 1.0) {
                shockRing.visible = false;
            } else {
                shockRing.scale.setScalar(1.0 + sProg * 8.5);
                shockRingMat.opacity = (1 - sProg) * 0.9;
            }
        }

        // Update 3D sparks
        if (sparksBurstActive) {
            sparkBurstAge += dt;
            const sFade = Math.max(0, 1.0 - sparkBurstAge * 1.6);
            sparkBurstMat.opacity = sFade;
            for (let i = 0; i < sparkBurstCount; i++) {
                const i3 = i * 3;
                sparkBurstPositions[i3] += sparkBurstVelocities[i].x * dt;
                sparkBurstPositions[i3 + 1] += sparkBurstVelocities[i].y * dt;
                sparkBurstPositions[i3 + 2] += sparkBurstVelocities[i].z * dt;
            }
            sparkBurstPosAttr.needsUpdate = true;
            if (sFade <= 0.001) {
                sparksBurstActive = false;
                sparkBurstPoints.visible = false;
            }
        }

        // Update shards
        if (shardsActive) {
            shardAge += dt;
            let anyAlive = false;
            const shardFade = Math.max(0, 1 - shardAge * 0.85);
            shardMat.uniforms.uOpacity.value = shardFade;
            shardMat.uniforms.uHeat.value = Math.max(0, 1 - shardAge * 1.1);
            shardMat.uniforms.uTime.value = elapsedTime;

            for (let i = 0; i < shardCount; i++) {
                if (shardLives[i] <= 0) continue;
                anyAlive = true;
                shardPositions[i].addScaledVector(shardVelocities[i], dt);
                shardRotations[i].x += shardSpins[i].x * dt;
                shardRotations[i].y += shardSpins[i].y * dt;
                shardRotations[i].z += shardSpins[i].z * dt;

                const curScale = shardScales[i] * shardFade;
                dummy.position.copy(shardPositions[i]);
                dummy.rotation.copy(shardRotations[i]);
                dummy.scale.setScalar(curScale);
                dummy.updateMatrix();
                shardMesh.setMatrixAt(i, dummy.matrix);
            }
            shardMesh.instanceMatrix.needsUpdate = true;

            if (!anyAlive || shardFade <= 0.001) {
                shardsActive = false;
                shardMesh.visible = false;
                hideShards();
            }
        }

        if (!active) return;

        // Keep target locked dynamically to the user's camera viewpoint
        updateImpactPoint();

        eventAge += dt;
        const rawProgress = Math.min(1.0, eventAge / eventDuration);

        // Smooth cinematic acceleration — clearly visible flight and build-up
        const motionProgress = Math.pow(rawProgress, 1.75);
        evaluateBezier(motionProgress, currentPos);

        // Tangent
        tangent.subVectors(currentPos, prevPos).normalize();
        prevPos.copy(currentPos);

        root.position.copy(currentPos);
        rockMesh.rotation.x += dt * 3.6;
        rockMesh.rotation.y += dt * 5.2;
        rockMesh.rotation.z += dt * 2.2;

        // Dynamic perspective swelling as it approaches camera
        const approachScale = 1.0 + Math.pow(rawProgress, 2.2) * 0.65;
        root.scale.setScalar(approachScale);

        const heat = THREE.MathUtils.smoothstep(rawProgress, 0.1, 0.95);
        rockMat.uniforms.uTime.value = elapsedTime;
        rockMat.uniforms.uHeat.value = heat;
        rockMat.uniforms.uHeatDirection.value.copy(tangent).multiplyScalar(-1);

        // Glow expands as it draws closer
        glowMat.opacity = heat * 0.9;
        hotGlowMat.opacity = Math.pow(heat, 2.0) * 0.95;

        // Trail update
        const tailSpan = 0.32 * Math.max(0.12, motionProgress);
        const trailArray = trailGeo.attributes.position.array;
        for (let s = 0; s < trailSegments; s++) {
            const segT = s / (trailSegments - 1);
            const historyT = Math.max(0, motionProgress - segT * tailSpan);
            evaluateBezier(historyT, trailCenters[s]);
        }

        for (let s = 0; s < trailSegments; s++) {
            const center = trailCenters[s];
            const before = trailCenters[Math.max(0, s - 1)];
            const after = trailCenters[Math.min(trailSegments - 1, s + 1)];
            tangent.subVectors(before, after).normalize();
            viewDir.subVectors(camera.position, center).normalize();
            sideVec.crossVectors(tangent, viewDir).normalize();

            const segT = s / (trailSegments - 1);
            const width = bodyRadius * approachScale * (0.9 + heat * 0.7) * (1.0 - segT * 0.9);
            const v = s * 2;
            trailArray[v * 3] = center.x + sideVec.x * width;
            trailArray[v * 3 + 1] = center.y + sideVec.y * width;
            trailArray[v * 3 + 2] = center.z + sideVec.z * width;
            trailArray[(v + 1) * 3] = center.x - sideVec.x * width;
            trailArray[(v + 1) * 3 + 1] = center.y - sideVec.y * width;
            trailArray[(v + 1) * 3 + 2] = center.z - sideVec.z * width;
        }

        trailGeo.attributes.position.needsUpdate = true;
        trailMat.uniforms.uTime.value = elapsedTime;
        trailMat.uniforms.uHeat.value = heat;
        trailMat.uniforms.uOpacity.value = heat * (1.0 - rawProgress * 0.15);

        // Check if reached destination (screen impact)
        if (rawProgress >= 1.0) {
            onHitScreen();
        }
    }

    function dispose() {
        scene.remove(root, trailMesh, shardMesh, flashSprite, shockRing, sparkBurstPoints);
        rockGeo.dispose();
        rockMat.dispose();
        glowMat.dispose();
        hotGlowMat.dispose();
        trailGeo.dispose();
        trailMat.dispose();
        shardGeo.dispose();
        shardMat.dispose();
        flashMat.dispose();
        shockRingGeo.dispose();
        shockRingMat.dispose();
        sparkBurstGeo.dispose();
        sparkBurstMat.dispose();
    }

    return {
        update,
        trigger,
        dispose,
    };
}
