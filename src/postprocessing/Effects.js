import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { N8AOPass } from 'n8ao';
import { POSTPROCESSING_CONSTANTS } from '../config/constants.js';

export class Effects {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer = null;
        this.bloomPass = null;
        this.bloomEnabled = false;
        this.antialiasingPass = null;
        this.usePostProcessingAA = true;
        this.vignettePass = null;
        this.vignetteEnabled = false;
        this.n8aoPass = null;
        this.aoEnabled = false;
        
        this.init();
    }

    init() {
        const isWebGL2 = this.renderer.capabilities.isWebGL2;
        
        try {
            this.composer = new EffectComposer(this.renderer);
            console.log('EffectComposer created (hardware MSAA via renderer.antialias)');
        } catch (error) {
            console.warn('Error creating EffectComposer with options, using standard:', error);
            this.composer = new EffectComposer(this.renderer);
        }

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        if (this.usePostProcessingAA) {
            this.initFXAA();
            console.log('FXAA enabled for anti-aliasing (required when using EffectComposer)');
        } else {
            console.log('Warning: Without FXAA, anti-aliasing may not work when using EffectComposer');
        }

        try {
            this.n8aoPass = new N8AOPass(
                this.scene,
                this.camera,
                window.innerWidth,
                window.innerHeight
            );
            this.n8aoPass.configuration.aoSamples = POSTPROCESSING_CONSTANTS.N8AO_SAMPLES;
            this.n8aoPass.configuration.denoiseSamples = POSTPROCESSING_CONSTANTS.N8AO_DENOISE_SAMPLES;
            this.n8aoPass.configuration.denoiseRadius = POSTPROCESSING_CONSTANTS.N8AO_DENOISE_RADIUS;
            this.n8aoPass.configuration.aoRadius = POSTPROCESSING_CONSTANTS.N8AO_RADIUS;
            this.n8aoPass.configuration.distanceFalloff = POSTPROCESSING_CONSTANTS.N8AO_DISTANCE_FALLOFF;
            this.n8aoPass.configuration.intensity = POSTPROCESSING_CONSTANTS.N8AO_INTENSITY;
            this.n8aoPass.enabled = true;
            this.aoEnabled = true;
            this.composer.addPass(this.n8aoPass);
            console.log('N8AO (GTAO) ready and enabled by default');
            console.log('Use window.app.effects.setAO(false) to disable');
        } catch (error) {
            console.warn('Failed to initialize N8AO:', error);
        }
        
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            POSTPROCESSING_CONSTANTS.BLOOM_STRENGTH,
            POSTPROCESSING_CONSTANTS.BLOOM_RADIUS,
            POSTPROCESSING_CONSTANTS.BLOOM_THRESHOLD
        );
        this.bloomPass.enabled = true;
        this.bloomEnabled = true;
        this.composer.addPass(this.bloomPass);
        
        try {
            this.vignettePass = new ShaderPass(VignetteShader);
            this.vignettePass.material.uniforms['offset'].value = POSTPROCESSING_CONSTANTS.VIGNETTE_OFFSET;
            this.vignettePass.material.uniforms['darkness'].value = POSTPROCESSING_CONSTANTS.VIGNETTE_DARKNESS;
            this.vignettePass.enabled = true;
            this.vignetteEnabled = true;
            this.composer.addPass(this.vignettePass);
            console.log('Vignette ready and enabled by default (dark edges)');
        } catch (error) {
            console.warn('Failed to initialize Vignette:', error);
        }
    }

    initFXAA() {
        const fxaaPass = new ShaderPass(FXAAShader);
        const pixelRatio = this.renderer.getPixelRatio();
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
        fxaaPass.enabled = true;
        this.antialiasingPass = fxaaPass;
        this.composer.addPass(fxaaPass);
        console.log('FXAA enabled for anti-aliasing (required when using EffectComposer)');
        console.log('FXAA added to end of effect chain for proper anti-aliasing');
    }

    setBloom(enabled) {
        this.bloomEnabled = enabled;
        if (this.bloomPass) {
            this.bloomPass.enabled = enabled;
        }
    }
    
    setBloomParams(params = {}) {
        if (!this.bloomPass) return;
        
        if (params.threshold !== undefined) {
            this.bloomPass.threshold = params.threshold;
        }
        if (params.strength !== undefined) {
            this.bloomPass.strength = params.strength;
        }
        if (params.radius !== undefined) {
            this.bloomPass.radius = params.radius;
        }
    }
    
    getBloomParams() {
        if (!this.bloomPass) {
            return { 
                threshold: POSTPROCESSING_CONSTANTS.BLOOM_THRESHOLD, 
                strength: POSTPROCESSING_CONSTANTS.BLOOM_STRENGTH, 
                radius: POSTPROCESSING_CONSTANTS.BLOOM_RADIUS 
            };
        }
        return {
            threshold: this.bloomPass.threshold,
            strength: this.bloomPass.strength,
            radius: this.bloomPass.radius
        };
    }

    needsComposer() {
        return this.bloomEnabled || this.vignetteEnabled || this.aoEnabled || this.usePostProcessingAA;
    }
    
    setVignette(enabled) {
        this.vignetteEnabled = enabled;
        if (this.vignettePass) {
            this.vignettePass.enabled = enabled;
        }
    }
    
    setAO(enabled) {
        this.aoEnabled = enabled;
        if (this.n8aoPass) {
            this.n8aoPass.enabled = enabled;
        }
    }
    
    setAntialiasing(enabled) {
        if (this.antialiasingPass) {
            this.antialiasingPass.enabled = enabled;
        }
    }
    
    setFXAA(enabled) {
        this.setAntialiasing(enabled);
    }

    setSize(width, height) {
        this.composer.setSize(width, height);
        
        if (this.bloomPass && this.bloomPass.setSize) {
            this.bloomPass.setSize(width, height);
        }
        
        if (this.n8aoPass && this.n8aoPass.setSize) {
            this.n8aoPass.setSize(width, height);
        }
        
        if (this.usePostProcessingAA && this.antialiasingPass) {
            const pixelRatio = this.renderer.getPixelRatio();
            if (this.antialiasingPass.material && this.antialiasingPass.material.uniforms) {
                const fxaaPass = this.antialiasingPass;
                if (fxaaPass.material.uniforms['resolution']) {
                    fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
                    fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
                }
            }
        }
    }

    render() {
        this.composer.render();
    }

    getComposer() {
        return this.composer;
    }
}

