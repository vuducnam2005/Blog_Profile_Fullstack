const WORKER_READY_TIMEOUT_MS = 12000;

function readViewport() {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
    };
}

function readScrollState() {
    return {
        scrollY: window.scrollY,
        maxScroll: Math.max(document.documentElement.scrollHeight - window.innerHeight, 1),
    };
}

function replaceTransferredCanvas(canvas) {
    const replacement = document.createElement('canvas');
    replacement.id = canvas.id;
    replacement.className = canvas.className;
    replacement.setAttribute('aria-hidden', canvas.getAttribute('aria-hidden') || 'true');
    canvas.replaceWith(replacement);
    return replacement;
}

export function startBlackHoleBackground() {
    let canvas = document.querySelector('#webgl-canvas');
    if (!canvas) return () => {};

    const viewport = readViewport();
    const isMobile = viewport.width < 768;
    const isTablet = viewport.width >= 768 && viewport.width < 1024;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const initialScroll = readScrollState();

    let worker = null;
    let fallbackEngine = null;
    let fallbackPromise = null;
    let canvasTransferred = false;
    let mode = 'starting';
    let disposed = false;
    let flushFrameId = null;
    let workerReadyTimer = null;
    let pendingResize = viewport;
    let resizeDirty = true;
    let inputDirty = true;
    let pendingInput = {
        ...initialScroll,
        mouseX: 0,
        mouseY: 0,
        wheelEnergy: 0,
        resetGalaxy: false,
        visible: !document.hidden,
    };

    const clearWorkerReadyTimer = () => {
        if (workerReadyTimer !== null) {
            window.clearTimeout(workerReadyTimer);
            workerReadyTimer = null;
        }
    };

    const deliverResize = () => {
        if (!resizeDirty) return false;

        if ((mode === 'worker' || mode === 'worker-starting') && worker) {
            worker.postMessage({ type: 'resize', ...pendingResize });
        } else if (mode === 'fallback' && fallbackEngine) {
            fallbackEngine.resize(
                pendingResize.width,
                pendingResize.height,
                pendingResize.devicePixelRatio,
            );
        } else {
            return false;
        }

        resizeDirty = false;
        return true;
    };

    const deliverInput = () => {
        if (!inputDirty) return false;

        const snapshot = { ...pendingInput };
        if ((mode === 'worker' || mode === 'worker-starting') && worker) {
            worker.postMessage({ type: 'input', input: snapshot });
        } else if (mode === 'fallback' && fallbackEngine) {
            fallbackEngine.updateInput(snapshot);
        } else {
            return false;
        }

        pendingInput.wheelEnergy = 0;
        pendingInput.resetGalaxy = false;
        inputDirty = false;
        return true;
    };

    const flushPendingState = () => {
        flushFrameId = null;
        if (disposed) return;
        deliverResize();
        deliverInput();
    };

    const scheduleFlush = () => {
        if (flushFrameId === null && !disposed) {
            flushFrameId = window.requestAnimationFrame(flushPendingState);
        }
    };

    const refreshScrollState = () => {
        Object.assign(pendingInput, readScrollState());
        inputDirty = true;
    };

    const startFallback = async (reason) => {
        if (fallbackPromise || disposed) return fallbackPromise;

        clearWorkerReadyTimer();
        if (worker) {
            worker.terminate();
            worker = null;
        }
        if (canvasTransferred) {
            canvas = replaceTransferredCanvas(canvas);
            canvasTransferred = false;
        }

        mode = 'fallback-loading';
        resizeDirty = true;
        inputDirty = true;

        fallbackPromise = import('./blackHoleFallback.js')
            .then(({ startBlackHoleFallback }) => {
                if (disposed) return null;
                fallbackEngine = startBlackHoleFallback({
                    canvas,
                    ...pendingResize,
                    isMobile,
                    isTablet,
                    prefersReducedMotion,
                    input: { ...pendingInput },
                });
                mode = 'fallback';
                scheduleFlush();
                return fallbackEngine;
            })
            .catch((error) => {
                console.error('Không thể khởi động Three.js fallback:', reason, error);
                return null;
            });

        return fallbackPromise;
    };

    const isIOS = typeof navigator !== 'undefined'
        && (/iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    const canUseWorker = !isIOS
        && typeof Worker === 'function'
        && typeof OffscreenCanvas === 'function'
        && typeof canvas.transferControlToOffscreen === 'function';

    if (canUseWorker) {
        try {
            mode = 'worker-starting';
            worker = new Worker(new URL('./blackHole.worker.js', import.meta.url), {
                type: 'module',
                name: 'black-hole-renderer',
            });

            worker.onmessage = (event) => {
                if (event.data.type === 'ready') {
                    clearWorkerReadyTimer();
                    mode = 'worker';
                    scheduleFlush();
                } else if (event.data.type === 'fatal') {
                    startFallback(event.data.message);
                }
            };
            worker.onerror = (event) => {
                event.preventDefault();
                startFallback(event.message || 'Black hole Worker failed to load.');
            };

            const offscreenCanvas = canvas.transferControlToOffscreen();
            canvasTransferred = true;
            worker.postMessage({
                type: 'init',
                canvas: offscreenCanvas,
                ...viewport,
                isMobile,
                isTablet,
                prefersReducedMotion,
                input: { ...pendingInput },
            }, [offscreenCanvas]);

            workerReadyTimer = window.setTimeout(() => {
                startFallback('Black hole Worker initialization timed out.');
            }, WORKER_READY_TIMEOUT_MS);
        } catch (error) {
            startFallback(error);
        }
    } else {
        startFallback('OffscreenCanvas Worker is not supported.');
    }

    const handleMouseMove = (event) => {
        pendingInput.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        pendingInput.mouseY = (event.clientY / window.innerHeight) * 2 - 1;
        inputDirty = true;
        scheduleFlush();
    };

    const handleWheel = (event) => {
        if (!prefersReducedMotion) {
            const impulse = Math.min(Math.abs(event.deltaY) / 280, 1);
            pendingInput.wheelEnergy += impulse * 0.82;
            inputDirty = true;
            scheduleFlush();
        }
    };

    const handleScroll = () => {
        refreshScrollState();
        scheduleFlush();
    };

    const handleResize = () => {
        pendingResize = readViewport();
        resizeDirty = true;
        refreshScrollState();
        scheduleFlush();
    };

    const handleVisibilityChange = () => {
        pendingInput.visible = !document.hidden;
        refreshScrollState();

        if (worker && (mode === 'worker' || mode === 'worker-starting')) {
            deliverInput();
            worker.postMessage({ type: 'visibility', visible: pendingInput.visible });
        } else if (fallbackEngine) {
            deliverInput();
            fallbackEngine.setVisibility(pendingInput.visible);
        }
        scheduleFlush();
    };

    const handleResetGalaxy = () => {
        pendingInput.mouseX = 0;
        pendingInput.mouseY = 0;
        pendingInput.resetGalaxy = true;
        inputDirty = true;
        scheduleFlush();
    };

    if (!isMobile) {
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('resetGalaxy', handleResetGalaxy);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const documentResizeObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            refreshScrollState();
            scheduleFlush();
        })
        : null;
    documentResizeObserver?.observe(document.documentElement);

    const cleanup = () => {
        if (disposed) return;
        disposed = true;
        clearWorkerReadyTimer();

        if (flushFrameId !== null) {
            window.cancelAnimationFrame(flushFrameId);
            flushFrameId = null;
        }

        if (!isMobile) {
            window.removeEventListener('mousemove', handleMouseMove);
        }
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('resetGalaxy', handleResetGalaxy);
        window.removeEventListener('beforeunload', cleanup);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        documentResizeObserver?.disconnect();

        fallbackEngine?.dispose();
        fallbackEngine = null;

        if (worker) {
            const workerToClose = worker;
            worker = null;
            workerToClose.postMessage({ type: 'dispose' });
            window.setTimeout(() => workerToClose.terminate(), 250);
        }
    };

    window.addEventListener('beforeunload', cleanup, { once: true });
    return cleanup;
}
