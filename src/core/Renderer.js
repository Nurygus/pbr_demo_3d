import * as THREE from 'three';
import { RENDERER_CONSTANTS } from '../config/constants.js';

export class Renderer {
    constructor(container) {
        this.container = container;
        this.renderer = null;
        this.init();
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        
        if (!this.renderer.userData) {
            this.renderer.userData = {};
        }
        
        const maxAnisotropy = this.renderer.capabilities?.getMaxAnisotropy?.() || 16;
        console.log(`Max anisotropic filtering: ${maxAnisotropy}`);
        this.renderer.userData.maxAnisotropy = maxAnisotropy;

        this.setSize(window.innerWidth, window.innerHeight);
        
        const devicePixelRatio = window.devicePixelRatio || 1;
        this.renderer.setPixelRatio(devicePixelRatio);
        console.log(`Pixel Ratio: ${devicePixelRatio.toFixed(2)}`);

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = RENDERER_CONSTANTS.TONE_MAPPING_EXPOSURE_DEFAULT;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;

        this.renderer.setClearColor(0x000000, 1);
        this.container.appendChild(this.renderer.domElement);
        window.addEventListener('resize', () => this.handleResize());
    }

    setSize(width, height) {
        this.renderer.setSize(width, height);
    }

    handleResize() {
        this.setSize(window.innerWidth, window.innerHeight);
    }

    setExposure(exposure) {
        this.renderer.toneMappingExposure = exposure;
    }

    render(scene, camera) {
        this.renderer.render(scene, camera);
    }

    getRenderer() {
        return this.renderer;
    }
}

