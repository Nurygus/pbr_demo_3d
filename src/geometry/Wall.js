import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class Wall {
    constructor(config) {
        this.width = config.width || 3;
        this.height = config.height || 2.7;
        this.thickness = config.thickness || 0.2;
        this.position = config.position || [0, 0, 0];
        this.rotation = config.rotation || 0;
        this.windows = config.windows || [];
        this.doors = config.doors || [];
        this.material = config.material || null;
    }

    createGeometry() {
        if (this.windows.length === 0 && this.doors.length === 0) {
            return this.createSimpleWall();
        } else {
            return this.createWallWithOpenings();
        }
    }

    createSimpleWall() {
        const geometry = new THREE.BoxGeometry(
            this.width,
            this.height,
            this.thickness
        );

        this.applyUVMapping(geometry);

        return geometry;
    }

    createWallWithOpenings() {
        const parts = [];
        
        const openings = [
            ...this.windows.map(w => ({ ...w, type: 'window' })),
            ...this.doors.map(d => ({ ...d, type: 'door' }))
        ];
        
        const sortedOpenings = openings.sort((a, b) => 
            (a.position[0] || 0) - (b.position[0] || 0)
        );

        let currentX = -this.width / 2;

        for (const opening of sortedOpenings) {
            const openingCenterX = opening.position[0] || 0;
            const openingWidth = opening.width || (opening.type === 'window' ? 1.2 : 0.9);
            
            // opening.position[1] is offset from wall center along Y
            // In local wall system, center is at Y = this.height / 2
            // So actual opening center: this.height / 2 + opening.position[1]
            const wallCenterY = this.height / 2;
            const openingCenterY = wallCenterY + (opening.position[1] || 0);
            const openingHeight = opening.height || (opening.type === 'window' ? 1.5 : 2.1);
            
            const openingLeft = openingCenterX - openingWidth / 2;
            const openingRight = openingCenterX + openingWidth / 2;
            const openingBottom = openingCenterY - openingHeight / 2;
            const openingTop = openingCenterY + openingHeight / 2;
            

            // Split wall into rectangular regions around opening
            if (openingLeft - currentX > 0.01) {
                const leftPartWidth = openingLeft - currentX;
                const leftPartGeometry = new THREE.BoxGeometry(
                    leftPartWidth,
                    this.height,
                    this.thickness
                );
                this.applyUVMapping(leftPartGeometry, leftPartWidth, this.height);
                parts.push({ 
                    geometry: leftPartGeometry, 
                    x: currentX + leftPartWidth / 2,
                    y: this.height / 2
                });
                
            }

            if (openingTop < this.height - 0.01) {
                const topHeight = this.height - openingTop;
                const topGeometry = new THREE.BoxGeometry(
                    openingWidth,
                    topHeight,
                    this.thickness
                );
                this.applyUVMapping(topGeometry, openingWidth, topHeight);
                const topCenterY = openingTop + topHeight / 2;
                parts.push({ 
                    geometry: topGeometry, 
                    x: openingCenterX,
                    y: topCenterY
                });
                
            }

            if (openingBottom > 0.01) {
                const bottomHeight = openingBottom;
                const bottomGeometry = new THREE.BoxGeometry(
                    openingWidth,
                    bottomHeight,
                    this.thickness
                );
                this.applyUVMapping(bottomGeometry, openingWidth, bottomHeight);
                const bottomCenterY = bottomHeight / 2;
                parts.push({ 
                    geometry: bottomGeometry, 
                    x: openingCenterX,
                    y: bottomCenterY
                });
                
            }

            currentX = openingRight;
        }

        if (currentX < this.width / 2) {
            const rightPartWidth = this.width / 2 - currentX;
            const rightPartGeometry = new THREE.BoxGeometry(
                rightPartWidth,
                this.height,
                this.thickness
            );
            this.applyUVMapping(rightPartGeometry, rightPartWidth, this.height);
            parts.push({ 
                geometry: rightPartGeometry, 
                x: currentX + rightPartWidth / 2,
                y: this.height / 2
            });
        }

        if (parts.length === 0) {
            return this.createSimpleWall();
        }

        // Merge all parts into single geometry for better performance
        // Parts are positioned relative to local wall system (bottom at Y=0)
        const geometriesToMerge = [];
        parts.forEach(part => {
            const geometry = part.geometry.clone();
            // Translate geometry to position in local wall system
            const matrix = new THREE.Matrix4();
            matrix.makeTranslation(part.x || 0, part.y || 0, 0);
            geometry.applyMatrix4(matrix);
            geometriesToMerge.push(geometry);
        });

        const mergedGeometry = mergeGeometries(geometriesToMerge);
        const mesh = new THREE.Mesh(mergedGeometry, this.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh.userData.openings = sortedOpenings.map(opening => ({
            type: opening.type,
            centerX: opening.position[0] || 0,
            centerY: (this.height / 2) + (opening.position[1] || 0),
            width: opening.width,
            height: opening.height,
            bottom: ((this.height / 2) + (opening.position[1] || 0)) - (opening.height / 2),
            top: ((this.height / 2) + (opening.position[1] || 0)) + (opening.height / 2)
        }));
        
        return mesh;
    }

    applyUVMapping(geometry, partWidth = null, partHeight = null) {
        const uvs = geometry.attributes.uv;
        if (!uvs) return;

        const uvArray = uvs.array;
        
        const width = partWidth !== null ? partWidth : this.width;
        const height = partHeight !== null ? partHeight : this.height;
        
        const textureScale = 2;
        
        for (let i = 0; i < uvArray.length; i += 2) {
            uvArray[i] *= width / textureScale;
            uvArray[i + 1] *= height / textureScale;
        }

        uvs.needsUpdate = true;
    }

    createMesh() {
        const geometry = this.createGeometry();
        
        const mesh = geometry instanceof THREE.Mesh ? geometry : new THREE.Mesh(geometry, this.material);
        if (geometry instanceof THREE.Mesh) {
            // Wall with openings: parts already positioned, bottom at Y=0
            mesh.position.set(this.position[0], 0, this.position[2]);
        } else {
            // Simple wall: BoxGeometry center at (0,0,0), need position [x, height/2, z]
            mesh.position.set(
                this.position[0],
                (this.position[1] || 0) + this.height / 2,
                this.position[2]
            );
        }
        
        mesh.rotation.y = this.rotation;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.isWall = true;
        
        // For walls visible only from inside, ensure material is single-sided
        if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(material => {
                if (material && material.side === undefined) {
                    material.side = THREE.FrontSide;
                }
            });
        }
        
        return mesh;
    }
}

