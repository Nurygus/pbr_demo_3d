import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { getAssetPath } from './helpers.js';

export class HDRILoader {
    constructor() {
        this.loader = new RGBELoader();
        this.pmremGenerator = null;
    }

    initPMREM(renderer) {
        this.pmremGenerator = new THREE.PMREMGenerator(renderer);
        this.pmremGenerator.compileEquirectangularShader();
    }

    async loadHDRI(url, intensity = 1.0) {
        const attempts = [
            { type: THREE.FloatType, name: 'FloatType' },
            { type: THREE.UnsignedByteType, name: 'UnsignedByteType' },
            { type: THREE.HalfFloatType, name: 'HalfFloatType' }
        ];
        
        let lastError = null;
        const assetUrl = getAssetPath(url);
        
        for (const attempt of attempts) {
            try {
                this.loader.setDataType(attempt.type);
                const texture = await this.loader.loadAsync(assetUrl);
                
                console.log(`HDRI loaded (${attempt.name}):`, assetUrl);
                console.log(`Size: ${texture.image?.width || 'N/A'}x${texture.image?.height || 'N/A'}`);
                console.log(`Format: ${texture.format}, Type: ${texture.type}`);
                
                texture.mapping = THREE.EquirectangularReflectionMapping;
                texture.colorSpace = THREE.LinearSRGBColorSpace;
                
                if (texture.image?.data) {
                    const data = texture.image.data;
                    let maxValue = 0;
                    let minValue = Infinity;
                    const sampleSize = Math.min(1000, data.length);
                    const isFloatType = texture.type === THREE.FloatType || texture.type === THREE.HalfFloatType;
                    
                    for (let i = 0; i < sampleSize; i += 4) {
                        let r, g, b;
                        if (isFloatType) {
                            r = data[i];
                            g = data[i + 1];
                            b = data[i + 2];
                        } else {
                            r = data[i] / 255;
                            g = data[i + 1] / 255;
                            b = data[i + 2] / 255;
                        }
                        const brightness = (r + g + b) / 3;
                        maxValue = Math.max(maxValue, brightness);
                        minValue = Math.min(minValue, brightness);
                    }
                    console.log(`Brightness (sample): min=${minValue.toFixed(3)}, max=${maxValue.toFixed(3)}`);
                    if (maxValue < 0.1 && maxValue > 0.01) {
                        console.warn(`Texture is very dark. Possible loading or encoding issue.`);
                    }
                }
                
                texture.userData.intensity = intensity;
                texture.userData.originalUrl = url;
                
                if (this.pmremGenerator) {
                    console.log('Processing via PMREM for IBL...');
                    
                    const pmremTexture = this.pmremGenerator.fromEquirectangular(texture);
                    const envMap = pmremTexture.texture;
                    
                    if (!envMap) {
                        throw new Error('PMREM did not return a texture');
                    }
                    
                    if (envMap.colorSpace !== THREE.LinearSRGBColorSpace) {
                        envMap.colorSpace = THREE.LinearSRGBColorSpace;
                    }
                    
                    envMap.userData.intensity = intensity;
                    envMap.userData.originalUrl = url;
                    
                    const backgroundTexture = texture.clone();
                    backgroundTexture.mapping = THREE.EquirectangularReflectionMapping;
                    
                    if (texture.type === THREE.FloatType || texture.type === THREE.HalfFloatType) {
                        backgroundTexture.colorSpace = THREE.NoColorSpace;
                    } else {
                        backgroundTexture.colorSpace = THREE.SRGBColorSpace;
                    }
                    envMap.userData.backgroundTexture = backgroundTexture;
                    
                    console.log('HDRI processed via PMREM for IBL');
                    return envMap;
                } else {
                    console.log('PMREMGenerator not initialized, using texture directly');
                    return texture;
                }
            } catch (error) {
                console.error(`HDRI load error (${attempt.name}):`, error.message);
                lastError = error;
                continue;
            }
        }
        
        console.error('All HDRI load attempts failed');
        throw lastError || new Error('Failed to load HDRI');
    }

    async loadDayHDRI(url = null, intensity = 1.0) {
        if (url) {
            try {
                return await this.loadHDRI(url, intensity);
            } catch (error) {
                console.warn('Failed to load HDRI, using procedural:', error);
                return this.createProceduralHDRI();
            }
        }
        return this.createProceduralHDRI();
    }

    async loadNightHDRI(url = null, intensity = 1.0) {
        if (url) {
            try {
                return await this.loadHDRI(url, intensity);
            } catch (error) {
                console.warn('Failed to load HDRI, using procedural:', error);
                return this.createNightHDRI();
            }
        }
        return this.createNightHDRI();
    }

    createProceduralHDRI() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size * 2;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#E0F6FF');
        gradient.addColorStop(1, '#F0F0F0');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size * 2, size);

        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    }

    createNightHDRI() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size * 2;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.3, '#16213e');
        gradient.addColorStop(0.7, '#0f3460');
        gradient.addColorStop(1, '#533483');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size * 2, size);

        ctx.fillStyle = '#ffaa44';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * size * 2;
            const y = size * 0.7 + Math.random() * size * 0.3;
            const radius = 2 + Math.random() * 3;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    }

    dispose() {
        if (this.pmremGenerator) {
            this.pmremGenerator.dispose();
        }
    }
}
