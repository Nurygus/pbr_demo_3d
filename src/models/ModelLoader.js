import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.models = {};
    }

    async loadModel(url, options = {}) {
        const gltf = await this.loader.loadAsync(url);
        const model = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const min = box.min;
        const max = box.max;
        
        const lightsInModel = [];
        model.traverse((child) => {
            if (child.isLight) {
                lightsInModel.push(child);
                console.log(`Found built-in light: ${child.type} in model ${url}`);
            }
        });
        
        if (options.scale) {
            if (typeof options.scale === 'number') {
                model.scale.setScalar(options.scale);
            } else {
                model.scale.set(...options.scale);
            }
        }
        if (options.rotation) {
            model.rotation.set(...options.rotation);
        }
        
        box.setFromObject(model);
        const finalCenter = box.getCenter(new THREE.Vector3());
        const finalSize = box.getSize(new THREE.Vector3());
        const finalMin = box.min;
        const finalMax = box.max;
        
        const positionMode = options.positionMode || 'floor';
        
        if (options.position) {
            if (positionMode === 'center') {
                model.position.sub(finalCenter);
                model.position.add(new THREE.Vector3(...options.position));
            } else {
                model.position.sub(new THREE.Vector3(finalCenter.x, finalMin.y, finalCenter.z));
                
                if (options.positionIsCenter) {
                    model.position.add(new THREE.Vector3(
                        options.position[0],
                        options.position[1] - (finalSize.y / 2),
                        options.position[2]
                    ));
                } else {
                    model.position.add(new THREE.Vector3(...options.position));
                }
            }
        } else {
            if (positionMode === 'center') {
                model.position.sub(finalCenter);
            } else {
                model.position.sub(new THREE.Vector3(finalCenter.x, finalMin.y, finalCenter.z));
            }
        }

        let meshesWithShadows = 0;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                meshesWithShadows++;
            }
        });
        console.log(`Shadows set for ${meshesWithShadows} meshes in model ${url}`);

        model.userData.originalCenter = center;
        model.userData.originalSize = size;
        model.userData.finalCenter = finalCenter;
        model.userData.finalSize = finalSize;
        model.userData.finalMin = finalMin;
        model.userData.finalMax = finalMax;
        model.userData.lights = lightsInModel;

        return model;
    }

    createSimpleChair(position = [0, 0, 0]) {
        const group = new THREE.Group();

        const seatGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.5);
        const seatMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.7,
            metalness: 0.1
        });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.y = 0.4;
        seat.castShadow = true;
        seat.receiveShadow = true;
        group.add(seat);

        const backGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.05);
        const back = new THREE.Mesh(backGeometry, seatMaterial);
        back.position.set(0, 0.7, -0.225);
        back.castShadow = true;
        back.receiveShadow = true;
        group.add(back);

        const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.3,
            metalness: 0.8
        });
        
        const positions = [
            [-0.2, 0.2, -0.2],
            [0.2, 0.2, -0.2],
            [-0.2, 0.2, 0.2],
            [0.2, 0.2, 0.2]
        ];
        
        positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(...pos);
            leg.castShadow = true;
            group.add(leg);
        });

        group.position.set(...position);
        return group;
    }

    createSimpleTable(position = [0.8, 0, 0.5]) {
        const group = new THREE.Group();

        const topGeometry = new THREE.BoxGeometry(0.4, 0.03, 0.4);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.6,
            metalness: 0.1
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 0.5;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.3,
            metalness: 0.8
        });
        
        const positions = [
            [-0.15, 0.25, -0.15],
            [0.15, 0.25, -0.15],
            [-0.15, 0.25, 0.15],
            [0.15, 0.25, 0.15]
        ];
        
        positions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(...pos);
            leg.castShadow = true;
            group.add(leg);
        });

        group.position.set(...position);
        return group;
    }
}

