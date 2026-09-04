import { createBlackHoleEngine } from './blackHoleEngine.js';

export function startBlackHoleFallback({
    canvas,
    width,
    height,
    devicePixelRatio,
    isMobile,
    isTablet,
    prefersReducedMotion,
    input,
    onScreenImpact = null,
}) {
    const engine = createBlackHoleEngine({
        canvas,
        width,
        height,
        devicePixelRatio,
        isMobile,
        isTablet,
        prefersReducedMotion,
        initialInput: input,
        onScreenImpact,
    });
    engine.start();
    return engine;
}
