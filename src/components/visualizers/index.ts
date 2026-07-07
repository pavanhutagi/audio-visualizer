import ParticleVisualizer from "./ParticleVisualizer";
import FrequencyBarsVisualizer from "./FrequencyBarsVisualizer";
import WaveformVisualizer from "./WaveformVisualizer";
import type { VisualizerDefinition } from "./types";

/**
 * Registry of all available visualizers. Add new visualizers here and they
 * automatically appear in the visualizer picker.
 */
export const visualizers: VisualizerDefinition[] = [
  {
    id: "particles",
    name: "Disco Globe",
    description: "3D particle sphere that pulses and spins with the beat",
    component: ParticleVisualizer,
  },
  {
    id: "bars",
    name: "Spectrum Bars",
    description: "Classic frequency equalizer with mirrored reflection",
    component: FrequencyBarsVisualizer,
  },
  {
    id: "waveform",
    name: "Waveform",
    description: "Glowing oscilloscope tracing the live audio waveform",
    component: WaveformVisualizer,
  },
];

/** The visualizer selected by default. */
export const defaultVisualizerId = "particles";

/**
 * Look up a visualizer definition by id, falling back to the default.
 */
export const getVisualizer = (id: string): VisualizerDefinition =>
  visualizers.find((v) => v.id === id) ??
  visualizers.find((v) => v.id === defaultVisualizerId) ??
  visualizers[0];

export type { VisualizerDefinition, VisualizerProps } from "./types";
