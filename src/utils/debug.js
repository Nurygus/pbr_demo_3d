import * as THREE from 'three';

export function countPolygons(scene) {
    let totalTriangles = 0;
    let totalVertices = 0;
    let meshCount = 0;
    const meshes = [];

    scene.traverse((object) => {
        if (object.isMesh && object.geometry) {
            const geometry = object.geometry;
            const positionAttribute = geometry.attributes.position;
            
            if (positionAttribute) {
                const vertices = positionAttribute.count;
                let triangles = 0;

                if (geometry.index) {
                    triangles = geometry.index.count / 3;
                } else {
                    triangles = vertices / 3;
                }

                totalTriangles += triangles;
                totalVertices += vertices;
                meshCount++;

                meshes.push({
                    name: object.name || 'Unnamed',
                    triangles: Math.floor(triangles),
                    vertices: vertices
                });
            }
        }
    });

    return {
        totalTriangles: Math.floor(totalTriangles),
        totalVertices,
        meshCount,
        meshes: meshes.sort((a, b) => b.triangles - a.triangles)
    };
}

export function logPerformanceStats(scene) {
    const stats = countPolygons(scene);
    
    console.group('Performance Statistics');
    console.log(`Total meshes: ${stats.meshCount}`);
    console.log(`Total triangles: ${stats.totalTriangles.toLocaleString()}`);
    console.log(`Total vertices: ${stats.totalVertices.toLocaleString()}`);
    console.log('\nTop meshes by polygon count:');
    stats.meshes.slice(0, 10).forEach((mesh, i) => {
        console.log(`${i + 1}. ${mesh.name}: ${mesh.triangles.toLocaleString()} triangles`);
    });
    console.groupEnd();

    return stats;
}

export function createPositionMarker(position, color = 0xff0000) {
    const group = new THREE.Group();
    
    const sphereGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    group.add(sphere);

    const lineMaterial = new THREE.LineBasicMaterial({ color });
    const axesHelper = new THREE.AxesHelper(0.2);
    group.add(axesHelper);

    group.position.copy(position);
    
    return group;
}

