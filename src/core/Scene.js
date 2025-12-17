import * as THREE from 'three';
import { POSTPROCESSING_CONSTANTS } from '../config/constants.js';

export class Scene {
    constructor() {
        this.scene = new THREE.Scene();
    }

    getScene() {
        return this.scene;
    }

    setEnvironment(envMap, intensity = 1.0) {
        if (!envMap) {
            console.warn('Environment map not provided');
            return;
        }
        
        this.scene.environment = envMap;
        
        if (this.scene.environment !== envMap) {
            console.error('Failed to set scene.environment');
        }
        
        if (envMap.userData?.backgroundTexture) {
            const bgTexture = envMap.userData.backgroundTexture;
            
            if (bgTexture.type === THREE.FloatType || bgTexture.type === THREE.HalfFloatType) {
                if (bgTexture.colorSpace === THREE.SRGBColorSpace) {
                    bgTexture.colorSpace = THREE.NoColorSpace;
                }
            } else {
                if (bgTexture.colorSpace !== THREE.SRGBColorSpace) {
                    bgTexture.colorSpace = THREE.SRGBColorSpace;
                }
            }
            
            this.scene.background = bgTexture;
        } else {
            const bgTexture = envMap.clone ? envMap.clone() : envMap;
            if (bgTexture.type === THREE.FloatType || bgTexture.type === THREE.HalfFloatType) {
                if (bgTexture.colorSpace === THREE.SRGBColorSpace) {
                    bgTexture.colorSpace = THREE.NoColorSpace;
                }
            } else {
                if (bgTexture.colorSpace !== THREE.SRGBColorSpace) {
                    bgTexture.colorSpace = THREE.SRGBColorSpace;
                }
            }
            this.scene.background = bgTexture;
        }
        
        if (!this.scene.background) {
            console.error('Failed to set scene.background');
        }
        
        if ('backgroundBlurriness' in this.scene) {
            this.scene.backgroundBlurriness = POSTPROCESSING_CONSTANTS.BACKGROUND_BLURRINESS;
        }
        
        if ('environmentIntensity' in this.scene) {
            this.scene.environmentIntensity = intensity;
        }
        
        this.applyIBLToMaterials(intensity);
    }
    
    applyIBLToMaterials(intensity) {
        if (!this.scene.environment) {
            return;
        }
        
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                
                materials.forEach(material => {
                    if (material.isMeshStandardMaterial || 
                        material.isMeshPhysicalMaterial || 
                        material.isMeshLambertMaterial) {
                        
                        material.envMap = this.scene.environment;
                        
                        const factor = material.userData?.envIntensityFactor ?? 1.0;
                        material.envMapIntensity = intensity * factor;
                        
                        this.updateMaterialTextures(material, 16);
                        
                        if (material.isMeshPhysicalMaterial) {
                            if (material.sheen === undefined || material.sheen === 0) {
                                material.sheen = 0.2;
                                material.sheenColor = new THREE.Color(0xffffff);
                                material.sheenRoughness = 0.5;
                            }
                        }
                    }
                });
            }
        });
    }
    
    updateMaterialTextures(material, maxAnisotropy = 16) {
        const textureProperties = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
            'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap'
        ];
        
        textureProperties.forEach(prop => {
            const texture = material[prop];
            if (texture && texture.isTexture) {
                if (texture.anisotropy === undefined || texture.anisotropy === 1) {
                    texture.anisotropy = maxAnisotropy;
                }
                
                if (!texture.generateMipmaps) {
                    texture.generateMipmaps = true;
                }
                
                if (texture.minFilter === THREE.NearestFilter || texture.minFilter === THREE.LinearFilter) {
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                }
                if (texture.magFilter === THREE.NearestFilter) {
                    texture.magFilter = THREE.LinearFilter;
                }
                
                if (prop === 'normalMap' && texture.mipMapBias === undefined) {
                    texture.mipMapBias = 0.3;
                }
                
                texture.needsUpdate = true;
            }
        });
        
        if (material.roughness !== undefined && typeof material.roughness === 'number' && material.roughness < 0.05) {
            material.roughness = Math.max(0.05, material.roughness);
        }
    }
    
    updateAllMaterials(intensity = 1.0, maxAnisotropy = 16) {
        this.applyIBLToMaterials(intensity);
        
        this.scene.traverse((object) => {
            if (object.isMesh) {
                if (object.castShadow === undefined) {
                    object.castShadow = true;
                }
                if (object.receiveShadow === undefined) {
                    object.receiveShadow = true;
                }
                
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                materials.forEach(material => {
                    this.updateMaterialTextures(material, maxAnisotropy);
                });
            }
        });
    }
    
    setEnvironmentRotation(rotationY) {
        if ('environmentRotation' in this.scene) {
            this.scene.environmentRotation.y = rotationY;
        }
        if ('backgroundRotation' in this.scene) {
            this.scene.backgroundRotation.y = rotationY;
        }
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }
}
