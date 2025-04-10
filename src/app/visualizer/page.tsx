"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import audioService, {
  AudioAnalysisResult,
  MoodType,
} from "@/services/audioService";
import ParticleVisualizer from "@/components/visualizers/ParticleVisualizer";

/**
 * Maps mood types to display colors
 */
const moodColors: Record<string, string> = {
  energetic: "#FF5722", // Orange-red
  happy: "#4CAF50", // Green
  calm: "#2196F3", // Blue
  melancholic: "#9C27B0", // Purple
  default: "#607D8B", // Blue-grey
};

/**
 * Loading spinner component
 */
const LoadingSpinner: React.FC = () => (
  <div className="text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
    <p>Initializing audio...</p>
  </div>
);

/**
 * Error display component
 */
const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-red-500 max-w-md text-center p-4">
    <h3 className="text-xl font-bold mb-2">Error</h3>
    <p>{message}</p>
  </div>
);

/**
 * Audio feature with progress bar component
 */
const FeatureWithBar: React.FC<{
  label: string;
  value: number | undefined;
  max?: number;
}> = ({ label, value, max = 1 }) => {
  const displayValue = value?.toFixed(2) || "0.00";
  const percentage = value ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="px-2">
      <div className="text-center">
        {label}: {displayValue}
      </div>
      <div className="w-full bg-gray-700 h-1 mt-1 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 h-full rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Audio features display component with progress bars
 */
const AudioFeatures: React.FC<{ audioData: AudioAnalysisResult | null }> = ({
  audioData,
}) => (
  <div className="flex justify-around p-2 sm:p-4 bg-gray-900 text-xs overflow-x-auto">
    <FeatureWithBar label="Energy" value={audioData?.features.energy} />
    <FeatureWithBar label="RMS" value={audioData?.features.rms} />
    <FeatureWithBar label="ZCR" value={audioData?.features.zcr} />
    <FeatureWithBar
      label="Centroid"
      value={audioData?.features.spectralCentroid}
    />
    <FeatureWithBar
      label="Flatness"
      value={audioData?.features.spectralFlatness}
    />
    <FeatureWithBar
      label="Rolloff"
      value={audioData?.features.spectralRolloff}
      max={1.5}
    />
  </div>
);

/**
 * Main visualizer page component
 */
export default function VisualizerPage() {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioData, setAudioData] = useState<AudioAnalysisResult | null>(null);
  const [sensitivity, setSensitivity] = useState(0.7);
  const [error, setError] = useState<string | null>(null);

  // Initialize audio service
  useEffect(() => {
    const initAudio = async () => {
      try {
        const success = await audioService.initialize();
        if (success) {
          setIsInitialized(true);

          // Subscribe to audio analysis updates
          const unsubscribe = audioService.subscribe((result) => {
            setAudioData(result);
          });

          // Cleanup on unmount
          return () => {
            unsubscribe();
            audioService.stop();
          };
        } else {
          setError(
            "Failed to initialize audio. Please check your microphone permissions."
          );
        }
      } catch (err) {
        setError(
          "Error accessing microphone: " +
            (err instanceof Error ? err.message : String(err))
        );
      }
    };

    initAudio();
  }, []);

  // Update sensitivity
  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSensitivity(value);
    audioService.setSensitivity(value);
  };

  // Return to home
  const handleBack = () => {
    router.push("/");
  };

  // Get color for current mood
  const getMoodColor = (mood: MoodType | string): string => {
    return moodColors[mood] || moodColors.default;
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header with controls - updated for responsive design */}
      <div className="flex justify-between items-center p-2 sm:p-4 border-b border-gray-800 bg-gray-900">
        <button
          onClick={handleBack}
          className="h-full px-5 py-1.5 sm:px-6 sm:py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center text-sm sm:text-base min-w-24 justify-center"
        >
          <span className="mr-1">◀</span> Back
        </button>

        {/* Only show sensitivity in header on larger screens */}
        <div className="hidden sm:flex flex-grow mx-4 justify-center">
          <div className="flex items-center w-full max-w-xs">
            <span className="mr-2 whitespace-nowrap">Sensitivity:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={sensitivity}
              onChange={handleSensitivityChange}
              className="w-full"
            />
            <span className="ml-2">{sensitivity.toFixed(1)}</span>
          </div>
        </div>

        {/* Mood display - increased width for mobile */}
        <div className="w-32 sm:w-28 text-center">
          <div
            className="px-2 py-1 rounded transition-colors duration-300 h-full flex flex-col justify-center"
            style={{
              backgroundColor: getMoodColor(audioData?.mood || "calm"),
            }}
          >
            <div className="text-xs">Mood</div>
            <div className="font-bold truncate">
              {audioData?.mood || "none"}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-grow relative">
        {isInitialized ? (
          <ParticleVisualizer audioData={audioData} />
        ) : (
          <div className="flex items-center justify-center h-full">
            {error ? <ErrorDisplay message={error} /> : <LoadingSpinner />}
          </div>
        )}
      </div>

      {/* Mobile sensitivity control - only shown on small screens */}
      <div className="sm:hidden p-2 pb-1.5 bg-gray-900 border-t border-gray-800">
        <div className="flex items-center justify-center">
          <span className="mr-2 text-xs sm:text-sm">Sensitivity:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={sensitivity}
            onChange={handleSensitivityChange}
            className="w-full max-w-48"
          />
          <span className="ml-2 text-xs sm:text-sm">
            {sensitivity.toFixed(1)}
          </span>
        </div>
        {/* Add separator line */}
        <div className="mt-2 border-t border-gray-700"></div>
      </div>

      {/* Audio feature display - reduced padding on mobile */}
      <AudioFeatures audioData={audioData} />
    </div>
  );
}
