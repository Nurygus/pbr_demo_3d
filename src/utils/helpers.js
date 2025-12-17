import * as THREE from 'three';
import { MATERIAL_CONSTANTS } from '../config/constants.js';

export async function loadTexture(url, options = {}, maxAnisotropy = 16) {
    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(url);
    
    texture.wrapS = options.wrapS || THREE.RepeatWrapping;
    texture.wrapT = options.wrapT || THREE.RepeatWrapping;
    texture.repeat.set(
        options.repeatX || 1,
        options.repeatY || 1
    );
    texture.colorSpace = options.colorSpace || THREE.SRGBColorSpace;
    
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    if (options.mipMapBias !== undefined) {
        texture.mipMapBias = options.mipMapBias;
    } else {
        texture.mipMapBias = MATERIAL_CONSTANTS.MIPMAP_BIAS_DEFAULT;
    }
    
    texture.anisotropy = maxAnisotropy;
    
    return texture;
}

export function extractChannel(texture, channel, maxAnisotropy = 16) {
    if (!texture.image || !texture.image.complete) {
        console.warn('Texture not yet loaded, waiting...');
    }

    const canvas = document.createElement('canvas');
    const img = texture.image;
    canvas.width = img.width || img.naturalWidth;
    canvas.height = img.height || img.naturalHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const channelIndex = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;
    
    for (let i = 0; i < data.length; i += 4) {
        const value = data[i + channelIndex];
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.wrapS = texture.wrapS;
    newTexture.wrapT = texture.wrapT;
    newTexture.repeat.copy(texture.repeat);
    newTexture.colorSpace = THREE.NoColorSpace;
    
    newTexture.generateMipmaps = true;
    newTexture.minFilter = THREE.LinearMipmapLinearFilter;
    newTexture.magFilter = THREE.LinearFilter;
    newTexture.mipMapBias = MATERIAL_CONSTANTS.MIPMAP_BIAS_SHARP;
    newTexture.needsUpdate = true;
    
    newTexture.anisotropy = maxAnisotropy;
    
    return newTexture;
}

export function createPBRMaterial(textures, params = {}) {
    const maxAnisotropy = params.maxAnisotropy || 16;
    delete params.maxAnisotropy;
    
    const materialParams = {
        map: textures.albedo || null,
        normalMap: textures.normal || null,
        roughnessMap: textures.roughness || null,
        aoMap: textures.ao || null,
        metalnessMap: textures.metalness || null,
        ...params
    };

    if (!textures.metalness && materialParams.metalness === undefined) {
        materialParams.metalness = MATERIAL_CONSTANTS.METALNESS_NON_METAL;
    }
    if (!textures.roughness && materialParams.roughness === undefined) {
        materialParams.roughness = MATERIAL_CONSTANTS.ROUGHNESS_FLOOR_PROCEDURAL;
    }

    Object.keys(materialParams).forEach(key => {
        if (materialParams[key] === undefined) {
            delete materialParams[key];
        }
    });

    const material = new THREE.MeshStandardMaterial(materialParams);
    
    material.envMapIntensity = params.envMapIntensity !== undefined ? params.envMapIntensity : MATERIAL_CONSTANTS.ENV_MAP_INTENSITY_BASE;
    
    if (materialParams.aoMap) {
        material.aoMapIntensity = params.aoMapIntensity !== undefined ? params.aoMapIntensity : MATERIAL_CONSTANTS.AO_INTENSITY_DEFAULT;
    }
    
    if (materialParams.normalMap) {
        material.normalScale = params.normalScale !== undefined ? new THREE.Vector2(params.normalScale, params.normalScale) : new THREE.Vector2(MATERIAL_CONSTANTS.NORMAL_SCALE_DEFAULT, MATERIAL_CONSTANTS.NORMAL_SCALE_DEFAULT);
    }
    
    if (material.roughness !== undefined && material.roughness < MATERIAL_CONSTANTS.ROUGHNESS_MIN) {
        material.roughness = Math.max(MATERIAL_CONSTANTS.ROUGHNESS_MIN, material.roughness);
    }
    
    const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap'];
    
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
        }
    });
    
    material.needsUpdate = true;
    
    return material;
}

export function updateLoadingProgress(progress) {
    const progressBar = document.getElementById('loading-progress');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

export function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.opacity = '0';
        loading.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            loading.style.display = 'none';
        }, 500);
    }
}

