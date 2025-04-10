/**
 * Audio Analysis Settings
 */
export const audioSettings = {
  // Microphone and audio processing settings
  fftSize: 256,
  smoothingTimeConstant: 0.4, // Reduced from 0.7 for faster response
  minDecibels: -80,
  maxDecibels: -30,

  // Feature extraction settings
  featureExtraction: {
    bufferSize: 256, // Reduced from 512 for lower latency
    hopSize: 128, // Reduced from 256 for lower latency
    windowingFunction: "hamming",
    features: ["energy", "rms", "zcr"],
  },
};

/**
 * Mood detection thresholds and mappings
 */
export const moodDetection = {
  // Mood categories and their audio feature thresholds
  moods: {
    happy: {
      energy: { min: 0.5, weight: 1.0 },
    },
    energetic: {
      energy: { min: 0.7, weight: 1.0 },
    },
    calm: {
      energy: { max: 0.4, weight: 1.0 },
    },
    melancholic: {
      energy: { max: 0.3, weight: 1.0 },
    },
  },

  // Sensitivity adjustment (0-1)
  defaultSensitivity: 0.8,
};

/**
 * Visualization settings for different moods
 */
export const visualizationSettings = {
  // Color palettes for each mood
  colorPalettes: {
    happy: ["#FFC300", "#FF5733", "#C70039", "#900C3F"],
    energetic: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00"],
    calm: ["#0000FF", "#007FFF", "#00FFFF", "#7F00FF"],
    melancholic: ["#4B0082", "#8B00FF", "#9400D3", "#800080"],
  },

  // Animation parameters
  animation: {
    happy: {
      speed: 0.8,
      complexity: 0.7,
      particleDensity: 0.8,
    },
    energetic: {
      speed: 1.0,
      complexity: 0.9,
      particleDensity: 1.0,
    },
    calm: {
      speed: 0.4,
      complexity: 0.5,
      particleDensity: 0.6,
    },
    melancholic: {
      speed: 0.5,
      complexity: 0.8,
      particleDensity: 0.7,
    },
  },

  // Default visualization style
  defaultStyle: "particles",

  // Responsive settings
  responsive: {
    mobileDensityMultiplier: 0.6,
    tabletDensityMultiplier: 0.8,
  },
};
