"use client";

import React, { useEffect, useRef } from "react";
import { visualizationSettings } from "../../../aisettings";
import type { VisualizerProps } from "./types";

/**
 * WaveformVisualizer
 *
 * A glowing oscilloscope. The time-domain waveform is drawn as a smooth,
 * mood-colored line across the center of the screen. Louder audio (higher
 * energy) scales the amplitude and thickens the glow, while a faint mirrored
 * copy adds depth. A subtle grid gives it a scope-like feel.
 */
const WaveformVisualizer: React.FC<VisualizerProps> = ({ audioData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioDataRef = useRef(audioData);
  const amplitudeRef = useRef(0);

  useEffect(() => {
    audioDataRef.current = audioData;
  }, [audioData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const drawGrid = (width: number, height: number) => {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      const step = 40;
      ctx.beginPath();
      for (let x = 0; x <= width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    };

    const drawWave = (
      wave: number[],
      width: number,
      height: number,
      amp: number,
      color: string,
      lineWidth: number,
      alpha: number
    ) => {
      const mid = height / 2;
      ctx.beginPath();
      for (let i = 0; i < wave.length; i++) {
        const x = (i / (wave.length - 1)) * width;
        const y = mid + wave[i] * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const data = audioDataRef.current;

      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(0, 0, width, height);
      drawGrid(width, height);

      const mood = data?.mood ?? "calm";
      const palette = visualizationSettings.colorPalettes[mood];
      const wave = data?.waveform ?? [];
      const energy = data?.features.energy ?? 0;

      if (wave.length > 1) {
        // Ease the amplitude scale so quiet↔loud transitions feel fluid.
        const targetAmp = height * 0.18 * (1 + energy * 2.5);
        amplitudeRef.current += (targetAmp - amplitudeRef.current) * 0.2;
        const amp = amplitudeRef.current;

        // Ghost/echo copy behind the main trace for depth.
        drawWave(wave, width, height, amp * 1.12, palette[palette.length - 1], 2, 0.25);
        // Main trace.
        drawWave(wave, width, height, amp, palette[0], 2.5 + energy * 4, 1);
      } else {
        // Flat idle line when there's no audio yet.
        const mid = height / 2;
        ctx.beginPath();
        ctx.moveTo(0, mid);
        ctx.lineTo(width, mid);
        ctx.strokeStyle = palette[0];
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="w-full h-full bg-black">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export default WaveformVisualizer;
