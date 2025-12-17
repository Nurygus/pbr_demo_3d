import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONTROLS_CONSTANTS } from '../config/constants.js';

export class Controls {
    constructor(camera, renderer) {
        this.controls = new OrbitControls(camera, renderer.domElement);
        this.init();
    }

    init() {
        this.controls.enableDamping = true;
        this.controls.dampingFactor = CONTROLS_CONSTANTS.DAMPING_FACTOR;
        this.controls.minDistance = CONTROLS_CONSTANTS.MIN_DISTANCE;
        this.controls.maxDistance = CONTROLS_CONSTANTS.MAX_DISTANCE;
        this.controls.maxPolarAngle = CONTROLS_CONSTANTS.MAX_POLAR_ANGLE;
        this.controls.minPolarAngle = CONTROLS_CONSTANTS.MIN_POLAR_ANGLE;
        this.controls.target.set(0, 1, 0);
    }

    update() {
        const wasChanged = this.controls.changed;
        this.controls.update();
        return wasChanged;
    }

    getControls() {
        return this.controls;
    }
    
    hasChanged() {
        return this.controls.changed;
    }
}

