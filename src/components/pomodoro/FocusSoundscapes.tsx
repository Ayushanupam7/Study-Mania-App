import React from "react";
import { Headphones, Volume2, VolumeX } from "lucide-react";

export interface Track {
  id: string;
  name: string;
  url: string;
  desc: string;
}

export const TRACKS: Track[] = [
  { id: "lofi", name: "Lo-Fi Study Beats", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", desc: "Relaxing chillhop rhythms" },
  { id: "synth", name: "Zen Synth Ambient", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", desc: "Cosmic meditative synth pads" },
  { id: "piano", name: "Peaceful Piano", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", desc: "Gentle classical piano loops" },
  { id: "acoustic", name: "Acoustic Focus", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", desc: "Calming guitar vibes" },
  { id: "beats", name: "Deep Study Beats", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", desc: "Steady rhythm for deep work" }
];

interface FocusSoundscapesProps {
  currentTrackId: string;
  setCurrentTrackId: (id: string) => void;
  isMusicPlaying: boolean;
  setIsMusicPlaying: (playing: boolean) => void;
  musicVolume: number;
  setMusicVolume: (volume: number) => void;
  autoPlayMusic: boolean;
  setAutoPlayMusic: (autoPlay: boolean) => void;
}

export const FocusSoundscapes: React.FC<FocusSoundscapesProps> = ({
  currentTrackId,
  setCurrentTrackId,
  isMusicPlaying,
  setIsMusicPlaying,
  musicVolume,
  setMusicVolume,
  autoPlayMusic,
  setAutoPlayMusic
}) => {
  const activeTrack = TRACKS.find(t => t.id === currentTrackId) || TRACKS[0];

  return (
    <div className="glass-card p-5 rounded-3xl border border-indigo-500/10">
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
          <Headphones className="h-5 w-5 text-indigo-500 animate-pulse" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Focus Soundscapes
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-bold block mb-1">Choose Track</label>
            <select
              value={currentTrackId}
              onChange={e => setCurrentTrackId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
            >
              {TRACKS.map(track => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            <strong>Track:</strong> {activeTrack.desc}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMusicPlaying(!isMusicPlaying)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isMusicPlaying
                    ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {isMusicPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{isMusicPlaying ? "Pause Audio" : "Play Audio"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Volume2 className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(musicVolume * 100)}
                onChange={e => setMusicVolume(parseFloat(e.target.value) / 100)}
                className="w-full accent-indigo-500 h-1 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 w-6 text-right shrink-0">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
          </div>

          <div className="pt-1.5">
            <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={autoPlayMusic}
                onChange={e => setAutoPlayMusic(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500/50 cursor-pointer"
              />
              <span>Auto-play soundscape on timer start</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
