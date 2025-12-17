import * as THREE from 'three';
import Stats from 'stats.js';

/**
 * Class for detailed performance monitoring of Three.js
 */
export class PerformanceMonitor {
    constructor(renderer, scene) {
        this.renderer = renderer;
        this.scene = scene;
        this.stats = null;
        this.logInterval = null;
        this.enabled = true;
        this.keyboardListener = null;
        
        this.init();
    }

    init() {
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
        this.stats.dom.style.position = 'absolute';
        this.stats.dom.style.top = '0px';
        this.stats.dom.style.left = '0px';
        this.stats.dom.style.zIndex = '1000';
        document.body.appendChild(this.stats.dom);

        this.setupKeyboardLogging();
    }

    setupKeyboardLogging() {
        this.keyboardListener = (event) => {
            if (event.key === 'i' || event.key === 'I') {
                if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
                    event.preventDefault();
                    this.logDetailedStats();
                }
            }
        };
        
        window.addEventListener('keydown', this.keyboardListener);
        console.log('Press I for detailed performance statistics');
    }

    stopLogging() {
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
        if (this.keyboardListener) {
            window.removeEventListener('keydown', this.keyboardListener);
            this.keyboardListener = null;
        }
    }

    logDetailedStats() {
        const info = this.renderer.info;
        
        console.group('Detailed Performance Statistics');
        
        console.log('General Info:');
        console.log(`FPS: ${this.stats.dom.children[0].textContent}`);
        console.log(`Resolution: ${this.renderer.domElement.width}x${this.renderer.domElement.height}`);
        console.log(`Pixel Ratio: ${this.renderer.getPixelRatio()}`);
        
        console.log('\nGeometry:');
        console.log(`Total geometries: ${info.memory.geometries}`);
        console.log(`Total vertices: ${(info.render.vertices || 0).toLocaleString()}`);
        console.log(`Total triangles: ${(info.render.triangles || 0).toLocaleString()}`);
        console.log(`Total points: ${(info.render.points || 0).toLocaleString()}`);
        console.log(`Total lines: ${(info.render.lines || 0).toLocaleString()}`);
        
        console.log('\nObjects:');
        console.log(`Total objects: ${info.render.objects || 0}`);
        console.log(`Meshes: ${(info.render.faces || 0).toLocaleString()}`);
        
        console.log('\nTextures:');
        console.log(`Total textures: ${info.memory.textures}`);
        console.log(`Texture memory size: ${this.formatBytes(this.calculateTextureMemory())}`);
        
        this.logTextureDetails();
        
        console.log('\nShaders:');
        console.log(`Total programs: ${info.programs?.length || 0}`);
        
        console.log('\nShadows:');
        this.logShadowDetails();
        
        console.log('\nRendering:');
        console.log(`Draw Calls: ${info.render.calls}`);
        console.log(`Frame: ${info.render.frame}`);
        
        console.log('\nMemory:');
        console.log(`Geometries: ${info.memory.geometries}`);
        console.log(`Textures: ${info.memory.textures}`);
        
        console.log('\nRenderer Settings:');
        const hasAntialiasing = this.renderer.capabilities.isWebGL2 || 
                                (this.renderer.getContext && this.renderer.getContext().getParameter(0x1C00));
        console.log(`Antialiasing: ${this.renderer.antialias ? 'Enabled (MSAA hardware)' : 'Disabled'} | Post-processing: Disabled`);
        console.log(`Shadow Map: ${this.renderer.shadowMap.enabled ? 'Enabled' : 'Disabled'}`);
        console.log(`Shadow Map Type: ${this.getShadowMapTypeName(this.renderer.shadowMap.type)}`);
        console.log(`Tone Mapping: ${this.getToneMappingName(this.renderer.toneMapping)}`);
        console.log(`Output Color Space: ${this.renderer.outputColorSpace}`);
        
        console.groupEnd();
    }

    logTextureDetails() {
        const textures = [];
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                const material = object.material;
                
                const textureTypes = [
                    { name: 'map', prop: material.map },
                    { name: 'normalMap', prop: material.normalMap },
                    { name: 'roughnessMap', prop: material.roughnessMap },
                    { name: 'metalnessMap', prop: material.metalnessMap },
                    { name: 'aoMap', prop: material.aoMap },
                    { name: 'emissiveMap', prop: material.emissiveMap },
                    { name: 'envMap', prop: material.envMap }
                ];
                
                textureTypes.forEach(({ name, prop }) => {
                    if (prop && prop.isTexture) {
                        textures.push({
                            name,
                            width: prop.image?.width || 0,
                            height: prop.image?.height || 0,
                            format: prop.format,
                            type: prop.type,
                            size: this.calculateTextureSize(prop)
                        });
                    }
                });
            }
        });

        if (textures.length > 0) {
            console.log('Texture Details:');
            const textureGroups = {};
            textures.forEach(tex => {
                const key = `${tex.name}_${tex.width}x${tex.height}`;
                if (!textureGroups[key]) {
                    textureGroups[key] = { ...tex, count: 0 };
                }
                textureGroups[key].count++;
            });

            Object.values(textureGroups).forEach(tex => {
                console.log(`- ${tex.name}: ${tex.width}x${tex.height} (${tex.count}x) - ${this.formatBytes(tex.size)}`);
            });
        }
    }

    logShadowDetails() {
        const lights = [];
        this.scene.traverse((object) => {
            if (object.isLight && object.castShadow) {
                lights.push({
                    type: object.type,
                    shadowMapSize: object.shadow?.mapSize || { width: 0, height: 0 },
                    shadowCamera: object.shadow?.camera
                });
            }
        });

        if (lights.length > 0) {
            console.log(`Lights with shadows: ${lights.length}`);
            lights.forEach((light, index) => {
                const size = light.shadowMapSize;
                const totalSize = size.width * size.height * 4;
                console.log(`${index + 1}. ${light.type}:`);
                console.log(`Shadow Map: ${size.width}x${size.height} (${this.formatBytes(totalSize)})`);
                if (light.shadowCamera) {
                    const cam = light.shadowCamera;
                    console.log(`Camera: ${cam.left?.toFixed(2)} to ${cam.right?.toFixed(2)}, ${cam.bottom?.toFixed(2)} to ${cam.top?.toFixed(2)}`);
                }
            });
        } else {
            console.log('No lights with shadows');
        }
    }

    calculateTextureSize(texture) {
        if (!texture.image) return 0;
        
        const width = texture.image.width || 0;
        const height = texture.image.height || 0;
        
        if (width === 0 || height === 0) return 0;
        
        let bytesPerPixel = 4;
        
        if (texture.format === THREE.RGBFormat) {
            bytesPerPixel = 3;
        } else if (texture.format === THREE.RGBAFormat) {
            bytesPerPixel = 4;
        } else if (texture.format === THREE.RGFormat) {
            bytesPerPixel = 2;
        } else if (texture.format === THREE.RedFormat) {
            bytesPerPixel = 1;
        }
        
        if (texture.type === THREE.FloatType || texture.type === THREE.HalfFloatType) {
            bytesPerPixel *= 4;
        } else if (texture.type === THREE.UnsignedByteType) {
        }
        
        const mipmapMultiplier = texture.generateMipmaps ? 1.33 : 1.0;
        
        return width * height * bytesPerPixel * mipmapMultiplier;
    }

    calculateTextureMemory() {
        let totalSize = 0;
        const processedTextures = new Set();
        
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                const material = object.material;
                const textureProps = [
                    material.map,
                    material.normalMap,
                    material.roughnessMap,
                    material.metalnessMap,
                    material.aoMap,
                    material.emissiveMap,
                    material.envMap
                ];
                
                textureProps.forEach(texture => {
                    if (texture && texture.isTexture && !processedTextures.has(texture.uuid)) {
                        processedTextures.add(texture.uuid);
                        totalSize += this.calculateTextureSize(texture);
                    }
                });
            }
        });
        
        if (this.scene.environment && !processedTextures.has(this.scene.environment.uuid)) {
            totalSize += this.calculateTextureSize(this.scene.environment);
        }
        
        return totalSize;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getShadowMapTypeName(type) {
        const types = {
            [THREE.BasicShadowMap]: 'BasicShadowMap',
            [THREE.PCFShadowMap]: 'PCFShadowMap',
            [THREE.PCFSoftShadowMap]: 'PCFSoftShadowMap',
            [THREE.VSMShadowMap]: 'VSMShadowMap'
        };
        return types[type] || 'Unknown';
    }

    getToneMappingName(type) {
        const types = {
            [THREE.NoToneMapping]: 'NoToneMapping',
            [THREE.LinearToneMapping]: 'LinearToneMapping',
            [THREE.ReinhardToneMapping]: 'ReinhardToneMapping',
            [THREE.CineonToneMapping]: 'CineonToneMapping',
            [THREE.ACESFilmicToneMapping]: 'ACESFilmicToneMapping',
            [THREE.AgXToneMapping]: 'AgXToneMapping',
            [THREE.NeutralToneMapping]: 'NeutralToneMapping'
        };
        return types[type] || 'Unknown';
    }

    begin() {
        if (this.stats) {
            this.stats.begin();
        }
    }

    end() {
        if (this.stats) {
            this.stats.end();
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (this.stats) {
            this.stats.dom.style.display = enabled ? 'block' : 'none';
        }
    }


    dispose() {
        this.stopLogging();
        if (this.stats && this.stats.dom.parentNode) {
            this.stats.dom.parentNode.removeChild(this.stats.dom);
        }
    }
}

