import * as THREE from 'three';
import { loadTexture, createPBRMaterial, extractChannel } from '../utils/helpers.js';
import { MATERIAL_CONSTANTS } from '../config/constants.js';

export class MaterialManager {
    constructor() {
        this.materials = {};
        this.textures = {};
        this.maxAnisotropy = 16;
    }
    
    setMaxAnisotropy(value) {
        this.maxAnisotropy = value;
    }

    async loadTextures(useRealTextures = false) {
        if (useRealTextures) {
            try {
                const floorDiffuse = await loadTexture('textures/laminate_floor_02/laminate_floor_02_diff_1k.jpg', {
                    repeatX: 2,
                    repeatY: 2,
                    colorSpace: THREE.SRGBColorSpace
                }, this.maxAnisotropy);
                const floorNormal = await loadTexture('textures/laminate_floor_02/laminate_floor_02_nor_gl_1k.jpg', {
                    repeatX: 2,
                    repeatY: 2,
                    mipMapBias: MATERIAL_CONSTANTS.MIPMAP_BIAS_SHARP,
                    colorSpace: THREE.NoColorSpace
                }, this.maxAnisotropy);
                const floorARM = await loadTexture('textures/laminate_floor_02/laminate_floor_02_arm_1k.jpg', {
                    repeatX: 2,
                    repeatY: 2,
                    mipMapBias: MATERIAL_CONSTANTS.MIPMAP_BIAS_SHARP,
                    colorSpace: THREE.NoColorSpace
                }, this.maxAnisotropy);

                await new Promise(resolve => {
                    if (floorARM.image.complete) {
                        resolve();
                    } else {
                        floorARM.image.onload = resolve;
                    }
                });

                const floorAO = extractChannel(floorARM, 'r', this.maxAnisotropy);
                const floorRoughness = extractChannel(floorARM, 'g', this.maxAnisotropy);
                const floorMetalness = extractChannel(floorARM, 'b', this.maxAnisotropy);

                this.textures.floor = {
                    albedo: floorDiffuse,
                    normal: floorNormal,
                    ao: floorAO,
                    roughness: floorRoughness,
                    metalness: floorMetalness
                };

                const wallTextureScale = 4;
                const wallNormal = await loadTexture('textures/concrete_wall_006/concrete_wall_006_nor_gl_512.jpg', {
                    repeatX: wallTextureScale,
                    repeatY: wallTextureScale,
                    mipMapBias: MATERIAL_CONSTANTS.MIPMAP_BIAS_SHARP,
                    colorSpace: THREE.NoColorSpace
                }, this.maxAnisotropy);
                const wallARM = await loadTexture('textures/concrete_wall_006/concrete_wall_006_arm_512.jpg', {
                    repeatX: wallTextureScale,
                    repeatY: wallTextureScale,
                    mipMapBias: MATERIAL_CONSTANTS.MIPMAP_BIAS_SHARP,
                    colorSpace: THREE.NoColorSpace
                }, this.maxAnisotropy);

                await new Promise(resolve => {
                    if (wallARM.image.complete) {
                        resolve();
                    } else {
                        wallARM.image.onload = resolve;
                    }
                });

                const wallAO = extractChannel(wallARM, 'r', this.maxAnisotropy);
                const wallRoughness = extractChannel(wallARM, 'g', this.maxAnisotropy);
                const wallMetalness = extractChannel(wallARM, 'b', this.maxAnisotropy);

                this.textures.wall = {
                    normal: wallNormal,
                    ao: wallAO,
                    roughness: wallRoughness,
                    metalness: wallMetalness
                };
            } catch (error) {
                console.warn('Failed to load real textures, using procedural:', error);
                return this.loadProceduralTextures();
            }

            this.materials.floor = createPBRMaterial(this.textures.floor, {
                envMapIntensity: MATERIAL_CONSTANTS.ENV_MAP_INTENSITY_FLOOR,
                maxAnisotropy: this.maxAnisotropy
            });

            this.materials.wall = createPBRMaterial(this.textures.wall, {
                color: 0x888888,
                envMapIntensity: MATERIAL_CONSTANTS.ENV_MAP_INTENSITY_WALL,
                maxAnisotropy: this.maxAnisotropy
            });
        } else {
            return this.loadProceduralTextures();
        }

        this.materials.ceiling = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: MATERIAL_CONSTANTS.ROUGHNESS_CEILING,
            metalness: MATERIAL_CONSTANTS.METALNESS_NON_METAL,
            envMapIntensity: MATERIAL_CONSTANTS.ENV_MAP_INTENSITY_DEFAULT
        });

        this.materials.windowFrame = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: MATERIAL_CONSTANTS.ROUGHNESS_WINDOW_FRAME,
            metalness: MATERIAL_CONSTANTS.METALNESS_WINDOW_FRAME,
            envMapIntensity: MATERIAL_CONSTANTS.ENV_MAP_INTENSITY_DEFAULT
        });

        return this.materials;
    }

    loadProceduralTextures() {
        this.textures.floor = {
            albedo: this.createProceduralTexture(0x8b6f47, 512, 512),
            normal: this.createNormalTexture(512, 512),
            roughness: this.createRoughnessTexture(0.7, 512, 512)
        };

        this.textures.wall = {
            albedo: this.createProceduralTexture(0xf5f5dc, 512, 512),
            normal: this.createNormalTexture(512, 512),
            roughness: this.createRoughnessTexture(0.85, 512, 512)
        };

        this.materials.floor = createPBRMaterial(this.textures.floor, {
            metalness: MATERIAL_CONSTANTS.METALNESS_NON_METAL,
            roughness: MATERIAL_CONSTANTS.ROUGHNESS_FLOOR_PROCEDURAL
        });

        this.materials.wall = createPBRMaterial(this.textures.wall, {
            metalness: MATERIAL_CONSTANTS.METALNESS_NON_METAL,
            roughness: MATERIAL_CONSTANTS.ROUGHNESS_WALL_PROCEDURAL
        });

        this.materials.ceiling = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: MATERIAL_CONSTANTS.ROUGHNESS_CEILING,
            metalness: MATERIAL_CONSTANTS.METALNESS_NON_METAL,
            envMapIntensity: MATERIAL_CONSTANTS.ENV_MAP_INTENSITY_DEFAULT
        });

        this.materials.windowFrame = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: MATERIAL_CONSTANTS.ROUGHNESS_WINDOW_FRAME,
            metalness: MATERIAL_CONSTANTS.METALNESS_WINDOW_FRAME,
            envMapIntensity: MATERIAL_CONSTANTS.ENV_MAP_INTENSITY_DEFAULT
        });

        return this.materials;
    }

    createProceduralTexture(color, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 20;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        
        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        
        return texture;
    }

    createNormalTexture(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                data[i] = 128;
                data[i + 1] = 128;
                data[i + 2] = 255;
                data[i + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.NoColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.mipMapBias = -0.5;
        
        return texture;
    }

    createRoughnessTexture(roughness, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const value = Math.floor(roughness * 255);
        ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
        ctx.fillRect(0, 0, width, height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.NoColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.mipMapBias = -0.5;
        
        return texture;
    }

    getMaterial(name) {
        return this.materials[name];
    }

    getAllMaterials() {
        return this.materials;
    }
}

