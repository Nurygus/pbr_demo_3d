import * as THREE from 'three';
import { CAMERA_CONSTANTS } from '../config/constants.js';

export class Camera {
    constructor() {
        this.camera = null;
        this.init();
    }

    init() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(
            CAMERA_CONSTANTS.FOV,
            aspect,
            CAMERA_CONSTANTS.NEAR,
            CAMERA_CONSTANTS.FAR
        );

        this.camera.position.set(1.3, 1.6, 1.7);
        this.camera.lookAt(0, 1, 0);
    }

    getCamera() {
        return this.camera;
    }

    handleResize() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }
}

