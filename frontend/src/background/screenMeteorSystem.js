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
    const impactDistance = 0.72;
    const trailSegments = isMobile ? 20 : 28;

    // Shared Geometries & Base Materials
    const rockGeo = createRockGeometry(bodyRadius, isMobile ? 1 : 2, random);
    const baseRockMat = createScreenRockMaterial();

    const baseGlowMat = new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xff5a10,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
    });

    const baseHotGlowMat = new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xffe2a0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
    });

    const baseTrailMat = createScreenTrailMaterial();

    // -------------------------------------------------------------
    // METEOR POOL: Allows spamming 'B' to launch many concurrent meteors!
    // -------------------------------------------------------------
    const MAX_METEORS = 30;
    const meteorPool = [];

    function createMeteorInstance() {
        const root = new THREE.Group();
        root.visible = false;
        scene.add(root);

        const rockMat = baseRockMat.clone();
        const rockMesh = new THREE.Mesh(rockGeo, rockMat);
        rockMesh.frustumCulled = false;
        root.add(rockMesh);

        const glowMat = baseGlowMat.clone();
        const glowSprite = new THREE.Sprite(glowMat);
        glowSprite.scale.setScalar(bodyRadius * 5.5);
        root.add(glowSprite);

        const hotGlowMat = baseHotGlowMat.clone();
        const hotGlowSprite = new THREE.Sprite(hotGlowMat);
        hotGlowSprite.scale.setScalar(bodyRadius * 2.9);
        root.add(hotGlowSprite);

        const trailGeo = createScreenTrailGeometry(trailSegments);
        const trailMat = baseTrailMat.clone();
        const trailMesh = new THREE.Mesh(trailGeo, trailMat);
        trailMesh.frustumCulled = false;
        trailMesh.visible = false;
        scene.add(trailMesh);

        return {
            root,
            rockMesh,
            rockMat,
            glowSprite,
            glowMat,
            hotGlowSprite,
            hotGlowMat,
            trailGeo,
            trailMat,
            trailMesh,
            trailCenters: Array.from({ length: trailSegments }, () => new THREE.Vector3()),
            pStart: new THREE.Vector3(),
            pMid: new THREE.Vector3(),
            pEnd: new THREE.Vector3(),
            currentPos: new THREE.Vector3(),
            prevPos: new THREE.Vector3(),
            tangent: new THREE.Vector3(),
            viewDir: new THREE.Vector3(),
            sideVec: new THREE.Vector3(),
            rotSpeed: new THREE.Vector3(
                3.0 + Math.random() * 2.0,
                4.5 + Math.random() * 2.5,
                1.8 + Math.random() * 1.5
            ),
            ndcX: 0,
            ndcY: 0,
            eventAge: 0,
            eventDuration: 4.6,
            active: false,
        };
    }

    // Pre-populate pool with 6 meteors
    for (let i = 0; i < 6; i++) {
        meteorPool.push(createMeteorInstance());
    }

    // -------------------------------------------------------------
    // IMPACT EFFECTS POOL (Flash, Shockwave Ring, 3D Sparks)
    // -------------------------------------------------------------
    const MAX_IMPACTS = 12;
    const impactPool = [];
    const shockRingGeo = new THREE.RingGeometry(0.08, 0.28, 32);

    function createImpactEffect() {
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

        const sparkBurstCount = isMobile ? 24 : 45;
        const sparkBurstPositions = new Float32Array(sparkBurstCount * 3);
        const sparkBurstVelocities = Array.from({ length: sparkBurstCount }, () => new THREE.Vector3());
        const sparkBurstGeo = new THREE.BufferGeometry();
        const sparkBurstPosAttr = new THREE.BufferAttribute(sparkBurstPositions, 3);
        sparkBurstPosAttr.setUsage(THREE.DynamicDrawUsage);
        sparkBurstGeo.setAttribute('position', sparkBurstPosAttr);

        const sparkBurstMat = new THREE.PointsMaterial({
            map: starTexture,
            color: 0xffb833,
            size: isMobile ? 0.32 : 0.48,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthTest: false,
        });
        const sparkBurstPoints = new THREE.Points(sparkBurstGeo, sparkBurstMat);
        sparkBurstPoints.visible = false;
        scene.add(sparkBurstPoints);

        return {
            flashSprite,
            flashMat,
            shockRing,
            shockRingMat,
            sparkBurstPoints,
            sparkBurstPositions,
            sparkBurstVelocities,
            sparkBurstPosAttr,
            sparkBurstMat,
            sparkBurstGeo,
            sparkBurstCount,
            active: false,
            age: 0,
            pEnd: new THREE.Vector3(),
        };
    }

    for (let i = 0; i < 6; i++) {
        impactPool.push(createImpactEffect());
    }

    function triggerImpactEffect(position) {
        let impact = impactPool.find(imp => !imp.active);
        if (!impact) {
            if (impactPool.length < MAX_IMPACTS) {
                impact = createImpactEffect();
                impactPool.push(impact);
            } else {
                impact = impactPool.reduce((oldest, cur) => cur.age > oldest.age ? cur : oldest, impactPool[0]);
            }
        }

        impact.active = true;
        impact.age = 0;
        impact.pEnd.copy(position);

        // Flash
        impact.flashSprite.position.copy(position);
        impact.flashSprite.scale.setScalar(bodyRadius * 11.0);
        impact.flashMat.opacity = 1.0;
        impact.flashSprite.visible = true;

        // Shockwave Ring
        impact.shockRing.position.copy(position);
        impact.shockRing.quaternion.copy(camera.quaternion);
        impact.shockRing.scale.setScalar(1.0);
        impact.shockRingMat.opacity = 0.95;
        impact.shockRing.visible = true;

        // Sparks
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

        for (let i = 0; i < impact.sparkBurstCount; i++) {
            const i3 = i * 3;
            impact.sparkBurstPositions[i3] = position.x;
            impact.sparkBurstPositions[i3 + 1] = position.y;
            impact.sparkBurstPositions[i3 + 2] = position.z;
            const spAngle = (i / impact.sparkBurstCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const spSpeed = 3.2 + Math.random() * 6.5;
            impact.sparkBurstVelocities[i].set(0, 0, 0)
                .addScaledVector(camRight, Math.cos(spAngle) * spSpeed)
                .addScaledVector(camUp, Math.sin(spAngle) * spSpeed)
                .addScaledVector(camForward, 0.5 + Math.random() * 1.5);
        }
        impact.sparkBurstPosAttr.needsUpdate = true;
        impact.sparkBurstMat.opacity = 1.0;
        impact.sparkBurstPoints.visible = true;
    }

    const _targetCamOffset = new THREE.Vector3();

    function updateMeteorImpactPoint(meteor) {
        const halfFovRad = THREE.MathUtils.degToRad(camera.fov * 0.5);
        const halfH = impactDistance * Math.tan(halfFovRad);
        const halfW = halfH * (camera.aspect || 1.6);

        const xCam = meteor.ndcX * halfW;
        const yCam = meteor.ndcY * halfH;

        _targetCamOffset.set(xCam, yCam, -impactDistance).applyQuaternion(camera.quaternion);
        meteor.pEnd.copy(camera.position).add(_targetCamOffset);
    }

    function evaluateBezier(t, p0, p1, p2, out) {
        const u = 1 - t;
        const tt = t * t;
        const uu = u * u;
        out.set(0, 0, 0);
        out.addScaledVector(p0, uu);
        out.addScaledVector(p1, 2 * u * t);
        out.addScaledVector(p2, tt);
        return out;
    }

    function spawnMeteor(isManual = false) {
        let meteor = meteorPool.find(m => !m.active);
        if (!meteor) {
            if (meteorPool.length < MAX_METEORS) {
                meteor = createMeteorInstance();
                meteorPool.push(meteor);
            } else {
                meteor = meteorPool.reduce((oldest, m) => (m.eventAge / m.eventDuration) > (oldest.eventAge / oldest.eventDuration) ? m : oldest, meteorPool[0]);
            }
        }

        if (isManual) {
            // SPAM / B KEY:
            // Random target across screen (-0.82 to +0.82)
            meteor.ndcX = (Math.random() - 0.5) * 1.64;
            meteor.ndcY = (Math.random() - 0.5) * 1.64;

            // Random flight duration for rapid, punchy barrage
            meteor.eventDuration = isMobile ? (2.0 + Math.random() * 1.0) : (1.7 + Math.random() * 1.2);

            // Random origin from any 360-degree direction in cosmic space
            const theta = Math.random() * Math.PI * 2;
            const radDist = 14 + Math.random() * 18;
            const zDist = -24 - Math.random() * 24;
            const yOff = (Math.random() - 0.5) * 14;

            meteor.pStart.set(
                Math.cos(theta) * radDist,
                Math.sin(theta) * radDist * 0.75 + yOff,
                zDist
            );

            updateMeteorImpactPoint(meteor);

            // Random curved mid-point with gravitational sling
            const midT = 0.42 + Math.random() * 0.16;
            meteor.pMid.lerpVectors(meteor.pStart, meteor.pEnd, midT);
            const curveAngle = Math.random() * Math.PI * 2;
            const curveDist = 4 + Math.random() * 7;
            meteor.pMid.x += Math.cos(curveAngle) * curveDist;
            meteor.pMid.y += Math.sin(curveAngle) * curveDist;
            meteor.pMid.z += (Math.random() - 0.5) * 6;
        } else {
            // AUTONOMOUS / SPONTANEOUS:
            if (Math.random() < 0.75) {
                meteor.ndcX = (Math.random() - 0.5) * 0.12;
                meteor.ndcY = (Math.random() - 0.5) * 0.10;
            } else {
                meteor.ndcX = (Math.random() - 0.5) * 0.28;
                meteor.ndcY = (Math.random() - 0.5) * 0.22;
            }

            meteor.eventDuration = isMobile ? 5.2 : 4.6;

            const sideSign = Math.random() < 0.5 ? -1 : 1;
            meteor.pStart.set(
                sideSign * (6 + Math.random() * 10),
                1.5 + Math.random() * 5,
                -18 - Math.random() * 14
            );

            meteor.pMid.set(
                sideSign * (2 + Math.random() * 4),
                0.5 + Math.random() * 3,
                -4 - Math.random() * 5
            );
            updateMeteorImpactPoint(meteor);
        }

        meteor.eventAge = 0;
        evaluateBezier(0, meteor.pStart, meteor.pMid, meteor.pEnd, meteor.prevPos);
        meteor.currentPos.copy(meteor.prevPos);
        meteor.active = true;
        meteor.root.visible = true;
        meteor.trailMesh.visible = !prefersReducedMotion;
        meteor.rockMat.uniforms.uOpacity.value = 1;
    }

    function onMeteorHit(meteor) {
        meteor.active = false;
        meteor.root.visible = false;
        meteor.trailMesh.visible = false;

        triggerImpactEffect(meteor.pEnd);

        // Project exact screen coordinate (0 to 1)
        const actualScreenX = (meteor.ndcX + 1) * 0.5;
        const actualScreenY = (1 - meteor.ndcY) * 0.5;

        if (typeof onScreenImpact === 'function') {
            onScreenImpact({
                screenX: actualScreenX,
                screenY: actualScreenY,
                intensity: 1.0,
            });
        }
    }

    let nextEventTime = 6.0;

    function trigger(isManual = true) {
        spawnMeteor(isManual);
    }

    function update(dt, elapsedTime) {
        // 1. Autonomous cadence timer (independent of manual spam)
        nextEventTime -= dt;
        if (nextEventTime <= 0) {
            spawnMeteor(false);
            nextEventTime = 16.0 + Math.random() * 6.0;
        }

        // 2. Update active impact effects
        for (let i = 0; i < impactPool.length; i++) {
            const imp = impactPool[i];
            if (!imp.active) continue;
            imp.age += dt;

            // Flash fade
            const flashFade = Math.max(0, 1.0 - imp.age * 5.0);
            imp.flashMat.opacity = flashFade;
            imp.flashSprite.scale.multiplyScalar(1 + dt * 2.5);
            if (flashFade <= 0.001) {
                imp.flashSprite.visible = false;
            }

            // Shockwave ring expand & fade
            const sProg = imp.age / 0.45;
            if (sProg >= 1.0) {
                imp.shockRing.visible = false;
            } else {
                imp.shockRing.scale.setScalar(1.0 + sProg * 8.5);
                imp.shockRingMat.opacity = (1 - sProg) * 0.9;
            }

            // Sparks
            const sFade = Math.max(0, 1.0 - imp.age * 1.6);
            imp.sparkBurstMat.opacity = sFade;
            if (sFade > 0.001) {
                for (let s = 0; s < imp.sparkBurstCount; s++) {
                    const s3 = s * 3;
                    imp.sparkBurstPositions[s3] += imp.sparkBurstVelocities[s].x * dt;
                    imp.sparkBurstPositions[s3 + 1] += imp.sparkBurstVelocities[s].y * dt;
                    imp.sparkBurstPositions[s3 + 2] += imp.sparkBurstVelocities[s].z * dt;
                }
                imp.sparkBurstPosAttr.needsUpdate = true;
            } else {
                imp.sparkBurstPoints.visible = false;
            }

            if (imp.age > 0.8) {
                imp.active = false;
            }
        }

        // 3. Update active meteors
        for (let m = 0; m < meteorPool.length; m++) {
            const meteor = meteorPool[m];
            if (!meteor.active) continue;

            updateMeteorImpactPoint(meteor);
            meteor.eventAge += dt;
            const rawProgress = Math.min(1.0, meteor.eventAge / meteor.eventDuration);
            const motionProgress = Math.pow(rawProgress, 1.75);

            evaluateBezier(motionProgress, meteor.pStart, meteor.pMid, meteor.pEnd, meteor.currentPos);
            meteor.tangent.subVectors(meteor.currentPos, meteor.prevPos).normalize();
            meteor.prevPos.copy(meteor.currentPos);

            meteor.root.position.copy(meteor.currentPos);
            meteor.rockMesh.rotation.x += dt * meteor.rotSpeed.x;
            meteor.rockMesh.rotation.y += dt * meteor.rotSpeed.y;
            meteor.rockMesh.rotation.z += dt * meteor.rotSpeed.z;

            const approachScale = 1.0 + Math.pow(rawProgress, 2.2) * 0.65;
            meteor.root.scale.setScalar(approachScale);

            const heat = THREE.MathUtils.smoothstep(rawProgress, 0.1, 0.95);
            meteor.rockMat.uniforms.uTime.value = elapsedTime;
            meteor.rockMat.uniforms.uHeat.value = heat;
            meteor.rockMat.uniforms.uHeatDirection.value.copy(meteor.tangent).multiplyScalar(-1);

            meteor.glowMat.opacity = heat * 0.9;
            meteor.hotGlowMat.opacity = Math.pow(heat, 2.0) * 0.95;

            // Trail update
            const tailSpan = 0.32 * Math.max(0.12, motionProgress);
            const trailArray = meteor.trailGeo.attributes.position.array;
            for (let s = 0; s < trailSegments; s++) {
                const segT = s / (trailSegments - 1);
                const historyT = Math.max(0, motionProgress - segT * tailSpan);
                evaluateBezier(historyT, meteor.pStart, meteor.pMid, meteor.pEnd, meteor.trailCenters[s]);
            }

            for (let s = 0; s < trailSegments; s++) {
                const center = meteor.trailCenters[s];
                const before = meteor.trailCenters[Math.max(0, s - 1)];
                const after = meteor.trailCenters[Math.min(trailSegments - 1, s + 1)];
                meteor.tangent.subVectors(before, after).normalize();
                meteor.viewDir.subVectors(camera.position, center).normalize();
                meteor.sideVec.crossVectors(meteor.tangent, meteor.viewDir).normalize();

                const segT = s / (trailSegments - 1);
                const width = bodyRadius * approachScale * (0.9 + heat * 0.7) * (1.0 - segT * 0.9);
                const v = s * 2;
                trailArray[v * 3] = center.x + meteor.sideVec.x * width;
                trailArray[v * 3 + 1] = center.y + meteor.sideVec.y * width;
                trailArray[v * 3 + 2] = center.z + meteor.sideVec.z * width;
                trailArray[(v + 1) * 3] = center.x - meteor.sideVec.x * width;
                trailArray[(v + 1) * 3 + 1] = center.y - meteor.sideVec.y * width;
                trailArray[(v + 1) * 3 + 2] = center.z - meteor.sideVec.z * width;
            }

            meteor.trailGeo.attributes.position.needsUpdate = true;
            meteor.trailMat.uniforms.uTime.value = elapsedTime;
            meteor.trailMat.uniforms.uHeat.value = heat;
            meteor.trailMat.uniforms.uOpacity.value = heat * (1.0 - rawProgress * 0.15);

            if (rawProgress >= 1.0) {
                onMeteorHit(meteor);
            }
        }
    }

    function dispose() {
        for (let m of meteorPool) {
            scene.remove(m.root, m.trailMesh);
            m.rockMat.dispose();
            m.glowMat.dispose();
            m.hotGlowMat.dispose();
            m.trailGeo.dispose();
            m.trailMat.dispose();
        }
        for (let imp of impactPool) {
            scene.remove(imp.flashSprite, imp.shockRing, imp.sparkBurstPoints);
            imp.flashMat.dispose();
            imp.shockRingMat.dispose();
            imp.sparkBurstGeo.dispose();
            imp.sparkBurstMat.dispose();
        }
        rockGeo.dispose();
        shockRingGeo.dispose();
        baseRockMat.dispose();
        baseGlowMat.dispose();
        baseHotGlowMat.dispose();
        baseTrailMat.dispose();
    }

    return {
        update,
        trigger,
        dispose,
    };
}
