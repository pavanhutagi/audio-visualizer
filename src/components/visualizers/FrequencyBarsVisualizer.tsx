"use client";

import React, { useEffect, useRef } from "react";
import { visualizationSettings } from "../../../aisettings";
import type { VisualizerProps } from "./types";

/**
 * FrequencyBarsVisualizer
 *
 * A classic 2D spectrum-analyser. The normalized frequency spectrum from the
 * audio service is grouped into a fixed number of bars, each drawn as a
 * mood-colored gradient with a soft mirrored reflection. Bar heights ease
 * toward their targets so the motion stays smooth between animation frames.
 */
const FrequencyBarsVisualizer: React.FC<VisualizerProps> = ({ audioData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioDataRef = useRef(audioData);
  const smoothedRef = useRef<number[]>([]);

  // Keep the latest audio frame available to the animation loop without
  // restarting the loop on every render.
  useEffect(() => {
    audioDataRef.current = audioData;
  }, [audioData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BAR_COUNT = 64;
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

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const data = audioDataRef.current;

      // Trail effect: fade the previous frame instead of a hard clear.
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(0, 0, width, height);

      const mood = data?.mood ?? "calm";
      const palette = visualizationSettings.colorPalettes[mood];
      const spectrum = data?.frequencyData ?? [];

      // Compute target heights by averaging the spectrum into BAR_COUNT groups.
      const targets = new Array<number>(BAR_COUNT).fill(0);
      if (spectrum.length > 0) {
        const groupSize = spectrum.length / BAR_COUNT;
        for (let i = 0; i < BAR_COUNT; i++) {
          const start = Math.floor(i * groupSize);
          const end = Math.max(start + 1, Math.floor((i + 1) * groupSize));
          let sum = 0;
          for (let j = start; j < end; j++) sum += spectrum[j];
          // Emphasize higher bins (which are usually quieter) with a gentle boost.
          const boost = 1 + (i / BAR_COUNT) * 0.8;
          targets[i] = Math.min(1, (sum / (end - start)) * boost);
        }
      }

      if (smoothedRef.current.length !== BAR_COUNT) {
        smoothedRef.current = new Array<number>(BAR_COUNT).fill(0);
      }
      const smoothed = smoothedRef.current;

      const baseline = height * 0.62;
      const maxBarHeight = height * 0.5;
      const gap = 2;
      const barWidth = Math.max(1, width / BAR_COUNT - gap);

      for (let i = 0; i < BAR_COUNT; i++) {
        // Ease toward the target: fast attack, slower release.
        const target = targets[i];
        const current = smoothed[i];
        const rate = target > current ? 0.5 : 0.12;
        smoothed[i] = current + (target - current) * rate;

        const barHeight = smoothed[i] * maxBarHeight;
        const x = i * (barWidth + gap) + gap / 2;

        const color = palette[i % palette.length];

        // Main bar with a vertical gradient.
        const gradient = ctx.createLinearGradient(0, baseline - barHeight, 0, baseline);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, palette[(i + 1) % palette.length]);
        ctx.fillStyle = gradient;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fillRect(x, baseline - barHeight, barWidth, barHeight);

        // Mirrored reflection below the baseline.
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.22;
        ctx.fillRect(x, baseline, barWidth, barHeight * 0.55);
        ctx.globalAlpha = 1;
      }

      ctx.shadowBlur = 0;
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

export default FrequencyBarsVisualizer;
