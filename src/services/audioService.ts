import { audioSettings, moodDetection } from "../../aisettings";

// Define clear types for better type safety
export type AudioFeatures = {
  energy: number;
  spectralCentroid: number;
  spectralFlatness: number;
  spectralRolloff: number;
  rms: number;
  zcr: number;
  [key: string]: number;
};

export type MoodType = "happy" | "energetic" | "calm" | "melancholic";

export type AudioAnalysisResult = {
  features: AudioFeatures;
  mood: MoodType;
  moodConfidence: number;
  dominantFrequency: number;
};

/**
 * AudioService handles microphone input, audio analysis, and mood detection
 */
class AudioService {
  // Web Audio API components
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  // State
  private isInitialized = false;
  private sensitivity: number = moodDetection.defaultSensitivity;
  private listeners: ((result: AudioAnalysisResult) => void)[] = [];

  // Mood tracking
  private currentMood: MoodType = "calm";
  private moodChangeTime: number = 0;
  private moodChangeThreshold: number = 100; // ms - reduced for faster response

  /**
   * Initialize audio capture and analysis
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Set up Web Audio API
      this.audioContext = new AudioContext();
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.analyzer = this.audioContext.createAnalyser();

      // Configure analyzer with settings from config
      this.analyzer.fftSize = audioSettings.fftSize;
      this.analyzer.smoothingTimeConstant = 0.4;
      this.analyzer.minDecibels = audioSettings.minDecibels;
      this.analyzer.maxDecibels = audioSettings.maxDecibels;

      // Connect microphone to analyzer
      this.microphone.connect(this.analyzer);

      this.isInitialized = true;

      // Start the analysis loop
      this.startAnalysisLoop();

      return true;
    } catch (error) {
      console.error("Error initializing audio service:", error);
      return false;
    }
  }

  /**
   * Main audio analysis loop
   */
  private startAnalysisLoop(): void {
    if (!this.analyzer || !this.audioContext) return;

    const bufferLength = this.analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Noise floor for filtering out background noise
    const noiseFloor = 0.03;

    const analyzeAudio = () => {
      if (!this.isInitialized) return;

      // Get frequency data
      this.analyzer!.getByteFrequencyData(dataArray);

      // Extract audio features
      const features = this.extractAudioFeatures(
        dataArray,
        bufferLength,
        noiseFloor
      );

      // Detect mood based on features
      const moodResult = this.detectMood(features);

      // Calculate dominant frequency
      const dominantFrequency = this.calculateDominantFrequency();

      // Notify listeners with analysis results
      this.notifyListeners({
        mood: moodResult.mood,
        moodConfidence: moodResult.confidence,
        features,
        dominantFrequency,
      });

      // Continue the loop
      requestAnimationFrame(analyzeAudio);
    };

    // Start the analysis loop
    analyzeAudio();
  }

  /**
   * Extract audio features from frequency data
   */
  private extractAudioFeatures(
    dataArray: Uint8Array,
    bufferLength: number,
    noiseFloor: number
  ): AudioFeatures {
    // Calculate energy
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    let energy = sum / (bufferLength * 255); // Normalize to 0-1

    // Apply noise gate and sensitivity
    energy = Math.max(0, energy - noiseFloor);
    energy = Math.min(1, energy * 2.0 * this.sensitivity);

    // Calculate RMS (Root Mean Square)
    let rmsSum = 0;
    for (let i = 0; i < bufferLength; i++) {
      rmsSum += (dataArray[i] / 255) ** 2;
    }
    const rms = Math.sqrt(rmsSum / bufferLength);

    // Calculate ZCR (Zero Crossing Rate)
    let zcr = 0;
    let prevValue = dataArray[0] > 128 ? 1 : -1;
    for (let i = 1; i < bufferLength; i++) {
      const currentValue = dataArray[i] > 128 ? 1 : -1;
      if (prevValue !== currentValue) {
        zcr++;
      }
      prevValue = currentValue;
    }
    zcr = zcr / bufferLength;

    // Calculate spectral centroid (brightness)
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = dataArray[i] / 255;
      numerator += i * amplitude;
      denominator += amplitude;
    }
    const spectralCentroid =
      denominator === 0 ? 0 : numerator / denominator / bufferLength;

    // Calculate spectral flatness
    let geometricMean = 0;
    let arithmeticMean = 0;
    let nonZeroCount = 0;
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] / 255;
      if (value > 0.01) {
        geometricMean += Math.log(value);
        arithmeticMean += value;
        nonZeroCount++;
      }
    }
    geometricMean =
      nonZeroCount > 0 ? Math.exp(geometricMean / nonZeroCount) : 0;
    arithmeticMean = nonZeroCount > 0 ? arithmeticMean / nonZeroCount : 0;
    const spectralFlatness =
      arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

    // Calculate spectral rolloff
    const rolloffThreshold = 0.85;
    let cumulativeEnergy = 0;
    const totalEnergy = sum;
    let spectralRolloff = 0;
    for (let i = 0; i < bufferLength; i++) {
      cumulativeEnergy += dataArray[i];
      if (cumulativeEnergy / totalEnergy >= rolloffThreshold) {
        spectralRolloff = i / bufferLength;
        break;
      }
    }

    return {
      energy,
      rms,
      zcr,
      spectralCentroid,
      spectralFlatness,
      spectralRolloff,
    };
  }

  /**
   * Detect mood based on audio features
   */
  private detectMood(features: AudioFeatures): {
    mood: MoodType;
    confidence: number;
  } {
    const { energy, spectralCentroid, zcr, spectralFlatness } = features;
    let detectedMood: MoodType;

    // Mood detection logic based on audio features
    if (energy < 0.03) {
      // Very low energy - stay in current mood
      detectedMood = this.currentMood || "calm";
    } else if (energy > 0.3 && zcr > 0.2) {
      // High energy + high ZCR = energetic
      detectedMood = "energetic";
    } else if (energy > 0.2 && spectralCentroid > 0.3) {
      // Medium energy + bright sound = happy
      detectedMood = "happy";
    } else if (spectralFlatness > 0.15 && energy < 0.15) {
      // Low energy + high flatness = melancholic
      detectedMood = "melancholic";
    } else {
      // Default to calm
      detectedMood = "calm";
    }

    // Apply mood change debouncing
    const now = Date.now();
    if (detectedMood !== this.currentMood) {
      if (now - this.moodChangeTime > this.moodChangeThreshold) {
        this.currentMood = detectedMood;
        this.moodChangeTime = now;
      }
    }

    return { mood: this.currentMood, confidence: 1.0 };
  }

  /**
   * Calculate the dominant frequency in the audio signal
   */
  private calculateDominantFrequency(): number {
    if (!this.analyzer || !this.audioContext) return 0;

    const bufferLength = this.analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyzer.getByteFrequencyData(dataArray);

    // Find the frequency bin with the highest amplitude
    let maxIndex = 0;
    let maxValue = 0;

    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    // Convert bin index to frequency
    const sampleRate = this.audioContext.sampleRate;
    return (maxIndex * sampleRate) / (this.analyzer.fftSize * 2);
  }

  /**
   * Set sensitivity level for audio analysis
   */
  setSensitivity(value: number): void {
    this.sensitivity = Math.max(0, Math.min(1, value));
  }

  /**
   * Subscribe to audio analysis updates
   */
  subscribe(callback: (result: AudioAnalysisResult) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  /**
   * Notify all listeners with analysis results
   */
  private notifyListeners(result: AudioAnalysisResult): void {
    this.listeners.forEach((listener) => listener(result));
  }

  /**
   * Stop audio capture and analysis
   */
  stop(): void {
    this.isInitialized = false;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }

    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Create singleton instance
const audioService = new AudioService();
export default audioService;
