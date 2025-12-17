import * as THREE from 'three';
import { Wall } from './Wall.js';
import { Window } from './Window.js';
import { aabbToOpening, aabbToOpeningRotated } from '../utils/aabbToOpening.js';

export class RoomBuilder {
    constructor(config) {
        this.config = {
            width: config.width || 3,
            height: config.height || 3,
            wallHeight: config.wallHeight || 2.7,
            wallThickness: config.wallThickness || 0.2,
            ...config
        };
        
        this.materials = config.materials || {};
        this.group = new THREE.Group();
        
        this.modelAABBs = config.modelAABBs || {};
    }

    build() {
        this.buildFloor();
        this.buildCeiling();
        this.buildWalls();
        return this.group;
    }

    buildFloor() {
        const floorWidth = this.config.width + 0.05;
        const floorHeight = this.config.height + 0.05;
        
        const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorHeight);
        floorGeometry.rotateX(-Math.PI / 2);

        const uvs = floorGeometry.attributes.uv;
        const textureScale = 2;
        for (let i = 0; i < uvs.array.length; i += 2) {
            uvs.array[i] *= floorWidth / textureScale;
            uvs.array[i + 1] *= floorHeight / textureScale;
        }
        uvs.needsUpdate = true;

        let floorMaterial = this.materials.floor;
        if (floorMaterial) {
            floorMaterial = floorMaterial.clone();
            floorMaterial.side = THREE.DoubleSide;
        }

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.name = 'Floor';
        floor.userData.isFloor = true;
        floor.position.set(-0.025, 0, -0.025);

        floor.castShadow = false;
        floor.receiveShadow = true;
        
        this.group.add(floor);
    }

    buildCeiling() {
        const ceilingGeometry = new THREE.PlaneGeometry(
            this.config.width,
            this.config.height
        );

        ceilingGeometry.rotateX(Math.PI / 2);

        const ceiling = new THREE.Mesh(
            ceilingGeometry,
            this.materials.ceiling || new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.8
            })
        );
        ceiling.position.y = this.config.wallHeight;
        
        ceiling.castShadow = true;
        ceiling.receiveShadow = true;
        
        ceiling.name = 'Ceiling';
        
        this.group.add(ceiling);
        
    }

    buildWalls() {
        const walls = this.config.walls || this.getDefaultWalls();

        walls.forEach(wallConfig => {
            let wallMaterial = this.materials.wall;
            if (wallMaterial) {
                wallMaterial = wallMaterial.clone();
                wallMaterial.side = THREE.DoubleSide;
            }
            
            const wall = new Wall({
                width: wallConfig.width || this.config.width,
                height: this.config.wallHeight,
                thickness: this.config.wallThickness,
                position: wallConfig.position,
                rotation: wallConfig.rotation || 0,
                windows: wallConfig.windows || [],
                doors: wallConfig.doors || [],
                material: wallMaterial
            });

            const wallMesh = wall.createMesh();
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            this.group.add(wallMesh);

            if (wallConfig.windows) {
                wallConfig.windows.forEach((windowConfig) => {
                    const globalPosition = [
                        wallConfig.position[0] + (windowConfig.position[0] || 0),
                        wallConfig.position[1] + (this.config.wallHeight / 2) + (windowConfig.position[1] || 0),
                        wallConfig.position[2]
                    ];
                    
                    if (!this.group.userData.openings) this.group.userData.openings = [];
                    const opening = {
                        type: 'window',
                        globalPosition: globalPosition,
                        size: { width: windowConfig.width, height: windowConfig.height }
                    };
                    this.group.userData.openings.push(opening);
                    this.group.userData.windowOpening = opening;
                    
                    if (!this.modelAABBs.window) {
                        const window = new Window({
                            width: windowConfig.width,
                            height: windowConfig.height,
                            position: [
                                globalPosition[0],
                                globalPosition[1],
                                globalPosition[2] + this.config.wallThickness / 2 + 0.005
                            ],
                            rotation: wallConfig.rotation || 0
                        });

                        const windowMesh = window.createWindow(this.materials.windowFrame || new THREE.MeshStandardMaterial({
                            color: 0x3a3a3a,
                            roughness: 0.3,
                            metalness: 0.1
                        }));
                        this.group.add(windowMesh);
                    }
                });
            }
            
            if (wallConfig.doors) {
                wallConfig.doors.forEach((doorConfig) => {
                    let globalPosition;
                    if (wallConfig.rotation === Math.PI / 2) {
                        globalPosition = [
                            wallConfig.position[0] + (doorConfig.position[2] || 0),
                            wallConfig.position[1] + (this.config.wallHeight / 2) + (doorConfig.position[1] || 0),
                            wallConfig.position[2] - (doorConfig.position[0] || 0)
                        ];
                    } else {
                        globalPosition = [
                            wallConfig.position[0] + (doorConfig.position[0] || 0),
                            wallConfig.position[1] + (this.config.wallHeight / 2) + (doorConfig.position[1] || 0),
                            wallConfig.position[2] + (doorConfig.position[2] || 0)
                        ];
                    }
                    
                    if (!this.group.userData.openings) this.group.userData.openings = [];
                    const opening = {
                        type: 'door',
                        globalPosition: globalPosition,
                        size: { width: doorConfig.width, height: doorConfig.height }
                    };
                    this.group.userData.openings.push(opening);
                    this.group.userData.doorOpening = opening;
                });
            }
        });
    }

    getDefaultWalls() {
        const walls = [
            {
                width: this.config.width,
                position: [0, 0, -this.config.height / 2],
                rotation: 0,
                windows: [],
                doors: []
            },
            {
                width: this.config.height,
                position: [-this.config.width / 2, 0, 0],
                rotation: Math.PI / 2,
                windows: [],
                doors: []
            },
            // For right wall, use BackSide as BoxGeometry normals point outward
            {
                width: this.config.height,
                position: [this.config.width / 2, 0, 0],
                rotation: Math.PI / 2,
                windows: [],
                doors: [],
                visibleFromInside: true
            }
        ];
        
        if (this.modelAABBs.window) {
            const windowAABB = this.modelAABBs.window;
            const wallConfig = walls[0];
            
            const openingConfig = aabbToOpening(
                windowAABB,
                wallConfig.position,
                wallConfig.rotation,
                this.config.wallHeight,
                this.config.wallThickness
            );
            
            wallConfig.windows.push({
                width: openingConfig.width,
                height: openingConfig.height,
                position: openingConfig.position
            });
            
        } else {
            walls[0].windows.push({
                width: 1.143,
                height: 1.661,
                position: [0.014, 0.167, 0]
            });
        }
        
        if (this.modelAABBs.door) {
            const doorAABB = this.modelAABBs.door;
            const wallConfig = walls[1];
            
            const openingConfig = aabbToOpeningRotated(
                doorAABB,
                wallConfig.position,
                this.config.wallHeight
            );
            
            const doorSize = doorAABB.getSize(new THREE.Vector3());
            openingConfig.width = Math.max(0.01, openingConfig.width - 0.10);
            openingConfig.height = Math.max(0.01, openingConfig.height - 0.05);
            
            openingConfig.position[1] -= 0.025;
            
            wallConfig.doors.push({
                width: openingConfig.width,
                height: openingConfig.height,
                position: openingConfig.position
            });
            
        } else {
            walls[1].doors.push({
                width: 0.855,
                height: 2.131,
                position: [0.013, -0.4345, 0]
            });
        }
        
        return walls;
    }

    getGroup() {
        return this.group;
    }
}

