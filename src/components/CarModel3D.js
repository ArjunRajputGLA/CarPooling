import React, { useRef } from 'react';
import { View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';

function Car() {
    const groupRef = useRef();

    // Subtle floating animation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
    });

    const carColor = '#EF4444';
    const wheelColor = '#1F2937';

    return (
        <group ref={groupRef} scale={[1, 1, 1]} position={[0, 0, 0]}>
            {/* Main Body */}
            <mesh position={[0, 0.4, 0]} castShadow>
                <boxGeometry args={[1.5, 0.3, 3]} />
                <meshStandardMaterial color={carColor} />
            </mesh>

            {/* Cabin */}
            <mesh position={[0, 0.7, -0.2]} castShadow>
                <boxGeometry args={[1.2, 0.4, 1.4]} />
                <meshStandardMaterial color={carColor} />
            </mesh>

            {/* Windows */}
            <mesh position={[0, 0.7, -0.2]}>
                <boxGeometry args={[1.22, 0.35, 1.35]} />
                <meshStandardMaterial color="#9CA3AF" />
            </mesh>

            {/* Wheels */}
            {/* Front Left */}
            <mesh position={[-0.8, 0.2, 1]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                <meshStandardMaterial color={wheelColor} />
            </mesh>
            {/* Front Right */}
            <mesh position={[0.8, 0.2, 1]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                <meshStandardMaterial color={wheelColor} />
            </mesh>
            {/* Back Left */}
            <mesh position={[-0.8, 0.2, -1]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                <meshStandardMaterial color={wheelColor} />
            </mesh>
            {/* Back Right */}
            <mesh position={[0.8, 0.2, -1]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                <meshStandardMaterial color={wheelColor} />
            </mesh>
        </group>
    );
}

export default function CarModel3D() {
    return (
        <View style={{ width: 60, height: 60, backgroundColor: 'transparent' }}>
            <Canvas
                style={{ flex: 1 }}
                camera={{ position: [5, 5, 5], fov: 40 }}
            >
                <ambientLight intensity={1.5} />
                <directionalLight position={[10, 10, 5]} intensity={2} />
                <Car />
            </Canvas>
        </View>
    );
}
