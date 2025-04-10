"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import audioService, {
  AudioAnalysisResult,
  MoodType,
} from "@/services/audioService";
import ParticleVisualizer from "@/components/visualizers/ParticleVisualizer";

export default function VisualizerPage() {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioData, setAudioData] = useState<AudioAnalysisResult | null>(null);
  const [sensitivity, setSensitivity] = useState(0.7);
  const [error, setError] = useState<string | null>(null);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Initialize audio service
  useEffect(() => {
    const initAudio = async () => {
      try {
        const success = await audioService.initialize();
        if (success) {
          setIsInitialized(true);

          // Subscribe to audio analysis updates with no throttling
          const unsubscribe = audioService.subscribe((result) => {
            // Update immediately for every audio frame
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

  // Add a function to get the mood color
  const getMoodColor = (mood: MoodType | string): string => {
    // Default colors for each mood
    const moodColors = {
      energetic: "#FF5722", // Orange-red
      happy: "#FFC107", // Amber
      calm: "#2196F3", // Blue
      melancholic: "#9C27B0", // Purple
    };

    return moodColors[mood as MoodType] || "#2196F3"; // Default to blue
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header with improved layout */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-900">
        {/* Back button - fixed width */}
        <div className="w-24 sm:w-28">
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors w-full"
          >
            Back
          </button>
        </div>

        {/* Centered sensitivity control - always in center */}
        <div className="flex flex-col items-center justify-center flex-grow mx-4 my-2 sm:my-0">
          <div className="flex items-center justify-center w-full max-w-md">
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

        {/* Mood display - with dynamic background color based on mood */}
        <div className="w-24 sm:w-28 text-center">
          <div
            className="px-2 py-1 rounded transition-colors duration-300"
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
            {error ? (
              <div className="text-red-500 max-w-md text-center p-4">
                <h3 className="text-xl font-bold mb-2">Error</h3>
                <p>{error}</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                <p>Initializing audio...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audio feature display */}
      <div className="flex justify-around p-2 bg-gray-900 text-xs overflow-x-auto">
        <div>Energy: {audioData?.features.energy?.toFixed(2) || "0.00"}</div>
        <div>RMS: {audioData?.features.rms?.toFixed(2) || "0.00"}</div>
        <div>ZCR: {audioData?.features.zcr?.toFixed(2) || "0.00"}</div>
        <div>
          Centroid: {audioData?.features.spectralCentroid?.toFixed(2) || "0.00"}
        </div>
        <div>
          Flatness: {audioData?.features.spectralFlatness?.toFixed(2) || "0.00"}
        </div>
        <div>
          Rolloff: {audioData?.features.spectralRolloff?.toFixed(2) || "0.00"}
        </div>
      </div>
    </div>
  );
}
