
export const LightPresets = {
    day: {
        sunIntensity: 4.0,
        sunColor: 0xffffeb,
        sunPosition: [0.5, 5, -2.5],
        
        ambientIntensity: 0.1, 
        ambientColor: 0xffffff,
        
        lampIntensity: 20,
        lampColor: 0xffaa44,
        lampSpotDown: {
            intensity: 0.0,
            angleDeg: 45.0,
            penumbra: 0.8,
            distance: 1.5,
            decay: 1.0,
            castShadow: true
        },
        lampSpotUp: {
            intensity: 0.0,
            angleDeg: 65.0,
            penumbra: 1.0,
            distance: 3.0,
            decay: 2.0,
            castShadow: false
        },
        lampSpotSide: {
            intensity: 0.0,
            angleDeg: 45.0,
            penumbra: 1.0,
            distance: 2.5,
            decay: 1.0,
            castShadow: true,
            positionX: 0.65,
            targetOffsetX: 3.0,
            targetOffsetY: -0.6
        },
        lampBulb: {
            intensity: 0.0,
            distance: 10.0,
            decay: 1.5,
            castShadow: false
        },
        
        exposure: 1,
        
        hdriIntensity: 1,

        // HemisphereLight (Fake GI)
        hemiSkyColor: 0xddeeff,
        hemiGroundColor: 0xad9682,
        hemiIntensity: 0.6,

        bloom: {
            enabled: true,
            threshold: 1.2,
            strength: 0.35,
            radius: 0.4
        }
    },
    night: {
        sunIntensity: 0,
        sunColor: 0xffffff,
        sunPosition: [2, 4, 2],
        
        ambientIntensity: 0.15, 
        ambientColor: 0x112244,
        
        lampIntensity: 20,
        lampColor: 0xffaa44,
        lampSpotDown: {
            intensity: 20.0,
            angleDeg: 45.0,
            penumbra: 0.8,
            distance: 16.5,
            decay: 1.0,
            castShadow: true
        },
        lampSpotUp: {
            intensity: 20.2,
            angleDeg: 65.0,
            penumbra: 1.0,
            distance: 3.0,
            decay: 2.0,
            castShadow: false
        },
        lampSpotSide: {
            intensity: 2.0,
            angleDeg: 45.0,
            penumbra: 1.0,
            distance: 2.5,
            decay: 1.0,
            castShadow: true,
            positionX: 0.65,
            targetOffsetX: 3.0
        },
        lampBulb: {
            intensity: 1.5,
            distance: 10.0,
            decay: 1.5,
            castShadow: false,
            shadowBias: -0.0005,
            shadowNormalBias: 0.02
        },
        
        exposure: 1,
        
        hdriIntensity: 0.3,

        hemiSkyColor: 0x223344,
        hemiGroundColor: 0x2a1a10,
        hemiIntensity: 0.35,

        bloom: {
            enabled: true,
            threshold: 1.5,
            strength: 0.5,
            radius: 0.6
        }
    }
};