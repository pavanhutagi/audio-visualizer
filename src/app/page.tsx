import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <h1 className="text-4xl font-bold mb-4">AI Audio Visualizer</h1>
        <p className="text-center max-w-md mb-8">
          Experience real-time audio visualization that adapts to the mood of
          your sound. This app uses AI to analyze audio from your microphone and
          creates dynamic visualizations based on the detected emotional
          characteristics.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="/visualizer"
          >
            Launch Visualizer
          </Link>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href="https://github.com/pavanhutagi/audio-visualizer"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Source
          </a>
        </div>

        <div className="mt-8 p-6 bg-black/[.05] dark:bg-white/[.06] rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Real-time microphone audio analysis</li>
            <li>Mood detection (happy, energetic, calm, melancholic)</li>
            <li>Dynamic 3D particle visualization</li>
            <li>Adjustable sensitivity controls</li>
          </ul>
        </div>
      </main>

      <footer className="row-start-3 text-center text-sm opacity-70">
        Built with Next.js, Three.js, and Meyda.js
      </footer>
    </div>
  );
}
