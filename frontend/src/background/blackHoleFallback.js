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
    });
    engine.start();
    return engine;
}
