import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createMeteorSystem } from './meteorSystem.js';
import { createScreenMeteorSystem } from './screenMeteorSystem.js';

const defaultRequestFrame = (callback) => {
    if (typeof globalThis.requestAnimationFrame === 'function') {
        return globalThis.requestAnimationFrame(callback);
    }
    return globalThis.setTimeout(callback, 1000 / 60);
};

const defaultCancelFrame = (frameId) => {
    if (typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(frameId);
    } else {
        globalThis.clearTimeout(frameId);
    }
};

export function createBlackHoleEngine({
    canvas,
    width,
    height,
    devicePixelRatio = 1,
    isMobile = width < 768,
    isTablet = width >= 768 && width < 1024,
    prefersReducedMotion = false,
    initialInput = {},
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    onScreenImpact = null,
}) {
if (!canvas) throw new Error('Black hole canvas is required.');

/* =====================================================================
 * CONFIG — Mọi hằng số điều chỉnh đều ở đây
 * ===================================================================== */
const CONFIG = {
    blackHole: {
        eventHorizonRadius: 1.2,
        diskInnerRadius: 1.6,
        diskOuterRadius: 7.5,
        diskTilt: Math.PI * 0.5,
        photonRingRadius: 1.45,
        lensingRingRadius: 1.65,
    },
    colors: {
        diskInner: [1.0, 0.95, 0.85],
        diskMid1: [1.0, 0.6, 0.1],
        diskMid2: [0.9, 0.25, 0.05],
        diskOuter1: [0.5, 0.1, 0.8],
        diskOuter2: [0.1, 0.1, 0.5],
    },
    rotation: {
        baseSpeed: prefersReducedMotion ? 0.0001 : 0.0003,
        maxBoost: prefersReducedMotion ? 0.003 : 0.032,
        boostMultiplier: 0.0035,
    },
    camera: {
        fov: 60,
        zFar: 22,
        zNear: prefersReducedMotion ? 14 : 7.2,
        yFar: 8,
        yNear: prefersReducedMotion ? 5 : 2.7,
        lerpPow: 0.97,
        scrollPunch: prefersReducedMotion ? 0.4 : 2.4,
    },
    bloom: {
        strength: isMobile ? 0.45 : isTablet ? 0.65 : 0.82,
        strengthMax: isMobile ? 0.65 : isTablet ? 0.88 : 1.08,
        radius: isMobile ? 0.18 : isTablet ? 0.26 : 0.32,
        threshold: isMobile ? 0.92 : 0.9,
    },
    parallax: {
        strength: prefersReducedMotion ? 0.06 : (isMobile ? 0 : 0.3),
        lerp: 0.03,
    },
    particles: {
        galaxy: isMobile ? 12000 : isTablet ? 60000 : 150000,
        farStars: isMobile ? 500 : isTablet ? 1200 : 2500,
        midDust: isMobile ? 250 : isTablet ? 600 : 1500,
        nearDust: isMobile ? 30 : isTablet ? 150 : 350,
        orbital: isMobile ? 30 : isTablet ? 80 : 160,
        lightRays: isMobile ? 4 : isTablet ? 7 : 10,
        lightRaySegments: isMobile ? 40 : isTablet ? 64 : 96,
    },
    galaxy: {
        radius: 17,
        branches: 2,
        spin: 1.8,
        randomness: 0.6,
        randomnessPower: 3.5,
        particleSize: isMobile ? 0.024 : 0.015,
    },
    lightRibbons: {
        // Shared by desktop and mobile: edit once and both layouts update.
        outerWidth: isMobile ? 0.88 : 0.74,
        innerWidth: 0.045,
        startRadius: 15.0,
        radiusVariation: 12.0,
        taperPower: 0.92,
        widthVariation: 0.2,
    },
};

/* =====================================================================
 * SETUP — Canvas, Scene, Camera, Renderer
 * ===================================================================== */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.018);

const sizes = { width, height, devicePixelRatio };

const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, sizes.width / sizes.height, 0.1, 200);
camera.position.set(0, CONFIG.camera.yFar, CONFIG.camera.zFar);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: 'high-performance'
});
renderer.setSize(sizes.width, sizes.height, false);
renderer.setPixelRatio(Math.min(sizes.devicePixelRatio, isMobile ? 1.0 : (isTablet ? 1.25 : 1.5)));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;

/* =====================================================================
 * POST-PROCESSING — EffectComposer + UnrealBloomPass
 * ===================================================================== */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomResolution = isMobile
    ? new THREE.Vector2(Math.round(sizes.width * 0.5), Math.round(sizes.height * 0.5))
    : new THREE.Vector2(sizes.width, sizes.height);
const bloomPass = new UnrealBloomPass(
    bloomResolution,
    CONFIG.bloom.strength,
    CONFIG.bloom.radius,
    CONFIG.bloom.threshold
);
composer.addPass(bloomPass);

/* =====================================================================
 * STAR TEXTURE
 * ===================================================================== */
const createStarTexture = () => {
    const c = typeof OffscreenCanvas === 'function'
        ? new OffscreenCanvas(32, 32)
        : document.createElement('canvas');
    c.width = 32; c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.1, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
};
const starTexture = createStarTexture();

/* =====================================================================
 * SIMPLEX NOISE GLSL — Embedded for shaders
 * ===================================================================== */
const NOISE_GLSL = `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
        const vec2 C=vec2(1.0/6.0,1.0/3.0);
        const vec4 D=vec4(0.0,0.5,1.0,2.0);
        vec3 i=floor(v+dot(v,C.yyy));
        vec3 x0=v-i+dot(i,C.xxx);
        vec3 g=step(x0.yzx,x0.xyz);
        vec3 l=1.0-g;
        vec3 i1=min(g.xyz,l.zxy);
        vec3 i2=max(g.xyz,l.zxy);
        vec3 x1=x0-i1+C.xxx;
        vec3 x2=x0-i2+C.yyy;
        vec3 x3=x0-D.yyy;
        i=mod289(i);
        vec4 p=permute(permute(permute(
            i.z+vec4(0.0,i1.z,i2.z,1.0))
            +i.y+vec4(0.0,i1.y,i2.y,1.0))
            +i.x+vec4(0.0,i1.x,i2.x,1.0));
        float n_=0.142857142857;
        vec3 ns=n_*D.wyz-D.xzx;
        vec4 j=p-49.0*floor(p*ns.z*ns.z);
        vec4 x_=floor(j*ns.z);
        vec4 y_=floor(j-7.0*x_);
        vec4 x=x_*ns.x+ns.yyyy;
        vec4 y=y_*ns.x+ns.yyyy;
        vec4 h=1.0-abs(x)-abs(y);
        vec4 b0=vec4(x.xy,y.xy);
        vec4 b1=vec4(x.zw,y.zw);
        vec4 s0=floor(b0)*2.0+1.0;
        vec4 s1=floor(b1)*2.0+1.0;
        vec4 sh=-step(h,vec4(0.0));
        vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
        vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
        vec3 p0=vec3(a0.xy,h.x);
        vec3 p1=vec3(a0.zw,h.y);
        vec3 p2=vec3(a1.xy,h.z);
        vec3 p3=vec3(a1.zw,h.w);
        vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
        vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
        m=m*m;
        return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
`;

/* =====================================================================
 * BLACK HOLE GROUP
 * ===================================================================== */
const blackHoleGroup = new THREE.Group();
scene.add(blackHoleGroup);

/* ----- EVENT HORIZON — Black sphere with light-suction effect ----- */
const ehSegments = isMobile ? 48 : 96;
const eventHorizonGeo = new THREE.SphereGeometry(CONFIG.blackHole.eventHorizonRadius, ehSegments, ehSegments);
const eventHorizonMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uScrollEnergy: { value: 0 },
    },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main(){
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mvPos.xyz);
            gl_Position = projectionMatrix * mvPos;
        }
    `,
    fragmentShader: `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uScrollEnergy;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main(){
            // How much this fragment faces the camera edge (rim)
            float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);

            // --- LIGHT SUCTION STREAMS ---
            // Spherical coordinates for surface flow
            float theta = atan(vWorldPos.z, vWorldPos.x); // horizontal angle
            float phi = asin(clamp(vWorldPos.y / ${CONFIG.blackHole.eventHorizonRadius.toFixed(1)}, -1.0, 1.0)); // vertical angle

            // Multiple swirling streams being "sucked in" from the rim toward the center
            // They spiral inward using fresnel (edge→center = 1→0)
            float swirlSpeed = uTime * (1.35 + uScrollEnergy * 4.0);
            float stream1 = sin(theta * 5.0 + phi * 3.0 - swirlSpeed + fresnel * 8.0) * 0.5 + 0.5;
            stream1 = pow(stream1, 6.0);
            float stream2 = sin(theta * 3.0 - phi * 5.0 + swirlSpeed * 0.7 + fresnel * 10.0) * 0.5 + 0.5;
            stream2 = pow(stream2, 5.0);
            float stream3 = sin(theta * 8.0 + phi * 2.0 + swirlSpeed * 1.3 - fresnel * 6.0) * 0.5 + 0.5;
            stream3 = pow(stream3, 7.0);

            // Noise for organic distortion
            float n = snoise(vec3(theta * 2.0 + uTime * 0.5, phi * 2.0, fresnel * 3.0 + uTime * 0.3));

            // --- SUCTION INTENSITY ---
            // Strongest at the rim (fresnel ~1), fading toward center
            float rimPower = pow(fresnel, 2.5);
            // Also add a narrower bright edge
            float sharpRim = pow(fresnel, 8.0);

            // Combine streams — only visible near the rim
            float streams = (stream1 * 0.4 + stream2 * 0.35 + stream3 * 0.25) * rimPower;
            streams += n * 0.15 * rimPower;

            // --- COLORS ---
            // Warm suction glow: gold/orange at edge being pulled into darkness
            vec3 suctionColor1 = vec3(1.0, 0.7, 0.2);  // Gold
            vec3 suctionColor2 = vec3(0.6, 0.2, 0.8);  // Purple
            vec3 suctionColor3 = vec3(0.2, 0.4, 1.0);  // Blue

            vec3 streamColor = mix(suctionColor1, suctionColor2, sin(theta * 3.0 + uTime) * 0.5 + 0.5);
            streamColor = mix(streamColor, suctionColor3, stream3 * 0.5);

            // Subtle rim glow (always visible, like light bending around)
            float pulse = 0.85 + 0.15 * sin(uTime * 2.0 + theta * 2.0);
            vec3 rimGlow = mix(vec3(0.3, 0.15, 0.5), vec3(0.15, 0.25, 0.6), fresnel) * sharpRim * 0.4 * pulse;

            // Final color: black center + streams being sucked in + rim glow
            vec3 finalColor = streamColor * streams * (0.42 + uScrollEnergy * 0.16) + rimGlow * 0.68;

            // Center is pure black, edge has the suction effect
            float alpha = 1.0; // Fully opaque — the black center absorbs everything
            gl_FragColor = vec4(finalColor, alpha);
        }
    `,
    side: THREE.FrontSide,
});
const eventHorizon = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
blackHoleGroup.add(eventHorizon);

/* ----- ACCRETION DISK — Main horizontal disk with organic turbulence ----- */
const diskSegsR = isMobile ? 80 : 160;
const diskSegsT = isMobile ? 40 : 80;
const accretionDiskGeo = new THREE.RingGeometry(
    CONFIG.blackHole.diskInnerRadius,
    CONFIG.blackHole.diskOuterRadius,
    diskSegsR, diskSegsT
);
const accretionDiskMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uScrollEnergy: { value: 0 },
    },
    vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vRadius;
        varying float vAngle;
        void main(){
            vUv = uv;
            vRadius = length(position.xy);
            vAngle = atan(position.y, position.x);
            vec3 pos = position;
            // Subtle wave distortion near center
            float normR = (vRadius - ${CONFIG.blackHole.diskInnerRadius.toFixed(1)}) / ${(CONFIG.blackHole.diskOuterRadius - CONFIG.blackHole.diskInnerRadius).toFixed(1)};
            float wave = sin(vAngle * 6.0 + uTime * 1.2 + vRadius * 2.0) * 0.08;
            wave += cos(vAngle * 3.0 - uTime * 0.6 + vRadius * 3.5) * 0.04;
            pos.z += wave * (1.0 - smoothstep(0.0, 0.5, normR));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        ${NOISE_GLSL}
        uniform float uTime;
        uniform float uScrollEnergy;
        varying vec2 vUv;
        varying float vRadius;
        varying float vAngle;
        void main(){
            float innerR = ${CONFIG.blackHole.diskInnerRadius.toFixed(1)};
            float outerR = ${CONFIG.blackHole.diskOuterRadius.toFixed(1)};
            float r = clamp((vRadius - innerR) / (outerR - innerR), 0.0, 1.0);

            // Kepler rotation speed — much faster near center
            float keplerSpeed = 1.0 / pow(max(r, 0.01) + 0.05, 1.5);
            float spinAngle = vAngle + uTime * keplerSpeed * (0.16 + uScrollEnergy * 0.16);

            // Multi-octave turbulence for organic look
            float n1 = snoise(vec3(spinAngle * 1.5, r * 3.0 + uTime * 0.25, uTime * 0.08));
            float n2 = snoise(vec3(spinAngle * 4.0 + 37.0, r * 7.0 - uTime * 0.15, uTime * 0.12 + 15.0));
            float n3 = snoise(vec3(spinAngle * 8.0 + 73.0, r * 14.0 + uTime * 0.08, 35.0));
            float n4 = snoise(vec3(spinAngle * 16.0 + 111.0, r * 20.0 - uTime * 0.05, 60.0));
            float turbulence = n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1;

            // Smooth 5-stop color gradient — no harsh transitions
            vec3 cWhiteHot = vec3(1.0, 0.97, 0.92);
            vec3 cGold = vec3(1.0, 0.75, 0.25);
            vec3 cDeepOrange = vec3(0.95, 0.35, 0.08);
            vec3 cPurple = vec3(0.55, 0.12, 0.75);
            vec3 cDeepBlue = vec3(0.12, 0.08, 0.45);

            vec3 color;
            float s = smoothstep(0.0, 0.05, r);
            if(r < 0.05){
                color = mix(cWhiteHot, cGold, r / 0.05);
            } else if(r < 0.12){
                color = mix(cGold, cDeepOrange, (r - 0.05) / 0.07);
            } else if(r < 0.65){
                color = mix(cDeepOrange, cPurple, (r - 0.12) / 0.53);
            } else {
                color = mix(cPurple, cDeepBlue, (r - 0.65) / 0.35);
            }

            // Organic brightness variation from turbulence
            float brightness = 0.36 + turbulence * 0.32;

            // Flowing gas streams (spiral streaks)
            float stream1 = sin(spinAngle * 10.0 + r * 18.0 + turbulence * 3.0) * 0.5 + 0.5;
            stream1 = pow(stream1, 5.0);
            float stream2 = sin(spinAngle * 6.0 - r * 12.0 + uTime * 0.5) * 0.5 + 0.5;
            stream2 = pow(stream2, 4.0);
            brightness += (stream1 * 0.2 + stream2 * 0.12) * (1.0 - r);

            // Intense inner glow
            float innerGlow = exp(-r * 8.0);
            color = color * brightness + cWhiteHot * innerGlow * 0.42;

            // Hot bright flashes near center
            float flash = pow(max(sin(spinAngle * 15.0 + uTime * 2.5 + turbulence * 5.0), 0.0), 10.0);
            color += cWhiteHot * flash * innerGlow * 0.28;

            // A darker gravitational moat keeps the event horizon visually dominant.
            float gravityShadow = mix(0.48, 1.0, smoothstep(0.02, 0.24, r));
            color *= gravityShadow * 0.82;

            // Alpha — smooth organic fade, gradual dissolve at outer edge
            float alphaInner = smoothstep(0.0, 0.04, r);
            float alphaOuter = 1.0 - smoothstep(0.55, 1.0, r);
            float alphaFlow = 0.42 + turbulence * 0.25 + stream1 * 0.18;
            float alpha = alphaInner * alphaOuter * alphaFlow;

            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});
const accretionDisk = new THREE.Mesh(accretionDiskGeo, accretionDiskMat);
accretionDisk.rotation.x = CONFIG.blackHole.diskTilt;
blackHoleGroup.add(accretionDisk);

/* ----- INNER GLOW RING — Bright thin ring at event horizon edge ----- */
const innerGlowGeo = new THREE.TorusGeometry(CONFIG.blackHole.eventHorizonRadius * 1.15, 0.04, 16, 128);
const innerGlowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main(){
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mvPos.xyz);
            gl_Position = projectionMatrix * mvPos;
        }
    `,
    fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main(){
            float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
            rim = pow(rim, 1.2);
            float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
            vec3 color = vec3(1.0, 0.82, 0.48) * pulse * 0.82;
            float alpha = rim * 0.62 * pulse;
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
});
const innerGlowRing = new THREE.Mesh(innerGlowGeo, innerGlowMat);
innerGlowRing.rotation.x = CONFIG.blackHole.diskTilt;
blackHoleGroup.add(innerGlowRing);

/* ----- EINSTEIN RING / VERTICAL LENSING ARC —
       This is the KEY element of the "Interstellar" look!
       Light from the back of the accretion disk is bent by gravity
       up and over the top of the black hole, creating a bright arc.
       Implemented as a large ring perpendicular to the main disk. ----- */
const einsteinRingGeo = new THREE.TorusGeometry(
    CONFIG.blackHole.eventHorizonRadius * 1.25, 0.18, 24, 128
);
const einsteinRingMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying float vAngle;
        void main(){
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mvPos.xyz);
            vWorldPos = position;
            vAngle = atan(position.z, position.x);
            gl_Position = projectionMatrix * mvPos;
        }
    `,
    fragmentShader: `
        ${NOISE_GLSL}
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying float vAngle;
        void main(){
            float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
            rim = pow(rim, 1.5);

            // Flowing turbulence along the ring
            float flow = snoise(vec3(vAngle * 3.0 + uTime * 0.8, vWorldPos.y * 4.0, uTime * 0.15));
            float flow2 = snoise(vec3(vAngle * 7.0 - uTime * 0.5, vWorldPos.y * 8.0 + 20.0, uTime * 0.1 + 30.0));
            float turbulence = flow * 0.6 + flow2 * 0.4;

            float pulse = 0.8 + 0.2 * sin(uTime * 2.0 + vAngle * 2.0);

            // Color gradient along ring — warm gold to orange
            vec3 cGold = vec3(1.0, 0.85, 0.4);
            vec3 cOrange = vec3(1.0, 0.55, 0.15);
            vec3 cPurple = vec3(0.6, 0.25, 0.7);
            vec3 color = mix(cGold, cOrange, sin(vAngle * 3.0 + uTime * 0.5) * 0.5 + 0.5);
            color = mix(color, cPurple, max(turbulence * 0.3, 0.0));
            color *= (0.7 + turbulence * 0.3) * pulse * 0.82;

            // Bright hot spots
            float hotspot = pow(max(sin(vAngle * 8.0 + uTime * 1.5), 0.0), 6.0);
            color += vec3(1.0, 0.95, 0.8) * hotspot * 0.22;

            float alpha = rim * 0.66 * pulse * (0.7 + turbulence * 0.3);
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
});
const einsteinRing = new THREE.Mesh(einsteinRingGeo, einsteinRingMat);
// Perpendicular to the main disk — goes OVER the top of the black hole
einsteinRing.rotation.z = Math.PI * 0.5;
einsteinRing.rotation.x = CONFIG.blackHole.diskTilt;
blackHoleGroup.add(einsteinRing);

/* ----- SECONDARY LENSING ARC — Slightly offset for depth ----- */
const lensArc2Geo = new THREE.TorusGeometry(
    CONFIG.blackHole.eventHorizonRadius * 1.3, 0.1, 16, 128
);
const lensArc2Mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying float vAngle;
        void main(){
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mvPos.xyz);
            vAngle = atan(position.z, position.x);
            gl_Position = projectionMatrix * mvPos;
        }
    `,
    fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying float vAngle;
        void main(){
            float rim = 1.0 - max(dot(vNormal, vViewDir), 0.0);
            rim = pow(rim, 2.0);
            float pulse = 0.7 + 0.3 * sin(uTime * 1.5 + vAngle * 3.0);
            vec3 color = mix(vec3(0.9, 0.65, 0.2), vec3(0.5, 0.2, 0.7),
                sin(vAngle * 5.0 + uTime * 0.8) * 0.5 + 0.5) * pulse * 0.8;
            float alpha = rim * 0.5 * pulse;
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
});
const lensArc2 = new THREE.Mesh(lensArc2Geo, lensArc2Mat);
// Slightly different angle for parallax depth
lensArc2.rotation.z = Math.PI * 0.5;
lensArc2.rotation.x = CONFIG.blackHole.diskTilt - 0.08;
lensArc2.rotation.y = 0.05;
blackHoleGroup.add(lensArc2);

/* =====================================================================
 * GALAXY SPIRAL PARTICLES
 * ===================================================================== */
const galaxyGeo = new THREE.BufferGeometry();
const gCount = CONFIG.particles.galaxy;
const gPositions = new Float32Array(gCount * 3);
const gColors = new Float32Array(gCount * 3);

const cInside = new THREE.Color('#ffffff');
const cPurple = new THREE.Color('#8a2be2');
const cCyan = new THREE.Color('#4488ff');
const cMid = new THREE.Color('#F1D89E');
const cOutside = new THREE.Color('#000000');

for (let i = 0; i < gCount; i++) {
    const i3 = i * 3;
    const radius = Math.pow(Math.random(), 1.3) * CONFIG.galaxy.radius;
    const spinAngle = Math.pow(radius, 0.8) * CONFIG.galaxy.spin;
    const branchAngle = ((i % CONFIG.galaxy.branches) / CONFIG.galaxy.branches) * Math.PI * 2;
    const scatter = CONFIG.galaxy.randomness * radius;
    const rp = CONFIG.galaxy.randomnessPower;

    const rx = Math.pow(Math.random(), rp) * (Math.random() < 0.5 ? 1 : -1) * scatter;
    const ry = Math.pow(Math.random(), rp) * (Math.random() < 0.5 ? 1 : -1) * scatter * 0.12;
    const rz = Math.pow(Math.random(), rp) * (Math.random() < 0.5 ? 1 : -1) * scatter;

    gPositions[i3] = Math.cos(branchAngle + spinAngle) * radius + rx;
    gPositions[i3 + 1] = ry;
    gPositions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + rz;

    const ratio = radius / CONFIG.galaxy.radius;
    const mc = new THREE.Color();
    if (ratio < 0.08) mc.copy(cInside).lerp(cPurple, ratio / 0.08);
    else if (ratio < 0.20) mc.copy(cPurple).lerp(cCyan, (ratio - 0.08) / 0.12);
    else if (ratio < 0.40) mc.copy(cCyan).lerp(cMid, (ratio - 0.20) / 0.20);
    else mc.copy(cMid).lerp(cOutside, (ratio - 0.40) / 0.60);

    gColors[i3] = mc.r;
    gColors[i3 + 1] = mc.g;
    gColors[i3 + 2] = mc.b;
}
galaxyGeo.setAttribute('position', new THREE.BufferAttribute(gPositions, 3));
galaxyGeo.setAttribute('color', new THREE.BufferAttribute(gColors, 3));

const galaxyMat = new THREE.PointsMaterial({
    size: CONFIG.galaxy.particleSize,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    alphaMap: starTexture,
});
const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat);
scene.add(galaxyPoints);

/* =====================================================================
 * FAR STARS — Background stars very far away
 * ===================================================================== */
const farStarsGeo = new THREE.BufferGeometry();
const fsCount = CONFIG.particles.farStars;
const fsPos = new Float32Array(fsCount * 3);
const fsCol = new Float32Array(fsCount * 3);
for (let i = 0; i < fsCount; i++) {
    const i3 = i * 3;
    // Distributed on a large sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 50 + Math.random() * 40;
    fsPos[i3] = r * Math.sin(phi) * Math.cos(theta);
    fsPos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    fsPos[i3 + 2] = r * Math.cos(phi);
    const brightness = 0.4 + Math.random() * 0.6;
    // Slight color variation
    const tint = Math.random();
    fsCol[i3] = brightness * (0.9 + tint * 0.1);
    fsCol[i3 + 1] = brightness * (0.85 + tint * 0.15);
    fsCol[i3 + 2] = brightness;
}
farStarsGeo.setAttribute('position', new THREE.BufferAttribute(fsPos, 3));
farStarsGeo.setAttribute('color', new THREE.BufferAttribute(fsCol, 3));
const farStarsMat = new THREE.PointsMaterial({
    size: 0.06,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    alphaMap: starTexture,
    opacity: 0.7,
});
const farStars = new THREE.Points(farStarsGeo, farStarsMat);
scene.add(farStars);

/* =====================================================================
 * MID DUST — Galaxy dust at medium distance
 * ===================================================================== */
const midDustGeo = new THREE.BufferGeometry();
const mdCount = CONFIG.particles.midDust;
const mdPos = new Float32Array(mdCount * 3);
const mdCol = new Float32Array(mdCount * 3);
for (let i = 0; i < mdCount; i++) {
    const i3 = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 20;
    const y = (Math.random() - 0.5) * 3;
    mdPos[i3] = Math.cos(angle) * r;
    mdPos[i3 + 1] = y;
    mdPos[i3 + 2] = Math.sin(angle) * r;
    const rRatio = r / 23;
    mdCol[i3] = 0.3 + rRatio * 0.2;
    mdCol[i3 + 1] = 0.15 + rRatio * 0.15;
    mdCol[i3 + 2] = 0.5 + rRatio * 0.1;
}
midDustGeo.setAttribute('position', new THREE.BufferAttribute(mdPos, 3));
midDustGeo.setAttribute('color', new THREE.BufferAttribute(mdCol, 3));
const midDustMat = new THREE.PointsMaterial({
    size: 0.12,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity: 0.25,
    alphaMap: starTexture,
});
const midDust = new THREE.Points(midDustGeo, midDustMat);
scene.add(midDust);

/* =====================================================================
 * NEAR DUST — Close particles for parallax depth
 * ===================================================================== */
const nearDustGeo = new THREE.BufferGeometry();
const ndCount = CONFIG.particles.nearDust;
const ndPos = new Float32Array(ndCount * 3);
const ndSpeeds = new Float32Array(ndCount);
for (let i = 0; i < ndCount; i++) {
    const i3 = i * 3;
    ndPos[i3] = (Math.random() - 0.5) * 50;
    ndPos[i3 + 1] = (Math.random() - 0.5) * 40;
    ndPos[i3 + 2] = (Math.random() - 0.5) * 60;
    ndSpeeds[i] = 0.02 + Math.random() * 0.05;
}
nearDustGeo.setAttribute('position', new THREE.BufferAttribute(ndPos, 3));
const nearDustMat = new THREE.PointsMaterial({
    size: 0.08,
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    alphaMap: starTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});
const nearDust = new THREE.Points(nearDustGeo, nearDustMat);
scene.add(nearDust);

/* =====================================================================
 * ORBITAL PARTICLES — Bright particles orbiting black hole
 * ===================================================================== */
const orbCount = CONFIG.particles.orbital;
const orbGeo = new THREE.BufferGeometry();
const orbPos = new Float32Array(orbCount * 3);
const orbCol = new Float32Array(orbCount * 3);
const orbRadii = new Float32Array(orbCount);
const orbSpeeds = new Float32Array(orbCount);
const orbPhases = new Float32Array(orbCount);
const orbInclinations = new Float32Array(orbCount);
const orbEccentricities = new Float32Array(orbCount);
for (let i = 0; i < orbCount; i++) {
    const i3 = i * 3;
    const orbitR = 2.0 + Math.random() * 6.0;
    const orbitSpeed = (0.2 + Math.random() * 0.8) / Math.pow(orbitR, 0.5);
    const phase = Math.random() * Math.PI * 2;
    const inclination = (Math.random() - 0.5) * 0.6;
    const eccentricity = Math.random() * 0.3;
    orbRadii[i] = orbitR;
    orbSpeeds[i] = orbitSpeed;
    orbPhases[i] = phase;
    orbInclinations[i] = inclination;
    orbEccentricities[i] = eccentricity;

    orbPos[i3] = Math.cos(phase) * orbitR;
    orbPos[i3 + 1] = inclination;
    orbPos[i3 + 2] = Math.sin(phase) * orbitR;

    // Warm colors for orbital particles
    const t = Math.random();
    orbCol[i3] = 1.0;
    orbCol[i3 + 1] = 0.6 + t * 0.35;
    orbCol[i3 + 2] = 0.2 + t * 0.3;
}
orbGeo.setAttribute('position', new THREE.BufferAttribute(orbPos, 3));
orbGeo.setAttribute('color', new THREE.BufferAttribute(orbCol, 3));
orbGeo.setAttribute('aOrbitRadius', new THREE.BufferAttribute(orbRadii, 1));
orbGeo.setAttribute('aOrbitSpeed', new THREE.BufferAttribute(orbSpeeds, 1));
orbGeo.setAttribute('aOrbitPhase', new THREE.BufferAttribute(orbPhases, 1));
orbGeo.setAttribute('aOrbitInclination', new THREE.BufferAttribute(orbInclinations, 1));
orbGeo.setAttribute('aOrbitEccentricity', new THREE.BufferAttribute(orbEccentricities, 1));
const orbitalUniforms = {
    uFlowTime: { value: 0 },
};
const orbMat = new THREE.PointsMaterial({
    size: 0.06,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    alphaMap: starTexture,
    opacity: 0.9,
});
orbMat.onBeforeCompile = (shader) => {
    shader.uniforms.uFlowTime = orbitalUniforms.uFlowTime;
    shader.vertexShader = shader.vertexShader
        .replace(
            '#include <common>',
            `#include <common>
            uniform float uFlowTime;
            attribute float aOrbitRadius;
            attribute float aOrbitSpeed;
            attribute float aOrbitPhase;
            attribute float aOrbitInclination;
            attribute float aOrbitEccentricity;`,
        )
        .replace(
            '#include <begin_vertex>',
            `float orbitAngle = uFlowTime * aOrbitSpeed + aOrbitPhase;
            float liveRadius = aOrbitRadius * (1.0 + aOrbitEccentricity * sin(orbitAngle));
            vec3 transformed = vec3(
                cos(orbitAngle) * liveRadius,
                sin(orbitAngle * 0.5) * aOrbitInclination,
                sin(orbitAngle) * liveRadius
            );`,
        );
};
orbMat.customProgramCacheKey = () => 'gpu-orbital-particles-v1';
const orbitalParticles = new THREE.Points(orbGeo, orbMat);
blackHoleGroup.add(orbitalParticles);

/* =====================================================================
 * GRAVITY-BENT LIGHT RAYS - beams from deep space swallowed by the core
 * ===================================================================== */
const lightRayParts = [];
const lightRayCount = CONFIG.particles.lightRays;
const raySteps = 14;
const ribbonViewAxis = new THREE.Vector3(0, 0.34, 0.94).normalize();

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

function createLightRibbonGeometry(curve, widthScale, seed, hue) {
    const segments = CONFIG.particles.lightRaySegments;
    const vertexCount = (segments + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const seeds = new Float32Array(vertexCount).fill(seed);
    const hues = new Float32Array(vertexCount).fill(hue);
    const indices = [];
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();
    const left = new THREE.Vector3();
    const right = new THREE.Vector3();

    for (let segment = 0; segment <= segments; segment++) {
        const t = segment / segments;
        curve.getPoint(t, point);
        curve.getTangent(t, tangent).normalize();
        side.crossVectors(tangent, ribbonViewAxis);
        if (side.lengthSq() < 0.0001) side.crossVectors(tangent, THREE.Object3D.DEFAULT_UP);
        side.normalize();

        // Absolute widths make the source-to-horizon compression unmistakable.
        const gravityCompression = THREE.MathUtils.lerp(
            CONFIG.lightRibbons.outerWidth * widthScale,
            CONFIG.lightRibbons.innerWidth * widthScale,
            Math.pow(t, CONFIG.lightRibbons.taperPower)
        );
        const breathingEdge = 1.0 + Math.sin(t * Math.PI * 2.0 + seed * 8.0) * 0.035 * (1.0 - t);
        const halfWidth = gravityCompression * breathingEdge * 0.5;
        left.copy(point).addScaledVector(side, halfWidth);
        right.copy(point).addScaledVector(side, -halfWidth);

        const vertex = segment * 2;
        positions.set([left.x, left.y, left.z], vertex * 3);
        positions.set([right.x, right.y, right.z], (vertex + 1) * 3);
        uvs.set([t, 0, t, 1], vertex * 2);

        if (segment < segments) {
            const next = vertex + 2;
            indices.push(vertex, vertex + 1, next, vertex + 1, next + 1, next);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('aRaySeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aRayHue', new THREE.BufferAttribute(hues, 1));
    geometry.setIndex(indices);
    return geometry;
}

const rayRandom = createSeededRandom(0xB1A6C40 + lightRayCount);
const raySectorSize = (Math.PI * 2) / lightRayCount;

for (let rayIndex = 0; rayIndex < lightRayCount; rayIndex++) {
    const seed = rayRandom();
    const hue = rayRandom();
    const startAngle = (rayIndex / lightRayCount) * Math.PI * 2
        + (rayRandom() - 0.5) * raySectorSize * 0.32;
    const startRadius = CONFIG.lightRibbons.startRadius
        + rayRandom() * CONFIG.lightRibbons.radiusVariation;
    const startHeight = (rayRandom() - 0.42) * (isMobile ? 5.5 : 9.0);
    const endHeight = (rayRandom() - 0.5) * 0.28;
    const bendAmount = 1.45 + rayRandom() * 0.55;
    const verticalArc = (rayRandom() - 0.5) * (isMobile ? 1.0 : 1.7);
    const photonEntry = 0.76 + rayRandom() * 0.06;
    const photonOrbitRadius = CONFIG.blackHole.photonRingRadius * (1.02 + rayRandom() * 0.08);
    const captureRadius = CONFIG.blackHole.eventHorizonRadius * 0.74;
    const controlPoints = [];

    for (let step = 0; step <= raySteps; step++) {
        const t = step / raySteps;
        const approach = THREE.MathUtils.smoothstep(Math.min(t / photonEntry, 1), 0, 1);
        const capture = THREE.MathUtils.smoothstep(
            Math.max((t - photonEntry) / (1 - photonEntry), 0),
            0,
            1
        );
        const radius = t < photonEntry
            ? THREE.MathUtils.lerp(startRadius, photonOrbitRadius, approach)
            : THREE.MathUtils.lerp(photonOrbitRadius, captureRadius, capture);
        const lensingTurn = 0.3 * Math.pow(approach, 1.75) + 0.7 * Math.pow(capture, 1.08);
        const angle = startAngle + bendAmount * lensingTurn;
        const y = THREE.MathUtils.lerp(startHeight, endHeight, Math.pow(t, 0.86))
            + Math.sin(Math.PI * t) * verticalArc * (1 - capture * 0.55);
        controlPoints.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            y,
            Math.sin(angle) * radius
        ));
    }

    const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.35);
    const ribbonWidthScale = 0.9
        + (rayRandom() - 0.5) * CONFIG.lightRibbons.widthVariation;
    lightRayParts.push(createLightRibbonGeometry(curve, ribbonWidthScale, seed, hue));
}

const lightRayGeo = mergeGeometries(lightRayParts, false);
lightRayParts.forEach(part => part.dispose());

const lightRayMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uVisibility: { value: 1.0 },
    },
    vertexShader: `
        attribute float aRaySeed;
        attribute float aRayHue;
        varying float vProgress;
        varying float vAcross;
        varying float vSeed;
        varying float vHue;

        void main(){
            vProgress = uv.x;
            vAcross = uv.y;
            vSeed = aRaySeed;
            vHue = aRayHue;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uVisibility;
        varying float vProgress;
        varying float vAcross;
        varying float vSeed;
        varying float vHue;

        float wrappedDistance(float a, float b) {
            float delta = abs(a - b);
            return min(delta, 1.0 - delta);
        }

        void main(){
            float speed = 0.16 + vSeed * 0.055;
            float flowProgress = pow(vProgress, 0.62);
            float headA = fract(uTime * speed + vSeed * 0.83);
            float headB = fract(uTime * speed * 0.63 + vSeed * 0.37 + 0.46);
            float pulseA = exp(-pow(wrappedDistance(flowProgress, headA) / 0.032, 2.0));
            float pulseB = exp(-pow(wrappedDistance(flowProgress, headB) / 0.026, 2.0));
            float tailA = exp(-mod(headA - flowProgress + 1.0, 1.0) / 0.11);
            float tailB = exp(-mod(headB - flowProgress + 1.0, 1.0) / 0.085);
            float photonPackets = pulseA * 1.25 + pulseB + tailA * 0.24 + tailB * 0.18;

            float sourceFade = smoothstep(0.0, 0.055, vProgress);
            float horizonAbsorption = 1.0 - smoothstep(0.9, 1.0, vProgress);
            float visibilityFade = sourceFade * horizonAbsorption;
            float inwardHeat = smoothstep(0.38, 0.86, vProgress);
            float redshift = smoothstep(0.76, 0.96, vProgress);

            float centeredAcross = 1.0 - abs(vAcross * 2.0 - 1.0);
            float bloomEnvelope = pow(max(centeredAcross, 0.0), 0.62);
            float narrowHalo = pow(max(centeredAcross, 0.0), 3.4);
            float photonCore = pow(max(centeredAcross, 0.0), 18.0);
            float microVariation = 0.94 + 0.06
                * sin(vProgress * 67.0 - uTime * (0.8 + speed) + vSeed * 19.0)
                * sin(vProgress * 23.0 + vSeed * 11.0);

            vec3 coolWhite = mix(vec3(0.48, 0.7, 1.0), vec3(0.78, 0.9, 1.0), vHue);
            vec3 warmGold = vec3(1.0, 0.58, 0.16);
            vec3 captureRed = vec3(1.0, 0.2, 0.035);
            vec3 whiteCore = vec3(1.0, 0.985, 0.92);
            vec3 color = mix(coolWhite, warmGold, inwardHeat);
            color = mix(color, captureRed, redshift * 0.72);
            color = mix(color, whiteCore, photonCore * (0.7 - redshift * 0.24));

            float shapeEnergy = bloomEnvelope * 0.08 + narrowHalo * 0.34 + photonCore * 1.25;
            float intensity = shapeEnergy
                * (0.62 + inwardHeat * 0.2 + photonPackets * 0.72)
                * microVariation;
            float alpha = visibilityFade
                * (bloomEnvelope * 0.052 + narrowHalo * 0.15 + photonCore * 0.42)
                * (0.74 + photonPackets * 0.28);
            gl_FragColor = vec4(
                color * intensity * uVisibility,
                alpha * uVisibility
            );
        }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
});
const swallowedLightRays = new THREE.Mesh(lightRayGeo, lightRayMat);
swallowedLightRays.renderOrder = 2;
blackHoleGroup.add(swallowedLightRays);

/* =====================================================================
 * GRAVITATIONAL METEOR - procedural rock, plasma trail and tidal breakup
 * ===================================================================== */
const meteorSystemCount = prefersReducedMotion ? 1 : (isMobile ? 1 : (isTablet ? 2 : 3));
const meteorSystems = Array.from({ length: meteorSystemCount }, (_, index) => createMeteorSystem({
    scene,
    camera,
    starTexture,
    eventHorizonRadius: CONFIG.blackHole.eventHorizonRadius,
    photonRingRadius: CONFIG.blackHole.photonRingRadius,
    isMobile,
    prefersReducedMotion,
    seedOffset: index * 13,
    initialDelay: 0.35 + index * (isMobile ? 3.0 : 1.75),
    allowImpact: true,
}));

const screenMeteor = createScreenMeteorSystem({
    scene,
    camera,
    starTexture,
    isMobile,
    prefersReducedMotion,
    onScreenImpact,
});

/* =====================================================================
 * STATE VARIABLES
 * ===================================================================== */
const clock = new THREE.Clock();
let elapsedTime = 0;
let flowTime = 0;
let currentRotationSpeed = CONFIG.rotation.baseSpeed;
let currentBloom = CONFIG.bloom.strength;
const input = {
    scrollY: initialInput.scrollY || 0,
    maxScroll: Math.max(initialInput.maxScroll || 1, 1),
    mouseX: initialInput.mouseX || 0,
    mouseY: initialInput.mouseY || 0,
    isScrolling: Boolean(initialInput.isScrolling),
};
let lastScrollY = input.scrollY;
let scrollVelocity = 0;
let scrollEnergy = 0;
let smoothMouseX = 0, smoothMouseY = 0;
let isTabVisible = initialInput.visible !== false;
let animationId = null;
let running = false;
let disposed = false;
let lastFrameTime = 0;

// Reusable vector to avoid GC
const _lookTarget = new THREE.Vector3(0, 0, 0);

/* =====================================================================
 * EXTERNAL STATE
 * ===================================================================== */
function updateInput(nextInput = {}) {
    if (Number.isFinite(nextInput.scrollY)) input.scrollY = nextInput.scrollY;
    if (Number.isFinite(nextInput.maxScroll)) input.maxScroll = Math.max(nextInput.maxScroll, 1);
    if (Number.isFinite(nextInput.mouseX)) input.mouseX = nextInput.mouseX;
    if (Number.isFinite(nextInput.mouseY)) input.mouseY = nextInput.mouseY;
    if (typeof nextInput.isScrolling === 'boolean') input.isScrolling = nextInput.isScrolling;

    if (!prefersReducedMotion && Number.isFinite(nextInput.wheelEnergy)) {
        scrollEnergy = Math.min(1, scrollEnergy + nextInput.wheelEnergy);
    }

    if (nextInput.resetGalaxy) {
        input.mouseX = 0;
        input.mouseY = 0;
    }
}

function resize(nextWidth, nextHeight, nextDevicePixelRatio = sizes.devicePixelRatio) {
    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) return;

    sizes.width = Math.max(1, nextWidth);
    sizes.height = Math.max(1, nextHeight);
    sizes.devicePixelRatio = Math.max(1, nextDevicePixelRatio || 1);
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height, false);
    renderer.setPixelRatio(Math.min(sizes.devicePixelRatio, isMobile ? 1.0 : (isTablet ? 1.25 : 1.5)));
    composer.setSize(sizes.width, sizes.height);
    if (isMobile && bloomPass?.resolution) {
        bloomPass.resolution.set(Math.round(sizes.width * 0.5), Math.round(sizes.height * 0.5));
    }
}

function setVisibility(visible) {
    if (isTabVisible === visible) return;
    isTabVisible = visible;

    if (!isTabVisible) {
        if (animationId !== null) {
            cancelFrame(animationId);
            animationId = null;
        }
        return;
    }

    clock.getDelta(); // consume accumulated delta to prevent jump
    lastScrollY = input.scrollY;
    scrollVelocity = 0;
    scrollEnergy = 0;

    if (running && animationId === null) {
        tick();
    }
}

/* =====================================================================
 * ANIMATION LOOP
 * ===================================================================== */
function tick() {
    animationId = null;
    if (!running || disposed || !isTabVisible) return;
    animationId = requestFrame(tick);

    // Giới hạn FPS trên mobile (tối đa ~60 FPS) chống quá nhiệt và tụt xung trên màn hình 120Hz ProMotion iPhone
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (isMobile && now - lastFrameTime < 16) {
        return;
    }
    lastFrameTime = now;

    // Delta time, clamped to prevent jumps
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsedTime += dt;

    // --- SCROLL PROGRESS & VELOCITY ---
    const scrollProgress = Math.max(0, Math.min(1, input.scrollY / input.maxScroll));
    const frameDelta = input.scrollY - lastScrollY;
    scrollVelocity += (frameDelta - scrollVelocity) * 0.1;
    scrollVelocity *= 0.95;
    lastScrollY = input.scrollY;

    const movementImpulse = prefersReducedMotion ? 0 : Math.min(Math.abs(frameDelta) / 42, 1);
    scrollEnergy = Math.min(1, scrollEnergy + movementImpulse * 0.22);
    scrollEnergy *= Math.exp(-dt * 2.15);
    flowTime += dt * (1.0 + scrollEnergy * 4.8);

    // --- ROTATION ---
    const absVel = Math.abs(scrollVelocity);
    const rotationBoost = Math.min(
        absVel * CONFIG.rotation.boostMultiplier + scrollEnergy * CONFIG.rotation.maxBoost,
        CONFIG.rotation.maxBoost
    );
    const targetSpeed = CONFIG.rotation.baseSpeed + rotationBoost;
    const rotLerp = 1.0 - Math.pow(0.95, dt * 60);
    currentRotationSpeed += (targetSpeed - currentRotationSpeed) * rotLerp;

    const rotDelta = currentRotationSpeed * dt * 60;
    blackHoleGroup.rotation.y += rotDelta;
    galaxyPoints.rotation.y += rotDelta * 0.8;
    midDust.rotation.y += rotDelta * 0.4;

    // --- MOUSE PARALLAX ---
    smoothMouseX += (input.mouseX - smoothMouseX) * CONFIG.parallax.lerp;
    smoothMouseY += (input.mouseY - smoothMouseY) * CONFIG.parallax.lerp;
    scene.rotation.y = smoothMouseX * CONFIG.parallax.strength;
    scene.rotation.x = smoothMouseY * CONFIG.parallax.strength * 0.3;

    // --- CAMERA ZOOM (scroll-driven) ---
    const zoomPunch = scrollEnergy * CONFIG.camera.scrollPunch * (1.0 - scrollProgress * 0.5);
    const targetZ = CONFIG.camera.zFar + (CONFIG.camera.zNear - CONFIG.camera.zFar) * scrollProgress - zoomPunch;
    const targetY = CONFIG.camera.yFar + (CONFIG.camera.yNear - CONFIG.camera.yFar) * scrollProgress - zoomPunch * 0.24;
    const camLerp = Math.min(0.22, 1.0 - Math.pow(CONFIG.camera.lerpPow, dt * 60) + scrollEnergy * 0.075);
    camera.position.z += (targetZ - camera.position.z) * camLerp;
    camera.position.y += (targetY - camera.position.y) * camLerp;
    camera.lookAt(_lookTarget);

    // --- UPDATE SHADER UNIFORMS ---
    eventHorizonMat.uniforms.uTime.value = flowTime;
    eventHorizonMat.uniforms.uScrollEnergy.value = scrollEnergy;
    accretionDiskMat.uniforms.uTime.value = flowTime;
    accretionDiskMat.uniforms.uScrollEnergy.value = scrollEnergy;
    innerGlowMat.uniforms.uTime.value = flowTime;
    einsteinRingMat.uniforms.uTime.value = flowTime;
    lensArc2Mat.uniforms.uTime.value = flowTime;
    lightRayMat.uniforms.uTime.value = elapsedTime;

    // --- UPDATE GPU ORBITAL PARTICLES ---
    orbitalUniforms.uFlowTime.value = flowTime;

    // --- UPDATE NEAR DUST (flying towards camera) ---
    const ndPositions = nearDustGeo.attributes.position.array;
    for (let i = 0; i < ndCount; i++) {
        const i3 = i * 3;
        ndPositions[i3 + 2] += ndSpeeds[i];
        if (ndPositions[i3 + 2] > 25) {
            ndPositions[i3 + 2] = -40;
            ndPositions[i3] = (Math.random() - 0.5) * 50;
            ndPositions[i3 + 1] = (Math.random() - 0.5) * 40;
        }
    }
    nearDustGeo.attributes.position.needsUpdate = true;

    // --- GRAVITATIONAL METEOR ---
    for (let index = 0; index < meteorSystems.length; index++) {
        meteorSystems[index].update(dt, elapsedTime);
    }

    // --- SCREEN IMPACT METEOR ---
    screenMeteor.update(dt, elapsedTime);

    // --- BLOOM DYNAMIC & RENDER ---
    // Trên di động, luôn render trực tiếp 1 pass (siêu nhẹ, 60-120fps mượt mà, không quá tải GPU)
    // Trên máy tính bàn/tablet, dùng EffectComposer với bloom đầy đủ
    if (isMobile) {
        renderer.render(scene, camera);
    } else {
        const bloomBoost = Math.min(scrollEnergy * 0.22, CONFIG.bloom.strengthMax - CONFIG.bloom.strength);
        const targetBloom = CONFIG.bloom.strength + bloomBoost;
        currentBloom += (targetBloom - currentBloom) * 0.05;
        bloomPass.strength = currentBloom;
        composer.render();
    }
}

function start() {
    if (running || disposed) return;
    running = true;
    if (isTabVisible) tick();
}

function stop() {
    if (!running) return;
    running = false;
    if (animationId !== null) {
        cancelFrame(animationId);
        animationId = null;
    }
}

/* =====================================================================
 * CLEANUP
 * ===================================================================== */
function dispose() {
    if (disposed) return;
    disposed = true;
    stop();

    // Dispose black hole
    eventHorizonGeo.dispose(); eventHorizonMat.dispose();
    accretionDiskGeo.dispose(); accretionDiskMat.dispose();
    innerGlowGeo.dispose(); innerGlowMat.dispose();
    einsteinRingGeo.dispose(); einsteinRingMat.dispose();
    lensArc2Geo.dispose(); lensArc2Mat.dispose();

    // Dispose particles
    galaxyGeo.dispose(); galaxyMat.dispose();
    farStarsGeo.dispose(); farStarsMat.dispose();
    midDustGeo.dispose(); midDustMat.dispose();
    nearDustGeo.dispose(); nearDustMat.dispose();
    orbGeo.dispose(); orbMat.dispose();
    lightRayGeo.dispose(); lightRayMat.dispose();

    for (let index = 0; index < meteorSystems.length; index++) {
        meteorSystems[index].dispose();
    }
    screenMeteor.dispose();

    // Dispose texture, composer, renderer
    starTexture.dispose();
    bloomPass.dispose();
    renderPass.dispose?.();
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
}

return {
    start,
    stop,
    resize,
    updateInput,
    setVisibility,
    triggerScreenMeteor: (options) => screenMeteor.trigger(typeof options === 'boolean' ? options : (options?.isManual ?? true)),
    dispose,
    config: CONFIG,
};
}
