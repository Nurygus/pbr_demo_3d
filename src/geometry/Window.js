import * as THREE from 'three';
import { GEOMETRY_CONSTANTS } from '../config/constants.js';

export class Window {
    constructor(config) {
        this.width = config.width || 1.2;
        this.height = config.height || 1.5;
        this.position = config.position || [0, 0, 0];
        this.rotation = config.rotation || 0;
        this.frameThickness = config.frameThickness || GEOMETRY_CONSTANTS.WINDOW_FRAME_THICKNESS;
        this.frameWidth = config.frameWidth || GEOMETRY_CONSTANTS.WINDOW_FRAME_WIDTH;
    }

    createFrame(material) {
        const group = new THREE.Group();

        const topFrame = new THREE.BoxGeometry(
            this.width + this.frameWidth * 2,
            this.frameWidth,
            this.frameThickness
        );
        const topMesh = new THREE.Mesh(topFrame, material);
        topMesh.position.y = this.height / 2 + this.frameWidth / 2;
        group.add(topMesh);

        const bottomFrame = new THREE.BoxGeometry(
            this.width + this.frameWidth * 2,
            this.frameWidth,
            this.frameThickness
        );
        const bottomMesh = new THREE.Mesh(bottomFrame, material);
        bottomMesh.position.y = -this.height / 2 - this.frameWidth / 2;
        group.add(bottomMesh);

        const leftFrame = new THREE.BoxGeometry(
            this.frameWidth,
            this.height,
            this.frameThickness
        );
        const leftMesh = new THREE.Mesh(leftFrame, material);
        leftMesh.position.x = -this.width / 2 - this.frameWidth / 2;
        group.add(leftMesh);

        const rightFrame = new THREE.BoxGeometry(
            this.frameWidth,
            this.height,
            this.frameThickness
        );
        const rightMesh = new THREE.Mesh(rightFrame, material);
        rightMesh.position.x = this.width / 2 + this.frameWidth / 2;
        group.add(rightMesh);

        return group;
    }

    createGlass() {
        const glassGeometry = new THREE.PlaneGeometry(this.width, this.height);
        
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            roughness: 0,
            metalness: 0,
            transmission: 0.95,
            thickness: 0.01,
            side: THREE.DoubleSide
        });

        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.z = GEOMETRY_CONSTANTS.WINDOW_GLASS_Z_OFFSET;
        
        return glass;
    }

    createWindow(frameMaterial) {
        const group = new THREE.Group();
        
        const frame = this.createFrame(frameMaterial);
        const glass = this.createGlass();
        
        group.add(frame);
        group.add(glass);
        
        group.position.set(...this.position);
        group.rotation.y = this.rotation;
        
        group.userData.isWindow = true;
        group.userData.isProcedural = true;
        
        return group;
    }
}

