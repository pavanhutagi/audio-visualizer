import type React from "react";
import type { AudioAnalysisResult } from "@/services/audioService";

/**
 * Props implemented by every visualizer component.
 * Visualizers receive the latest audio analysis frame (or null before audio
 * is initialized) and render themselves to fill their parent container.
 */
export type VisualizerProps = {
  audioData: AudioAnalysisResult | null;
};

/**
 * Registry entry describing a selectable visualizer.
 */
export type VisualizerDefinition = {
  /** Stable identifier used for selection/persistence. */
  id: string;
  /** Human-readable name shown in the visualizer picker. */
  name: string;
  /** Short description of the visual style. */
  description: string;
  /** The React component that renders the visualizer. */
  component: React.ComponentType<VisualizerProps>;
};
