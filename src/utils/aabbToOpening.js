import * as THREE from 'three';

export function aabbToOpening(globalAABB, wallPosition, wallRotation, wallHeight, wallThickness) {
    const globalCenter = globalAABB.getCenter(new THREE.Vector3());
    const globalSize = globalAABB.getSize(new THREE.Vector3());
    
    const wallMatrix = new THREE.Matrix4();
    wallMatrix.makeRotationY(-wallRotation);
    wallMatrix.setPosition(-wallPosition[0], -wallPosition[1], -wallPosition[2]);
    
    const localCenter = globalCenter.clone().applyMatrix4(wallMatrix);
    
    const openingConfig = {
        width: globalSize.x,
        height: globalSize.y,
        position: [
            localCenter.x,
            localCenter.y - (wallHeight / 2),
            0
        ]
    };
    
    return openingConfig;
}

export function aabbToOpeningRotated(globalAABB, wallPosition, wallHeight) {
    const globalCenter = globalAABB.getCenter(new THREE.Vector3());
    const globalSize = globalAABB.getSize(new THREE.Vector3());
    
    const localX = globalCenter.z - wallPosition[2];
    const localY = globalCenter.y - wallPosition[1];
    const localZ = -(globalCenter.x - wallPosition[0]);
    
    const openingConfig = {
        width: globalSize.z,
        height: globalSize.y,
        position: [
            localX,
            localY - (wallHeight / 2),
            0
        ]
    };
    
    return openingConfig;
}

export function getGlobalAABB(model) {
    const box = new THREE.Box3().setFromObject(model);
    return box;
}

