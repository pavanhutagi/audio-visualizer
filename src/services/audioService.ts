import Meyda from "meyda";
import { audioSettings, moodDetection } from "../../aisettings";

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

class AudioService {
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private meydaAnalyzer: any = null;
  private stream: MediaStream | null = null;
  private isInitialized = false;
  private sensitivity: number = moodDetection.defaultSensitivity;

  private listeners: ((result: AudioAnalysisResult) => void)[] = [];

  private currentMood: MoodType = "calm";
  private moodChangeTime: number = 0;
  private moodChangeThreshold: number = 300; // ms

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Request microphone access with standard settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Set up Web Audio API
      this.audioContext = new AudioContext();
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.analyzer = this.audioContext.createAnalyser();

      // Use standard analyzer settings
      this.analyzer.fftSize = 256; // Standard size
      this.analyzer.smoothingTimeConstant = 0.8; // Standard smoothing
      this.analyzer.minDecibels = -100;
      this.analyzer.maxDecibels = -30;

      // Connect microphone to analyzer
      this.microphone.connect(this.analyzer);

      // Set up a simple analyzer without Meyda
      this.isInitialized = true;

      // Start the analysis loop
      this.startAnalysisLoop();

      return true;
    } catch (error) {
      console.error("Error initializing audio service:", error);
      return false;
    }
  }

  private startAnalysisLoop(): void {
    if (!this.analyzer || !this.audioContext) return;

    const bufferLength = this.analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Simple noise floor
    let noiseFloor = 0.05;

    const analyzeAudio = () => {
      if (!this.isInitialized) return;

      // Get frequency data
      this.analyzer!.getByteFrequencyData(dataArray);

      // Calculate simple energy
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      let energy = sum / (bufferLength * 255); // Normalize to 0-1

      // Apply a simple noise gate
      energy = Math.max(0, energy - noiseFloor);

      // Apply sensitivity
      energy = Math.min(1, energy * 2.0 * this.sensitivity);

      // Calculate simple RMS
      let rmsSum = 0;
      for (let i = 0; i < bufferLength; i++) {
        rmsSum += (dataArray[i] / 255) ** 2;
      }
      const rms = Math.sqrt(rmsSum / bufferLength);

      // Calculate zero crossing rate (simplified)
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

      // Calculate spectral centroid
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < bufferLength; i++) {
        const amplitude = dataArray[i] / 255;
        numerator += i * amplitude;
        denominator += amplitude;
      }
      const spectralCentroid =
        denominator === 0 ? 0 : numerator / denominator / bufferLength;

      // Calculate spectral flatness (simplified)
      let geometricMean = 0;
      let arithmeticMean = 0;
      let nonZeroCount = 0;
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i] / 255;
        if (value > 0.01) {
          // Avoid log(0)
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

      // Calculate spectral rolloff (simplified)
      const rolloffThreshold = 0.85; // 85% of energy
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

      // Simple mood detection
      const moodResult = this.detectMood({
        energy,
        rms,
        zcr,
        spectralCentroid,
        spectralFlatness,
        spectralRolloff,
      });

      // Notify listeners with all features
      this.notifyListeners({
        mood: moodResult.mood,
        confidence: moodResult.confidence,
        features: {
          energy,
          rms,
          zcr,
          spectralCentroid,
          spectralFlatness,
          spectralRolloff,
        },
      });

      // Continue the loop
      requestAnimationFrame(analyzeAudio);
    };

    // Start the analysis loop
    analyzeAudio();
  }

  private handleAudioFeatures(features: AudioFeatures): void {
    // Normalize features to 0-1 range
    const normalizedFeatures = this.normalizeFeatures(features);

    // Detect mood
    const { mood, confidence } = this.detectMood(normalizedFeatures);

    // Calculate dominant frequency
    const dominantFrequency = this.calculateDominantFrequency();

    // Create analysis result
    const result: AudioAnalysisResult = {
      features: normalizedFeatures,
      mood,
      moodConfidence: confidence,
      dominantFrequency,
    };

    // Notify listeners
    this.notifyListeners(result);
  }

  private normalizeFeatures(features: AudioFeatures): AudioFeatures {
    const normalized: AudioFeatures = { ...features };

    // Simple normalization for better performance
    if (normalized.energy !== undefined)
      normalized.energy = Math.min(1, Math.max(0, normalized.energy));

    if (normalized.spectralCentroid !== undefined)
      normalized.spectralCentroid = Math.min(
        1,
        Math.max(0, normalized.spectralCentroid / 10000)
      );

    if (normalized.spectralFlatness !== undefined)
      normalized.spectralFlatness = Math.min(
        1,
        Math.max(0, normalized.spectralFlatness)
      );

    if (normalized.spectralRolloff !== undefined)
      normalized.spectralRolloff = Math.min(
        1,
        Math.max(0, normalized.spectralRolloff / 22050)
      );

    if (normalized.rms !== undefined)
      normalized.rms = Math.min(1, Math.max(0, normalized.rms * 5));

    if (normalized.zcr !== undefined)
      normalized.zcr = Math.min(1, Math.max(0, normalized.zcr / 1000));

    return normalized;
  }

  private detectMood(features: AudioFeatures): {
    mood: MoodType;
    confidence: number;
  } {
    const { energy, spectralCentroid, zcr, spectralFlatness } = features;
    let detectedMood: MoodType;

    // Simple mood detection thresholds
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

    // Quick mood changes
    const now = Date.now();
    if (detectedMood !== this.currentMood) {
      if (now - this.moodChangeTime > 100) {
        this.currentMood = detectedMood;
        this.moodChangeTime = now;
      }
    }

    return { mood: this.currentMood, confidence: 1.0 };
  }

  private calculateDominantFrequency(): number {
    if (!this.analyzer) return 0;

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
    const sampleRate = this.audioContext?.sampleRate || 44100;
    return (maxIndex * sampleRate) / (this.analyzer.fftSize * 2);
  }

  setSensitivity(value: number): void {
    this.sensitivity = Math.max(0, Math.min(1, value));
  }

  subscribe(callback: (result: AudioAnalysisResult) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  private notifyListeners(result: AudioAnalysisResult): void {
    this.listeners.forEach((listener) => listener(result));
  }

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
