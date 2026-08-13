import * as THREE from 'three';

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

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
        const broadShape = 0.88
            + Math.sin(direction.x * 4.1 + direction.z * 2.7) * 0.08
            + Math.sin(direction.y * 7.3 - direction.x * 2.2) * 0.045;
        const chippedSurface = (random() - 0.5) * 0.17;
        point.copy(direction).multiplyScalar(radius * (broadShape + chippedSurface));
        point.x *= 1.12;
        point.y *= 0.92;
        positions.setXYZ(index, point.x, point.y, point.z);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
}

function createRockMaterial() {
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

            float cellularEdge(vec3 p) {
                vec3 baseCell = floor(p);
                vec3 local = fract(p);
                float nearest = 10.0;
                float secondNearest = 10.0;

                for (int z = -1; z <= 1; z++) {
                    for (int y = -1; y <= 1; y++) {
                        for (int x = -1; x <= 1; x++) {
                            vec3 offset = vec3(float(x), float(y), float(z));
                            vec3 feature = offset + vec3(
                                hash31(baseCell + offset),
                                hash31(baseCell + offset + 19.1),
                                hash31(baseCell + offset + 47.7)
                            ) - local;
                            float distanceSquared = dot(feature, feature);
                            if (distanceSquared < nearest) {
                                secondNearest = nearest;
                                nearest = distanceSquared;
                            } else if (distanceSquared < secondNearest) {
                                secondNearest = distanceSquared;
                            }
                        }
                    }
                }

                return sqrt(secondNearest) - sqrt(nearest);
            }

            void main() {
                float dissolve = hash31(vObjectPosition * 37.0 + 11.0);
                if (uOpacity < 0.004 || dissolve > uOpacity) discard;
                vec3 normal = normalize(vNormalView);
                vec3 fillDirection = normalize(vec3(-0.35, 0.55, 0.82));
                vec3 heatDirection = normalize(uHeatDirection);
                float heatFacing = max(dot(normal, heatDirection), 0.0);
                float diffuse = 0.13
                    + max(dot(normal, fillDirection), 0.0) * 0.34
                    + heatFacing * (0.2 + uHeat * 0.38);
                float rim = pow(1.0 - max(dot(normal, normalize(vViewDirection)), 0.0), 2.4);

                vec3 rockSpace = normalize(vObjectPosition) * 5.5;
                float surface = valueNoise(rockSpace * 1.35)
                    + valueNoise(rockSpace * 3.1 + 17.0) * 0.42;
                float edgeDistance = cellularEdge(rockSpace * 1.45 + valueNoise(rockSpace) * 0.35);
                float cracks = 1.0 - smoothstep(0.035, 0.12, edgeDistance);
                cracks *= smoothstep(0.16, 0.92, uHeat) * mix(0.48, 1.38, heatFacing);

                vec3 coldRock = mix(vec3(0.012, 0.01, 0.014), vec3(0.12, 0.075, 0.045), surface * 0.62);
                vec3 bakedRock = mix(coldRock, vec3(0.24, 0.045, 0.008), uHeat * 0.72);
                vec3 ember = mix(vec3(1.0, 0.16, 0.012), vec3(1.0, 0.86, 0.48), pow(uHeat, 2.2));
                float heatPulse = 0.94 + sin(uTime * 10.0 + surface * 18.0) * 0.06 * uHeat;
                float leadingHeat = pow(heatFacing, 2.35) * pow(uHeat, 2.25);

                vec3 color = bakedRock * diffuse;
                color += ember * cracks * (1.0 + uHeat * 3.8) * heatPulse;
                color += ember * leadingHeat * 1.65;
                color += vec3(1.0, 0.32, 0.045) * rim * uHeat * 0.34;
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        transparent: false,
        depthTest: true,
        depthWrite: true,
    });
}

function createTrailGeometry(segmentCount) {
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

function createTrailMaterial() {
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

            float hash12(vec2 p) {
                vec3 p3 = fract(vec3(p.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }

            void main() {
                float across = vAcross * 2.0 - 1.0;
                float centered = 1.0 - abs(across);
                float nearBody = 1.0 - smoothstep(0.04, 0.72, vAlong);
                float ignition = smoothstep(0.0, 0.035, vAlong);
                float tailFade = 1.0 - smoothstep(0.36, 1.0, vAlong);

                float waveA = sin(vAlong * 56.0 - uTime * 17.0 + across * 5.0);
                float waveB = sin(vAlong * 23.0 - uTime * 8.5 - across * 8.0);
                float granular = hash12(vec2(floor(vAlong * 46.0), floor(uTime * 11.0)));
                float edgeThreshold = 0.045 + (waveA * 0.5 + waveB * 0.3 + granular * 0.2 + 1.0)
                    * (0.045 + vAlong * 0.085);
                float outerFlame = smoothstep(edgeThreshold, 0.46, centered);
                float middleFlame = pow(max(centered, 0.0), 3.6);
                float hotCore = pow(max(centered, 0.0), 15.0) * nearBody;
                float tongues = 0.76 + 0.24 * sin(vAlong * 43.0 - uTime * 14.0 + waveB * 1.7);
                float turbulence = mix(0.72, 1.08, granular) * tongues;

                float temperature = clamp(uHeat * (0.38 + nearBody * 0.76) + hotCore * 0.45, 0.0, 1.0);
                vec3 emberRed = vec3(0.42, 0.012, 0.001);
                vec3 deepOrange = vec3(1.0, 0.095, 0.004);
                vec3 goldPlasma = vec3(1.0, 0.48, 0.055);
                vec3 whiteHot = vec3(1.0, 0.96, 0.78);
                vec3 color = mix(emberRed, deepOrange, smoothstep(0.08, 0.48, temperature));
                color = mix(color, goldPlasma, smoothstep(0.35, 0.78, temperature) * middleFlame);
                color = mix(color, whiteHot, hotCore * smoothstep(0.62, 1.0, temperature));

                float flameShape = outerFlame * 0.19 + middleFlame * 0.42 + hotCore * 0.92;
                float energy = outerFlame * 0.2 + middleFlame * (0.58 + temperature * 0.64)
                    + hotCore * 1.7;
                float alpha = flameShape * tailFade * ignition * turbulence * uOpacity;
                gl_FragColor = vec4(color * energy * tailFade * turbulence, alpha);
            }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
}

function createSparkMaterial(isMobile) {
    return new THREE.ShaderMaterial({
        vertexShader: `
            attribute float aLife;
            attribute float aSize;
            varying float vLife;

            void main() {
                vLife = aLife;
                vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * ${isMobile ? '28.0' : '38.0'} / max(-viewPosition.z, 1.0);
                gl_Position = projectionMatrix * viewPosition;
            }
        `,
        fragmentShader: `
            varying float vLife;

            void main() {
                vec2 centered = gl_PointCoord - 0.5;
                float radius = length(centered) * 2.0;
                float core = 1.0 - smoothstep(0.0, 0.2, radius);
                float halo = 1.0 - smoothstep(0.0, 1.0, radius);
                vec3 color = mix(vec3(1.0, 0.14, 0.01), vec3(1.0, 0.9, 0.58), core);
                float alpha = (core * 0.65 + halo * 0.08) * vLife;
                gl_FragColor = vec4(color * (0.35 + core * 1.05), alpha);
            }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
}

function createImpactChunkMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: `
            attribute float aLife;
            attribute float aHeat;
            attribute float aSeed;
            varying float vLife;
            varying float vHeat;
            varying float vSeed;
            varying vec3 vNormalView;
            varying vec3 vObjectPosition;
            varying vec3 vViewDirection;

            void main() {
                vLife = aLife;
                vHeat = aHeat;
                vSeed = aSeed;
                vObjectPosition = position;
                vec4 localPosition = instanceMatrix * vec4(position, 1.0);
                vec3 localNormal = mat3(instanceMatrix) * normal;
                vNormalView = normalize(normalMatrix * localNormal);
                vec4 viewPosition = modelViewMatrix * localPosition;
                vViewDirection = normalize(-viewPosition.xyz);
                gl_Position = projectionMatrix * viewPosition;
            }
        `,
        fragmentShader: `
            varying float vLife;
            varying float vHeat;
            varying float vSeed;
            varying vec3 vNormalView;
            varying vec3 vObjectPosition;
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
                float dissolve = hash31(vObjectPosition * 31.0 + vSeed * 29.0);
                if (vLife <= 0.002 || dissolve > smoothstep(0.0, 0.22, vLife)) discard;

                vec3 normal = normalize(vNormalView);
                vec3 viewDirection = normalize(vViewDirection);
                vec3 lightDirection = normalize(vec3(-0.4, 0.62, 0.74));
                float diffuse = max(dot(normal, lightDirection), 0.0);
                float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
                vec3 rockSpace = normalize(vObjectPosition);
                vec3 noiseSpace = rockSpace * 3.4 + vSeed * vec3(17.0, 29.0, 41.0);
                float broadNoise = valueNoise(noiseSpace * 0.78);
                float mediumNoise = valueNoise(noiseSpace * 1.9 + 13.7);
                float fineNoise = valueNoise(noiseSpace * 4.6 - 8.2);
                float crackA = 1.0 - abs(sin(dot(rockSpace, vec3(13.7, 7.1, 10.9)) + vSeed * 21.0));
                float crackB = 1.0 - abs(sin(dot(rockSpace, vec3(-8.3, 15.4, 6.7)) - vSeed * 17.0));
                float cracks = pow(max(crackA * crackB, 0.0), 4.2);
                float moltenField = broadNoise * 0.58 + mediumNoise * 0.31 + fineNoise * 0.11;
                float moltenPatches = smoothstep(0.46, 0.64, moltenField + vHeat * 0.11);
                moltenPatches *= smoothstep(0.08, 0.42, vHeat);
                float moltenMask = clamp(moltenPatches * 0.82 + cracks * 0.88, 0.0, 1.0);
                float scorchedNoise = hash31(floor(rockSpace * 8.0 + vSeed * 13.0));

                vec3 blackCrust = mix(vec3(0.009, 0.006, 0.005), vec3(0.12, 0.028, 0.008), scorchedNoise);
                vec3 emberRed = vec3(0.8, 0.025, 0.002);
                vec3 moltenOrange = vec3(1.0, 0.22, 0.008);
                vec3 moltenGold = vec3(1.0, 0.62, 0.095);
                vec3 whiteHot = vec3(1.0, 0.94, 0.66);
                vec3 color = blackCrust * (0.24 + diffuse * 0.72);
                vec3 moltenColor = mix(emberRed, moltenOrange, smoothstep(0.12, 0.68, vHeat));
                moltenColor = mix(moltenColor, moltenGold, smoothstep(0.68, 1.0, vHeat));
                float hottestPatches = smoothstep(0.76, 0.94, moltenField + vHeat * 0.18);
                moltenColor = mix(moltenColor, whiteHot, hottestPatches * vHeat * 0.72);
                color = mix(color, moltenColor * (0.92 + vHeat * 1.35), moltenMask);
                color += moltenGold * cracks * (0.38 + vHeat * 1.25);
                color += moltenOrange * rim * vHeat * 0.34;
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        transparent: false,
        depthTest: true,
        depthWrite: true,
        blending: THREE.NormalBlending,
    });
}

function createImpactRingMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uHeat: { value: 1 },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vLocalPosition;

            void main() {
                vUv = uv;
                vLocalPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uOpacity;
            uniform float uHeat;
            varying vec2 vUv;
            varying vec3 vLocalPosition;

            void main() {
                float angle = atan(vLocalPosition.y, vLocalPosition.x);
                float breakup = 0.78 + 0.22 * sin(angle * 11.0 - uTime * 9.0)
                    * sin(angle * 5.0 + uTime * 5.0);
                float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
                float core = pow(max(across, 0.0), 7.0);
                float halo = pow(max(across, 0.0), 1.4);
                vec3 orange = vec3(1.0, 0.12, 0.004);
                vec3 gold = vec3(1.0, 0.58, 0.075);
                vec3 whiteHot = vec3(1.0, 0.96, 0.78);
                vec3 color = mix(orange, gold, uHeat);
                color = mix(color, whiteHot, core * uHeat);
                float alpha = (halo * 0.035 + core * 0.22) * breakup * uOpacity;
                gl_FragColor = vec4(color * (halo * 0.08 + core * 0.72), alpha);
            }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
}

function createImpactTrailMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: `
            attribute float aLife;
            attribute float aHeat;
            attribute float aHead;
            varying float vLife;
            varying float vHeat;
            varying float vHead;

            void main() {
                vLife = aLife;
                vHeat = aHeat;
                vHead = aHead;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying float vLife;
            varying float vHeat;
            varying float vHead;

            void main() {
                vec3 deepRed = vec3(0.56, 0.008, 0.001);
                vec3 orange = vec3(1.0, 0.19, 0.006);
                vec3 gold = vec3(1.0, 0.7, 0.16);
                vec3 color = mix(deepRed, orange, smoothstep(0.08, 0.58, vHeat));
                color = mix(color, gold, smoothstep(0.62, 1.0, vHeat) * vHead);
                float alpha = vLife * mix(0.035, 0.38, vHead) * smoothstep(0.06, 0.32, vHeat);
                gl_FragColor = vec4(color * mix(0.34, 1.08, vHead), alpha);
            }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
}

export function createMeteorSystem({
    scene,
    camera,
    starTexture,
    eventHorizonRadius,
    photonRingRadius,
    isMobile,
    prefersReducedMotion,
    seedOffset = 0,
    initialDelay = 0.75,
    allowImpact = true,
}) {
    const random = createSeededRandom(0xA57E20 + (isMobile ? 17 : 41) + seedOffset * 997);
    const bodyRadius = isMobile ? 0.55 : 0.72;
    const bodyGeometry = createRockGeometry(bodyRadius, isMobile ? 1 : 2, random);
    const bodyMaterial = createRockMaterial();
    const meteorRoot = new THREE.Group();
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.frustumCulled = false;
    meteorRoot.add(bodyMesh);

    const glowMaterial = new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xff5a12,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
    });
    const glowSprite = new THREE.Sprite(glowMaterial);
    glowSprite.scale.setScalar(bodyRadius * 5.2);
    meteorRoot.add(glowSprite);

    const hotGlowMaterial = new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xffe1a3,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
    });
    const hotGlowSprite = new THREE.Sprite(hotGlowMaterial);
    hotGlowSprite.scale.setScalar(bodyRadius * 2.8);
    meteorRoot.add(hotGlowSprite);
    meteorRoot.visible = false;
    scene.add(meteorRoot);

    const trailSegmentCount = isMobile ? 22 : 36;
    const trailGeometry = createTrailGeometry(trailSegmentCount);
    const trailMaterial = createTrailMaterial();
    const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
    trailMesh.frustumCulled = false;
    trailMesh.renderOrder = 3;
    trailMesh.visible = false;
    scene.add(trailMesh);

    const debrisCount = isMobile ? 6 : 11;
    const debrisGeometry = createRockGeometry(bodyRadius * 0.37, 0, random);
    const debrisMaterial = createRockMaterial();
    const debrisMesh = new THREE.InstancedMesh(debrisGeometry, debrisMaterial, debrisCount);
    debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    debrisMesh.frustumCulled = false;
    debrisMesh.visible = false;
    scene.add(debrisMesh);

    const sparkCount = isMobile ? 10 : 16;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkLives = new Float32Array(sparkCount);
    const sparkSizes = new Float32Array(sparkCount);
    const sparkGeometry = new THREE.BufferGeometry();
    const sparkPositionAttribute = new THREE.BufferAttribute(sparkPositions, 3);
    const sparkLifeAttribute = new THREE.BufferAttribute(sparkLives, 1);
    const sparkSizeAttribute = new THREE.BufferAttribute(sparkSizes, 1);
    sparkPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    sparkLifeAttribute.setUsage(THREE.DynamicDrawUsage);
    sparkSizeAttribute.setUsage(THREE.DynamicDrawUsage);
    sparkGeometry.setAttribute('position', sparkPositionAttribute);
    sparkGeometry.setAttribute('aLife', sparkLifeAttribute);
    sparkGeometry.setAttribute('aSize', sparkSizeAttribute);
    const sparkMaterial = createSparkMaterial(isMobile);
    const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
    sparks.frustumCulled = false;
    sparks.renderOrder = 4;
    sparks.visible = false;
    scene.add(sparks);

    const impactChunkCount = isMobile ? 8 : 12;
    const impactLives = new Float32Array(impactChunkCount);
    const impactHeats = new Float32Array(impactChunkCount);
    const impactSeeds = new Float32Array(impactChunkCount);
    const impactGeometry = createRockGeometry(bodyRadius * 0.28, 1, random);
    const impactLifeAttribute = new THREE.InstancedBufferAttribute(impactLives, 1);
    const impactHeatAttribute = new THREE.InstancedBufferAttribute(impactHeats, 1);
    const impactSeedAttribute = new THREE.InstancedBufferAttribute(impactSeeds, 1);
    impactLifeAttribute.setUsage(THREE.DynamicDrawUsage);
    impactHeatAttribute.setUsage(THREE.DynamicDrawUsage);
    impactSeedAttribute.setUsage(THREE.DynamicDrawUsage);
    impactGeometry.setAttribute('aLife', impactLifeAttribute);
    impactGeometry.setAttribute('aHeat', impactHeatAttribute);
    impactGeometry.setAttribute('aSeed', impactSeedAttribute);
    const impactMaterial = createImpactChunkMaterial();
    const impactChunks = new THREE.InstancedMesh(impactGeometry, impactMaterial, impactChunkCount);
    impactChunks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    impactChunks.frustumCulled = false;
    impactChunks.renderOrder = 4;
    impactChunks.visible = false;
    scene.add(impactChunks);

    const impactTrailPositions = new Float32Array(impactChunkCount * 2 * 3);
    const impactTrailLives = new Float32Array(impactChunkCount * 2);
    const impactTrailHeats = new Float32Array(impactChunkCount * 2);
    const impactTrailHeads = new Float32Array(impactChunkCount * 2);
    for (let index = 0; index < impactChunkCount; index++) {
        impactTrailHeads[index * 2] = 0;
        impactTrailHeads[index * 2 + 1] = 1;
    }
    const impactTrailGeometry = new THREE.BufferGeometry();
    const impactTrailPositionAttribute = new THREE.BufferAttribute(impactTrailPositions, 3);
    const impactTrailLifeAttribute = new THREE.BufferAttribute(impactTrailLives, 1);
    const impactTrailHeatAttribute = new THREE.BufferAttribute(impactTrailHeats, 1);
    impactTrailPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    impactTrailLifeAttribute.setUsage(THREE.DynamicDrawUsage);
    impactTrailHeatAttribute.setUsage(THREE.DynamicDrawUsage);
    impactTrailGeometry.setAttribute('position', impactTrailPositionAttribute);
    impactTrailGeometry.setAttribute('aLife', impactTrailLifeAttribute);
    impactTrailGeometry.setAttribute('aHeat', impactTrailHeatAttribute);
    impactTrailGeometry.setAttribute('aHead', new THREE.BufferAttribute(impactTrailHeads, 1));
    const impactTrailMaterial = createImpactTrailMaterial();
    const impactTrails = new THREE.LineSegments(impactTrailGeometry, impactTrailMaterial);
    impactTrails.frustumCulled = false;
    impactTrails.renderOrder = 5;
    impactTrails.visible = false;
    scene.add(impactTrails);

    const impactFlashMaterial = new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xfff2cf,
        transparent: true,
        opacity: 0,
        blending: THREE.NormalBlending,
        depthTest: true,
        depthWrite: false,
    });
    const impactFlash = new THREE.Sprite(impactFlashMaterial);
    impactFlash.renderOrder = 7;
    impactFlash.visible = false;
    scene.add(impactFlash);

    const impactRingGeometry = new THREE.TorusGeometry(1, 0.12, isMobile ? 8 : 12, isMobile ? 48 : 80);
    const impactRingMaterial = createImpactRingMaterial();
    const impactRing = new THREE.Mesh(impactRingGeometry, impactRingMaterial);
    impactRing.frustumCulled = false;
    impactRing.renderOrder = 5;
    impactRing.visible = false;
    scene.add(impactRing);

    const debris = Array.from({ length: debrisCount }, () => ({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        spin: new THREE.Vector3(),
        scale: 0,
    }));
    const sparkVelocities = Array.from({ length: sparkCount }, () => new THREE.Vector3());
    const impactVelocities = Array.from({ length: impactChunkCount }, () => new THREE.Vector3());
    const impactPositions = Array.from({ length: impactChunkCount }, () => new THREE.Vector3());
    const impactRotations = Array.from({ length: impactChunkCount }, () => new THREE.Euler());
    const impactSpins = Array.from({ length: impactChunkCount }, () => new THREE.Vector3());
    const impactScales = new Float32Array(impactChunkCount);
    const impactLifeDurations = new Float32Array(impactChunkCount);
    const trailCenters = Array.from({ length: trailSegmentCount }, () => new THREE.Vector3());
    const dummy = new THREE.Object3D();
    const pathPoint = new THREE.Vector3();
    const previousPathPoint = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();
    const viewDirection = new THREE.Vector3();
    const gravityDirection = new THREE.Vector3();
    const heatDirectionView = new THREE.Vector3();
    const lastMeteorPosition = new THREE.Vector3();
    const inverseCameraQuaternion = new THREE.Quaternion();
    const impactNormal = new THREE.Vector3();
    const impactTangentA = new THREE.Vector3();
    const impactTangentB = new THREE.Vector3();
    const impactLateralDirection = new THREE.Vector3();
    const impactLaunchDirection = new THREE.Vector3();
    const impactReboundDirection = new THREE.Vector3();
    const impactCameraDirection = new THREE.Vector3();
    const impactPoint = new THREE.Vector3();
    const impactQuaternion = new THREE.Quaternion();

    let systemTime = 0;
    let nextEventTime = prefersReducedMotion ? 3.5 : initialDelay;
    let active = false;
    let eventAge = 0;
    let eventDuration = prefersReducedMotion ? 12 : (isMobile ? 7.8 : 7.1);
    let eventIndex = seedOffset;
    let eventSeed = 0;
    let eventSizeScale = 1.12;
    let currentBodyRadius = bodyRadius * eventSizeScale;
    let isGiantEvent = false;
    let startAngle = 0.2;
    let startHeight = 6;
    let orbitDirection = 1;
    let turnAmount = 2.45;
    let arcHeight = 1.2;
    let fractureStarted = false;
    let debrisAge = 0;
    let meteorSpeed = 0;
    let impactActive = false;
    let impactTriggered = false;
    let impactSparkBurstPending = false;
    let impactAge = 0;
    let impactEnergy = 0;

    function getPathPoint(progress, target) {
        const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
        const motion = Math.pow(clampedProgress, prefersReducedMotion ? 1.15 : 1.62);
        const captureStart = prefersReducedMotion ? 0.82 : 0.72;
        const approach = THREE.MathUtils.smoothstep(Math.min(motion / captureStart, 1), 0, 1);
        const capture = THREE.MathUtils.smoothstep(
            Math.max((motion - captureStart) / (1 - captureStart), 0),
            0,
            1,
        );
        const startRadius = isMobile ? 18 : 22;
        const safeOrbitRadius = photonRingRadius * 4.1;
        const closestRadius = prefersReducedMotion
            ? safeOrbitRadius
            : THREE.MathUtils.lerp(photonRingRadius * 1.14, eventHorizonRadius * 0.58, capture);
        const radius = motion < captureStart
            ? THREE.MathUtils.lerp(
                startRadius,
                prefersReducedMotion ? safeOrbitRadius : photonRingRadius * 1.14,
                approach,
            )
            : closestRadius;
        const angle = startAngle
            + orbitDirection * turnAmount * (approach * 0.63 + capture * 0.37);
        const y = THREE.MathUtils.lerp(startHeight, 0.08, Math.pow(motion, 0.78))
            + Math.sin(Math.PI * motion) * arcHeight * (1 - capture * 0.7);

        target.set(
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius,
        );
        return target;
    }

    function getPathTangent(progress, target) {
        getPathPoint(Math.max(0, progress - 0.003), previousPathPoint);
        getPathPoint(Math.min(1, progress + 0.003), pathPoint);
        return target.subVectors(pathPoint, previousPathPoint).normalize();
    }

    function updateHeatDirection(material, position) {
        gravityDirection.copy(position).multiplyScalar(-1);
        if (gravityDirection.lengthSq() < 0.0001) gravityDirection.set(0, 0, 1);
        gravityDirection.normalize();
        inverseCameraQuaternion.copy(camera.quaternion).invert();
        heatDirectionView.copy(gravityDirection).applyQuaternion(inverseCameraQuaternion);
        material.uniforms.uHeatDirection.value.copy(heatDirectionView);
    }

    function hideInstances() {
        for (let index = 0; index < debrisCount; index++) {
            dummy.position.set(0, 0, 0);
            dummy.scale.setScalar(0);
            dummy.updateMatrix();
            debrisMesh.setMatrixAt(index, dummy.matrix);
        }
        debrisMesh.instanceMatrix.needsUpdate = true;
    }

    function resetFragments() {
        fractureStarted = false;
        debrisAge = 0;
        debrisMesh.visible = false;
        sparks.visible = false;
        hideInstances();
        sparkLives.fill(0);
        sparkLifeAttribute.needsUpdate = true;
    }

    function resetImpact() {
        impactActive = false;
        impactTriggered = false;
        impactSparkBurstPending = false;
        impactAge = 0;
        impactEnergy = 0;
        impactLives.fill(0);
        impactLifeAttribute.needsUpdate = true;
        impactChunks.visible = false;
        impactTrails.visible = false;
        impactFlash.visible = false;
        impactRing.visible = false;
        impactFlashMaterial.opacity = 0;
        impactRingMaterial.uniforms.uOpacity.value = 0;
    }

    function spawnEvent() {
        eventSeed = random();
        const giantRoll = random();
        isGiantEvent = !prefersReducedMotion && (giantRoll > 0.9 || eventIndex % 8 === 3);
        if (isGiantEvent) {
            // Pick a world-space size that projects to roughly a quarter of the viewport near the black hole.
            const targetScreenCoverage = 0.235 + random() * 0.045;
            const cameraDistance = Math.max(camera.position.length(), 7.5);
            const halfFovTangent = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
            eventSizeScale = THREE.MathUtils.clamp(
                targetScreenCoverage * cameraDistance * halfFovTangent / bodyRadius,
                isMobile ? 2.1 : 1.85,
                isMobile ? 7.2 : 5.8,
            );
        } else {
            eventSizeScale = 1.12 + Math.pow(random(), 1.25) * 0.88;
        }
        currentBodyRadius = bodyRadius * eventSizeScale;
        startAngle = eventIndex % 2 === 0
            ? 0.18 + (random() - 0.5) * 0.34
            : Math.PI - 0.18 + (random() - 0.5) * 0.34;
        startHeight = (isMobile ? 4.8 : 6.2) + random() * (isMobile ? 1.6 : 2.4);
        orbitDirection = eventIndex % 2 === 0 ? 1 : -1;
        turnAmount = (prefersReducedMotion ? 0.72 : 2.25) + random() * (prefersReducedMotion ? 0.2 : 0.5);
        arcHeight = 0.75 + random() * 1.2;
        eventDuration = prefersReducedMotion ? 12 : (isMobile ? 7.5 : 6.8) + random() * 0.8;
        eventAge = 0;
        getPathPoint(0, lastMeteorPosition);
        meteorSpeed = 0;
        active = true;
        eventIndex++;
        meteorRoot.visible = true;
        trailMesh.visible = !prefersReducedMotion;
        resetFragments();
        resetImpact();
    }

    function startImpact(progress) {
        if (impactTriggered || prefersReducedMotion || !allowImpact) return;
        impactTriggered = true;
        impactActive = true;
        impactSparkBurstPending = true;
        impactAge = 0;
        getPathPoint(progress, pathPoint);
        getPathTangent(progress, tangent);

        impactNormal.copy(pathPoint).normalize();
        const emissionOffset = THREE.MathUtils.clamp(
            currentBodyRadius * 0.42,
            eventHorizonRadius * 0.22,
            eventHorizonRadius * 0.7,
        );
        impactPoint.copy(impactNormal).multiplyScalar(eventHorizonRadius + emissionOffset);
        impactCameraDirection.subVectors(camera.position, impactPoint).normalize();
        impactPoint.addScaledVector(
            impactCameraDirection,
            THREE.MathUtils.clamp(currentBodyRadius * 0.1, 0.06, 0.18),
        );
        impactTangentA.crossVectors(impactNormal, THREE.Object3D.DEFAULT_UP);
        if (impactTangentA.lengthSq() < 0.0001) impactTangentA.crossVectors(impactNormal, X_AXIS);
        impactTangentA.normalize();
        impactTangentB.crossVectors(impactNormal, impactTangentA).normalize();
        impactReboundDirection.copy(tangent).multiplyScalar(-1);
        impactReboundDirection.addScaledVector(
            impactNormal,
            -impactReboundDirection.dot(impactNormal),
        );
        if (impactReboundDirection.lengthSq() < 0.0001) {
            impactReboundDirection.copy(impactTangentA);
        } else {
            impactReboundDirection.normalize();
        }

        const sizeEnergy = THREE.MathUtils.clamp(eventSizeScale / 3.2, 0.35, 1.45);
        const speedEnergy = THREE.MathUtils.clamp(meteorSpeed / 16, 0.3, 1.2);
        impactEnergy = THREE.MathUtils.clamp(sizeEnergy * 0.55 + speedEnergy * 0.65, 0.45, 1.55);

        impactFlash.position.copy(impactPoint).addScaledVector(impactNormal, 0.08);
        impactFlash.scale.setScalar(currentBodyRadius * (1.85 + impactEnergy * 0.82));
        impactFlash.visible = true;

        impactRing.position.copy(impactPoint).addScaledVector(impactNormal, 0.035);
        impactQuaternion.setFromUnitVectors(Z_AXIS, impactNormal);
        impactRing.quaternion.copy(impactQuaternion);
        impactRing.scale.setScalar(currentBodyRadius * 0.35);
        impactRing.visible = true;
        impactRingMaterial.uniforms.uHeat.value = 1;

        for (let index = 0; index < impactChunkCount; index++) {
            const radialAngle = (index / impactChunkCount) * Math.PI * 2
                + (random() - 0.5) * 0.52;
            impactLateralDirection.copy(impactTangentA).multiplyScalar(Math.cos(radialAngle));
            impactLateralDirection.addScaledVector(impactTangentB, Math.sin(radialAngle));
            impactLateralDirection.normalize();
            const outwardForce = 0.92 + random() * 0.58;
            const lateralForce = 0.3 + random() * 0.62;
            const reboundForce = 0.18 + random() * 0.38;
            impactLaunchDirection.copy(impactNormal).multiplyScalar(outwardForce)
                .addScaledVector(impactLateralDirection, lateralForce)
                .addScaledVector(impactReboundDirection, reboundForce)
                .addScaledVector(impactCameraDirection, 0.08 + random() * 0.14)
                .normalize();
            const spawnSpread = currentBodyRadius * (0.05 + random() * 0.16);
            impactPositions[index].copy(impactPoint)
                .addScaledVector(impactLateralDirection, spawnSpread)
                .addScaledVector(impactNormal, currentBodyRadius * (0.04 + random() * 0.08));
            impactVelocities[index].copy(impactLaunchDirection).multiplyScalar(
                (3.4 + random() * 4.6) * (0.78 + impactEnergy * 0.46),
            );
            impactVelocities[index].addScaledVector(tangent, meteorSpeed * 0.02);
            impactLifeDurations[index] = 1.05 + random() * 1.25 + impactEnergy * 0.3;
            impactLives[index] = 1;
            impactHeats[index] = 0.82 + random() * 0.18;
            impactSeeds[index] = random();
            impactScales[index] = THREE.MathUtils.clamp(
                eventSizeScale * (0.48 + Math.pow(random(), 1.45) * 0.66),
                0.58,
                isMobile ? 3.6 : 4.4,
            );
            impactRotations[index].set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
            impactSpins[index].set(
                (random() - 0.5) * 8,
                (random() - 0.5) * 8,
                (random() - 0.5) * 8,
            );

            dummy.position.copy(impactPositions[index]);
            dummy.rotation.copy(impactRotations[index]);
            dummy.scale.setScalar(impactScales[index]);
            dummy.updateMatrix();
            impactChunks.setMatrixAt(index, dummy.matrix);

        }

        impactChunks.instanceMatrix.needsUpdate = true;
        impactLifeAttribute.needsUpdate = true;
        impactHeatAttribute.needsUpdate = true;
        impactSeedAttribute.needsUpdate = true;
        impactChunks.visible = true;
        impactTrails.visible = true;
    }

    function spawnImpactSparks() {
        impactSparkBurstPending = false;
        sparks.visible = true;

        for (let index = 0; index < sparkCount; index++) {
            const index3 = index * 3;
            const radialAngle = (index / sparkCount) * Math.PI * 2
                + (random() - 0.5) * 0.72;
            impactLateralDirection.copy(impactTangentA).multiplyScalar(Math.cos(radialAngle));
            impactLateralDirection.addScaledVector(impactTangentB, Math.sin(radialAngle));
            impactLateralDirection.normalize();
            impactLaunchDirection.copy(impactNormal).multiplyScalar(1.0 + random() * 0.8)
                .addScaledVector(impactLateralDirection, 0.34 + random() * 0.95)
                .addScaledVector(impactReboundDirection, 0.12 + random() * 0.32)
                .addScaledVector(impactCameraDirection, 0.06 + random() * 0.12)
                .normalize();

            pathPoint.copy(impactPoint)
                .addScaledVector(impactLateralDirection, currentBodyRadius * random() * 0.18)
                .addScaledVector(impactNormal, currentBodyRadius * (0.06 + random() * 0.12));
            sparkPositions[index3] = pathPoint.x;
            sparkPositions[index3 + 1] = pathPoint.y;
            sparkPositions[index3 + 2] = pathPoint.z;
            sparkLives[index] = 0.78 + random() * 0.22;
            sparkSizes[index] = THREE.MathUtils.clamp(
                eventSizeScale * (0.1 + random() * 0.2),
                0.12,
                isMobile ? 0.68 : 0.86,
            );
            sparkVelocities[index].copy(impactLaunchDirection).multiplyScalar(
                (5.2 + random() * 7.4) * (0.82 + impactEnergy * 0.28),
            );
        }

        sparkPositionAttribute.needsUpdate = true;
        sparkLifeAttribute.needsUpdate = true;
        sparkSizeAttribute.needsUpdate = true;
    }

    function updateImpact(dt, elapsedTime) {
        if (!impactActive) return;
        impactAge += dt;

        const flashFade = 1 - smoothstepRange(impactAge, 0.025, 0.17);
        impactFlashMaterial.opacity = flashFade * Math.min(0.42, 0.22 + impactEnergy * 0.1);
        impactFlash.scale.multiplyScalar(1 + dt * 1.8);
        impactFlash.visible = flashFade > 0.001;

        const ringProgress = smoothstepRange(impactAge, 0, 0.48);
        const ringFade = 1 - smoothstepRange(impactAge, 0.08, 0.58);
        impactRing.scale.setScalar(currentBodyRadius * (0.26 + ringProgress * (1.5 + impactEnergy * 0.35)));
        impactRingMaterial.uniforms.uTime.value = elapsedTime;
        impactRingMaterial.uniforms.uOpacity.value = ringFade * (0.18 + impactEnergy * 0.08);
        impactRingMaterial.uniforms.uHeat.value = 1 - ringProgress * 0.55;
        impactRing.visible = ringFade > 0.001;

        let chunksAlive = false;
        for (let index = 0; index < impactChunkCount; index++) {
            if (impactLives[index] <= 0) continue;
            chunksAlive = true;
            pathPoint.copy(impactPositions[index]);
            gravityDirection.copy(pathPoint).multiplyScalar(-1);
            const distance = Math.max(gravityDirection.length(), eventHorizonRadius * 0.62);
            gravityDirection.normalize();
            const gravitationalPull = 7.4 / Math.pow(distance, 0.78);
            impactVelocities[index].addScaledVector(gravityDirection, gravitationalPull * dt);
            impactVelocities[index].multiplyScalar(Math.exp(-dt * 0.14));
            pathPoint.addScaledVector(impactVelocities[index], dt);
            impactPositions[index].copy(pathPoint);

            impactLives[index] = Math.max(0, impactLives[index] - dt / impactLifeDurations[index]);
            const coolingRate = 0.42 + (1 - impactSeeds[index]) * 0.28;
            impactHeats[index] = Math.max(0, impactHeats[index] - dt * coolingRate);
            if (distance < eventHorizonRadius * 0.76) impactLives[index] *= 0.82;

            impactRotations[index].x += impactSpins[index].x * dt;
            impactRotations[index].y += impactSpins[index].y * dt;
            impactRotations[index].z += impactSpins[index].z * dt;
            const motionStretch = THREE.MathUtils.clamp(impactVelocities[index].length() * 0.07, 1, 1.7);
            const liveScale = impactScales[index] * smoothstepRange(impactLives[index], 0, 0.18);
            dummy.position.copy(pathPoint);
            dummy.rotation.copy(impactRotations[index]);
            dummy.scale.set(liveScale * motionStretch, liveScale, liveScale);
            dummy.quaternion.setFromUnitVectors(X_AXIS, viewDirection.copy(impactVelocities[index]).normalize());
            dummy.rotateX(impactRotations[index].x);
            dummy.rotateY(impactRotations[index].y);
            dummy.updateMatrix();
            impactChunks.setMatrixAt(index, dummy.matrix);

            const trailVertex = index * 2;
            const trailPosition = trailVertex * 3;
            const trailLength = THREE.MathUtils.clamp(
                impactVelocities[index].length() * (0.055 + impactHeats[index] * 0.05),
                0.12,
                currentBodyRadius * 0.52,
            );
            gravityDirection.copy(impactVelocities[index]).normalize();
            impactTrailPositions[trailPosition] = pathPoint.x - gravityDirection.x * trailLength;
            impactTrailPositions[trailPosition + 1] = pathPoint.y - gravityDirection.y * trailLength;
            impactTrailPositions[trailPosition + 2] = pathPoint.z - gravityDirection.z * trailLength;
            impactTrailPositions[trailPosition + 3] = pathPoint.x;
            impactTrailPositions[trailPosition + 4] = pathPoint.y;
            impactTrailPositions[trailPosition + 5] = pathPoint.z;
            impactTrailLives[trailVertex] = impactLives[index] * 0.62;
            impactTrailLives[trailVertex + 1] = impactLives[index];
            impactTrailHeats[trailVertex] = impactHeats[index] * 0.7;
            impactTrailHeats[trailVertex + 1] = impactHeats[index];
        }

        impactChunks.instanceMatrix.needsUpdate = true;
        impactLifeAttribute.needsUpdate = true;
        impactHeatAttribute.needsUpdate = true;
        impactChunks.visible = chunksAlive;
        impactTrailPositionAttribute.needsUpdate = true;
        impactTrailLifeAttribute.needsUpdate = true;
        impactTrailHeatAttribute.needsUpdate = true;
        impactTrails.visible = chunksAlive;

        if (!chunksAlive && flashFade <= 0.001 && ringFade <= 0.001) {
            impactActive = false;
            impactFlash.visible = false;
            impactRing.visible = false;
            impactChunks.visible = false;
            impactTrails.visible = false;
        }
    }

    function startFracture(progress) {
        if (fractureStarted || prefersReducedMotion) return;
        fractureStarted = true;
        debrisAge = 0;
        debrisMesh.visible = true;
        sparks.visible = true;
        getPathPoint(progress, pathPoint);
        getPathTangent(progress, tangent);

        for (let index = 0; index < debrisCount; index++) {
            const fragment = debris[index];
            fragment.position.copy(pathPoint).add(new THREE.Vector3(
                (random() - 0.5) * currentBodyRadius * 0.9,
                (random() - 0.5) * currentBodyRadius * 0.9,
                (random() - 0.5) * currentBodyRadius * 0.9,
            ));
            fragment.velocity.copy(tangent).multiplyScalar(2.3 + random() * 1.8);
            fragment.velocity.add(new THREE.Vector3(
                (random() - 0.5) * 1.3,
                (random() - 0.5) * 1.3,
                (random() - 0.5) * 1.3,
            ));
            fragment.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
            fragment.spin.set(
                (random() - 0.5) * 7,
                (random() - 0.5) * 7,
                (random() - 0.5) * 7,
            );
            fragment.scale = eventSizeScale * (0.46 + random() * 0.72);
        }

        for (let index = 0; index < sparkCount; index++) {
            const index3 = index * 3;
            sparkPositions[index3] = pathPoint.x + (random() - 0.5) * currentBodyRadius;
            sparkPositions[index3 + 1] = pathPoint.y + (random() - 0.5) * currentBodyRadius;
            sparkPositions[index3 + 2] = pathPoint.z + (random() - 0.5) * currentBodyRadius;
            sparkLives[index] = 0.6 + random() * 0.4;
            sparkSizes[index] = THREE.MathUtils.clamp(
                eventSizeScale * ((isMobile ? 0.16 : 0.2) + random() * 0.36),
                0.14,
                isMobile ? 0.82 : 1.05,
            );
            sparkVelocities[index].copy(tangent).multiplyScalar(2 + random() * 3.3);
            sparkVelocities[index].add(new THREE.Vector3(
                (random() - 0.5) * 2.4,
                (random() - 0.5) * 2.4,
                (random() - 0.5) * 2.4,
            ));
        }
        sparkPositionAttribute.needsUpdate = true;
        sparkLifeAttribute.needsUpdate = true;
        sparkSizeAttribute.needsUpdate = true;
    }

    function updateTrail(progress, heat, opacity, elapsedTime) {
        const positions = trailGeometry.attributes.position.array;
        const tailSpan = (0.21 + heat * 0.095) * THREE.MathUtils.lerp(1, eventSizeScale, 0.34);

        for (let segment = 0; segment < trailSegmentCount; segment++) {
            const tailProgress = segment / (trailSegmentCount - 1);
            getPathPoint(progress - tailProgress * tailSpan, trailCenters[segment]);
        }

        for (let segment = 0; segment < trailSegmentCount; segment++) {
            const center = trailCenters[segment];
            const before = trailCenters[Math.max(0, segment - 1)];
            const after = trailCenters[Math.min(trailSegmentCount - 1, segment + 1)];
            tangent.subVectors(before, after).normalize();
            viewDirection.subVectors(camera.position, center).normalize();
            side.crossVectors(tangent, viewDirection);
            if (side.lengthSq() < 0.0001) side.set(0, 1, 0);
            side.normalize();

            const tailProgress = segment / (trailSegmentCount - 1);
            const ripple = Math.sin(tailProgress * 19 + elapsedTime * 8 + eventSeed * 11)
                * currentBodyRadius * 0.055 * tailProgress;
            center.addScaledVector(side, ripple);
            const halfWidth = THREE.MathUtils.lerp(
                currentBodyRadius * (0.4 + heat * 0.3),
                currentBodyRadius * 0.018,
                Math.pow(tailProgress, 0.68),
            );
            const vertex = segment * 2;
            positions[vertex * 3] = center.x + side.x * halfWidth;
            positions[vertex * 3 + 1] = center.y + side.y * halfWidth;
            positions[vertex * 3 + 2] = center.z + side.z * halfWidth;
            positions[(vertex + 1) * 3] = center.x - side.x * halfWidth;
            positions[(vertex + 1) * 3 + 1] = center.y - side.y * halfWidth;
            positions[(vertex + 1) * 3 + 2] = center.z - side.z * halfWidth;
        }

        trailGeometry.attributes.position.needsUpdate = true;
        trailMaterial.uniforms.uTime.value = elapsedTime;
        trailMaterial.uniforms.uHeat.value = heat;
        trailMaterial.uniforms.uOpacity.value = opacity * smoothstepRange(progress, 0.08, 0.2);
    }

    function updateFragments(dt) {
        if (!fractureStarted) return;
        debrisAge += dt;
        const fragmentFade = 1 - THREE.MathUtils.smoothstep(debrisAge, 0.85, 2.15);
        debrisMaterial.uniforms.uTime.value = systemTime;
        debrisMaterial.uniforms.uHeat.value = Math.max(0.28, 1 - debrisAge * 0.24);
        debrisMaterial.uniforms.uOpacity.value = fragmentFade;
        if (debrisCount > 0) updateHeatDirection(debrisMaterial, debris[0].position);

        for (let index = 0; index < debrisCount; index++) {
            const fragment = debris[index];
            gravityDirection.copy(fragment.position).multiplyScalar(-1);
            const distance = Math.max(gravityDirection.length(), eventHorizonRadius * 0.55);
            gravityDirection.normalize();
            fragment.velocity.addScaledVector(gravityDirection, dt * 4.8 / Math.pow(distance, 0.72));
            fragment.position.addScaledVector(fragment.velocity, dt);
            fragment.rotation.x += fragment.spin.x * dt;
            fragment.rotation.y += fragment.spin.y * dt;
            fragment.rotation.z += fragment.spin.z * dt;
            const tidalStretch = 1 + Math.max(0, 2.2 - distance) * 0.38;
            const scale = fragment.scale * fragmentFade;
            dummy.position.copy(fragment.position);
            dummy.rotation.copy(fragment.rotation);
            dummy.scale.set(scale * tidalStretch, scale, scale);
            dummy.updateMatrix();
            debrisMesh.setMatrixAt(index, dummy.matrix);
        }
        debrisMesh.instanceMatrix.needsUpdate = true;

        let sparksAlive = false;
        for (let index = 0; index < sparkCount; index++) {
            if (sparkLives[index] <= 0) continue;
            sparksAlive = true;
            const index3 = index * 3;
            pathPoint.set(
                sparkPositions[index3],
                sparkPositions[index3 + 1],
                sparkPositions[index3 + 2],
            );
            gravityDirection.copy(pathPoint).multiplyScalar(-1);
            const distance = Math.max(gravityDirection.length(), 0.8);
            gravityDirection.normalize();
            sparkVelocities[index].addScaledVector(gravityDirection, dt * 3.4 / Math.pow(distance, 0.7));
            pathPoint.addScaledVector(sparkVelocities[index], dt);
            sparkPositions[index3] = pathPoint.x;
            sparkPositions[index3 + 1] = pathPoint.y;
            sparkPositions[index3 + 2] = pathPoint.z;
            sparkLives[index] = Math.max(0, sparkLives[index] - dt * 0.56);
        }
        sparkPositionAttribute.needsUpdate = true;
        sparkLifeAttribute.needsUpdate = true;
        sparks.visible = sparksAlive;

        if (fragmentFade <= 0.001) {
            debrisMesh.visible = false;
            sparks.visible = false;
            if (!active) fractureStarted = false;
        }
    }

    function smoothstepRange(value, edge0, edge1) {
        return THREE.MathUtils.smoothstep(value, edge0, edge1);
    }

    function update(dt, elapsedTime) {
        systemTime += dt;

        if (!active && systemTime >= nextEventTime) {
            spawnEvent();
        }

        if (!active) {
            updateFragments(dt);
            updateImpact(dt, elapsedTime);
            return;
        }

        eventAge += dt;
        const progress = THREE.MathUtils.clamp(eventAge / eventDuration, 0, 1);
        getPathPoint(progress, pathPoint);
        const instantaneousSpeed = pathPoint.distanceTo(lastMeteorPosition) / Math.max(dt, 0.001);
        meteorSpeed += (instantaneousSpeed - meteorSpeed) * Math.min(1, dt * 7.5);
        lastMeteorPosition.copy(pathPoint);
        getPathTangent(progress, tangent);
        meteorRoot.position.copy(pathPoint);
        meteorRoot.quaternion.setFromUnitVectors(X_AXIS, tangent);

        const collisionRadius = eventHorizonRadius * 1.03
            + currentBodyRadius * (isGiantEvent ? 0.42 : 0.54);
        if (allowImpact && !impactTriggered && progress > 0.68 && pathPoint.length() <= collisionRadius) {
            startImpact(progress);
        }

        const progressHeat = smoothstepRange(progress, 0.28, 0.8);
        const speedHeat = smoothstepRange(meteorSpeed, 1.5, 10.5);
        const heat = prefersReducedMotion
            ? smoothstepRange(progress, 0.35, 0.88) * 0.35
            : Math.min(1, progressHeat * 0.72 + speedHeat * 0.48);
        const fractureProgress = prefersReducedMotion ? 0 : smoothstepRange(progress, 0.73, 0.86);
        const horizonFade = 1 - smoothstepRange(progress, 0.9, 1.0);
        const impactBodyFade = impactTriggered ? 1 - smoothstepRange(impactAge, 0.015, 0.34) : 1;
        const bodyOpacity = (1 - fractureProgress) * horizonFade * impactBodyFade;
        const stretch = prefersReducedMotion ? 0 : smoothstepRange(progress, 0.68, 0.9);
        const tidalStretch = stretch * (isGiantEvent ? 0.66 : 1);
        meteorRoot.scale.set(
            eventSizeScale * (1 + tidalStretch * 1.8),
            eventSizeScale * (1 - tidalStretch * 0.22),
            eventSizeScale * (1 - tidalStretch * 0.22),
        );
        bodyMesh.rotation.x += dt * (1.35 + eventSeed * 1.4);
        bodyMesh.rotation.y += dt * (1.9 + eventSeed * 1.1);
        bodyMesh.rotation.z += dt * 0.72;
        bodyMaterial.uniforms.uTime.value = elapsedTime;
        bodyMaterial.uniforms.uHeat.value = heat;
        bodyMaterial.uniforms.uOpacity.value = bodyOpacity;
        updateHeatDirection(bodyMaterial, pathPoint);
        glowMaterial.opacity = bodyOpacity * heat * (0.16 + heat * 0.3);
        glowSprite.scale.setScalar(bodyRadius * (4.5 + heat * 3.0));
        hotGlowMaterial.opacity = bodyOpacity * Math.pow(heat, 1.7) * 0.42;
        hotGlowSprite.scale.setScalar(bodyRadius * (2.4 + heat * 1.45));

        updateTrail(
            progress,
            heat,
            horizonFade * impactBodyFade * (0.35 + heat * 0.65),
            elapsedTime,
        );

        if (progress >= 0.75) {
            startFracture(progress);
        }
        if (impactSparkBurstPending) {
            spawnImpactSparks();
        }
        updateFragments(dt);
        updateImpact(dt, elapsedTime);

        if (progress >= 1) {
            active = false;
            meteorRoot.visible = false;
            trailMesh.visible = false;
            const quietTime = isMobile ? 2.35 + random() * 0.7 : 2.05 + random() * 0.65;
            nextEventTime = systemTime + (prefersReducedMotion ? 18 : quietTime);
        }
    }

    function dispose() {
        scene.remove(
            meteorRoot,
            trailMesh,
            debrisMesh,
            sparks,
            impactChunks,
            impactTrails,
            impactFlash,
            impactRing,
        );
        bodyGeometry.dispose();
        bodyMaterial.dispose();
        glowMaterial.dispose();
        hotGlowMaterial.dispose();
        trailGeometry.dispose();
        trailMaterial.dispose();
        debrisGeometry.dispose();
        debrisMaterial.dispose();
        sparkGeometry.dispose();
        sparkMaterial.dispose();
        impactGeometry.dispose();
        impactMaterial.dispose();
        impactTrailGeometry.dispose();
        impactTrailMaterial.dispose();
        impactFlashMaterial.dispose();
        impactRingGeometry.dispose();
        impactRingMaterial.dispose();
    }

    hideInstances();

    return {
        update,
        dispose,
    };
}
