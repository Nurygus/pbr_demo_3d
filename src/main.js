import * as THREE from 'three';
import { Renderer } from './core/Renderer.js';
import { Camera } from './core/Camera.js';
import { Controls } from './core/Controls.js';
import { Scene } from './core/Scene.js';
import { RoomBuilder } from './geometry/RoomBuilder.js';
import { MaterialManager } from './materials/MaterialManager.js';
import { LightingSystem } from './lighting/LightingSystem.js';
import { ModelLoader } from './models/ModelLoader.js';
import { Effects } from './postprocessing/Effects.js';
import { UIControls } from './ui/Controls.js';
import { LightingControls } from './ui/LightingControls.js';
import { HDRILoader } from './utils/hdriLoader.js';
import { updateLoadingProgress, hideLoading } from './utils/helpers.js';
import { logPerformanceStats } from './utils/debug.js';
import { PerformanceMonitor } from './utils/PerformanceMonitor.js';
import { LightPresets } from './lighting/LightPresets.js';
import {
    DEBUG_CONFIG,
    RENDER_CONFIG,
    ROOM_CONFIG,
    MODEL_CONFIG,
    HDRI_CONFIG,
    WINDOW_LIGHT_FALLBACK,
    APP_CONFIG,
} from './config/appConfig.js';

class App {
    constructor() {
        const env = import.meta.env || {};
        const envFlagRaw = env[DEBUG_CONFIG.envFlagKey];
        const envFlag = (envFlagRaw ?? '').toString().trim().toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        const urlDebug = (urlParams.get(DEBUG_CONFIG.queryParam) || '').trim().toLowerCase();
        const debugFromEnv = envFlag === 'true' || envFlag === '1';
        const debugFromUrl = urlDebug === '1' || urlDebug === 'true';
        this.debugMode = debugFromEnv || debugFromUrl;
        if (this.debugMode) {
            console.info('Debug detection:', {
                VITE_DEBUG: envFlag,
                VITE_DEBUG_raw: envFlagRaw,
                urlDebug,
                debugFromEnv,
                debugFromUrl,
                debugMode: this.debugMode,
            });
        } else {
            console.log = () => {};
            console.info = () => {};
            console.debug = () => {};
        }

        this.container = document.getElementById('canvas-container');
        this.renderer = null;
        this.camera = null;
        this.controls = null;
        this.scene = null;
        this.lightingSystem = null;
        this.effects = null;
        this.isRendering = false;
        this.performanceMonitor = null;
        this.currentSceneType = 'room';
        
        this.needsRender = true;
        this.lastCameraPosition = new THREE.Vector3();
        this.lastCameraRotation = new THREE.Euler();
        this.lastCameraTarget = new THREE.Vector3();
        this.staticFrameCount = 0;
        this.STATIC_THRESHOLD = RENDER_CONFIG.staticFrameThreshold;
        
        this.init();
    }

    async init() {
        try {
            await this.initScene();
            await this.loadMaterials();
            await this.loadModels();
            this.setupLights();
            await this.loadHDRI();
            await this.loadFurniture();
            this.setupPostProcessing();
            this.setupUI();
            this.setupEventListeners();
            this.startRenderLoop();
        } catch (error) {
            console.error('Initialization error:', error);
            hideLoading();
            alert('Error loading scene. Check console for details.');
        }
    }

    async initScene() {
        this.renderer = new Renderer(this.container);
        this.camera = new Camera();
        this.scene = new Scene();
        this.controls = new Controls(
            this.camera.getCamera(),
            this.renderer.getRenderer()
        );
        
        this.controls.getControls().addEventListener('change', () => {
            this.needsRender = true;
            this.staticFrameCount = 0;
            this.resumeRenderLoop();
        });
        
        this.controls.getControls().addEventListener('start', () => {
            this.needsRender = true;
            this.staticFrameCount = 0;
            this.resumeRenderLoop();
        });

        updateLoadingProgress(APP_CONFIG.loadingProgress.base);
    }

    async loadMaterials() {
        const materialManager = new MaterialManager();
        materialManager.setMaxAnisotropy(
            this.renderer.getRenderer().userData.maxAnisotropy || RENDER_CONFIG.maxAnisotropyFallback
        );
        this.materials = await materialManager.loadTextures(true);
        updateLoadingProgress(APP_CONFIG.loadingProgress.materials);
    }

    async loadModels() {
        const modelLoader = new ModelLoader();
        
        const [windowModel, doorModel] = await Promise.all([
            modelLoader.loadModel(MODEL_CONFIG.window.path, {
                position: MODEL_CONFIG.window.position,
                rotation: MODEL_CONFIG.window.rotation,
                scale: MODEL_CONFIG.window.scale,
                positionMode: MODEL_CONFIG.window.positionMode
            }).catch(err => {
                console.warn('Failed to load window:', err);
                return null;
            }),
            
            modelLoader.loadModel(MODEL_CONFIG.door.path, {
                position: MODEL_CONFIG.door.position,
                rotation: MODEL_CONFIG.door.rotation,
                scale: MODEL_CONFIG.door.scale,
                positionMode: MODEL_CONFIG.door.positionMode
            }).catch(err => {
                console.warn('Failed to load door:', err);
                return null;
            })
        ]);
            
        const modelAABBs = {};
        if (windowModel) {
            windowModel.position.x += MODEL_CONFIG.window.positionOffset.x;
            windowModel.position.y += MODEL_CONFIG.window.positionOffset.y;
            
            windowModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    const name = child.name.toLowerCase();
                    const isGlass = name.includes('glass') || 
                                   name.includes('стекло') || 
                                   name.includes('window') ||
                                   child.material.transparent === true ||
                                   (child.material.opacity !== undefined && child.material.opacity < 1);
                    
                    if (isGlass || child.material.transmission !== undefined) {
                        const mat = child.material;
                        if (!mat.isMeshPhysicalMaterial) {
                            child.material = new THREE.MeshPhysicalMaterial({
                                color: mat.color || 0xffffff,
                                transparent: true,
                                opacity: APP_CONFIG.windowGlass.opacity,
                                roughness: APP_CONFIG.windowGlass.roughness,
                                metalness: 0,
                                transmission: APP_CONFIG.windowGlass.transmission,
                                thickness: 0.01,
                                side: THREE.DoubleSide,
                                envMapIntensity: APP_CONFIG.windowGlass.envMapIntensity,
                                reflectivity: APP_CONFIG.windowGlass.reflectivity
                            });
                        } else {
                            mat.transparent = true;
                            mat.opacity = APP_CONFIG.windowGlass.opacity;
                            mat.transmission = APP_CONFIG.windowGlass.transmission;
                            mat.roughness = APP_CONFIG.windowGlass.roughness;
                            mat.metalness = 0;
                            mat.thickness = 0.01;
                            mat.side = THREE.DoubleSide;
                            mat.envMapIntensity = APP_CONFIG.windowGlass.envMapIntensity;
                            mat.reflectivity = APP_CONFIG.windowGlass.reflectivity;
                        }
                        
                        child.castShadow = false;
                        child.receiveShadow = true;
                        child.userData.isWindowGlass = true;
                    }
                }
            });
                
            modelAABBs.window = new THREE.Box3().setFromObject(windowModel);
        }
            
        if (doorModel) {
            modelAABBs.door = new THREE.Box3().setFromObject(doorModel);
            
            doorModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach((material) => {
                        if (material && typeof material.roughness === 'number') {
                            material.roughness = Math.min(1.0, material.roughness * APP_CONFIG.door.roughnessMultiplier);
                        }
                    });
                }
            });
        }
            
        updateLoadingProgress(APP_CONFIG.loadingProgress.models);

        const roomBuilder = new RoomBuilder({
            width: ROOM_CONFIG.width,
            height: ROOM_CONFIG.height,
            wallHeight: ROOM_CONFIG.wallHeight,
            wallThickness: ROOM_CONFIG.wallThickness,
            materials: this.materials,
            modelAABBs: modelAABBs
        });
        
        this.roomGroup = roomBuilder.build();
        this.scene.add(this.roomGroup);

        if (windowModel) {
            const windowsToRemove = [];
            this.roomGroup.traverse((child) => {
                if (child.userData?.isProcedural && child.userData?.isWindow) {
                    windowsToRemove.push(child);
                }
            });
            windowsToRemove.forEach(w => w.parent?.remove(w));
            this.scene.add(windowModel);
        }
        
        if (doorModel) {
            this.scene.add(doorModel);
        }
        
        updateLoadingProgress(APP_CONFIG.loadingProgress.room);
    }

    setupLights() {
        this.lightingSystem = new LightingSystem(this.scene.getScene());
        
        const windowOpening = this.roomGroup?.userData?.windowOpening;
        if (windowOpening) {
            const { size, globalPosition } = windowOpening;
            const wallThickness = ROOM_CONFIG.wallThickness;
            const lightPosition = [
                globalPosition[0],
                globalPosition[1],
                globalPosition[2] + wallThickness / 2
            ];
            
            this.lightingSystem.createWindowLight({
                position: lightPosition,
                width: size.width,
                height: size.height,
                rotation: 0
            });
        } else {
            this.lightingSystem.createWindowLight({
                position: WINDOW_LIGHT_FALLBACK.position,
                width: WINDOW_LIGHT_FALLBACK.width,
                height: WINDOW_LIGHT_FALLBACK.height,
                rotation: 0
            });
        }
            
        if (typeof window !== 'undefined') {
            window.app = this;
        }
    }

    async loadHDRI() {
        const hdriLoader = new HDRILoader();
        hdriLoader.initPMREM(this.renderer.getRenderer());
        this.hdriLoader = hdriLoader;
        
        const dayIntensity = LightPresets.day.hdriIntensity;
        const nightIntensity = LightPresets.night.hdriIntensity;
        
        this.dayHDRI = await hdriLoader.loadDayHDRI(HDRI_CONFIG.day.environmentPath, dayIntensity);
        try {
            const loader = new THREE.TextureLoader();
            const texture = await loader.loadAsync(HDRI_CONFIG.day.backgroundPath);
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            this.dayHDRI.userData.backgroundTexture = texture;
        } catch (err) {
            console.warn('Failed to load day background:', err);
        }
        
        this.nightHDRI = await hdriLoader.loadNightHDRI(HDRI_CONFIG.night.environmentPath, nightIntensity);
        try {
            const loader = new THREE.TextureLoader();
            const texture = await loader.loadAsync(HDRI_CONFIG.night.backgroundPath);
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            this.nightHDRI.userData.backgroundTexture = texture;
        } catch (err) {
            console.warn('Failed to load night background:', err);
        }

        this.scene.setEnvironment(this.dayHDRI, dayIntensity);
        updateLoadingProgress(APP_CONFIG.loadingProgress.hdri);
        
        if (this.debugMode) {
            this.performanceMonitor = new PerformanceMonitor(
                this.renderer.getRenderer(),
                this.scene.getScene()
            );
        }
    }

    async loadFurniture() {
        const modelLoader = new ModelLoader();
        const [chair, lauters] = await Promise.all([
            modelLoader.loadModel(MODEL_CONFIG.chair.path, {
                position: MODEL_CONFIG.chair.position,
                rotation: MODEL_CONFIG.chair.rotation,
                scale: MODEL_CONFIG.chair.scale
            }).catch(err => {
                console.warn('Failed to load chair:', err);
                return modelLoader.createSimpleChair(MODEL_CONFIG.chair.position);
            }),
            
            modelLoader.loadModel(MODEL_CONFIG.lauters.path, {
                position: MODEL_CONFIG.lauters.position,
                rotation: MODEL_CONFIG.lauters.rotation,
                scale: MODEL_CONFIG.lauters.scale,
                positionMode: MODEL_CONFIG.lauters.positionMode
            }).catch(err => {
                console.warn('Failed to load lamp:', err);
                return null;
            })
        ]);
            
        if (chair) {
            chair.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this.scene.add(chair);
        }

        if (lauters) {
            this.scene.add(lauters);
            this.lightingSystem.createLampLighting(lauters);
            
            if (this.lightingControls?.refreshControls) {
                setTimeout(() => {
                    this.lightingControls.refreshControls();
                }, APP_CONFIG.loadingDelays.lightingControlsRefresh);
            }
        }
            
        setTimeout(() => {
            const intensity = this.lightingSystem.getHDRIIntensity();
            const maxAnisotropy = this.renderer.getRenderer().userData.maxAnisotropy || RENDER_CONFIG.maxAnisotropyFallback;
            this.scene.updateAllMaterials(intensity, maxAnisotropy);
        }, APP_CONFIG.loadingDelays.materialsUpdate);
            
        updateLoadingProgress(APP_CONFIG.loadingProgress.furniture);
    }

    setupPostProcessing() {
        this.effects = new Effects(
            this.renderer.getRenderer(),
            this.scene.getScene(),
            this.camera.getCamera()
        );

        const dayBloom = LightPresets.day.bloom;
        if (dayBloom) {
            this.effects.setBloom(dayBloom.enabled);
            this.effects.setBloomParams({
                threshold: dayBloom.threshold,
                strength: dayBloom.strength,
                radius: dayBloom.radius
            });
        }
        updateLoadingProgress(APP_CONFIG.loadingProgress.postProcessing);
    }

    setupUI() {
        new UIControls((mode) => this.switchLightingMode(mode));

        if (this.debugMode) {
            this.lightingControls = new LightingControls(
                this.lightingSystem,
                this.renderer.getRenderer(),
                this.scene,
                this.effects
            );
        }
            
        window.app = this;
            
        if (this.lightingSystem.lights.lampSpotDown && this.lightingSystem.lights.lampSpotUp) {
            setTimeout(() => {
                this.lightingControls?.refreshControls();
            }, APP_CONFIG.loadingDelays.lightingControlsRefresh);
        }
            
        const toggleControlsBtn = document.getElementById('toggle-lighting-controls');
        if (this.debugMode && toggleControlsBtn && this.lightingControls) {
            toggleControlsBtn.style.display = 'inline-block';
            toggleControlsBtn.addEventListener('click', () => this.lightingControls.toggle());
        } else if (toggleControlsBtn) {
            toggleControlsBtn.style.display = 'none';
        }

        const toggleSceneBtn = document.getElementById('toggle-scene');
        if (toggleSceneBtn) toggleSceneBtn.style.display = 'none';
        
        updateLoadingProgress(APP_CONFIG.loadingProgress.ui);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.handleResize();
            this.renderer.handleResize();
            this.effects.setSize(window.innerWidth, window.innerHeight);
            this.requestRender();
        });

        setTimeout(() => {
            hideLoading();
            const uiRoot = document.getElementById('ui');
            if (uiRoot) uiRoot.style.display = 'block';
            if (this.debugMode) logPerformanceStats(this.scene.getScene());
        }, APP_CONFIG.loadingDelays.hideLoading);
    }

    switchLightingMode(mode) {
        this.lightingSystem.switchMode(mode);

        if (this.effects) {
            const bloom = LightPresets[mode]?.bloom;
            if (bloom) {
                this.effects.setBloom(bloom.enabled);
                this.effects.setBloomParams({
                    threshold: bloom.threshold,
                    strength: bloom.strength,
                    radius: bloom.radius
                });
            }
        }

        const hdri = mode === 'night' ? this.nightHDRI : this.dayHDRI;
        const intensity = LightPresets[mode].hdriIntensity;
        if (hdri) this.scene.setEnvironment(hdri, intensity);

        if (this.debugMode) {
            setTimeout(() => this.lightingControls?.refreshControls(), 100);
        }

        this.requestRender();
    }

    startRenderLoop() {
        this.renderer.getRenderer().setAnimationLoop(this.render.bind(this));
    }

    resumeRenderLoop() {
        if (!this.isRendering) {
            this.startRenderLoop();
            this.isRendering = true;
        }
    }

    render() {
        const camera = this.camera.getCamera();
        const controls = this.controls.getControls();
        
        const controlsChanged = this.controls.update();
        
        const cameraPositionChanged = !this.lastCameraPosition.equals(camera.position);
        const cameraRotationChanged = !this.lastCameraRotation.equals(camera.rotation);
        const cameraTargetChanged = !this.lastCameraTarget.equals(controls.target);
        
        const hasChanges = cameraPositionChanged || 
                          cameraRotationChanged || 
                          cameraTargetChanged || 
                          controlsChanged || 
                          this.needsRender;
        
        if (hasChanges) {
            this.needsRender = false;
            this.staticFrameCount = 0;
            
            this.lastCameraPosition.copy(camera.position);
            this.lastCameraRotation.copy(camera.rotation);
            this.lastCameraTarget.copy(controls.target);
            
            if (this.performanceMonitor) {
                this.performanceMonitor.begin();
            }

            this.renderer.getRenderer().shadowMap.autoUpdate = true;
            this.renderer.getRenderer().shadowMap.needsUpdate = true;

            if (this.effects.needsComposer()) {
                this.effects.render();
            } else {
                this.renderer.render(this.scene.getScene(), this.camera.getCamera());
            }
            
            if (controlsChanged) {
                this.renderer.getRenderer().shadowMap.autoUpdate = true;
            }

            if (this.performanceMonitor) {
                this.performanceMonitor.end();
            }
        } else {
            this.staticFrameCount++;
        }
    }

    requestRender() {
        this.needsRender = true;
        this.staticFrameCount = 0;
        this.resumeRenderLoop();
    }

    toggleNormalMaterial(enabled) {
        if (!this.roomGroup) return;

        if (!this.roomGroup.userData.originalMaterials) {
            this.roomGroup.userData.originalMaterials = new Map();
        }

        const normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

        this.roomGroup.traverse((object) => {
            if (
                object.isMesh &&
                (object.userData.isWall || object.userData.isFloor || object.name === 'Floor' || object.name === 'Ceiling')
            ) {
                const key = object.uuid;

                if (enabled) {
                    if (!this.roomGroup.userData.originalMaterials.has(key)) {
                        this.roomGroup.userData.originalMaterials.set(key, object.material);
                    }
                    object.material = normalMaterial;
                } else {
                    const originalMaterial = this.roomGroup.userData.originalMaterials.get(key);
                    if (originalMaterial) {
                        object.material = originalMaterial;
                    }
                }
            }
        });

        this.requestRender();
    }

    dispose() {
        this.renderer.getRenderer().setAnimationLoop(null);
        this.isRendering = false;
        if (this.performanceMonitor) {
            this.performanceMonitor.dispose();
        }
        if (this.simpleScene) {
            this.simpleScene.dispose();
        }
    }
}

// App entry point
new App();

