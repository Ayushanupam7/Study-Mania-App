import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Activity,
  CheckSquare,
  ExternalLink,
  Sun,
  Moon
} from "lucide-react";
import { useStore } from "../../store/store";

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface FocusTimerProps {
  timerType: "pomodoro" | "stopwatch";
  setTimerType: (type: "pomodoro" | "stopwatch") => void;
  mode: "work" | "short" | "long";
  secondsLeft: number;
  isRunning: boolean;
  arenaComment: string;
  setArenaComment: (comment: string) => void;
  handleReset: () => void;
  handleStartPause: () => void;
  handleStopwatchComplete: () => void;
  handleModeChange: (newMode: "work" | "short" | "long") => void;
  sessionCount: number;
  todayMinutes: number;
  totalStudyTime: number;
  progressPercent: number;
  strokeDashoffset: number;
  radius: number;
  circumference: number;
  storeWorkTime: number;
  storeShortBreak: number;
  storeLongBreak: number;
  todos: Todo[];
  activeTaskId: string;
  customFocusGoal: string;
  format: (sec: number) => string;
  formatStudyTime: (mins: number) => string;
  darkMode: boolean;
}

// Stopwatch color styling helpers
export const getStopwatchColor = (minute: number) => {
  const colors = [
    "stroke-indigo-500",
    "stroke-emerald-500",
    "stroke-pink-500",
    "stroke-amber-500",
    "stroke-sky-500",
    "stroke-red-500",
    "stroke-purple-500",
    "stroke-lime-500",
    "stroke-blue-500",
    "stroke-orange-500",
    "stroke-teal-500",
    "stroke-fuchsia-500",
    "stroke-rose-500",
    "stroke-cyan-500"
  ];
  return colors[minute % colors.length];
};

export const getStopwatchGradient = (minute: number) => {
  const gradients = [
    "from-indigo-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-pink-500 to-rose-600",
    "from-amber-500 to-orange-600",
    "from-sky-500 to-blue-600",
    "from-red-500 to-rose-600",
    "from-purple-500 to-fuchsia-600",
    "from-lime-500 to-green-600",
    "from-blue-500 to-indigo-600",
    "from-orange-500 to-red-600",
    "from-teal-500 to-emerald-600",
    "from-fuchsia-500 to-pink-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-blue-600"
  ];
  return gradients[minute % gradients.length];
};

export const getStopwatchTextColor = (minute: number, shade: "400" | "500" = "400") => {
  const textColors400 = [
    "text-indigo-400",
    "text-emerald-400",
    "text-pink-400",
    "text-amber-400",
    "text-sky-400",
    "text-red-400",
    "text-purple-400",
    "text-lime-400",
    "text-blue-400",
    "text-orange-400",
    "text-teal-400",
    "text-fuchsia-400",
    "text-rose-400",
    "text-cyan-400"
  ];
  const textColors500 = [
    "text-indigo-500",
    "text-emerald-500",
    "text-pink-500",
    "text-amber-500",
    "text-sky-500",
    "text-red-500",
    "text-purple-500",
    "text-lime-500",
    "text-blue-500",
    "text-orange-500",
    "text-teal-500",
    "text-fuchsia-500",
    "text-rose-500",
    "text-cyan-500"
  ];
  return shade === "400"
    ? textColors400[minute % textColors400.length]
    : textColors500[minute % textColors500.length];
};

export const getStopwatchBgLight = (minute: number) => {
  const bgLights = [
    "bg-indigo-500/30",
    "bg-emerald-500/30",
    "bg-pink-500/30",
    "bg-amber-500/30",
    "bg-sky-500/30",
    "bg-red-500/30",
    "bg-purple-500/30",
    "bg-lime-500/30",
    "bg-blue-500/30",
    "bg-orange-500/30",
    "bg-teal-500/30",
    "bg-fuchsia-500/30",
    "bg-rose-500/30",
    "bg-cyan-500/30"
  ];
  return bgLights[minute % bgLights.length];
};

export const FocusTimer: React.FC<FocusTimerProps> = ({
  timerType,
  setTimerType,
  mode,
  secondsLeft,
  isRunning,
  arenaComment,
  setArenaComment,
  handleReset,
  handleStartPause,
  handleStopwatchComplete,
  handleModeChange,
  sessionCount,
  todayMinutes,
  strokeDashoffset,
  radius,
  circumference,
  format,
  formatStudyTime,
  darkMode
}) => {
  const toggleTheme = useStore(state => state.toggleTheme);
  const [pipWindow, setPipWindow] = React.useState<Window | null>(null);
  const [pipHourMinuteOnly, setPipHourMinuteOnly] = React.useState(true);

  React.useEffect(() => {
    return () => {
      if (pipWindow) {
        pipWindow.close();
      }
    };
  }, [pipWindow]);

  React.useEffect(() => {
    if (pipWindow) {
      const themeClass = darkMode ? "dark" : "";
      pipWindow.document.body.className = `${themeClass} bg-white dark:bg-slate-950 text-slate-800 dark:text-white flex items-center justify-center min-h-screen overflow-hidden m-0 p-0 font-sans`;

      pipWindow.document.documentElement.className = themeClass;
      pipWindow.document.documentElement.style.background = darkMode ? "#020617" : "#ffffff";
      pipWindow.document.body.style.background = darkMode ? "#020617" : "#ffffff";
    }
  }, [pipWindow, darkMode]);

  const togglePiP = async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      alert("Floating Overlay (Document Picture-in-Picture) is not supported in this browser. Please use Chrome or Edge on Desktop.");
      return;
    }

    try {
      const w = await (window as any).documentPictureInPicture.requestWindow({
        width: 220,
        height: 140,
      });

      // Copy style sheets by cloning the DOM nodes
      [...document.querySelectorAll('style, link[rel="stylesheet"]')].forEach((el) => {
        w.document.head.appendChild(el.cloneNode(true));
      });

      w.document.body.className = "bg-slate-950 text-white flex items-center justify-center min-h-screen overflow-hidden m-0 p-0 font-sans";

      w.addEventListener("pagehide", () => {
        setPipWindow(null);
      });

      setPipWindow(w);
    } catch (e) {
      console.error("Failed to open PiP window: ", e);
    }
  };

  const formatHourMinute = (sec: number) => {
    const isPomodoro = timerType === "pomodoro";
    const totalMins = isPomodoro ? Math.ceil(sec / 60) : Math.floor(sec / 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;

    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, "0")}m`;
    }
    return `${m}m`;
  };

  const activeMinutes = Math.floor(secondsLeft / 60);

  return (
    <div className="glass-card p-5 md:p-6 rounded-3xl flex flex-col lg:flex-row items-center gap-5 lg:gap-6">
      {/* Circular Timer (Left Hand Side on Desktop) */}
      <div className="flex flex-col items-center justify-center shrink-0">
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
            {/* Back Circle */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              className="stroke-slate-200 dark:stroke-slate-800 fill-none"
              strokeWidth="10"
            />
            {/* Previous Lap Circle (Overlap) */}
            {timerType === "stopwatch" && activeMinutes > 0 && (
              <circle
                cx="120"
                cy="120"
                r={radius}
                className={`fill-none ${getStopwatchColor(activeMinutes - 1)}`}
                strokeWidth="8"
              />
            )}
            {/* Active Circle Progress Indicator */}
            <motion.circle
              cx="120"
              cy="120"
              r={radius}
              className={`fill-none ${timerType === "pomodoro"
                ? mode === "work"
                  ? "stroke-emerald-500"
                  : mode === "short"
                    ? "stroke-sky-500"
                    : "stroke-indigo-500"
                : getStopwatchColor(activeMinutes)
                }`}
              strokeWidth="8"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{
                duration: timerType === "stopwatch" && secondsLeft % 60 === 0 ? 0 : 0.35,
                ease: "linear"
              }}
              strokeLinecap="round"
            />
          </svg>

          {/* Absolute Centered text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              {timerType === "pomodoro"
                ? mode === "work"
                  ? "FOCUS"
                  : "BREAK"
                : "ELAPSED FOCUS"}
            </span>
            <motion.span
              animate={{ scale: isRunning && secondsLeft % 2 === 0 ? 1.02 : 1 }}
              className={`text-3xl md:text-4xl font-black font-mono tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${timerType === "pomodoro"
                ? mode === "work"
                  ? "from-emerald-500 to-teal-600"
                  : mode === "short"
                    ? "from-sky-100 to-blue-600"
                    : "from-indigo-500 to-purple-600"
                : getStopwatchGradient(activeMinutes)
                }`}
            >
              {format(secondsLeft)}
            </motion.span>
            <span className="font-bold text-[10px] uppercase flex items-center gap-1">
              {isRunning ? (
                <span className="flex h-2 w-2 relative">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timerType === "pomodoro"
                      ? mode === "work"
                        ? "bg-emerald-400"
                        : mode === "short"
                          ? "bg-sky-400"
                          : "bg-indigo-400"
                      : getStopwatchTextColor(activeMinutes).replace("text-", "bg-")
                      }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${timerType === "pomodoro"
                      ? mode === "work"
                        ? "bg-emerald-500"
                        : mode === "short"
                          ? "bg-sky-500"
                          : "bg-indigo-500"
                      : getStopwatchTextColor(activeMinutes, "500").replace("text-", "bg-")
                      }`}
                  ></span>
                </span>
              ) : null}
              <span
                className={
                  timerType === "pomodoro"
                    ? mode === "work"
                      ? "text-emerald-500"
                      : mode === "short"
                        ? "text-sky-500"
                        : "text-indigo-500"
                    : getStopwatchTextColor(activeMinutes, "500")
                }
              >
                {isRunning ? "Arena Active" : "Standing By"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Controls & Statistics (Right Hand Side on Desktop) */}
      <div className="flex flex-col items-center lg:items-start flex-1 w-full space-y-3.5">
        {/* Timer Type Selector (Tabs) */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 w-full max-w-[280px]">
          <button
            onClick={() => {
              if (isRunning) handleStartPause(); // trigger parent play/pause to pause correctly
              setTimerType("pomodoro");
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${timerType === "pomodoro"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
          >
            Pomodoro Mode
          </button>
          <button
            onClick={() => {
              if (isRunning) handleStartPause(); // trigger parent play/pause to pause correctly
              setTimerType("stopwatch");
            }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${timerType === "stopwatch"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
          >
            Stopwatch Mode
          </button>
        </div>

        {/* Mode Selector pills (Only visible in Pomodoro Mode) */}
        {timerType === "pomodoro" && (
          <div className="flex bg-slate-200/50 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 backdrop-blur-md">
            <button
              onClick={() => handleModeChange("work")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === "work" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              Focus Session
            </button>
            <button
              onClick={() => handleModeChange("short")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === "short" ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              Short Break
            </button>
            <button
              onClick={() => handleModeChange("long")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === "long" ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              Long Break
            </button>
          </div>
        )}

        {/* Stopwatch indicator (Visible only in Stopwatch Mode) */}
        {timerType === "stopwatch" && (
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs border border-indigo-200/40 dark:border-indigo-900/30">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            <span>Stopwatch Study Tracking</span>
          </div>
        )}

        {/* Status Comment Input */}
        <div className="w-full max-w-[280px] space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
            Live Status Comment (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Grinding math homework..."
            value={arenaComment}
            onChange={e => setArenaComment(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-xs text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Floating Bubble Settings */}
        <div className="w-full max-w-[280px] pt-0.5 space-y-1.5">
          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
            Floating Bubble Settings
          </span>
          <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900/20">
            <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pipHourMinuteOnly}
                onChange={e => setPipHourMinuteOnly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500/30 border-slate-300 dark:border-slate-700 h-3.5 w-3.5"
              />
              <span>Show Hour/Minute display only</span>
            </label>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleReset}
            className="p-3.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            onClick={handleStartPause}
            className={`p-5 rounded-full text-white shadow-xl transition-all transform active:scale-95 cursor-pointer ${timerType === "pomodoro"
              ? mode === "work"
                ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25"
                : mode === "short"
                  ? "bg-sky-500 hover:bg-sky-600 shadow-sky-500/25"
                  : "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/25"
              : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/25"
              }`}
          >
            {isRunning ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
          </button>

          {timerType === "pomodoro" ? (
            <button
              onClick={() => handleModeChange(mode === "work" ? "short" : "work")}
              className="p-3.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
              title="Skip Session"
            >
              <Coffee className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleStopwatchComplete}
              className="p-3.5 rounded-full border border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
              title="Complete focus session and earn XP"
            >
              <CheckSquare className="h-5 w-5" />
            </button>
          )}

          <button
            onClick={togglePiP}
            className={`p-3.5 rounded-full border transition-all cursor-pointer ${pipWindow
              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-500 dark:text-indigo-400"
              : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              }`}
            title={pipWindow ? "Close Floating Bubble" : "Floating Overlay Bubble"}
          >
            <ExternalLink className="h-5 w-5" />
          </button>
        </div>

        {/* Timer Stats overview */}
        <div className="grid grid-cols-2 gap-3 w-full border-t border-slate-200/50 dark:border-slate-800/50 pt-3">
          <div className="text-center p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/20">
            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sessions</div>
            <div className="text-lg font-black mt-0.5 text-slate-800 dark:text-white">{sessionCount}</div>
          </div>
          <div className="text-center p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/20">
            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today's Focus</div>
            <div className="text-lg font-black mt-0.5 text-slate-800 dark:text-white">{formatStudyTime(todayMinutes)}</div>
          </div>
          {/* <div className="text-center p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/20">
            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">All-Time Focus</div>
            <div className="text-lg font-black mt-0.5 text-slate-800 dark:text-white">{formatStudyTime(totalStudyTime)}</div>
          </div> */}
        </div>
      </div>

      {pipWindow && createPortal(
        <div className="group flex flex-col items-center justify-center text-center p-3 w-full h-full select-none rounded-2xl relative transition-all duration-300 overflow-hidden border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">

          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-all opacity-50 group-hover:opacity-100 cursor-pointer flex items-center justify-center"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {/* Session type / status - Small, neat and centered at the top */}
          <div className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest pointer-events-none select-none mb-2.5">
            {timerType === "pomodoro" ? `${mode === "work" ? "🧠 FOCUS" : "☕ BREAK"}` : "⚡ STOPWATCH"}
          </div>

          {/* Combined Controls & Time Display Row */}
          <div className="flex flex-row items-center justify-center gap-3.5 w-full opacity-85 hover:opacity-100 transition-opacity duration-200">
            {/* Play/Pause Button - Uses theme color styling matching the main app */}
            <button
              onClick={handleStartPause}
              className={`p-2 rounded-full text-white transition-all transform active:scale-90 shadow-md cursor-pointer flex items-center justify-center shrink-0 ${timerType === "pomodoro"
                ? mode === "work"
                  ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                  : mode === "short"
                    ? "bg-sky-500 hover:bg-sky-600 shadow-sky-500/20"
                    : "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20"
                : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/20"
                }`}
              title={isRunning ? "Pause" : "Start"}
            >
              {isRunning ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Hour/Minute Time Display */}
            <div className="text-3xl font-black font-mono tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(99,102,241,0.1)] dark:drop-shadow-[0_0_8px_rgba(168,85,247,0.15)] select-all px-1">
              {pipHourMinuteOnly ? formatHourMinute(secondsLeft) : format(secondsLeft)}
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center active:scale-90 shadow-sm shrink-0"
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>,
        pipWindow.document.body
      )}
    </div>
  );
};
