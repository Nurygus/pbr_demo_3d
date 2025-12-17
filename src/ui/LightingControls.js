
export class LightingControls {
    constructor(lightingSystem, renderer, scene, effects) {
        this.lightingSystem = lightingSystem;
        this.renderer = renderer;
        this.scene = scene;
        this.effects = effects;
        this.panel = null;
        this.isVisible = false;
        
        this.init();
    }

    init() {
        this.panel = document.createElement('div');
        this.panel.id = 'lighting-controls-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 320px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            z-index: 1000;
            max-height: 90vh;
            overflow-y: auto;
            display: none;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Lighting Controls';
        title.style.cssText = 'margin: 0 0 15px 0; font-size: 14px;';
        this.panel.appendChild(title);

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'Hide';
        toggleBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; padding: 5px 10px;';
        toggleBtn.onclick = () => this.toggle();
        this.panel.appendChild(toggleBtn);

        this.createControls();

        document.body.appendChild(this.panel);
    }

    createControls() {
        const lights = this.lightingSystem.getLights();
        const sun = lights.sun;

        // Sun Light
        const sunSection = this.createSection('Sun Light');
        
        sunSection.appendChild(this.createSlider('Intensity', 0, 5, 0.1, sun.intensity, (val) => {
            sun.intensity = val;
            this.updateValue('sun-intensity-value', val.toFixed(2));
        }, 'sun-intensity-value'));

        sunSection.appendChild(this.createSlider('Position X', -10, 10, 0.1, sun.position.x, (val) => {
            sun.position.x = val;
            this.updateValue('sun-pos-x-value', val.toFixed(2));
            this.updateShadowCamera();
        }, 'sun-pos-x-value'));

        sunSection.appendChild(this.createSlider('Position Y', 0, 15, 0.1, sun.position.y, (val) => {
            sun.position.y = val;
            this.updateValue('sun-pos-y-value', val.toFixed(2));
            this.updateShadowCamera();
        }, 'sun-pos-y-value'));

        sunSection.appendChild(this.createSlider('Position Z', -10, 10, 0.1, sun.position.z, (val) => {
            sun.position.z = val;
            this.updateValue('sun-pos-z-value', val.toFixed(2));
            this.updateShadowCamera();
        }, 'sun-pos-z-value'));

        sunSection.appendChild(this.createSlider('Target Y', 0, 5, 0.1, sun.target.position.y, (val) => {
            sun.target.position.y = val;
            this.updateValue('sun-target-y-value', val.toFixed(2));
            this.updateShadowCamera();
        }, 'sun-target-y-value'));

        this.panel.appendChild(sunSection);

        // Shadows
        const shadowSection = this.createSection('Shadows');
        
        shadowSection.appendChild(this.createSlider('Map Size', 256, 4096, 256, sun.shadow.mapSize.width, (val) => {
            const size = Math.floor(val / 256) * 256;
            sun.shadow.mapSize.width = size;
            sun.shadow.mapSize.height = size;
            this.updateValue('shadow-map-size-value', size);
            sun.shadow.map = null;
        }, 'shadow-map-size-value'));

        shadowSection.appendChild(this.createSlider('Bias', -0.001, 0.001, 0.0001, sun.shadow.bias, (val) => {
            sun.shadow.bias = val;
            this.updateValue('shadow-bias-value', val.toFixed(5));
        }, 'shadow-bias-value'));

        shadowSection.appendChild(this.createSlider('Normal Bias', 0, 0.1, 0.001, sun.shadow.normalBias, (val) => {
            sun.shadow.normalBias = val;
            this.updateValue('shadow-normal-bias-value', val.toFixed(4));
        }, 'shadow-normal-bias-value'));

        shadowSection.appendChild(this.createSlider('Radius (Softness)', 0, 10, 0.1, sun.shadow.radius, (val) => {
            sun.shadow.radius = val;
            this.updateValue('shadow-radius-value', val.toFixed(2));
        }, 'shadow-radius-value'));

        shadowSection.appendChild(this.createSlider('Camera Size', 1, 20, 0.5, 5, (val) => {
            this.shadowCameraSize = val;
            this.updateShadowCamera();
            this.updateValue('shadow-camera-size-value', val.toFixed(2));
        }, 'shadow-camera-size-value'));

        this.panel.appendChild(shadowSection);

        // Ambient Light
        const ambientSection = this.createSection('Ambient Light');
        
        ambientSection.appendChild(this.createSlider('Intensity', 0, 1, 0.01, lights.ambient.intensity, (val) => {
            lights.ambient.intensity = val;
            this.updateValue('ambient-intensity-value', val.toFixed(3));
            if (window.app && window.app.requestRender) window.app.requestRender();
        }, 'ambient-intensity-value'));

        this.panel.appendChild(ambientSection);

        // Hemisphere Light (Fake GI)
        if (lights.hemi) {
            const hemiSection = this.createSection('Hemisphere Light (Fake GI)');

            const hemiHelperContainer = this.createCheckboxContainer('Show Helper', lights.hemiHelper?.visible || false, (checked) => {
                if (this.lightingSystem.setHemiHelperVisible) {
                    this.lightingSystem.setHemiHelperVisible(checked);
                }
                if (window.app && window.app.requestRender) window.app.requestRender();
            });
            hemiSection.appendChild(hemiHelperContainer);

            hemiSection.appendChild(this.createSlider('Intensity', 0, 2, 0.01, lights.hemi.intensity, (val) => {
                lights.hemi.intensity = val;
                this.updateValue('hemi-intensity-value', val.toFixed(3));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'hemi-intensity-value'));

            hemiSection.appendChild(this.createColorInput('Sky Color', lights.hemi.color, (val) => {
                lights.hemi.color.set(val);
                if (window.app && window.app.requestRender) window.app.requestRender();
            }));

            hemiSection.appendChild(this.createColorInput('Ground Color', lights.hemi.groundColor, (val) => {
                lights.hemi.groundColor.set(val);
                if (window.app && window.app.requestRender) window.app.requestRender();
            }));

            this.panel.appendChild(hemiSection);
        }

        // HDRI / IBL
        const hdriSection = this.createSection('HDRI / IBL');
        
        const currentHDRI = this.scene.getScene().environment;
        const currentHDRIIntensity = currentHDRI?.userData?.intensity || 1.0;
        
        hdriSection.appendChild(this.createSlider('Intensity', 0, 5, 0.1, currentHDRIIntensity, (val) => {
            const envMap = this.scene.getScene().environment;
            if (envMap) {
                this.scene.setEnvironment(envMap, val);
                this.updateValue('hdri-intensity-value', val.toFixed(2));
            }
        }, 'hdri-intensity-value'));

        this.panel.appendChild(hdriSection);

        // Exposure
        const exposureSection = this.createSection('Exposure');
        
        // Safely get exposure, may be undefined during initialization
        const currentExposure = this.renderer.toneMappingExposure || 1.0;
        
        exposureSection.appendChild(this.createSlider('Exposure', 0.1, 3, 0.1, currentExposure, (val) => {
            this.renderer.setExposure(val);
            this.updateValue('exposure-value', val.toFixed(2));
        }, 'exposure-value'));

        this.panel.appendChild(exposureSection);

        // Rect Area Light (Window)
        if (lights.window) {
            const windowSection = this.createSection('Window Light (RectAreaLight)');
            
            // Window Light Enabled
            const windowEnabledContainer = document.createElement('div');
            windowEnabledContainer.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;';
            const windowEnabledLabel = document.createElement('label');
            windowEnabledLabel.textContent = 'Enabled';
            windowEnabledLabel.style.cssText = 'font-size: 11px;';
            const windowEnabledCheckbox = document.createElement('input');
            windowEnabledCheckbox.type = 'checkbox';
            windowEnabledCheckbox.checked = lights.window.visible;
            windowEnabledCheckbox.onchange = (e) => {
                lights.window.visible = e.target.checked;
            };
            windowEnabledContainer.appendChild(windowEnabledLabel);
            windowEnabledContainer.appendChild(windowEnabledCheckbox);
            windowSection.appendChild(windowEnabledContainer);
            
            const windowHelperContainer = document.createElement('div');
            windowHelperContainer.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;';
            const windowHelperLabel = document.createElement('label');
            windowHelperLabel.textContent = 'Show Helper';
            windowHelperLabel.style.cssText = 'font-size: 11px;';
            const windowHelperCheckbox = document.createElement('input');
            windowHelperCheckbox.type = 'checkbox';
            windowHelperCheckbox.checked = false;
            windowHelperCheckbox.onchange = (e) => {
                this.lightingSystem.setWindowLightHelperVisible(e.target.checked);
            };
            windowHelperContainer.appendChild(windowHelperLabel);
            windowHelperContainer.appendChild(windowHelperCheckbox);
            windowSection.appendChild(windowHelperContainer);
            
            windowSection.appendChild(this.createSlider('Intensity', 0, 20, 0.1, lights.window.intensity, (val) => {
                lights.window.intensity = val;
                this.updateValue('window-intensity-value', val.toFixed(2));
            }, 'window-intensity-value'));
            
            windowSection.appendChild(this.createSlider('Position X', -5, 5, 0.1, lights.window.position.x, (val) => {
                lights.window.position.x = val;
                this.updateValue('window-pos-x-value', val.toFixed(2));
            }, 'window-pos-x-value'));
            
            windowSection.appendChild(this.createSlider('Position Y', 0, 5, 0.1, lights.window.position.y, (val) => {
                lights.window.position.y = val;
                this.updateValue('window-pos-y-value', val.toFixed(2));
            }, 'window-pos-y-value'));
            
            windowSection.appendChild(this.createSlider('Position Z', -5, 5, 0.1, lights.window.position.z, (val) => {
                lights.window.position.z = val;
                this.updateValue('window-pos-z-value', val.toFixed(2));
            }, 'window-pos-z-value'));
            
            windowSection.appendChild(this.createSlider('Rotation Y', -Math.PI, Math.PI, 0.1, lights.window.rotation.y, (val) => {
                lights.window.rotation.y = val;
                this.updateValue('window-rot-y-value', val.toFixed(2));
            }, 'window-rot-y-value'));
            
            windowSection.appendChild(this.createSlider('Rotation X', -Math.PI, Math.PI, 0.1, lights.window.rotation.x, (val) => {
                lights.window.rotation.x = val;
                this.updateValue('window-rot-x-value', val.toFixed(2));
            }, 'window-rot-x-value'));
            
            windowSection.appendChild(this.createSlider('Width', 0.5, 3, 0.1, lights.window.width, (val) => {
                lights.window.width = val;
                this.updateValue('window-width-value', val.toFixed(2));
                if (this.lightingSystem.windowLightHelper) {
                    this.lightingSystem.windowLightHelper.update();
                }
            }, 'window-width-value'));
            
            windowSection.appendChild(this.createSlider('Height', 0.5, 3, 0.1, lights.window.height, (val) => {
                lights.window.height = val;
                this.updateValue('window-height-value', val.toFixed(2));
                if (this.lightingSystem.windowLightHelper) {
                    this.lightingSystem.windowLightHelper.update();
                }
            }, 'window-height-value'));
            
            this.panel.appendChild(windowSection);
        }

        // Lamp Light (SpotLight)
        if (lights.lampSpotDown && lights.lampSpotUp) {
            const lampSection = this.createSection('Lamp Light (SpotLight)');
            
            const lampHelperContainer = this.createCheckboxContainer('Show Helper', false, (checked) => {
                if (this.lightingSystem.setLampLightHelperVisible) {
                    this.lightingSystem.setLampLightHelperVisible(checked);
                }
            });
            lampSection.appendChild(lampHelperContainer);
            
            const spotDownSection = this.createSection('SpotLight Down (Main)');
            
            const spotDownEnabledContainer = this.createCheckboxContainer('Enabled', lights.lampSpotDown.visible, (checked) => {
                lights.lampSpotDown.visible = checked;
                if (window.app && window.app.requestRender) window.app.requestRender();
            });
            spotDownSection.appendChild(spotDownEnabledContainer);
            
            spotDownSection.appendChild(this.createSlider('Intensity', 0, 50, 0.5, lights.lampSpotDown.intensity, (val) => {
                lights.lampSpotDown.intensity = val;
                this.updateValue('lamp-spot-down-intensity-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-intensity-value'));
            

            spotDownSection.appendChild(this.createSlider('Angle (deg)', 10, 90, 1, lights.lampSpotDown.angle * 180 / Math.PI, (val) => {
                lights.lampSpotDown.angle = val * Math.PI / 180;
                if (this.lightingSystem.updateSpotLightShadowCamera) {
                    this.lightingSystem.updateSpotLightShadowCamera(lights.lampSpotDown);
                }
                if (this.lightingSystem.lampSpotDownHelper) {
                    this.lightingSystem.lampSpotDownHelper.update();
                }
                this.updateValue('lamp-spot-down-angle-value', val.toFixed(1));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-angle-value'));
            
            spotDownSection.appendChild(this.createSlider('Penumbra', 0, 1, 0.1, lights.lampSpotDown.penumbra, (val) => {
                lights.lampSpotDown.penumbra = val;
                if (this.lightingSystem.updateSpotLightShadowCamera) {
                    this.lightingSystem.updateSpotLightShadowCamera(lights.lampSpotDown);
                }
                this.updateValue('lamp-spot-down-penumbra-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-penumbra-value'));
            
            // Distance (0 = infinite, no attenuation)
            spotDownSection.appendChild(this.createSlider('Distance', 0, 20, 0.5, lights.lampSpotDown.distance, (val) => {
                lights.lampSpotDown.distance = val;
                // Update shadow camera far when distance changes
                // If distance = 0 (infinite), set far = 100
                if (lights.lampSpotDown.shadow && lights.lampSpotDown.shadow.camera) {
                    lights.lampSpotDown.shadow.camera.far = val > 0 ? val : 100;
                    lights.lampSpotDown.shadow.camera.updateProjectionMatrix();
                }
                this.updateValue('lamp-spot-down-distance-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-distance-value'));
            
            const initialDownBias = lights.lampSpotDown.shadow ? lights.lampSpotDown.shadow.bias : 0;
            spotDownSection.appendChild(this.createSlider('Shadow Bias', -0.005, 0.005, 0.00001, initialDownBias, (val) => {
                if (lights.lampSpotDown.shadow) {
                    lights.lampSpotDown.shadow.bias = val;
                    lights.lampSpotDown.shadow.needsUpdate = true;
                }
                this.updateValue('lamp-spot-down-shadow-bias-value', val.toFixed(5));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-shadow-bias-value'));
            
            const initialDownNormalBias = lights.lampSpotDown.shadow ? lights.lampSpotDown.shadow.normalBias : 0;
            spotDownSection.appendChild(this.createSlider('Shadow NormalBias', 0, 0.1, 0.0001, initialDownNormalBias, (val) => {
                if (lights.lampSpotDown.shadow) {
                    lights.lampSpotDown.shadow.normalBias = val;
                    lights.lampSpotDown.shadow.needsUpdate = true;
                }
                this.updateValue('lamp-spot-down-shadow-normalbias-value', val.toFixed(4));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-shadow-normalbias-value'));
            
            spotDownSection.appendChild(this.createSlider('Position X', -5, 5, 0.1, lights.lampSpotDown.position.x, (val) => {
                lights.lampSpotDown.position.x = val;
                lights.lampSpotDown.target.position.x = val;
                if (this.lightingSystem.lampSpotDownHelper) {
                    this.lightingSystem.lampSpotDownHelper.update();
                }
                this.updateValue('lamp-spot-down-pos-x-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-pos-x-value'));
            
            spotDownSection.appendChild(this.createSlider('Position Y', 0, 3, 0.1, lights.lampSpotDown.position.y, (val) => {
                lights.lampSpotDown.position.y = val;
                lights.lampSpotDown.target.position.y = val - 2;
                if (this.lightingSystem.lampSpotDownHelper) {
                    this.lightingSystem.lampSpotDownHelper.update();
                }
                this.updateValue('lamp-spot-down-pos-y-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-pos-y-value'));
            
            spotDownSection.appendChild(this.createSlider('Position Z', -5, 5, 0.1, lights.lampSpotDown.position.z, (val) => {
                lights.lampSpotDown.position.z = val;
                lights.lampSpotDown.target.position.z = val;
                if (this.lightingSystem.lampSpotDownHelper) {
                    this.lightingSystem.lampSpotDownHelper.update();
                }
                this.updateValue('lamp-spot-down-pos-z-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-pos-z-value'));
            
            spotDownSection.appendChild(this.createSlider('Decay', 0, 3, 0.1, lights.lampSpotDown.decay, (val) => {
                lights.lampSpotDown.decay = val;
                this.updateValue('lamp-spot-down-decay-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-down-decay-value'));
            
            const spotDownShadowContainer = this.createCheckboxContainer('Cast Shadow', lights.lampSpotDown.castShadow, (checked) => {
                lights.lampSpotDown.castShadow = checked;
                if (window.app && window.app.requestRender) window.app.requestRender();
            });
            spotDownSection.appendChild(spotDownShadowContainer);
            
            lampSection.appendChild(spotDownSection);
            
            const spotUpSection = this.createSection('SpotLight Up (Atmospheric)');
            
            const spotUpEnabledContainer = this.createCheckboxContainer('Enabled', lights.lampSpotUp.visible, (checked) => {
                lights.lampSpotUp.visible = checked;
                if (window.app && window.app.requestRender) window.app.requestRender();
            });
            spotUpSection.appendChild(spotUpEnabledContainer);
            
            spotUpSection.appendChild(this.createSlider('Intensity', 0, 30, 0.5, lights.lampSpotUp.intensity, (val) => {
                lights.lampSpotUp.intensity = val;
                this.updateValue('lamp-spot-up-intensity-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-up-intensity-value'));
            
            spotUpSection.appendChild(this.createSlider('Angle (deg)', 10, 90, 1, lights.lampSpotUp.angle * 180 / Math.PI, (val) => {
                lights.lampSpotUp.angle = val * Math.PI / 180;
                if (this.lightingSystem.updateSpotLightShadowCamera) {
                    this.lightingSystem.updateSpotLightShadowCamera(lights.lampSpotUp);
                }
                if (this.lightingSystem.lampSpotUpHelper) {
                    this.lightingSystem.lampSpotUpHelper.update();
                }
                this.updateValue('lamp-spot-up-angle-value', val.toFixed(1));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-up-angle-value'));
            
            spotUpSection.appendChild(this.createSlider('Penumbra', 0, 1, 0.1, lights.lampSpotUp.penumbra, (val) => {
                lights.lampSpotUp.penumbra = val;
                if (this.lightingSystem.updateSpotLightShadowCamera) {
                    this.lightingSystem.updateSpotLightShadowCamera(lights.lampSpotUp);
                }
                this.updateValue('lamp-spot-up-penumbra-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-up-penumbra-value'));
            
            spotUpSection.appendChild(this.createSlider('Distance', 0, 20, 0.5, lights.lampSpotUp.distance, (val) => {
                lights.lampSpotUp.distance = val;
                if (lights.lampSpotUp.shadow && lights.lampSpotUp.shadow.camera) {
                    lights.lampSpotUp.shadow.camera.far = val > 0 ? val : 100;
                    lights.lampSpotUp.shadow.camera.updateProjectionMatrix();
                }
                this.updateValue('lamp-spot-up-distance-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-up-distance-value'));
            
            const initialUpBias = lights.lampSpotUp.shadow ? lights.lampSpotUp.shadow.bias : 0;
            spotUpSection.appendChild(this.createSlider('Shadow Bias', -0.005, 0.005, 0.00001, initialUpBias, (val) => {
                if (lights.lampSpotUp.shadow) {
                    lights.lampSpotUp.shadow.bias = val;
                    lights.lampSpotUp.shadow.needsUpdate = true;
                }
                this.updateValue('lamp-spot-up-shadow-bias-value', val.toFixed(5));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-up-shadow-bias-value'));
            
            const initialUpNormalBias = lights.lampSpotUp.shadow ? lights.lampSpotUp.shadow.normalBias : 0;
            spotUpSection.appendChild(this.createSlider('Shadow NormalBias', 0, 0.1, 0.0001, initialUpNormalBias, (val) => {
                if (lights.lampSpotUp.shadow) {
                    lights.lampSpotUp.shadow.normalBias = val;
                    lights.lampSpotUp.shadow.needsUpdate = true;
                }
                this.updateValue('lamp-spot-up-shadow-normalbias-value', val.toFixed(4));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-up-shadow-normalbias-value'));
            
            spotUpSection.appendChild(this.createSlider('Position Y', 0, 3, 0.1, lights.lampSpotUp.position.y, (val) => {
                lights.lampSpotUp.position.y = val;
                lights.lampSpotUp.target.position.y = val + 3;
                if (this.lightingSystem.lampSpotUpHelper) {
                    this.lightingSystem.lampSpotUpHelper.update();
                }
                this.updateValue('lamp-spot-up-pos-y-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-up-pos-y-value'));
            
            spotUpSection.appendChild(this.createSlider('Decay', 0, 3, 0.1, lights.lampSpotUp.decay, (val) => {
                lights.lampSpotUp.decay = val;
                this.updateValue('lamp-spot-up-decay-value', val.toFixed(2));
                if (window.app && window.app.requestRender) window.app.requestRender();
            }, 'lamp-spot-up-decay-value'));
            
            const spotUpShadowContainer = this.createCheckboxContainer('Cast Shadow', lights.lampSpotUp.castShadow, (checked) => {
                lights.lampSpotUp.castShadow = checked;
                if (window.app && window.app.requestRender) window.app.requestRender();
            });
            spotUpSection.appendChild(spotUpShadowContainer);
            
            lampSection.appendChild(spotUpSection);

            if (lights.lampSpotSide) {
                const sideSection = this.createSection('SpotLight Side (Horizontal)');
                
                const sideEnabledContainer = this.createCheckboxContainer('Enabled', lights.lampSpotSide.visible, (checked) => {
                    lights.lampSpotSide.visible = checked;
                    if (window.app && window.app.requestRender) window.app.requestRender();
                });
                sideSection.appendChild(sideEnabledContainer);
                
                sideSection.appendChild(this.createSlider('Intensity', 0, 30, 0.5, lights.lampSpotSide.intensity, (val) => {
                    lights.lampSpotSide.intensity = val;
                    this.updateValue('lamp-spot-side-intensity-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-intensity-value'));
                
                sideSection.appendChild(this.createSlider('Angle (deg)', 10, 90, 1, lights.lampSpotSide.angle * 180 / Math.PI, (val) => {
                    lights.lampSpotSide.angle = val * Math.PI / 180;
                    if (this.lightingSystem.updateSpotLightShadowCamera) {
                        this.lightingSystem.updateSpotLightShadowCamera(lights.lampSpotSide);
                    }
                    if (this.lightingSystem.lampSpotSideHelper) {
                        this.lightingSystem.lampSpotSideHelper.update();
                    }
                    this.updateValue('lamp-spot-side-angle-value', val.toFixed(1));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-angle-value'));
                
                sideSection.appendChild(this.createSlider('Penumbra', 0, 1, 0.1, lights.lampSpotSide.penumbra, (val) => {
                    lights.lampSpotSide.penumbra = val;
                    if (this.lightingSystem.updateSpotLightShadowCamera) {
                        this.lightingSystem.updateSpotLightShadowCamera(lights.lampSpotSide);
                    }
                    this.updateValue('lamp-spot-side-penumbra-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-penumbra-value'));
                
                sideSection.appendChild(this.createSlider('Distance', 0, 20, 0.5, lights.lampSpotSide.distance, (val) => {
                    lights.lampSpotSide.distance = val;
                    if (lights.lampSpotSide.shadow && lights.lampSpotSide.shadow.camera) {
                        lights.lampSpotSide.shadow.camera.far = val > 0 ? val : 100;
                        lights.lampSpotSide.shadow.camera.updateProjectionMatrix();
                    }
                    this.updateValue('lamp-spot-side-distance-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-distance-value'));
                
                const initialSideBias = lights.lampSpotSide.shadow ? lights.lampSpotSide.shadow.bias : 0;
                sideSection.appendChild(this.createSlider('Shadow Bias', -0.005, 0.005, 0.0000001, initialSideBias, (val) => {
                    if (lights.lampSpotSide.shadow) {
                        lights.lampSpotSide.shadow.bias = val;
                        lights.lampSpotSide.shadow.needsUpdate = true;
                    }
                    this.updateValue('lamp-spot-side-shadow-bias-value', val.toFixed(7));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-shadow-bias-value'));
                
                const initialSideNormalBias = lights.lampSpotSide.shadow ? lights.lampSpotSide.shadow.normalBias : 0;
                sideSection.appendChild(this.createSlider('Shadow NormalBias', 0, 0.1, 0.0001, initialSideNormalBias, (val) => {
                    if (lights.lampSpotSide.shadow) {
                        lights.lampSpotSide.shadow.normalBias = val;
                        lights.lampSpotSide.shadow.needsUpdate = true;
                    }
                    this.updateValue('lamp-spot-side-shadow-normalbias-value', val.toFixed(4));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-shadow-normalbias-value'));
                
                sideSection.appendChild(this.createSlider('Position X', -5, 5, 0.1, lights.lampSpotSide.position.x, (val) => {
                    lights.lampSpotSide.position.x = val;
                    if (this.lightingSystem.lampSpotSideHelper) {
                        this.lightingSystem.lampSpotSideHelper.update();
                    }
                    this.updateValue('lamp-spot-side-pos-x-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-pos-x-value'));
                
                sideSection.appendChild(this.createSlider('Position Y', 0, 3, 0.1, lights.lampSpotSide.position.y, (val) => {
                    lights.lampSpotSide.position.y = val;
                    if (this.lightingSystem.lampSpotSideHelper) {
                        this.lightingSystem.lampSpotSideHelper.update();
                    }
                    this.updateValue('lamp-spot-side-pos-y-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-pos-y-value'));
                
                sideSection.appendChild(this.createSlider('Position Z', -5, 5, 0.1, lights.lampSpotSide.position.z, (val) => {
                    lights.lampSpotSide.position.z = val;
                    if (this.lightingSystem.lampSpotSideHelper) {
                        this.lightingSystem.lampSpotSideHelper.update();
                    }
                    this.updateValue('lamp-spot-side-pos-z-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-pos-z-value'));
                
                sideSection.appendChild(this.createSlider('Target X', -5, 5, 0.1, lights.lampSpotSide.target.position.x, (val) => {
                    lights.lampSpotSide.target.position.x = val;
                    lights.lampSpotSide.target.updateMatrixWorld();
                    if (this.lightingSystem.lampSpotSideHelper) {
                        this.lightingSystem.lampSpotSideHelper.update();
                    }
                    this.updateValue('lamp-spot-side-target-x-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-spot-side-target-x-value'));
                
                const sideShadowContainer = this.createCheckboxContainer('Cast Shadow', lights.lampSpotSide.castShadow, (checked) => {
                    lights.lampSpotSide.castShadow = checked;
                    if (window.app && window.app.requestRender) window.app.requestRender();
                });
                sideSection.appendChild(sideShadowContainer);
                
                lampSection.appendChild(sideSection);
            }
            
            if (lights.lampBulb) {
            const bulbSection = this.createSection('Bulb (PointLight)');
                
                const bulbEnabledContainer = this.createCheckboxContainer('Enabled', lights.lampBulb.visible, (checked) => {
                    lights.lampBulb.visible = checked;
                    if (window.app && window.app.requestRender) window.app.requestRender();
                });
                bulbSection.appendChild(bulbEnabledContainer);
                
                bulbSection.appendChild(this.createSlider('Intensity', 0, 10, 0.1, lights.lampBulb.intensity, (val) => {
                    lights.lampBulb.intensity = val;
                    this.updateValue('lamp-bulb-intensity-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-bulb-intensity-value'));
                
                bulbSection.appendChild(this.createSlider('Position Y', 0, 3, 0.01, lights.lampBulb.position.y, (val) => {
                    if (lights.lampBulb && lights.lampBulb.position) {
                        lights.lampBulb.position.y = val;
                    }
                    this.updateValue('lamp-bulb-pos-y-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-bulb-pos-y-value'));
                
                // Distance (0 = infinite, no attenuation)
                bulbSection.appendChild(this.createSlider('Distance', 0, 10, 0.1, lights.lampBulb.distance, (val) => {
                    lights.lampBulb.distance = val;
                    const farMargin = 1.5;
                    if (lights.lampBulb.castShadow && lights.lampBulb.shadow && lights.lampBulb.shadow.camera) {
                        lights.lampBulb.shadow.camera.far = val > 0 ? val * farMargin : 100;
                        lights.lampBulb.shadow.camera.updateProjectionMatrix();
                    }
                    this.updateValue('lamp-bulb-distance-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-bulb-distance-value'));
                
                bulbSection.appendChild(this.createSlider('Decay', 0, 3, 0.1, lights.lampBulb.decay, (val) => {
                    lights.lampBulb.decay = val;
                    this.updateValue('lamp-bulb-decay-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-bulb-decay-value'));

                let emissiveIntensity = 0;
                if (this.lightingSystem.lights.lampShadeMeshes && this.lightingSystem.lights.lampShadeMeshes.length > 0) {
                    const shadeMesh = this.lightingSystem.lights.lampShadeMeshes[0];
                    const mat = Array.isArray(shadeMesh.material) ? shadeMesh.material[0] : shadeMesh.material;
                    if (mat && typeof mat.emissiveIntensity === 'number') {
                        emissiveIntensity = mat.emissiveIntensity;
                    }
                }
                bulbSection.appendChild(this.createSlider('Shade Emissive', 0, 10, 0.1, emissiveIntensity, (val) => {
                    const shadeMeshes = (this.lightingSystem.lights && this.lightingSystem.lights.lampShadeMeshes) || [];
                    shadeMeshes.forEach(mesh => {
                        if (!mesh.material) return;
                        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                        if (!mat) return;
                        mat.emissiveIntensity = val;
                        // Disable tone mapping for values > 1.0 to work correctly with Bloom
                        if (val > 1.0 && mat.toneMapped !== undefined) {
                            mat.toneMapped = false;
                        } else if (val <= 1.0 && mat.toneMapped !== undefined) {
                            mat.toneMapped = true;
                        }
                        mat.needsUpdate = true;
                    });
                    this.updateValue('lamp-bulb-emissive-value', val.toFixed(2));
                    if (window.app && window.app.requestRender) window.app.requestRender();
                }, 'lamp-bulb-emissive-value'));
                
                lampSection.appendChild(bulbSection);
            }
            
            this.panel.appendChild(lampSection);
        }

        // N8AO (GTAO)
        const n8aoSection = this.createSection('N8AO (GTAO)');
        
        const n8aoEnabledContainer = document.createElement('div');
        n8aoEnabledContainer.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;';
        const n8aoEnabledLabel = document.createElement('label');
        n8aoEnabledLabel.textContent = 'Enabled';
        n8aoEnabledLabel.style.cssText = 'font-size: 11px;';
        const n8aoEnabledCheckbox = document.createElement('input');
        n8aoEnabledCheckbox.type = 'checkbox';
        n8aoEnabledCheckbox.checked = (this.effects && this.effects.aoEnabled) || false;
        n8aoEnabledCheckbox.onchange = (e) => {
            if (this.effects) {
                this.effects.setAO(e.target.checked);
            } else if (window.app && window.app.effects) {
                window.app.effects.setAO(e.target.checked);
            }
        };
        n8aoEnabledContainer.appendChild(n8aoEnabledLabel);
        n8aoEnabledContainer.appendChild(n8aoEnabledCheckbox);
        n8aoSection.appendChild(n8aoEnabledContainer);
        
        // N8AO Settings
        if (this.effects && this.effects.n8aoPass) {
            const n8aoConfig = this.effects.n8aoPass.configuration;
            
            n8aoSection.appendChild(this.createSlider('AO Samples', 4, 32, 2, n8aoConfig.aoSamples, (val) => {
                n8aoConfig.aoSamples = Math.floor(val);
                this.updateValue('n8ao-samples-value', Math.floor(val));
            }, 'n8ao-samples-value'));
            
            n8aoSection.appendChild(this.createSlider('AO Radius', 0.1, 2, 0.1, n8aoConfig.aoRadius, (val) => {
                n8aoConfig.aoRadius = val;
                this.updateValue('n8ao-radius-value', val.toFixed(2));
            }, 'n8ao-radius-value'));
            
            n8aoSection.appendChild(this.createSlider('Intensity', 0, 5, 0.1, n8aoConfig.intensity, (val) => {
                n8aoConfig.intensity = val;
                this.updateValue('n8ao-intensity-value', val.toFixed(2));
            }, 'n8ao-intensity-value'));
            
            n8aoSection.appendChild(this.createSlider('Denoise Samples', 1, 8, 1, n8aoConfig.denoiseSamples, (val) => {
                n8aoConfig.denoiseSamples = Math.floor(val);
                this.updateValue('n8ao-denoise-samples-value', Math.floor(val));
            }, 'n8ao-denoise-samples-value'));
            
            n8aoSection.appendChild(this.createSlider('Denoise Radius', 1, 20, 1, n8aoConfig.denoiseRadius, (val) => {
                n8aoConfig.denoiseRadius = Math.floor(val);
                this.updateValue('n8ao-denoise-radius-value', Math.floor(val));
            }, 'n8ao-denoise-radius-value'));
            
            n8aoSection.appendChild(this.createSlider('Distance Falloff', 0.1, 5, 0.1, n8aoConfig.distanceFalloff, (val) => {
                n8aoConfig.distanceFalloff = val;
                this.updateValue('n8ao-falloff-value', val.toFixed(2));
            }, 'n8ao-falloff-value'));
        } else {
            const appN8AOPass = window.app && window.app.effects && window.app.effects.n8aoPass;
            if (appN8AOPass) {
                const n8aoConfig = appN8AOPass.configuration;
                
                n8aoSection.appendChild(this.createSlider('AO Samples', 4, 32, 2, n8aoConfig.aoSamples, (val) => {
                    n8aoConfig.aoSamples = Math.floor(val);
                    this.updateValue('n8ao-samples-value', Math.floor(val));
                }, 'n8ao-samples-value'));
                
                n8aoSection.appendChild(this.createSlider('AO Radius', 0.1, 2, 0.1, n8aoConfig.aoRadius, (val) => {
                    n8aoConfig.aoRadius = val;
                    this.updateValue('n8ao-radius-value', val.toFixed(2));
                }, 'n8ao-radius-value'));
                
                n8aoSection.appendChild(this.createSlider('Intensity', 0, 5, 0.1, n8aoConfig.intensity, (val) => {
                    n8aoConfig.intensity = val;
                    this.updateValue('n8ao-intensity-value', val.toFixed(2));
                }, 'n8ao-intensity-value'));
                
                n8aoSection.appendChild(this.createSlider('Denoise Samples', 1, 8, 1, n8aoConfig.denoiseSamples, (val) => {
                    n8aoConfig.denoiseSamples = Math.floor(val);
                    this.updateValue('n8ao-denoise-samples-value', Math.floor(val));
                }, 'n8ao-denoise-samples-value'));
                
                n8aoSection.appendChild(this.createSlider('Denoise Radius', 1, 20, 1, n8aoConfig.denoiseRadius, (val) => {
                    n8aoConfig.denoiseRadius = Math.floor(val);
                    this.updateValue('n8ao-denoise-radius-value', Math.floor(val));
                }, 'n8ao-denoise-radius-value'));
                
                n8aoSection.appendChild(this.createSlider('Distance Falloff', 0.1, 5, 0.1, n8aoConfig.distanceFalloff, (val) => {
                    n8aoConfig.distanceFalloff = val;
                    this.updateValue('n8ao-falloff-value', val.toFixed(2));
                }, 'n8ao-falloff-value'));
            } else {
                const noN8AOMsg = document.createElement('div');
                noN8AOMsg.textContent = 'N8AO не инициализирован';
                noN8AOMsg.style.cssText = 'color: #ff6b6b; font-size: 11px;';
                n8aoSection.appendChild(noN8AOMsg);
            }
        }
        
        this.panel.appendChild(n8aoSection);

        // Post-Processing Effects
        const effectsSection = this.createSection('Post-Processing Effects');
        
        const effects = this.effects || (window.app && window.app.effects);
        
        if (effects) {
            const bloomContainer = this.createCheckboxContainer('Bloom', effects.bloomEnabled || false, (checked) => {
                if (effects.setBloom) {
                    effects.setBloom(checked);
                }
            });
            effectsSection.appendChild(bloomContainer);
            
            if (effects.getBloomParams) {
                const bloomParams = effects.getBloomParams();
                
                // Threshold (Luminance Threshold)
                // Threshold must be above standard white color (1.0)
                effectsSection.appendChild(this.createSlider(
                    'Bloom Threshold', 
                    0.0, 
                    3.0, 
                    0.1, 
                    bloomParams.threshold || 1.5, 
                    (val) => {
                        if (effects.setBloomParams) {
                            effects.setBloomParams({ threshold: val });
                        }
                        this.updateValue('bloom-threshold-value', val.toFixed(2));
                        if (window.app && window.app.requestRender) window.app.requestRender();
                    }, 
                    'bloom-threshold-value'
                ));
                
                effectsSection.appendChild(this.createSlider(
                    'Bloom Strength', 
                    0.0, 
                    3.0, 
                    0.1, 
                    bloomParams.strength || 0.5, 
                    (val) => {
                        if (effects.setBloomParams) {
                            effects.setBloomParams({ strength: val });
                        }
                        this.updateValue('bloom-strength-value', val.toFixed(2));
                        if (window.app && window.app.requestRender) window.app.requestRender();
                    }, 
                    'bloom-strength-value'
                ));
                
                effectsSection.appendChild(this.createSlider(
                    'Bloom Radius', 
                    0.0, 
                    2.0, 
                    0.1, 
                    bloomParams.radius || 0.6, 
                    (val) => {
                        if (effects.setBloomParams) {
                            effects.setBloomParams({ radius: val });
                        }
                        this.updateValue('bloom-radius-value', val.toFixed(2));
                        if (window.app && window.app.requestRender) window.app.requestRender();
                    }, 
                    'bloom-radius-value'
                ));
            }
            
            const vignetteContainer = this.createCheckboxContainer('Vignette', effects.vignetteEnabled || false, (checked) => {
                if (effects.setVignette) {
                    effects.setVignette(checked);
                }
            });
            effectsSection.appendChild(vignetteContainer);
        } else {
            const noEffectsMsg = document.createElement('div');
            noEffectsMsg.textContent = 'Effects не инициализированы';
            noEffectsMsg.style.cssText = 'color: #ff6b6b; font-size: 11px;';
            effectsSection.appendChild(noEffectsMsg);
        }
        
        this.panel.appendChild(effectsSection);

        // Debug
        const debugSection = this.createSection('Debug');
        
        const normalMaterialContainer = this.createCheckboxContainer(
            'Show Normal Material (Walls & Floor)',
            false,
            (checked) => {
                if (window.app && window.app.toggleNormalMaterial) {
                    window.app.toggleNormalMaterial(checked);
                }
            }
        );
        debugSection.appendChild(normalMaterialContainer);
        
        this.panel.appendChild(debugSection);

        // Quick Presets
        const presetSection = this.createSection('Quick Presets');
        
        const dayBtn = document.createElement('button');
        dayBtn.textContent = 'Day';
        dayBtn.style.cssText = 'width: 48%; margin-right: 2%; padding: 8px;';
        dayBtn.onclick = () => this.applyPreset('day');
        
        const nightBtn = document.createElement('button');
        nightBtn.textContent = 'Night';
        nightBtn.style.cssText = 'width: 48%; padding: 8px;';
        nightBtn.onclick = () => this.applyPreset('night');
        
        presetSection.appendChild(dayBtn);
        presetSection.appendChild(nightBtn);
        this.panel.appendChild(presetSection);
    }

    createCheckboxContainer(label, checked, onChange) {
        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'font-size: 11px;';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.onchange = (e) => {
            if (onChange) {
                onChange(e.target.checked);
            }
        };
        
        container.appendChild(labelEl);
        container.appendChild(checkbox);
        return container;
    }

    createSection(title) {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.2);';
        
        const titleEl = document.createElement('h4');
        titleEl.textContent = title;
        titleEl.style.cssText = 'margin: 0 0 10px 0; font-size: 13px; color: #4CAF50;';
        section.appendChild(titleEl);
        
        return section;
    }

    createSlider(label, min, max, step, value, onChange, valueId) {
        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 10px;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'display: block; margin-bottom: 5px; font-size: 11px;';

        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';

        const safeValue = (value !== undefined && value !== null) ? value : (min + max) / 2;
        const numValue = typeof safeValue === 'number' ? safeValue : parseFloat(safeValue) || (min + max) / 2;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = numValue;
        slider.style.cssText = 'flex: 1;';
        slider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            onChange(val);
            if (window.app && window.app.requestRender) {
                window.app.requestRender();
            }
        };

        const valueEl = document.createElement('span');
        valueEl.id = valueId;
        const decimals = step < 0.1 ? (step < 0.01 ? 3 : 2) : 1;
        valueEl.textContent = numValue.toFixed(decimals);
        valueEl.style.cssText = 'min-width: 50px; text-align: right; font-family: monospace;';

        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(valueEl);
        container.appendChild(labelEl);
        container.appendChild(sliderContainer);

        return container;
    }

    createColorInput(label, initialColor, onChange) {
        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = 'font-size: 11px;';

        const input = document.createElement('input');
        input.type = 'color';
        const hex = initialColor && initialColor.isColor ? `#${initialColor.getHexString()}` : '#ffffff';
        input.value = hex;
        input.oninput = (e) => {
            onChange(e.target.value);
            if (window.app && window.app.requestRender) {
                window.app.requestRender();
            }
        };

        container.appendChild(labelEl);
        container.appendChild(input);
        return container;
    }

    updateValue(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    updateShadowCamera() {
        const sun = this.lightingSystem.getLights().sun;
        const size = this.shadowCameraSize || 5;
        const height = 4;
        
        sun.shadow.camera.left = -size / 2;
        sun.shadow.camera.right = size / 2;
        sun.shadow.camera.top = height / 2;
        sun.shadow.camera.bottom = -height / 2;
        sun.shadow.camera.updateProjectionMatrix();
    }

    applyPreset(mode) {
        if (window.app && window.app.switchLightingMode) {
            window.app.switchLightingMode(mode);
        } else {
            this.lightingSystem.switchMode(mode);
        }
    }

    refreshControls() {
        const wasVisible = this.isVisible;
        const title = this.panel.querySelector('h3');
        const toggleBtn = this.panel.querySelector('button');
        this.panel.innerHTML = '';
        if (title) this.panel.appendChild(title);
        if (toggleBtn) this.panel.appendChild(toggleBtn);
        this.createControls();
        if (wasVisible) {
            this.show();
        }
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.panel.style.display = this.isVisible ? 'block' : 'none';
    }

    show() {
        this.isVisible = true;
        this.panel.style.display = 'block';
    }

    hide() {
        this.isVisible = false;
        this.panel.style.display = 'none';
    }
}

