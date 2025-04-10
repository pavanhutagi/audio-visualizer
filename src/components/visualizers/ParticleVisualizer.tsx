import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { AudioAnalysisResult } from "@/services/audioService";
import { visualizationSettings } from "../../../aisettings";

type ParticleVisualizerProps = {
  audioData: AudioAnalysisResult | null;
};

// Particle system component
const ParticleSystem = ({ audioData }: ParticleVisualizerProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [lastMood, setLastMood] = useState<string>("calm");

  // Reduce particle count for better performance
  const count = 800;

  // Use useMemo to create particles only once
  const particles = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    // Create a circular texture for particles
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

    const texture = new THREE.CanvasTexture(canvas);

    // Initialize particles in a sphere with reduced radius
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Reduce radius from 2.5 to 2.0
      const radius = 2.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { geometry, material };
  }, [count]);

  // Direct response to audio data changes
  useEffect(() => {
    if (!audioData || !pointsRef.current) return;

    const mood = audioData.mood || "calm";
    const energy = audioData.features.energy || 0;

    // Only update color when mood changes for better performance
    if (mood !== lastMood) {
      const colorPalette = visualizationSettings.colorPalettes[mood];
      const color = new THREE.Color(colorPalette[0]);
      particles.material.color = color;
      setLastMood(mood);
    }

    // Immediately update size based on energy
    particles.material.size = 0.1 + energy * 0.3;
  }, [audioData, lastMood, particles.material]);

  // Animation frame for continuous rotation with increased speed
  useFrame((state, delta) => {
    if (!pointsRef.current || !audioData) return;

    const energy = audioData.features.energy || 0;

    // Apply rotation based on energy with increased speed
    const baseRotation = 0.01; // Always have some rotation
    const energyRotation = energy * 0.5; // Increased from 0.2 to 0.5 for faster rotation

    pointsRef.current.rotation.y += delta * (baseRotation + energyRotation);
    pointsRef.current.rotation.x +=
      delta * (baseRotation + energyRotation) * 0.3;
  });

  return (
    <points
      ref={pointsRef}
      geometry={particles.geometry}
      material={particles.material}
    />
  );
};

// Main visualizer component
const ParticleVisualizer: React.FC<ParticleVisualizerProps> = ({
  audioData,
}) => {
  return (
    <div className="w-full h-full">
      {/* Adjust camera position to be slightly further away */}
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <ParticleSystem audioData={audioData} />
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};

export default ParticleVisualizer;
