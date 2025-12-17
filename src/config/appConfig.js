export const DEBUG_CONFIG = {
    envFlagKey: 'VITE_DEBUG',
    queryParam: 'debug',
};

export const RENDER_CONFIG = {
    maxAnisotropyFallback: 16,
    staticFrameThreshold: 3,
};

export const ROOM_CONFIG = {
    width: 3,
    height: 3,
    wallHeight: 3.0,
    wallThickness: 0.11,
};

export const MODEL_CONFIG = {
    window: {
        path: 'models/window.glb',
        position: [0.014, 1.667, -1.5],
        rotation: [0, 0, 0],
        scale: 1.0,
        positionMode: 'center',
        positionOffset: { x: 0.015, y: 0.037 },
    },
    door: {
        path: 'models/door.glb',
        position: [-1.5, 1.0655, -0.013],
        rotation: [0, Math.PI / 2, 0],
        scale: 1.0,
        positionMode: 'center',
    },
    chair: {
        path: 'models/chair.glb',
        position: [-0.5, 0, -0.5],
        rotation: [0, Math.PI / 4, 0],
        scale: 1.0,
    },
    lauters: {
        path: 'models/lauters.glb',
        position: [0.8, 0, -0.5],
        rotation: [0, 0, 0],
        scale: 0.8,
        positionMode: 'floor',
    },
};

export const HDRI_CONFIG = {
    day: {
        environmentPath: 'textures/hdri/kloofendal_48d_partly_cloudy_puresky_256.hdr',
        backgroundPath: 'textures/hdri/kloofendal_48d_partly_cloudy_puresky.jpg',
    },
    night: {
        environmentPath: 'textures/hdri/moonless_golf_256.hdr',
        backgroundPath: 'textures/hdri/moonless_golf.jpg',
    },
};

export const WINDOW_LIGHT_FALLBACK = {
    position: [0.5, 2.15, -1.4],
    width: 1.2,
    height: 1.5,
};

export const APP_CONFIG = {
    loadingDelays: {
        uiUpdate: 100,
        materialsUpdate: 100,
        lightingControlsRefresh: 200,
        hideLoading: 500
    },
    loadingProgress: {
        base: 10,
        materials: 30,
        models: 40,
        room: 50,
        hdri: 60,
        furniture: 70,
        performance: 72,
        postProcessing: 90,
        ui: 95,
        complete: 100
    },
    windowGlass: {
        opacity: 0.2,
        roughness: 0.05,
        transmission: 0.9,
        envMapIntensity: 1.5,
        reflectivity: 0.5
    },
    door: {
        roughnessMultiplier: 1.5
    },
    lightingSystem: {
        lampShadeEmissiveIntensityNight: 1.0
    }
};


