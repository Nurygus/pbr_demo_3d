import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import { LightPresets } from './LightPresets.js';
import { APP_CONFIG } from '../config/appConfig.js';
import { LIGHTING_CONSTANTS } from '../config/constants.js';

const SpotLightHelper = THREE.SpotLightHelper;

/**
 * Lighting system with IBL support
 * Properly balances directional light, ambient and IBL
 */
export class LightingSystem {
    constructor(scene) {
        this.scene = scene;
        this.lights = {};
        this.currentMode = 'day';
        this.targetMode = 'day';
        this.isTransitioning = false;
        this.transitionSpeed = 0.05;
        
        this.init();
    }

    init() {
        RectAreaLightUniformsLib.init();
        
        this.lights.sun = new THREE.DirectionalLight(
            LightPresets.day.sunColor,
            LightPresets.day.sunIntensity
        );
        
        const initialSunPosition = new THREE.Vector3(...LightPresets.day.sunPosition);
        const sunTarget = new THREE.Vector3(0, LIGHTING_CONSTANTS.SUN_TARGET_Y, 0);
        
        const direction = new THREE.Vector3().subVectors(initialSunPosition, sunTarget).normalize();
        const moveBackDistance = LIGHTING_CONSTANTS.SUN_MOVE_BACK_DISTANCE;
        const adjustedSunPosition = initialSunPosition.clone().add(direction.multiplyScalar(moveBackDistance));
        
        this.lights.sun.position.set(adjustedSunPosition.x, adjustedSunPosition.y, adjustedSunPosition.z);
        this.lights.sun.target.position.set(0, LIGHTING_CONSTANTS.SUN_TARGET_Y, 0);
        this.lights.sun.castShadow = true;
        
        this.lights.sun.shadow.mapSize.width = LIGHTING_CONSTANTS.SHADOW_MAP_SIZE_DIRECTIONAL;
        this.lights.sun.shadow.mapSize.height = LIGHTING_CONSTANTS.SHADOW_MAP_SIZE_DIRECTIONAL;
        this.lights.sun.shadow.camera.near = LIGHTING_CONSTANTS.SHADOW_CAMERA_NEAR;
        this.lights.sun.shadow.camera.far = LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR;
        
        const sceneSize = LIGHTING_CONSTANTS.SCENE_SIZE;
        const sceneHeight = LIGHTING_CONSTANTS.SCENE_HEIGHT;
        this.lights.sun.shadow.camera.left = -sceneSize / 2;
        this.lights.sun.shadow.camera.right = sceneSize / 2;
        this.lights.sun.shadow.camera.top = sceneHeight / 2;
        this.lights.sun.shadow.camera.bottom = -sceneHeight / 2;
        
        this.lights.sun.shadow.camera.updateProjectionMatrix();
        
        this.shadowCameraHelper = new THREE.CameraHelper(this.lights.sun.shadow.camera);
        this.shadowCameraHelper.visible = false;
        this.scene.add(this.shadowCameraHelper);
        
        this.lights.sun.shadow.bias = LIGHTING_CONSTANTS.SHADOW_BIAS_DEFAULT;
        this.lights.sun.shadow.normalBias = LIGHTING_CONSTANTS.SHADOW_NORMAL_BIAS_DEFAULT;
        this.lights.sun.shadow.radius = LIGHTING_CONSTANTS.SHADOW_RADIUS;
        
        this.lights.ambient = new THREE.AmbientLight(
            LightPresets.day.ambientColor,
            LightPresets.day.ambientIntensity
        );

        this.lights.hemi = new THREE.HemisphereLight(
            LightPresets.day.hemiSkyColor,
            LightPresets.day.hemiGroundColor,
            LightPresets.day.hemiIntensity
        );
        this.lights.hemi.position.set(0, 3, 0);
        this.scene.add(this.lights.hemi);
        this.lights.hemiHelper = new THREE.HemisphereLightHelper(this.lights.hemi, 0.5);
        this.lights.hemiHelper.visible = false;
        this.scene.add(this.lights.hemiHelper);
        
        this.lights.lamp = new THREE.PointLight(
            LightPresets.day.lampColor,
            LightPresets.day.lampIntensity
        );
        this.lights.lamp.position.set(0.8, 1.0, 0.5);
        this.lights.lamp.castShadow = false;
        this.lights.lamp.distance = 5;
        this.lights.lamp.decay = 2;
        
        this.scene.add(this.lights.sun.target);
        this.scene.add(this.lights.sun);
        this.scene.add(this.lights.ambient);
        this.scene.add(this.lights.lamp);
    }

    switchMode(mode) {
        if (mode === this.currentMode) return;
        this.targetMode = mode;
        this.currentMode = mode;
        this.isTransitioning = false;
        this.applyPreset(mode);
    }

    applyPreset(mode) {
        const preset = LightPresets[mode];
        if (!preset) return;

        this.lights.sun.intensity = preset.sunIntensity;
        this.lights.sun.color.copy(new THREE.Color(preset.sunColor));
        if (mode === 'day') {
            const initialSunPosition = new THREE.Vector3(...preset.sunPosition);
            const sunTarget = new THREE.Vector3(0, LIGHTING_CONSTANTS.SUN_TARGET_Y, 0);
            const direction = new THREE.Vector3().subVectors(initialSunPosition, sunTarget).normalize();
            const moveBackDistance = LIGHTING_CONSTANTS.SUN_MOVE_BACK_DISTANCE;
            const adjustedSunPosition = initialSunPosition.clone().add(direction.multiplyScalar(moveBackDistance));
            this.lights.sun.position.set(adjustedSunPosition.x, adjustedSunPosition.y, adjustedSunPosition.z);
        } else {
            this.lights.sun.position.set(...preset.sunPosition);
        }
        this.lights.sun.target.position.set(0, LIGHTING_CONSTANTS.SUN_TARGET_Y, 0);

        this.lights.ambient.intensity = preset.ambientIntensity;
        this.lights.ambient.color.copy(new THREE.Color(preset.ambientColor));

        if (this.lights.hemi) {
            this.lights.hemi.intensity = preset.hemiIntensity || 0;
            this.lights.hemi.color.copy(new THREE.Color(preset.hemiSkyColor || 0xffffff));
            this.lights.hemi.groundColor.copy(new THREE.Color(preset.hemiGroundColor || 0xffffff));
            if (this.lights.hemiHelper) this.lights.hemiHelper.update();
        }

        if (this.lights.window) {
            const targetIntensity = mode === 'day'
                ? this.lights.window.userData.dayIntensity
                : this.lights.window.userData.nightIntensity;
            const targetColor = mode === 'day' ? 0xffffff : 0xffa500;
            this.lights.window.intensity = targetIntensity;
            this.lights.window.color.copy(new THREE.Color(targetColor));
            this.updateWindowLightDirection();
        }

        if (this.lights.lampSpotDown && this.lights.lampSpotUp) {
            this.applyLampPreset(mode);
            if (this.lampSpotDownHelper) this.lampSpotDownHelper.update();
            if (this.lampSpotUpHelper) this.lampSpotUpHelper.update();
        }
        if (this.lights.lampBulb && !(this.lights.lampSpotDown && this.lights.lampSpotUp)) {
            this.lights.lampBulb.intensity = preset.lampIntensity;
            this.lights.lampBulb.color.copy(new THREE.Color(preset.lampColor));
        }

        if (this.lights.lampShadeMeshes && this.lights.lampShadeMeshes.length > 0) {
            const isNight = mode === 'night';
            const emissiveIntensityNight = APP_CONFIG.lightingSystem.lampShadeEmissiveIntensityNight;
            this.lights.lampShadeMeshes.forEach(mesh => {
                if (!mesh.material || (!mesh.material.isMeshStandardMaterial && !mesh.material.isMeshPhysicalMaterial)) return;
                
                if (!mesh.userData._emissiveCloned) {
                    mesh.material = mesh.material.clone();
                    mesh.userData._emissiveCloned = true;
                }
                const mat = mesh.material;
                mat.emissive = mat.emissive || new THREE.Color(0x000000);
                mat.emissiveIntensity = isNight ? emissiveIntensityNight : 0.0;
                if (isNight) {
                    mat.emissive.set(preset.lampColor || 0xffaa44);
                    if (mat.toneMapped !== undefined) {
                        mat.toneMapped = false;
                    }
                } else {
                    if (mat.toneMapped !== undefined) {
                        mat.toneMapped = true;
                    }
                }
                mat.needsUpdate = true;
            });
        }
        
        this.updateWindowGlassForMode(mode);
        this.updateShadowCamera();
        this.applyLampPreset(mode);
    }

    applyLampPreset(mode = this.currentMode) {
        const preset = LightPresets[mode];
        if (!preset) return;

        const lampColor = preset.lampColor || 0xffaa44;
        const spotDownCfg = preset.lampSpotDown || {};
        const spotUpCfg = preset.lampSpotUp || {};
        const sideCfg = preset.lampSpotSide || {};
        const bulbCfg = preset.lampBulb || {};

        if (this.lights.lampSpotDown) {
            this.lights.lampSpotDown.color.set(lampColor);
            if (spotDownCfg.intensity !== undefined) this.lights.lampSpotDown.intensity = spotDownCfg.intensity;
            if (spotDownCfg.angleDeg !== undefined) {
                this.lights.lampSpotDown.angle = spotDownCfg.angleDeg * Math.PI / 180;
                this.updateSpotLightShadowCamera(this.lights.lampSpotDown);
            }
            if (spotDownCfg.penumbra !== undefined) {
                this.lights.lampSpotDown.penumbra = spotDownCfg.penumbra;
                this.updateSpotLightShadowCamera(this.lights.lampSpotDown);
            }
            if (spotDownCfg.distance !== undefined) {
                this.lights.lampSpotDown.distance = spotDownCfg.distance;
                this.lights.lampSpotDown.shadow.camera.far = spotDownCfg.distance > 0 ? spotDownCfg.distance : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
                this.lights.lampSpotDown.shadow.camera.updateProjectionMatrix();
            }
            if (spotDownCfg.decay !== undefined) this.lights.lampSpotDown.decay = spotDownCfg.decay;
            if (spotDownCfg.castShadow !== undefined) {
                this.lights.lampSpotDown.castShadow = spotDownCfg.castShadow;
                if (spotDownCfg.castShadow) {
                    this.updateSpotLightShadowCamera(this.lights.lampSpotDown);
                    this.lights.lampSpotDown.shadow.needsUpdate = true;
                }
            }
        }

        if (this.lights.lampSpotUp) {
            this.lights.lampSpotUp.color.set(lampColor);
            if (spotUpCfg.intensity !== undefined) this.lights.lampSpotUp.intensity = spotUpCfg.intensity;
            if (spotUpCfg.angleDeg !== undefined) {
                this.lights.lampSpotUp.angle = spotUpCfg.angleDeg * Math.PI / 180;
                this.updateSpotLightShadowCamera(this.lights.lampSpotUp);
            }
            if (spotUpCfg.penumbra !== undefined) {
                this.lights.lampSpotUp.penumbra = spotUpCfg.penumbra;
                this.updateSpotLightShadowCamera(this.lights.lampSpotUp);
            }
            if (spotUpCfg.distance !== undefined) {
                this.lights.lampSpotUp.distance = spotUpCfg.distance;
                this.lights.lampSpotUp.shadow.camera.far = spotUpCfg.distance > 0 ? spotUpCfg.distance : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
                this.lights.lampSpotUp.shadow.camera.updateProjectionMatrix();
            }
            if (spotUpCfg.decay !== undefined) this.lights.lampSpotUp.decay = spotUpCfg.decay;
            if (spotUpCfg.castShadow !== undefined) {
                this.lights.lampSpotUp.castShadow = spotUpCfg.castShadow;
                if (spotUpCfg.castShadow) {
                    this.updateSpotLightShadowCamera(this.lights.lampSpotUp);
                    this.lights.lampSpotUp.shadow.needsUpdate = true;
                }
            }
        }

        if (this.lights.lampSpotSide) {
            this.lights.lampSpotSide.color.set(lampColor);
            if (sideCfg.intensity !== undefined) this.lights.lampSpotSide.intensity = sideCfg.intensity;
            if (sideCfg.angleDeg !== undefined) {
                this.lights.lampSpotSide.angle = sideCfg.angleDeg * Math.PI / 180;
                this.updateSpotLightShadowCamera(this.lights.lampSpotSide);
            }
            if (sideCfg.penumbra !== undefined) {
                this.lights.lampSpotSide.penumbra = sideCfg.penumbra;
                this.updateSpotLightShadowCamera(this.lights.lampSpotSide);
            }
            if (sideCfg.distance !== undefined) {
                this.lights.lampSpotSide.distance = sideCfg.distance;
                this.lights.lampSpotSide.shadow.camera.far = sideCfg.distance > 0 ? sideCfg.distance : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
                this.lights.lampSpotSide.shadow.camera.updateProjectionMatrix();
            }
            if (sideCfg.decay !== undefined) this.lights.lampSpotSide.decay = sideCfg.decay;
            if (sideCfg.castShadow !== undefined) {
                this.lights.lampSpotSide.castShadow = sideCfg.castShadow;
                if (sideCfg.castShadow) {
                    this.updateSpotLightShadowCamera(this.lights.lampSpotSide);
                    this.lights.lampSpotSide.shadow.needsUpdate = true;
                }
            }
            if (sideCfg.positionX !== undefined) {
                this.lights.lampSpotSide.position.x = sideCfg.positionX;
                if (this.lampSpotSideHelper && this.lampSpotSideHelper.visible) {
                    this.lampSpotSideHelper.update();
                }
            }
            if (sideCfg.targetOffsetX !== undefined || sideCfg.targetOffsetY !== undefined) {
                const lightPos = this.lights.lampSpotSide.position;
                const offsetX = sideCfg.targetOffsetX !== undefined ? sideCfg.targetOffsetX : 3.0;
                const offsetY = sideCfg.targetOffsetY !== undefined ? sideCfg.targetOffsetY : -0.6;
                this.lights.lampSpotSide.target.position.set(
                    lightPos.x - offsetX,
                    lightPos.y + offsetY,
                    lightPos.z
                );
                this.lights.lampSpotSide.target.updateMatrixWorld();
                this.lights.lampSpotSide.updateMatrixWorld();
                if (this.lights.lampSpotSide.shadow && this.lights.lampSpotSide.shadow.camera) {
                    this.lights.lampSpotSide.shadow.camera.updateMatrixWorld();
                    this.lights.lampSpotSide.shadow.needsUpdate = true;
                    if (this.lampSpotSideShadowCameraHelper && this.lampSpotSideShadowCameraHelper.visible) {
                        this.lampSpotSideShadowCameraHelper.update();
                    }
                }
            }
        }

        if (this.lights.lampBulb) {
            this.lights.lampBulb.color.set(lampColor);
            if (bulbCfg.intensity !== undefined) this.lights.lampBulb.intensity = bulbCfg.intensity;
            if (bulbCfg.distance !== undefined) {
                this.lights.lampBulb.distance = bulbCfg.distance;
                
                if (this.lights.lampBulb.castShadow && this.lights.lampBulb.shadow && this.lights.lampBulb.shadow.camera) {
                    this.lights.lampBulb.shadow.camera.near = LIGHTING_CONSTANTS.SHADOW_CAMERA_NEAR_SPOT;
                    const farMargin = LIGHTING_CONSTANTS.FAR_MARGIN_POINT;
                    this.lights.lampBulb.shadow.camera.far = bulbCfg.distance > 0 ? bulbCfg.distance * farMargin : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
                    this.lights.lampBulb.shadow.camera.updateProjectionMatrix();
                }
            }
            if (bulbCfg.decay !== undefined) this.lights.lampBulb.decay = bulbCfg.decay;
            if (bulbCfg.castShadow !== undefined) {
                this.lights.lampBulb.castShadow = bulbCfg.castShadow;
                if (bulbCfg.castShadow && this.lights.lampBulb.shadow && this.lights.lampBulb.shadow.camera) {
                    this.lights.lampBulb.shadow.camera.near = LIGHTING_CONSTANTS.SHADOW_CAMERA_NEAR_SPOT;
                    const farMargin = LIGHTING_CONSTANTS.FAR_MARGIN_POINT;
                    this.lights.lampBulb.shadow.camera.far = this.lights.lampBulb.distance > 0 ? this.lights.lampBulb.distance * farMargin : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
                    this.lights.lampBulb.shadow.camera.updateProjectionMatrix();
                }
            }
            if (this.lights.lampBulb.castShadow && this.lights.lampBulb.shadow) {
                if (bulbCfg.shadowBias !== undefined) this.lights.lampBulb.shadow.bias = bulbCfg.shadowBias;
                if (bulbCfg.shadowNormalBias !== undefined) this.lights.lampBulb.shadow.normalBias = bulbCfg.shadowNormalBias;
            }
        }
    }

    getExposure() {
        return LightPresets[this.targetMode].exposure;
    }

    getHDRIIntensity() {
        return LightPresets[this.targetMode].hdriIntensity;
    }

    getLampLight() {
        return this.lights.lamp;
    }

    /**
     * Creates realistic lighting for floor lamp
     * @param {THREE.Group} lampModel - Lamp model
     * @param {Object} options - Positioning options
     */
    createLampLighting(lampModel, options = {}) {
        if (!lampModel) {
            console.warn('Lamp model not found, skipping lighting setup');
            return;
        }

        const preset = LightPresets[this.currentMode] || {};
        const spotDownCfg = preset.lampSpotDown || {};
        const spotUpCfg = preset.lampSpotUp || {};
        const sideCfg = preset.lampSpotSide || {};
        const bulbCfg = preset.lampBulb || {};
        const lampColor = preset.lampColor || 0xffaa44;

        const lampBox = new THREE.Box3().setFromObject(lampModel);
        const lampCenter = lampBox.getCenter(new THREE.Vector3());
        const lampSize = lampBox.getSize(new THREE.Vector3());
        const lampMax = lampBox.max;
        
        const lightHeightOffset = LIGHTING_CONSTANTS.LAMP_HEIGHT_OFFSET;
        const lightPosition = new THREE.Vector3(
            lampCenter.x,
            lampMax.y + lightHeightOffset,
            lampCenter.z
        );

        lampModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.layers.enable(0);
            }
        });

        const mainIntensity = spotDownCfg.intensity !== undefined ? spotDownCfg.intensity : 2.0;
        const spotLightDown = new THREE.SpotLight(
            lampColor,
            mainIntensity
        );
        
        spotLightDown.position.copy(lightPosition);
        spotLightDown.angle = (spotDownCfg.angleDeg !== undefined ? spotDownCfg.angleDeg : 45.0) * Math.PI / 180;
        spotLightDown.penumbra = spotDownCfg.penumbra !== undefined ? spotDownCfg.penumbra : 0.8;
        spotLightDown.decay = spotDownCfg.decay !== undefined ? spotDownCfg.decay : 1.0;
        spotLightDown.distance = spotDownCfg.distance !== undefined ? spotDownCfg.distance : 1.5;
        spotLightDown.castShadow = spotDownCfg.castShadow !== undefined ? spotDownCfg.castShadow : true;
        
        spotLightDown.shadow.mapSize.width = LIGHTING_CONSTANTS.SHADOW_MAP_SIZE_SPOT;
        spotLightDown.shadow.mapSize.height = LIGHTING_CONSTANTS.SHADOW_MAP_SIZE_SPOT;
        spotLightDown.shadow.camera.near = LIGHTING_CONSTANTS.SHADOW_CAMERA_NEAR_SPOT;
        spotLightDown.shadow.camera.far = spotLightDown.distance > 0 ? spotLightDown.distance : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
        const angleDeg = spotLightDown.angle * 180 / Math.PI;
        const fovMargin = angleDeg > LIGHTING_CONSTANTS.FOV_ANGLE_THRESHOLD ? LIGHTING_CONSTANTS.FOV_MARGIN_LARGE : LIGHTING_CONSTANTS.FOV_MARGIN_SMALL;
        spotLightDown.shadow.camera.fov = angleDeg * fovMargin;
        
        spotLightDown.shadow.camera.updateProjectionMatrix();
        spotLightDown.shadow.bias = LIGHTING_CONSTANTS.SHADOW_BIAS_SPOT;
        spotLightDown.shadow.normalBias = 0.0;
        spotLightDown.shadow.radius = LIGHTING_CONSTANTS.SHADOW_RADIUS_SPOT;
        
        if (spotLightDown.castShadow) {
            spotLightDown.shadow.needsUpdate = true;
        }
        
        spotLightDown.target.position.set(lightPosition.x, lightPosition.y - 2, lightPosition.z);
        spotLightDown.target.updateMatrixWorld();
        
        const ambientIntensity = spotUpCfg.intensity !== undefined ? spotUpCfg.intensity : mainIntensity * 0.6;
        const spotLightUp = new THREE.SpotLight(
            lampColor,
            ambientIntensity
        );
        
        spotLightUp.position.copy(lightPosition);
        spotLightUp.angle = (spotUpCfg.angleDeg !== undefined ? spotUpCfg.angleDeg : 65.0) * Math.PI / 180;
        spotLightUp.penumbra = spotUpCfg.penumbra !== undefined ? spotUpCfg.penumbra : 1.0;
        spotLightUp.decay = spotUpCfg.decay !== undefined ? spotUpCfg.decay : 2.0;
        spotLightUp.distance = spotUpCfg.distance !== undefined ? spotUpCfg.distance : 3.0;
        spotLightUp.castShadow = spotUpCfg.castShadow !== undefined ? spotUpCfg.castShadow : false;
        
        spotLightUp.shadow.mapSize.width = LIGHTING_CONSTANTS.SHADOW_MAP_SIZE_SPOT;
        spotLightUp.shadow.mapSize.height = LIGHTING_CONSTANTS.SHADOW_MAP_SIZE_SPOT;
        spotLightUp.shadow.bias = 0;
        spotLightUp.shadow.normalBias = 0;
        spotLightUp.shadow.radius = LIGHTING_CONSTANTS.SHADOW_RADIUS_SPOT;
        spotLightUp.shadow.camera.near = LIGHTING_CONSTANTS.SHADOW_CAMERA_NEAR_SPOT;
        spotLightUp.shadow.camera.far = spotLightUp.distance > 0 ? spotLightUp.distance : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
        
        const angleDegUp = spotLightUp.angle * 180 / Math.PI;
        const fovMarginUp = angleDegUp > LIGHTING_CONSTANTS.FOV_ANGLE_THRESHOLD ? LIGHTING_CONSTANTS.FOV_MARGIN_LARGE : LIGHTING_CONSTANTS.FOV_MARGIN_SMALL;
        spotLightUp.shadow.camera.fov = angleDegUp * fovMarginUp;
        
        spotLightUp.shadow.camera.updateProjectionMatrix();
        
        if (spotLightUp.castShadow) {
            spotLightUp.shadow.needsUpdate = true;
        }
        
        spotLightUp.target.position.set(lightPosition.x, lightPosition.y + 3, lightPosition.z);
        spotLightUp.target.updateMatrixWorld();
        
        const sideIntensity = sideCfg.intensity !== undefined ? sideCfg.intensity : 2.0;
        const spotLightSide = new THREE.SpotLight(
            lampColor,
            sideIntensity
        );
        
        spotLightSide.position.copy(lightPosition);
        spotLightSide.angle = (sideCfg.angleDeg !== undefined ? sideCfg.angleDeg : 45.0) * Math.PI / 180;
        spotLightSide.penumbra = sideCfg.penumbra !== undefined ? sideCfg.penumbra : 1.0;
        spotLightSide.decay = sideCfg.decay !== undefined ? sideCfg.decay : 1.0;
        spotLightSide.distance = sideCfg.distance !== undefined ? sideCfg.distance : 2.5;
        spotLightSide.castShadow = sideCfg.castShadow !== undefined ? sideCfg.castShadow : true;
        
        spotLightSide.shadow.mapSize.width = LIGHTING_CONSTANTS.SHADOW_MAP_SIZE_SPOT;
        spotLightSide.shadow.mapSize.height = LIGHTING_CONSTANTS.SHADOW_MAP_SIZE_SPOT;
        spotLightSide.shadow.bias = LIGHTING_CONSTANTS.SHADOW_BIAS_SPOT_SIDE;
        spotLightSide.shadow.normalBias = LIGHTING_CONSTANTS.SHADOW_NORMAL_BIAS_SPOT_SIDE;
        spotLightSide.shadow.radius = LIGHTING_CONSTANTS.SHADOW_RADIUS_SPOT;
        spotLightSide.shadow.camera.near = LIGHTING_CONSTANTS.SHADOW_CAMERA_NEAR_SPOT;
        spotLightSide.shadow.camera.far = spotLightSide.distance > 0 ? spotLightSide.distance : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
        
        const angleDegSide = spotLightSide.angle * 180 / Math.PI;
        const fovMarginSide = angleDegSide > LIGHTING_CONSTANTS.FOV_ANGLE_THRESHOLD ? LIGHTING_CONSTANTS.FOV_MARGIN_LARGE : LIGHTING_CONSTANTS.FOV_MARGIN_SMALL;
        spotLightSide.shadow.camera.fov = angleDegSide * fovMarginSide;
        spotLightSide.shadow.camera.updateProjectionMatrix();
        
        if (spotLightSide.castShadow) {
            spotLightSide.shadow.needsUpdate = true;
        }
        
        const sideTargetOffset = sideCfg.targetOffsetX !== undefined ? sideCfg.targetOffsetX : 3.0;
        const sideTargetYOffset = sideCfg.targetOffsetY !== undefined ? sideCfg.targetOffsetY : -0.6;
        spotLightSide.position.x = sideCfg.positionX !== undefined ? sideCfg.positionX : 0.65;
        spotLightSide.target.position.set(
            spotLightSide.position.x - sideTargetOffset,
            lightPosition.y + sideTargetYOffset,
            lightPosition.z
        );
        spotLightSide.target.updateMatrixWorld();
        
        spotLightSide.updateMatrixWorld();
        if (spotLightSide.shadow && spotLightSide.shadow.camera) {
            spotLightSide.shadow.camera.updateMatrixWorld();
            spotLightSide.shadow.needsUpdate = true;
            
            const shadowCameraPos = new THREE.Vector3();
            const shadowCameraTarget = new THREE.Vector3();
            spotLightSide.shadow.camera.getWorldPosition(shadowCameraPos);
            spotLightSide.shadow.camera.getWorldDirection(shadowCameraTarget);
        }
        
        this.lights.lampSpotDown = spotLightDown;
        this.lights.lampSpotUp = spotLightUp;
        this.lights.lampSpotSide = spotLightSide;
        
        this.scene.add(spotLightDown);
        this.scene.add(spotLightDown.target);
        this.scene.add(spotLightUp);
        this.scene.add(spotLightUp.target);
        this.scene.add(spotLightSide);
        this.scene.add(spotLightSide.target);
        
        let shadeFound = false;
        const shadePosition = new THREE.Vector3();
        this.lights.lampShadeMeshes = [];
        const allLampMeshes = [];
        
        lampModel.traverse((child) => {
            if (child.isMesh) {
                allLampMeshes.push(child);
                const name = child.name || '';
                const lower = name.toLowerCase();
                const childWorldPos = new THREE.Vector3();
                child.getWorldPosition(childWorldPos);
                const isShade = lower.includes('shade') || 
                               lower.includes('абажур') || 
                               lower.includes('lamp') ||
                               lower.includes('lauters');
                const isInUpperPart = childWorldPos.y > lampCenter.y + lampSize.y * 0.3;
                
                if (isShade || isInUpperPart) {
                    child.getWorldPosition(shadePosition);
                    shadeFound = true;
                    this.lights.lampShadeMeshes.push(child);
                }
            }
        });

        if (!shadeFound && allLampMeshes.length > 0) {
            let topMesh = null;
            let topY = -Infinity;
            const tmpPos = new THREE.Vector3();
            allLampMeshes.forEach(mesh => {
                mesh.getWorldPosition(tmpPos);
                if (tmpPos.y > topY) {
                    topY = tmpPos.y;
                    topMesh = mesh;
                }
            });
            if (topMesh) {
                topMesh.getWorldPosition(shadePosition);
                this.lights.lampShadeMeshes.push(topMesh);
            }
        }
        
        const bulbIntensity = bulbCfg.intensity !== undefined ? bulbCfg.intensity : 1.5;
        const bulbLight = new THREE.PointLight(
            lampColor,
            bulbIntensity
        );
        bulbLight.position.copy(lightPosition);
        bulbLight.position.y += LIGHTING_CONSTANTS.LAMP_BULB_Y_OFFSET;
        
        bulbLight.distance = bulbCfg.distance !== undefined ? bulbCfg.distance : 10.0;
        bulbLight.decay = bulbCfg.decay !== undefined ? bulbCfg.decay : 1.5;
        bulbLight.castShadow = false;
        
        if (false && bulbLight.castShadow) {
            bulbLight.shadow.camera.near = LIGHTING_CONSTANTS.SHADOW_CAMERA_NEAR_SPOT;
            const farMargin = LIGHTING_CONSTANTS.FAR_MARGIN_POINT;
            bulbLight.shadow.camera.far = bulbLight.distance > 0 ? bulbLight.distance * farMargin : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
            bulbLight.shadow.mapSize.width = 256;
            bulbLight.shadow.mapSize.height = 256;
            bulbLight.shadow.camera.updateProjectionMatrix();
        }
        
        this.lights.lampBulb = bulbLight;
        this.scene.add(bulbLight);
        
        this.lampBulbHelper = new THREE.PointLightHelper(bulbLight, 0.1, 0xffff00);
        this.lampBulbHelper.visible = false;
        this.scene.add(this.lampBulbHelper);
        this.lampSpotDownHelper = new SpotLightHelper(spotLightDown, 0xff0000);
        this.lampSpotUpHelper = new SpotLightHelper(spotLightUp, 0x00ff00);
        this.lampSpotSideHelper = new SpotLightHelper(spotLightSide, 0x0000ff);
        this.lampSpotDownHelper.visible = false;
        this.lampSpotUpHelper.visible = false;
        this.lampSpotSideHelper.visible = false;
        this.scene.add(this.lampSpotDownHelper);
        this.scene.add(this.lampSpotUpHelper);
        this.scene.add(this.lampSpotSideHelper);
        this.lampSpotDownShadowCameraHelper = new THREE.CameraHelper(spotLightDown.shadow.camera);
        this.lampSpotDownShadowCameraHelper.visible = false;
        this.scene.add(this.lampSpotDownShadowCameraHelper);
        
        this.lampSpotUpShadowCameraHelper = new THREE.CameraHelper(spotLightUp.shadow.camera);
        this.lampSpotUpShadowCameraHelper.visible = false;
        this.scene.add(this.lampSpotUpShadowCameraHelper);
        
        this.lampSpotSideShadowCameraHelper = new THREE.CameraHelper(spotLightSide.shadow.camera);
        this.lampSpotSideShadowCameraHelper.visible = false;
        this.scene.add(this.lampSpotSideShadowCameraHelper);
        
        if (this.lights.lamp) {
            this.lights.lamp.visible = false;
            this.lights.lamp.intensity = 0;
        }
        
        this.applyLampPreset(this.currentMode);
    }
    
    updateSpotLightShadowCamera(spotLight, forceUpdate = false) {
        if (!spotLight?.shadow?.camera) return;
        
        const angleDeg = spotLight.angle * 180 / Math.PI;
        const fovMargin = angleDeg > LIGHTING_CONSTANTS.FOV_ANGLE_THRESHOLD ? LIGHTING_CONSTANTS.FOV_MARGIN_LARGE : LIGHTING_CONSTANTS.FOV_MARGIN_SMALL;
        const calculatedFov = angleDeg * fovMargin;
        
        if (!forceUpdate && spotLight.shadow.userData?.fovManual) {
            const minFov = angleDeg * 1.1;
            if (spotLight.shadow.camera.fov < minFov) {
                spotLight.shadow.camera.fov = minFov;
            }
        } else {
            spotLight.shadow.camera.fov = calculatedFov;
        }
        
        if (spotLight.shadow.camera.near > LIGHTING_CONSTANTS.SHADOW_CAMERA_NEAR_SPOT) {
            spotLight.shadow.camera.near = LIGHTING_CONSTANTS.SHADOW_CAMERA_NEAR_SPOT;
        }
        
        if (spotLight.distance !== undefined) {
            spotLight.shadow.camera.far = spotLight.distance > 0 ? spotLight.distance : LIGHTING_CONSTANTS.SHADOW_CAMERA_FAR_FALLBACK;
        }
        
        spotLight.shadow.camera.updateProjectionMatrix();
        
        if (spotLight === this.lights.lampSpotDown) this.lampSpotDownShadowCameraHelper?.update();
        if (spotLight === this.lights.lampSpotUp) this.lampSpotUpShadowCameraHelper?.update();
        if (spotLight === this.lights.lampSpotSide) this.lampSpotSideShadowCameraHelper?.update();
    }
    
    setLampLightHelperVisible(visible) {
        if (this.lampSpotDownHelper) this.lampSpotDownHelper.visible = visible;
        if (this.lampSpotUpHelper) this.lampSpotUpHelper.visible = visible;
        if (this.lampSpotSideHelper) this.lampSpotSideHelper.visible = visible;
        if (this.lampSpotDownShadowCameraHelper) this.lampSpotDownShadowCameraHelper.visible = visible;
        if (this.lampSpotUpShadowCameraHelper) this.lampSpotUpShadowCameraHelper.visible = visible;
        if (this.lampSpotSideShadowCameraHelper) this.lampSpotSideShadowCameraHelper.visible = visible;
        if (this.lampBulbHelper) this.lampBulbHelper.visible = visible;
    }
    
    diagnoseChairPosition() {
        if (!this.scene) return;
        
        let chairFound = false;
        let chairObject = null;
        const chairBox = new THREE.Box3();
        const chairCenter = new THREE.Vector3();
        const chairSize = new THREE.Vector3();
        
        this.scene.traverse((object) => {
            if ((object.isMesh || object.isGroup) && !chairFound) {
                const name = (object.name || '').toLowerCase();
                if (name.includes('chair') || name.includes('кресло')) {
                    chairFound = true;
                    chairObject = object;
                    chairBox.setFromObject(object);
                    chairBox.getCenter(chairCenter);
                    chairBox.getSize(chairSize);
                }
            }
        });
        
        if (chairObject) {
            chairObject.traverse((child) => {
                if (child.isMesh) {
                    console.log(`Mesh: ${child.name}, castShadow: ${child.castShadow}, receiveShadow: ${child.receiveShadow}`);
                }
            });
        }
    }
    
    fixChairShadows() {
        if (!this.scene) return;
        
        let chairObject = null;
        this.scene.traverse((object) => {
            if (object.isMesh || object.isGroup) {
                const name = (object.name || '').toLowerCase();
                if (name.includes('chair') || name.includes('кресло')) {
                    chairObject = object;
                }
            }
        });
        
        if (!chairObject) return;
        
        chairObject.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        if (this.lights.lampSpotSide?.castShadow) {
            this.lights.lampSpotSide.shadow.needsUpdate = true;
        }
    }

    updateWindowGlassForMode(mode) {
        if (!this.scene) return;
        
        const isNight = mode === 'night';
        const daySettings = {
            transmission: 0.9,
            reflectivity: 0.5,
            roughness: 0.05,
            opacity: 0.2,
            envMapIntensity: 1.5,
            color: 0xffffff
        };
        
        const nightSettings = {
            transmission: 0.15,
            reflectivity: 0.7,
            roughness: 0.03,
            opacity: 0.6,
            envMapIntensity: 1.8,
            color: 0x1a1a1a
        };
        
        const settings = isNight ? nightSettings : daySettings;
        
        this.scene.traverse((object) => {
            if (object.isMesh && object.material && object.userData.isWindowGlass === true) {
                if (object.material.isMeshPhysicalMaterial) {
                    const mat = object.material;
                    mat.transmission = settings.transmission;
                    mat.reflectivity = settings.reflectivity;
                    mat.roughness = settings.roughness;
                    mat.opacity = settings.opacity;
                    mat.envMapIntensity = settings.envMapIntensity;
                    mat.color.set(settings.color);
                    mat.needsUpdate = true;
                }
            }
        });
    }
    
    getLights() {
        return this.lights;
    }
    
    updateShadowCamera() {
        const sun = this.lights.sun;
        const sceneSize = 25;
        const sceneHeight = 15;
        
        sun.shadow.camera.left = -sceneSize / 2;
        sun.shadow.camera.right = sceneSize / 2;
        sun.shadow.camera.top = sceneHeight / 2;
        sun.shadow.camera.bottom = -sceneHeight / 2;
        
        sun.shadow.camera.updateProjectionMatrix();
        sun.shadow.needsUpdate = true;
        
        if (this.shadowCameraHelper) {
            this.shadowCameraHelper.update();
        }
    }
    
    setShadowHelperVisible(visible) {
        if (this.shadowCameraHelper) {
            this.shadowCameraHelper.visible = visible;
        }
    }
    
    createWindowLight(windowConfig) {
        if (this.lights.window) {
            this.scene.remove(this.lights.window);
        }
        
        const windowWidth = windowConfig.width || 1.2;
        const windowHeight = windowConfig.height || 1.5;
        const windowPosition = new THREE.Vector3(...(windowConfig.position || [0, 2.15, -1.4]));
        const windowRotation = windowConfig.rotation || 0;
        
        const dayIntensity = 5.0;
        const nightIntensity = 0.1;
        
        this.lights.window = new THREE.RectAreaLight(
            0xffffff,
            dayIntensity,
            windowWidth,
            windowHeight
        );
        
        this.lights.window.position.copy(windowPosition);
        this.lights.window.rotation.set(0, Math.PI, 0);
        
        if (windowRotation !== 0) {
            this.lights.window.rotation.y += windowRotation;
        }
        
        this.scene.add(this.lights.window);
        
        this.lights.window.userData.dayIntensity = dayIntensity;
        this.lights.window.userData.nightIntensity = nightIntensity;
        this.lights.window.userData.windowPosition = windowPosition;
        this.lights.window.userData.windowWidth = windowWidth;
        this.lights.window.userData.windowHeight = windowHeight;
        
        if (this.windowLightHelper) {
            this.lights.window.remove(this.windowLightHelper);
        }
        this.windowLightHelper = new RectAreaLightHelper(this.lights.window, 0xffff00);
        this.windowLightHelper.visible = false;
        this.lights.window.add(this.windowLightHelper);
    }
    
    setWindowLightHelperVisible(visible) {
        if (this.windowLightHelper) {
            this.windowLightHelper.visible = visible;
            console.log(`Window Light Helper: ${visible ? 'visible' : 'hidden'}`);
        }
    }

    setHemiHelperVisible(visible) {
        if (this.lights.hemiHelper) {
            this.lights.hemiHelper.visible = visible;
            console.log(`HemisphereLight Helper: ${visible ? 'visible' : 'hidden'}`);
        }
    }
    
    getWindowLight() {
        return this.lights.window;
    }
    
    updateWindowLightDirection() {
        if (!this.lights.window) {
            return;
        }
        
    }
}
