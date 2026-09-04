import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Web Audio procedural glass shatter sound synthesizer
 * Zero external audio files required — 100% reliable, zero latency.
 */
function playProceduralGlassSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // 1. Kinetic Heavy Impact Thud (Low boom)
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(140, now);
        subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.18);
        subGain.gain.setValueAtTime(0.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.25);

        // 2. High-Frequency Glass Fracture Noise Crunch
        const bufferSize = ctx.sampleRate * 0.35;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(4200, now);
        noiseFilter.Q.setValueAtTime(3.5, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.75, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);

        whiteNoise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        whiteNoise.start(now);
        whiteNoise.stop(now + 0.35);

        // 3. Resonant Glass Shard Pings (Harmonic tinkling)
        const tinkleFreqs = [3200, 4800, 6400, 8200];
        tinkleFreqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq + Math.random() * 200, now + idx * 0.012);
            gain.gain.setValueAtTime(0.18, now + idx * 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35 + idx * 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.012);
            osc.stop(now + 0.45);
        });
    } catch {
        // Audio playback gracefully suppressed if user hasn't interacted with page yet
    }
}

/**
 * Procedural Spiderweb Glass Crack Pattern Generator
 */
function generateCrackPattern(cx, cy, width, height) {
    const random = () => Math.random();
    const rayCount = 15 + Math.floor(random() * 6); // 15 - 20 main radial fissures
    const rays = [];
    const coreRadius = 16 + random() * 8;
    const maxDimension = Math.max(width, height);

    // 1. Generate Radial Rays
    for (let i = 0; i < rayCount; i++) {
        const baseAngle = (i / rayCount) * Math.PI * 2 + (random() - 0.5) * 0.28;
        // Reach varied from medium cracks (200px) to massive fissures spanning the screen
        const maxLen = (0.22 + Math.pow(random(), 1.4) * 0.42) * maxDimension;
        const segmentCount = 10 + Math.floor(random() * 8);

        const points = [{ x: cx, y: cy }];
        let curX = cx;
        let curY = cy;
        let curAngle = baseAngle;
        const branches = [];

        for (let s = 1; s <= segmentCount; s++) {
            const stepProgress = s / segmentCount;
            const stepDist = (maxLen / segmentCount) * (0.7 + random() * 0.6);
            curAngle += (random() - 0.5) * 0.38; // Jagged zig-zag
            curX += Math.cos(curAngle) * stepDist;
            curY += Math.sin(curAngle) * stepDist;
            points.push({ x: curX, y: curY });

            // Spawn secondary branch crack
            if (s > 2 && s < segmentCount - 2 && random() < 0.4) {
                const branchSign = random() < 0.5 ? 1 : -1;
                const branchAngle = curAngle + branchSign * (0.6 + random() * 0.45);
                const branchLen = (35 + random() * 95);
                const bSteps = 4 + Math.floor(random() * 4);
                const bPoints = [{ x: curX, y: curY }];
                let bx = curX;
                let by = curY;
                let bAngle = branchAngle;
                for (let bs = 1; bs <= bSteps; bs++) {
                    bAngle += (random() - 0.5) * 0.3;
                    bx += Math.cos(bAngle) * (branchLen / bSteps);
                    by += Math.sin(bAngle) * (branchLen / bSteps);
                    bPoints.push({ x: bx, y: by });
                }
                branches.push(bPoints);
            }
        }

        rays.push({
            points,
            branches,
            baseAngle,
        });
    }

    // 2. Generate Concentric Web Arcs connecting adjacent rays
    const webRingCount = 5 + Math.floor(random() * 3);
    const webArcs = [];

    for (let ring = 1; ring <= webRingCount; ring++) {
        // Rings spread out quadratically
        const ringDist = coreRadius + Math.pow(ring / webRingCount, 1.5) * (maxDimension * 0.28);
        for (let i = 0; i < rayCount; i++) {
            if (random() < 0.18) continue; // Skip occasional segment for organic broken look
            const nextIdx = (i + 1) % rayCount;
            const rayA = rays[i];
            const rayB = rays[nextIdx];

            const pA = getPointAlongRay(rayA.points, ringDist);
            const pB = getPointAlongRay(rayB.points, ringDist);

            if (pA && pB) {
                // Add faceted mid-point with slight inward/outward crack deflection
                const midX = (pA.x + pB.x) * 0.5 + (random() - 0.5) * 12;
                const midY = (pA.y + pB.y) * 0.5 + (random() - 0.5) * 12;
                webArcs.push({ pA, mid: { x: midX, y: midY }, pB });
            }
        }
    }

    // 3. Central Chipped Shards & Embers
    const emberCount = 22;
    const embers = [];
    for (let e = 0; e < emberCount; e++) {
        const eAngle = random() * Math.PI * 2;
        const eDist = coreRadius * (0.3 + random() * 2.5);
        embers.push({
            x: cx + Math.cos(eAngle) * eDist,
            y: cy + Math.sin(eAngle) * eDist,
            size: 1.5 + random() * 2.8,
            heat: 0.8 + random() * 0.2,
        });
    }

    // 4. Detached Flying Glass Shards (popping off on kinetic impact)
    const flyingShards = [];
    const shardCount = 10;
    for (let s = 0; s < shardCount; s++) {
        const sAngle = (s / shardCount) * Math.PI * 2 + (random() - 0.5) * 0.45;
        const sDist = coreRadius * (0.5 + random() * 1.6);
        const sSpeed = (140 + random() * 260); // pixels per second
        const sSize = 10 + random() * 18;
        flyingShards.push({
            x: cx + Math.cos(sAngle) * sDist,
            y: cy + Math.sin(sAngle) * sDist,
            vx: Math.cos(sAngle) * sSpeed,
            vy: Math.sin(sAngle) * sSpeed + 50,
            size: sSize,
            rot: random() * Math.PI * 2,
            vRot: (random() - 0.5) * 10,
            points: [
                { x: 0, y: -sSize * 0.8 },
                { x: sSize * 0.6, y: sSize * 0.5 },
                { x: -sSize * 0.55, y: sSize * 0.4 },
            ],
        });
    }

    // 5. Powdered glass dust puffs
    const dustPuffs = [];
    const dustCount = 16;
    for (let d = 0; d < dustCount; d++) {
        const dAngle = random() * Math.PI * 2;
        const dSpeed = 45 + random() * 120;
        dustPuffs.push({
            x: cx,
            y: cy,
            vx: Math.cos(dAngle) * dSpeed,
            vy: Math.sin(dAngle) * dSpeed,
            radius: 10 + random() * 18,
        });
    }

    // 6. Dynamic fiery spark streaks blasting from impact point
    const sparks = [];
    const sparkCount = 48;
    for (let sp = 0; sp < sparkCount; sp++) {
        const spAngle = random() * Math.PI * 2;
        const spSpeed = 220 + random() * 580; // px/s
        sparks.push({
            x: cx,
            y: cy,
            vx: Math.cos(spAngle) * spSpeed,
            vy: Math.sin(spAngle) * spSpeed,
            size: 1.5 + random() * 2.5,
            length: 12 + random() * 24,
            color: random() < 0.35 ? '#ffffff' : (random() < 0.7 ? '#ffb330' : '#ff4400'),
            maxLife: 0.45 + random() * 0.45,
        });
    }

    return {
        cx,
        cy,
        coreRadius,
        rays,
        webArcs,
        embers,
        flyingShards,
        dustPuffs,
        sparks,
    };
}

function getPointAlongRay(points, targetDist) {
    let accumulated = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const segDist = Math.sqrt(dx * dx + dy * dy);
        if (accumulated + segDist >= targetDist) {
            const ratio = (targetDist - accumulated) / Math.max(segDist, 0.001);
            return {
                x: points[i].x + dx * ratio,
                y: points[i].y + dy * ratio,
            };
        }
        accumulated += segDist;
    }
    return points[points.length - 1];
}

export default function GlassShatterOverlay() {
    const canvasRef = useRef(null);
    const activeCrackRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [shakeStyle, setShakeStyle] = useState({});

    // Trigger physical screen shake on the viewport
    const triggerShake = useCallback((intensity = 1.0) => {
        const startTime = performance.now();
        const duration = 450; // ms

        const updateShake = () => {
            const elapsed = performance.now() - startTime;
            if (elapsed >= duration) {
                setShakeStyle({});
                return;
            }

            const progress = elapsed / duration;
            // Damped high-frequency sinusoidal decay
            const decay = Math.pow(1 - progress, 2.5);
            const frequency = 40;
            const magnitude = 10 * intensity * decay;
            const dx = (Math.sin(elapsed * 0.04) + (Math.random() - 0.5) * 0.8) * magnitude;
            const dy = (Math.cos(elapsed * 0.035) + (Math.random() - 0.5) * 0.8) * magnitude;
            const rot = (Math.sin(elapsed * 0.03) * 0.45 * intensity * decay).toFixed(2);

            setShakeStyle({
                transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${rot}deg)`,
                transition: 'none',
            });

            requestAnimationFrame(updateShake);
        };

        requestAnimationFrame(updateShake);
    }, []);

    // Trigger broken glass crack
    const triggerCrack = useCallback((screenX = 0.5, screenY = 0.5, intensity = 1.0) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        const pixelX = screenX * width;
        const pixelY = screenY * height;

        const pattern = generateCrackPattern(pixelX, pixelY, width, height);

        activeCrackRef.current = {
            pattern,
            startTime: performance.now(),
            growthDuration: 60, // Cracks propagate in 60ms (instant kinetic snap)
            sustainDuration: 2600, // Stays fully sharp for 2.6s
            fadeDuration: 2200, // Smoothly dissolves away over 2.2s
            intensity,
        };

        playProceduralGlassSound();
        triggerShake(intensity);
    }, [triggerShake]);

    // Render loop for cracks and cooling embers
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        const handleResize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.resetTransform?.();
            ctx.scale(dpr, dpr);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        const render = (now) => {
            animationFrameRef.current = requestAnimationFrame(render);
            const crack = activeCrackRef.current;
            if (!crack) {
                return;
            }

            const elapsed = now - crack.startTime;
            const totalDuration = crack.growthDuration + crack.sustainDuration + crack.fadeDuration;

            if (elapsed >= totalDuration) {
                // Complete cleanup: clear canvas and reset
                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
                activeCrackRef.current = null;
                return;
            }

            // Calculate crack propagation (0 -> 1 in 60ms)
            const growthProgress = Math.min(1.0, elapsed / crack.growthDuration);
            const easedGrowth = 1 - Math.pow(1 - growthProgress, 3);

            // Calculate fade out (1 -> 0 after sustain)
            let opacity = 1.0;
            if (elapsed > crack.growthDuration + crack.sustainDuration) {
                const fadeElapsed = elapsed - (crack.growthDuration + crack.sustainDuration);
                opacity = Math.max(0, 1.0 - fadeElapsed / crack.fadeDuration);
            }

            // Clear frame
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            const { cx, cy, coreRadius, rays, webArcs, embers, flyingShards, dustPuffs, sparks } = crack.pattern;

            ctx.save();
            ctx.globalAlpha = opacity;

            // ========================================================
            // LAYER 0A: Kinetic Impact Flash (Intense blinding burst at t=0)
            // ========================================================
            if (elapsed < 140) {
                const flashIntensity = Math.pow(1.0 - elapsed / 140, 2);
                const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 9);
                flashGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * flashIntensity})`);
                flashGrad.addColorStop(0.25, `rgba(255, 220, 130, ${0.75 * flashIntensity})`);
                flashGrad.addColorStop(0.65, `rgba(255, 120, 30, ${0.4 * flashIntensity})`);
                flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = flashGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, coreRadius * 9, 0, Math.PI * 2);
                ctx.fill();
            }

            // ========================================================
            // LAYER 0B: Expanding Glass Compression Shockwave Ring
            // ========================================================
            if (elapsed < 420) {
                const waveProgress = elapsed / 420;
                const waveRadius = coreRadius + waveProgress * (Math.max(window.innerWidth, window.innerHeight) * 0.42);
                const waveAlpha = (1 - waveProgress) * 0.85;
                ctx.save();
                ctx.strokeStyle = `rgba(255, 245, 210, ${waveAlpha})`;
                ctx.lineWidth = 3.5 * (1 - waveProgress);
                ctx.shadowColor = 'rgba(255, 190, 80, 0.85)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // ========================================================
            // LAYER 1: Core Molten Ember Glow (fades quickly as rock cools)
            // ========================================================
            const heatElapsed = elapsed / 1000;
            const coreHeat = Math.max(0, 1.0 - heatElapsed * 0.7);
            if (coreHeat > 0.01) {
                const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 4.5);
                glowGrad.addColorStop(0, `rgba(255, 245, 210, ${0.85 * coreHeat})`);
                glowGrad.addColorStop(0.2, `rgba(255, 140, 20, ${0.65 * coreHeat})`);
                glowGrad.addColorStop(0.55, `rgba(220, 45, 5, ${0.35 * coreHeat})`);
                glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, coreRadius * 4.5, 0, Math.PI * 2);
                ctx.fill();
            }

            // ========================================================
            // LAYER 2: Refraction Shadow (Gives 3D glass thickness & depth)
            // ========================================================
            ctx.save();
            ctx.translate(1.5, 1.8); // Offset shadow
            ctx.strokeStyle = 'rgba(10, 18, 28, 0.75)';
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'miter';

            // Shadow for radial rays
            rays.forEach((ray) => {
                const limit = Math.floor(ray.points.length * easedGrowth);
                if (limit < 2) return;
                ctx.beginPath();
                ctx.moveTo(ray.points[0].x, ray.points[0].y);
                for (let i = 1; i < limit; i++) {
                    ctx.lineTo(ray.points[i].x, ray.points[i].y);
                }
                ctx.stroke();

                if (easedGrowth > 0.5) {
                    ray.branches.forEach((bPoints) => {
                        ctx.beginPath();
                        ctx.moveTo(bPoints[0].x, bPoints[0].y);
                        for (let b = 1; b < bPoints.length; b++) {
                            ctx.lineTo(bPoints[b].x, bPoints[b].y);
                        }
                        ctx.stroke();
                    });
                }
            });

            // Shadow for web arcs
            if (easedGrowth > 0.3) {
                webArcs.forEach((arc) => {
                    ctx.beginPath();
                    ctx.moveTo(arc.pA.x, arc.pA.y);
                    ctx.lineTo(arc.mid.x, arc.mid.y);
                    ctx.lineTo(arc.pB.x, arc.pB.y);
                    ctx.stroke();
                });
            }
            ctx.restore();

            // ========================================================
            // LAYER 3: Chromatic Aberration Fringe (Cyan / Magenta split)
            // ========================================================
            ctx.save();
            ctx.translate(-0.8, -0.6);
            ctx.strokeStyle = 'rgba(0, 230, 255, 0.28)';
            ctx.lineWidth = 1.0;
            rays.forEach((ray) => {
                const limit = Math.floor(ray.points.length * easedGrowth);
                if (limit < 2) return;
                ctx.beginPath();
                ctx.moveTo(ray.points[0].x, ray.points[0].y);
                for (let i = 1; i < limit; i++) {
                    ctx.lineTo(ray.points[i].x, ray.points[i].y);
                }
                ctx.stroke();
            });
            ctx.restore();

            // ========================================================
            // LAYER 4: Brilliant Specular Highlight (Pure White Internal Glint)
            // ========================================================
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 3;
            ctx.lineWidth = 1.3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'miter';

            rays.forEach((ray) => {
                const limit = Math.floor(ray.points.length * easedGrowth);
                if (limit < 2) return;
                ctx.beginPath();
                ctx.moveTo(ray.points[0].x, ray.points[0].y);
                for (let i = 1; i < limit; i++) {
                    ctx.lineTo(ray.points[i].x, ray.points[i].y);
                }
                ctx.stroke();

                if (easedGrowth > 0.5) {
                    ray.branches.forEach((bPoints) => {
                        ctx.beginPath();
                        ctx.moveTo(bPoints[0].x, bPoints[0].y);
                        for (let b = 1; b < bPoints.length; b++) {
                            ctx.lineTo(bPoints[b].x, bPoints[b].y);
                        }
                        ctx.stroke();
                    });
                }
            });

            // Web arcs highlight
            if (easedGrowth > 0.3) {
                ctx.lineWidth = 1.1;
                webArcs.forEach((arc) => {
                    ctx.beginPath();
                    ctx.moveTo(arc.pA.x, arc.pA.y);
                    ctx.lineTo(arc.mid.x, arc.mid.y);
                    ctx.lineTo(arc.pB.x, arc.pB.y);
                    ctx.stroke();
                });
            }

            // ========================================================
            // LAYER 5: Pulverized Impact Core (Frosted White Micro-Cracks)
            // ========================================================
            ctx.shadowBlur = 0;
            // Opaque frosted glass disc
            const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreRadius);
            coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
            coreGrad.addColorStop(0.5, 'rgba(235, 245, 255, 0.75)');
            coreGrad.addColorStop(0.85, 'rgba(180, 205, 230, 0.4)');
            coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
            ctx.fill();

            // Concentric crushed micro-rings
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 1.5;
            for (let cr = 4; cr <= coreRadius; cr += 4) {
                ctx.beginPath();
                ctx.arc(cx, cy, cr, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Dark center puncture hole
            ctx.fillStyle = 'rgba(8, 12, 18, 0.88)';
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(3, coreRadius * 0.28), 0, Math.PI * 2);
            ctx.fill();

            // ========================================================
            // LAYER 6: Molten Embers and Spark Debris
            // ========================================================
            if (coreHeat > 0.05) {
                embers.forEach((emb) => {
                    const sparkAlpha = coreHeat * (0.6 + Math.sin(now * 0.02 + emb.x) * 0.4);
                    ctx.fillStyle = `rgba(255, ${Math.floor(120 * emb.heat + 100)}, 40, ${sparkAlpha})`;
                    ctx.beginPath();
                    ctx.arc(emb.x, emb.y, emb.size * coreHeat, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // ========================================================
            // LAYER 7: Detached Flying Glass Shards (Kinetic pop-off)
            // ========================================================
            if (flyingShards && elapsed < 800) {
                const shardProgress = elapsed / 800;
                const shardAlpha = Math.max(0, (1 - shardProgress * shardProgress));
                const sec = elapsed / 1000;
                ctx.save();
                flyingShards.forEach((s) => {
                    const curX = s.x + s.vx * sec;
                    const curY = s.y + s.vy * sec + 140 * sec * sec;
                    const curRot = s.rot + s.vRot * sec;
                    ctx.save();
                    ctx.translate(curX, curY);
                    ctx.rotate(curRot);

                    // Drop shadow
                    ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shardAlpha})`;
                    ctx.beginPath();
                    s.points.forEach((pt, idx) => {
                        if (idx === 0) ctx.moveTo(pt.x + 3, pt.y + 3);
                        else ctx.lineTo(pt.x + 3, pt.y + 3);
                    });
                    ctx.closePath();
                    ctx.fill();

                    // Glass body with specular gradient
                    const glassGrad = ctx.createLinearGradient(-s.size, -s.size, s.size, s.size);
                    glassGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * shardAlpha})`);
                    glassGrad.addColorStop(0.4, `rgba(215, 240, 255, ${0.55 * shardAlpha})`);
                    glassGrad.addColorStop(1, `rgba(180, 215, 245, ${0.8 * shardAlpha})`);
                    ctx.fillStyle = glassGrad;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * shardAlpha})`;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    s.points.forEach((pt, idx) => {
                        if (idx === 0) ctx.moveTo(pt.x, pt.y);
                        else ctx.lineTo(pt.x, pt.y);
                    });
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                });
                ctx.restore();
            }

            // ========================================================
            // LAYER 8: Powdered Glass Dust & Vapor Puffs
            // ========================================================
            if (dustPuffs && elapsed < 900) {
                const dustProgress = elapsed / 900;
                const dustAlpha = Math.max(0, (1 - dustProgress) * 0.45);
                const sec = elapsed / 1000;
                ctx.save();
                dustPuffs.forEach((dp) => {
                    const curX = dp.x + dp.vx * sec;
                    const curY = dp.y + dp.vy * sec;
                    const curR = dp.radius * (1 + dustProgress * 2.4);
                    const grad = ctx.createRadialGradient(curX, curY, 0, curX, curY, curR);
                    grad.addColorStop(0, `rgba(255, 255, 255, ${dustAlpha})`);
                    grad.addColorStop(0.5, `rgba(220, 235, 255, ${dustAlpha * 0.45})`);
                    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(curX, curY, curR, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            }

            // ========================================================
            // LAYER 9: Blazing Kinetic Spark Streaks (Tia lửa bắn tóe)
            // ========================================================
            if (sparks && elapsed < 950) {
                const sec = elapsed / 1000;
                ctx.save();
                sparks.forEach((sp) => {
                    if (sec > sp.maxLife) return;
                    const lifeRatio = Math.max(0, 1.0 - (sec / sp.maxLife));
                    const curX = sp.x + sp.vx * sec;
                    const curY = sp.y + sp.vy * sec + 160 * sec * sec;
                    const tailX = curX - (sp.vx * 0.024);
                    const tailY = curY - (sp.vy * 0.024) - (160 * sec * 0.024);

                    ctx.strokeStyle = sp.color;
                    ctx.shadowColor = sp.color;
                    ctx.shadowBlur = 8;
                    ctx.lineWidth = Math.max(0.5, sp.size * lifeRatio);
                    ctx.beginPath();
                    ctx.moveTo(tailX, tailY);
                    ctx.lineTo(curX, curY);
                    ctx.stroke();

                    // Glowing spark head
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(curX, curY, (sp.size * 0.8) * lifeRatio, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            }

            ctx.restore();
        };

        animationFrameRef.current = requestAnimationFrame(render);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Listen for custom screen impact event from background engine
    useEffect(() => {
        const handleScreenImpact = (event) => {
            const { screenX, screenY, intensity } = event.detail || {};
            triggerCrack(screenX ?? 0.5, screenY ?? 0.5, intensity ?? 1.0);
        };

        const handleKeyDown = (event) => {
            // Secret test hotkey: Press 'B' to trigger impact immediately
            if (event.key === 'b' || event.key === 'B') {
                if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
                    return; // Don't trigger when typing in inputs
                }
                // If background engine is available, trigger 3D projectile (which will hit center and trigger crack exactly there)
                if (typeof window.__triggerScreenImpact === 'function') {
                    window.__triggerScreenImpact();
                } else {
                    triggerCrack(0.5, 0.5, 1.0);
                }
            }
        };

        window.addEventListener('cosmic:screen-impact', handleScreenImpact);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('cosmic:screen-impact', handleScreenImpact);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [triggerCrack]);

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[25] overflow-hidden"
            style={shakeStyle}
            aria-hidden="true"
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full block pointer-events-none"
            />
        </div>
    );
}
