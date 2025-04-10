import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { AudioAnalysisResult } from "@/services/audioService";
import { visualizationSettings } from "../../../aisettings";

// Add this type import for the ref
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type ParticleVisualizerProps = {
  audioData: AudioAnalysisResult | null;
};

/**
 * Creates a particle texture for better-looking particles
 */
const createParticleTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
};

/**
 * Particle system component that reacts to audio
 */
const ParticleSystem: React.FC<ParticleVisualizerProps> = ({ audioData }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [lastMood, setLastMood] = useState<string>("calm");
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const currentExpansionRef = useRef<number>(1.0);

  // Number of particles to render
  const count = 800;

  // Create particles with geometry and material
  const particles = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const texture = createParticleTexture();

    // Initialize particles in a sphere
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }

    // Store original positions for expansion/contraction effect
    originalPositionsRef.current = positions.slice();

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Create material with additive blending for glow effect
    const material = new THREE.PointsMaterial({
      size: 0.1,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      color: new THREE.Color(visualizationSettings.colorPalettes.calm[0]),
    });

    return { geometry, material };
  }, []);

  // Update particles based on audio data
  useEffect(() => {
    if (!audioData) return;

    const { energy } = audioData.features;
    const mood = audioData.mood;

    // Only update color when mood changes for better performance
    if (mood !== lastMood) {
      const colorPalette = visualizationSettings.colorPalettes[mood];
      const color = new THREE.Color(colorPalette[0]);
      particles.material.color = color;
      setLastMood(mood);
    }

    // Update particle size based on energy - make more responsive
    particles.material.size = 0.1 + energy * 0.5; // Increased from 0.3 to 0.5 for more dramatic size changes
  }, [audioData, lastMood, particles.material]);

  // Animation frame for continuous rotation and expansion
  useFrame((state, delta) => {
    if (!pointsRef.current || !audioData || !originalPositionsRef.current)
      return;

    const energy = audioData.features.energy || 0;
    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const originalPositions = originalPositionsRef.current;

    // Apply rotation based on energy - make more responsive
    const baseRotation = 0.01; // Always have some rotation
    const energyRotation = energy * 2.0; // Increased from 1.2 to 2.0 for faster response

    pointsRef.current.rotation.y += delta * (baseRotation + energyRotation);
    pointsRef.current.rotation.x +=
      delta * (baseRotation + energyRotation) * 0.3;

    // Calculate target expansion factor based on energy - make more responsive
    const targetExpansionFactor = 1.0 + energy * 0.5; // Increased from 0.3 to 0.5

    // Increase interpolation speed for faster response
    const interpolationSpeed = 8.0; // Increased from 3.0 to 8.0 for faster transitions
    currentExpansionRef.current +=
      (targetExpansionFactor - currentExpansionRef.current) *
      Math.min(delta * interpolationSpeed, 1.0);

    // Use the interpolated expansion factor
    const expansionFactor = currentExpansionRef.current;

    // Update each particle position based on original position and smooth expansion factor
    for (let i = 0; i < originalPositions.length; i += 3) {
      positions[i] = originalPositions[i] * expansionFactor;
      positions[i + 1] = originalPositions[i + 1] * expansionFactor;
      positions[i + 2] = originalPositions[i + 2] * expansionFactor;
    }

    // Mark the position attribute as needing an update
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points
      ref={pointsRef}
      geometry={particles.geometry}
      material={particles.material}
    />
  );
};

/**
 * Main visualizer component with Three.js canvas
 */
const ParticleVisualizer: React.FC<ParticleVisualizerProps> = ({
  audioData,
}) => {
  // Use the proper type for the controls ref
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Add a function to handle double-click for quick zoom to center
  const handleDoubleClick = () => {
    if (controlsRef.current) {
      // Animate to center position
      controlsRef.current.target.set(0, 0, 0);
      // Zoom in closer to the center
      controlsRef.current.dollyIn(1.5);
      controlsRef.current.update();
    }
  };

  return (
    <div className="w-full h-full" onDoubleClick={handleDoubleClick}>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <ParticleSystem audioData={audioData} />
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={2} // Reduced from 3 to allow closer zoom
          maxDistance={10}
          enableDamping
          dampingFactor={0.05}
          zoomSpeed={1.2} // Increased zoom speed
          rotateSpeed={0.8}
          target={[0, 0, 0]} // Ensure we're targeting the center
          enableZoom={true}
        />
      </Canvas>
    </div>
  );
};

export default ParticleVisualizer;
