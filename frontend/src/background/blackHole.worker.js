import { createBlackHoleEngine } from './blackHoleEngine.js';

let engine = null;
let fatalReported = false;

function reportFatal(error) {
    if (fatalReported) return;
    fatalReported = true;
    self.postMessage({
        type: 'fatal',
        message: error instanceof Error ? error.message : String(error),
    });
    engine?.dispose();
    engine = null;
}

self.addEventListener('error', (event) => {
    reportFatal(event.error || event.message || 'Unknown black hole worker error.');
});

self.addEventListener('unhandledrejection', (event) => {
    reportFatal(event.reason || 'Unhandled black hole worker rejection.');
});

self.onmessage = (event) => {
    const message = event.data;

    try {
        switch (message.type) {
            case 'init':
                engine = createBlackHoleEngine({
                    canvas: message.canvas,
                    width: message.width,
                    height: message.height,
                    devicePixelRatio: message.devicePixelRatio,
                    isMobile: message.isMobile,
                    isTablet: message.isTablet,
                    prefersReducedMotion: message.prefersReducedMotion,
                    initialInput: message.input,
                });
                engine.start();
                self.postMessage({ type: 'ready' });
                break;
            case 'input':
                engine?.updateInput(message.input);
                break;
            case 'resize':
                engine?.resize(message.width, message.height, message.devicePixelRatio);
                break;
            case 'visibility':
                engine?.setVisibility(message.visible);
                break;
            case 'dispose':
                engine?.dispose();
                engine = null;
                self.close();
                break;
            default:
                break;
        }
    } catch (error) {
        reportFatal(error);
    }
};
