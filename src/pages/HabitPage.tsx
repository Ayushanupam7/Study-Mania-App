// src/pages/HabitPage.tsx
import React, { useState, useMemo } from "react";
import { useStore } from "../store/store";
import type { Habit } from "../store/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Plus,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Activity,
  Check,
  X,
  Lock,
  Zap,
  BookOpen,
  Dumbbell,
  Brain,
  Code2,
  Heart,
  Star,
  Target,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Volume2,
  VolumeX,
  Search,
  Archive,
  RotateCcw,
  Sword,
  Gift,
} from "lucide-react";

interface HabitInput {
  title: string;
  category: string;
  frequency: "daily" | "weekly";
}

// ─── Sound Chime Synthesizer (Web Audio API) ───────────────────────────────────
const playCompletionSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Tone 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.25);

    // Tone 2: E5 (659.25 Hz)
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);
    }, 70);

    // Tone 3: G5 (783.99 Hz)
    setTimeout(() => {
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(783.99, ctx.currentTime);
      gain3.gain.setValueAtTime(0, ctx.currentTime);
      gain3.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start();
      osc3.stop(ctx.currentTime + 0.35);
    }, 140);
  } catch (e) {
    console.error("Audio Context error:", e);
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTodayStr = () => new Date().toISOString().split("T")[0];

const getPastDays = (n: number) => {
  const list = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateString = d.toISOString().split("T")[0];
    list.push({
      dateString,
      dayName: d.toLocaleDateString("en-US", { weekday: "narrow" }),
      dayNumber: d.getDate(),
      monthShort: d.toLocaleDateString("en-US", { month: "short" }),
      isToday: i === 0,
      isPast: i > 0,
    });
  }
  return list;
};

const computeCurrentStreak = (completions: Record<string, boolean>): number => {
  const todayStr = new Date().toISOString().split("T")[0];
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  let streak = 0;
  const d = new Date();
  
  if (completions[todayStr]) {
    d.setDate(d.getDate());
  } else if (completions[yesterdayStr]) {
    d.setDate(d.getDate() - 1);
  } else {
    return 0;
  }
  
  while (true) {
    const key = d.toISOString().split("T")[0];
    if (completions[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

const computeLongestStreak = (completions: Record<string, boolean>): number => {
  const completedDates = Object.keys(completions)
    .filter(dateStr => completions[dateStr])
    .map(dateStr => {
      const parts = dateStr.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
    })
    .sort((a, b) => a - b);

  if (completedDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < completedDates.length; i++) {
    const diffTime = completedDates[i] - completedDates[i - 1];
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current++;
    } else if (diffDays > 1) {
      longest = Math.max(longest, current);
      current = 1;
    }
  }

  longest = Math.max(longest, current);
  return longest;
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "Health",      icon: Heart,    color: "emerald", gradient: "from-emerald-400 to-teal-500", glow: "shadow-emerald-500/20" },
  { label: "Fitness",     icon: Dumbbell, color: "rose",    gradient: "from-rose-400 to-pink-500",   glow: "shadow-rose-500/20" },
  { label: "Coding",      icon: Code2,    color: "sky",     gradient: "from-sky-400 to-blue-500",    glow: "shadow-sky-500/20" },
  { label: "Academics",   icon: BookOpen, color: "indigo",  gradient: "from-indigo-400 to-violet-500", glow: "shadow-indigo-500/20" },
  { label: "Mindfulness", icon: Brain,    color: "purple",  gradient: "from-purple-400 to-fuchsia-500", glow: "shadow-purple-500/20" },
  { label: "Reading",     icon: BookOpen, color: "amber",   gradient: "from-amber-400 to-orange-500", glow: "shadow-amber-500/20" },
] as const;

const getCatConfig = (cat: string) =>
  CATEGORIES.find(c => c.label === cat) ?? {
    label: cat,
    icon: Star,
    color: "slate",
    gradient: "from-slate-400 to-slate-500",
    glow: "shadow-slate-500/10",
  };

const COLOR_PALETTE: Record<string, { ring: string; pill: string; glow: string; border: string; barColor: string; completedPastBg: string; completedPastBorder: string; completedPastText: string; cardBg: string }> = {
  emerald: {
    ring: "text-emerald-500",
    pill: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-250 dark:border-emerald-800/40",
    glow: "hover:shadow-emerald-500/15",
    border: "border-l-emerald-500",
    barColor: "bg-emerald-500",
    completedPastBg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    completedPastBorder: "border-emerald-200/40 dark:border-emerald-850/15",
    completedPastText: "text-emerald-500 dark:text-emerald-400",
    cardBg: "bg-emerald-50/40 dark:bg-[#0c1322]/60 hover:bg-emerald-50/50 dark:hover:bg-[#0c1322]/70"
  },
  rose: {
    ring: "text-rose-500",
    pill: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-250 dark:border-rose-800/40",
    glow: "hover:shadow-rose-500/15",
    border: "border-l-rose-500",
    barColor: "bg-rose-500",
    completedPastBg: "bg-rose-50/60 dark:bg-rose-950/20",
    completedPastBorder: "border-rose-200/40 dark:border-rose-850/15",
    completedPastText: "text-rose-500 dark:text-rose-400",
    cardBg: "bg-rose-50/40 dark:bg-[#0c1322]/60 hover:bg-rose-50/50 dark:hover:bg-[#0c1322]/70"
  },
  sky: {
    ring: "text-sky-500",
    pill: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 border-sky-250 dark:border-sky-800/40",
    glow: "hover:shadow-sky-500/15",
    border: "border-l-sky-500",
    barColor: "bg-sky-500",
    completedPastBg: "bg-sky-50/60 dark:bg-sky-950/20",
    completedPastBorder: "border-sky-200/40 dark:border-sky-850/15",
    completedPastText: "text-sky-500 dark:text-sky-400",
    cardBg: "bg-sky-50/40 dark:bg-[#0c1322]/60 hover:bg-sky-50/50 dark:hover:bg-[#0c1322]/70"
  },
  indigo: {
    ring: "text-indigo-500",
    pill: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-250 dark:border-indigo-800/40",
    glow: "hover:shadow-indigo-500/15",
    border: "border-l-indigo-500",
    barColor: "bg-indigo-500",
    completedPastBg: "bg-indigo-50/60 dark:bg-indigo-950/20",
    completedPastBorder: "border-indigo-200/40 dark:border-indigo-850/15",
    completedPastText: "text-indigo-500 dark:text-indigo-400",
    cardBg: "bg-indigo-50/40 dark:bg-[#0c1322]/60 hover:bg-indigo-50/50 dark:hover:bg-[#0c1322]/70"
  },
  purple: {
    ring: "text-purple-500",
    pill: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border-purple-250 dark:border-purple-800/40",
    glow: "hover:shadow-purple-500/15",
    border: "border-l-purple-500",
    barColor: "bg-purple-500",
    completedPastBg: "bg-purple-50/60 dark:bg-purple-950/20",
    completedPastBorder: "border-purple-200/40 dark:border-purple-850/15",
    completedPastText: "text-purple-500 dark:text-purple-400",
    cardBg: "bg-purple-50/40 dark:bg-[#0c1322]/60 hover:bg-purple-50/50 dark:hover:bg-[#0c1322]/70"
  },
  amber: {
    ring: "text-amber-500",
    pill: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-250 dark:border-amber-800/40",
    glow: "hover:shadow-amber-500/15",
    border: "border-l-amber-500",
    barColor: "bg-amber-500",
    completedPastBg: "bg-amber-50/60 dark:bg-amber-950/20",
    completedPastBorder: "border-amber-200/40 dark:border-amber-850/15",
    completedPastText: "text-amber-500 dark:text-amber-400",
    cardBg: "bg-amber-50/40 dark:bg-[#0c1322]/60 hover:bg-amber-50/50 dark:hover:bg-[#0c1322]/70"
  },
  slate: {
    ring: "text-slate-400",
    pill: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    glow: "hover:shadow-slate-500/10",
    border: "border-l-slate-400",
    barColor: "bg-slate-400",
    completedPastBg: "bg-slate-50/60 dark:bg-slate-800/20",
    completedPastBorder: "border-slate-200/40 dark:border-slate-700/20",
    completedPastText: "text-slate-500 dark:text-slate-400",
    cardBg: "bg-slate-50/40 dark:bg-[#0c1322]/60 hover:bg-slate-50/50 dark:hover:bg-[#0c1322]/70"
  },
};

const RING_COLOR_MAP: Record<string, string> = {
  emerald: "#10b981", rose: "#f43f5e", sky: "#0ea5e9",
  indigo: "#6366f1", purple: "#a855f7", amber: "#f59e0b", slate: "#94a3b8",
};

// ─── SVG Ring Component ───────────────────────────────────────────────────────
const RingProgress: React.FC<{ pct: number; size?: number; stroke?: number; color?: string; className?: string }> = ({
  pct, size = 56, stroke = 5, color = "#f97316", className = "",
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className={`-rotate-90 filter drop-shadow-[0_0_4px_rgba(0,0,0,0.15)] ${className}`} aria-hidden>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-200 dark:text-slate-800/40" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.65s cubic-bezier(0.4, 0, 0.2, 1)" }} />
    </svg>
  );
};

// ─── Habit Card ───────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
}

const HabitCard: React.FC<{
  habit: Habit;
  past14: ReturnType<typeof getPastDays>;
  today: string;
  onToggle: (id: string, date: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string, archive: boolean) => void;
  soundEnabled: boolean;
}> = ({ habit, past14, today, onToggle, onDelete, onArchive, soundEnabled }) => {
  const [expanded, setExpanded] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [particles, setParticles] = useState<Particle[]>([]);

  const cat = getCatConfig(habit.category);
  const colors = COLOR_PALETTE[cat.color as string] ?? COLOR_PALETTE.slate;
  const Icon = cat.icon;
  const isArchived = !!habit.archived;

  const streak = useMemo(() => computeCurrentStreak(habit.completions), [habit.completions]);
  const longestStreak = useMemo(() => computeLongestStreak(habit.completions), [habit.completions]);
  const todayDone = !!habit.completions[today];

  const last7 = past14.slice(-7);
  const done7 = last7.filter(d => !!habit.completions[d.dateString]).length;
  const pct7 = Math.round((done7 / 7) * 100);

  const ringColor = RING_COLOR_MAP[cat.color as string] ?? "#f97316";

  // Golden theme variables for today-completed card
  const cardBgClass = todayDone
    ? "bg-amber-50/45 dark:bg-amber-950/15 border-l-amber-500 hover:shadow-amber-500/10 dark:hover:shadow-amber-500/5 hover:border-amber-400 dark:hover:border-amber-800/40"
    : `${colors.cardBg} ${colors.border} ${colors.glow}`;

  const currentRingColor = todayDone ? "#d97706" : ringColor;
  const currentBeamColor = todayDone ? "#f59e0b" : ringColor;
  const currentDotColor = todayDone ? "#f59e0b" : ringColor;
  const currentIconColor = todayDone ? "text-amber-500 dark:text-amber-400" : colors.ring;
  const currentPillClass = todayDone
    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-250 dark:border-amber-900/30"
    : colors.pill;

  // Milestones Calculation (based on longest streak ever achieved)
  const milestone = useMemo(() => {
    if (longestStreak >= 14) return { text: "⚡ Legendary", class: "bg-red-500/10 text-red-500 border-red-500/20" };
    if (longestStreak >= 7) return { text: "🔥 Streak Master", class: "bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse" };
    if (done7 === 7) return { text: "🎯 Perfect Week", class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    if (longestStreak >= 3) return { text: "🌱 Building", class: "bg-sky-500/10 text-sky-500 border-sky-500/20" };
    return null;
  }, [longestStreak, done7]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const daysList = [];

    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dVal = prevMonthTotalDays - i;
      const mVal = month === 0 ? 11 : month - 1;
      const yVal = month === 0 ? year - 1 : year;
      const dateStr = `${yVal}-${(mVal + 1).toString().padStart(2, "0")}-${dVal.toString().padStart(2, "0")}`;
      
      const cellDate = new Date(yVal, mVal, dVal);
      const cellToday = new Date();
      cellToday.setHours(0,0,0,0);
      cellDate.setHours(0,0,0,0);

      daysList.push({
        dateStr,
        dayNum: dVal,
        isCurrentMonth: false,
        isPast: cellDate < cellToday,
      });
    }

    for (let dVal = 1; dVal <= totalDays; dVal++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${dVal.toString().padStart(2, "0")}`;
      
      const cellDate = new Date(year, month, dVal);
      const cellToday = new Date();
      cellToday.setHours(0,0,0,0);
      cellDate.setHours(0,0,0,0);

      daysList.push({
        dateStr,
        dayNum: dVal,
        isCurrentMonth: true,
        isPast: cellDate < cellToday,
      });
    }

    const totalCells = daysList.length <= 35 ? 35 : 42;
    const remaining = totalCells - daysList.length;
    for (let dVal = 1; dVal <= remaining; dVal++) {
      const mVal = month === 11 ? 0 : month + 1;
      const yVal = month === 11 ? year + 1 : year;
      const dateStr = `${yVal}-${(mVal + 1).toString().padStart(2, "0")}-${dVal.toString().padStart(2, "0")}`;
      
      const cellDate = new Date(yVal, mVal, dVal);
      const cellToday = new Date();
      cellToday.setHours(0,0,0,0);
      cellDate.setHours(0,0,0,0);

      daysList.push({
        dateStr,
        dayNum: dVal,
        isCurrentMonth: false,
        isPast: cellDate < cellToday,
      });
    }

    return daysList;
  }, [calendarDate, today]);

  // Handle Mark Today click with high-tech sounds and particles
  const handleToggleClick = () => {
    if (isArchived) return;

    if (!todayDone) {
      if (soundEnabled) {
        playCompletionSound();
      }
      // Generate particles
      const newParticles = Array.from({ length: 12 }).map((_, idx) => ({
        id: Date.now() + idx,
        x: (Math.random() - 0.5) * 110,
        y: (Math.random() - 0.5) * 80 - 10,
        scale: Math.random() * 0.7 + 0.3,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 850);
    }
    onToggle(habit.id, today);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      className={`glass-card ${cardBgClass} rounded-2xl sm:rounded-3xl overflow-hidden border-l-4 border-solid border-t-0 border-r-0 border-b-0 transition-all duration-300 relative`}
    >
      {/* Dynamic light moving border beam */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" aria-hidden>
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="18"
          fill="none"
          stroke={currentBeamColor}
          strokeWidth="2"
          strokeDasharray="60 400"
          className="opacity-60 dark:opacity-85"
          style={{
            animation: "borderBeam 15s linear infinite",
            filter: `drop-shadow(0 0 3px ${currentBeamColor})`
          }}
        />
      </svg>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes borderBeam {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -920; }
        }
      `}} />

      {/* Tech dot grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.06] pointer-events-none select-none" 
        style={{
          backgroundImage: "radial-gradient(currentColor 1.2px, transparent 1.2px)",
          backgroundSize: "14px 14px",
          color: currentDotColor
        }}
      />

      {/* Giant faded background icon */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.055] dark:opacity-[0.05] pointer-events-none select-none rotate-[15deg]">
        <Icon className={`w-36 h-36 ${currentIconColor}`} />
      </div>

      {/* Particles Completion Splash */}
      <AnimatePresence>
        {particles.length > 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20">
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: p.scale,
                  x: p.x,
                  y: p.y - 45,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`absolute w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${colors.barColor} filter blur-[0.5px] shadow-[0_0_8px_currentColor]`}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Top section */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 relative">
        {/* Ring icon — smaller on mobile */}
        <div className="relative shrink-0 select-none group/ring">
          <RingProgress pct={pct7} size={48} stroke={4.5} color={currentRingColor} className="sm:hidden" />
          <RingProgress pct={pct7} size={58} stroke={5.5} color={currentRingColor} className="hidden sm:block" />
          <div className="absolute inset-1 rounded-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200/10 dark:border-slate-800/10 flex items-center justify-center">
            <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${currentIconColor} filter drop-shadow-[0_0_3px_rgba(0,0,0,0.1)] group-hover/ring:scale-110 transition-transform`} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 w-full text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-1.5">
                <span className={`inline-flex items-center text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-solid ${currentPillClass}`}>
                  {habit.category}
                </span>
                {milestone && (
                  <span className={`inline-flex items-center text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-solid ${milestone.class}`}>
                    {milestone.text}
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-sm sm:text-base mt-2 truncate text-slate-800 dark:text-slate-100 leading-snug">
                {habit.title}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-505 font-bold capitalize mt-0.5">
                {habit.frequency} · {pct7}% completed this week
              </p>
            </div>

            {/* Streak + Archive / Delete controls */}
            <div className="flex items-center justify-center sm:justify-end gap-1.5 shrink-0 mt-1 sm:mt-0">
              {/* Current Streak (Flame Badge) */}
              <motion.div
                whileHover={{ scale: 1.06, y: -1.5 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border select-none transition-all duration-300 shadow-sm group/flame
                  ${streak > 0
                    ? "bg-gradient-to-r from-orange-500/10 to-amber-500/10 dark:from-orange-500/5 dark:to-amber-500/5 border-orange-300/30 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 shadow-orange-500/5"
                    : "bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 text-slate-400 dark:text-slate-650"
                  }`}
                title={streak > 0 ? `Current streak: ${streak} days` : "No current streak"}
              >
                <Flame className={`h-3.5 w-3.5 transition-transform group-hover/flame:scale-115
                  ${streak > 0 
                    ? "text-orange-500 fill-orange-500/20 animate-pulse" 
                    : "text-slate-400 dark:text-slate-600"
                  }`} 
                />
                <span className="text-[10px] sm:text-xs font-black tracking-wide">{streak}</span>
              </motion.div>
              
              {/* Longest Streak (Star Badge) */}
              <motion.div
                whileHover={{ scale: 1.06, y: -1.5 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border select-none transition-all duration-300 shadow-sm group/star
                  ${longestStreak > 0
                    ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 dark:from-amber-500/5 dark:to-yellow-500/5 border-amber-300/30 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-amber-500/5"
                    : "bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 text-slate-400 dark:text-slate-650"
                  }`}
                title={longestStreak > 0 ? `Longest streak achieved: ${longestStreak} days` : "No longest streak"}
              >
                <Star className={`h-3.5 w-3.5 transition-transform duration-500 group-hover/star:rotate-180
                  ${longestStreak > 0 
                    ? "text-amber-500 fill-amber-500/20" 
                    : "text-slate-400 dark:text-slate-600"
                  }`} 
                />
                <span className="text-[10px] sm:text-xs font-black tracking-wide">{longestStreak}</span>
              </motion.div>

              {/* Archive/Delete actions */}
              <div className="flex items-center gap-0.5 border-l border-slate-200/40 dark:border-slate-800/40 pl-1.5 ml-1">
                {isArchived ? (
                  <>
                    <button
                      onClick={() => onArchive(habit.id, false)}
                      className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer"
                      title="Restore habit"
                    >
                      <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(habit.id)}
                      className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onArchive(habit.id, true)}
                      className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer"
                      title="Archive habit"
                    >
                      <Archive className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(habit.id)}
                      className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                      title="Delete habit"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Today quick toggle */}
          <motion.button
            whileHover={isArchived ? {} : { scale: 1.015 }}
            whileTap={isArchived ? {} : { scale: 0.985 }}
            onClick={handleToggleClick}
            disabled={isArchived}
            className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-sm ${
              isArchived
                ? "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-650 cursor-not-allowed border border-transparent"
                : todayDone
                ? `bg-gradient-to-r ${cat.gradient} text-white shadow-md ${cat.glow}`
                : "bg-slate-50 dark:bg-slate-900 text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/40"
            }`}
          >
            {isArchived ? (
              <>Archived (Read-Only)</>
            ) : todayDone ? (
              <><CheckCircle2 className="h-4 w-4" />Done today! ✓</>
            ) : (
              <><Target className="h-4 w-4" />Mark completed today</>
            )}
          </motion.button>
        </div>
      </div>

      {/* Calendar strip / Monthly Calendar view */}
      <div className="px-3.5 sm:px-5 pb-3.5 sm:pb-4 pt-0">
        <div className="border-t border-slate-100 dark:border-slate-800/60 pt-2.5 sm:pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {expanded ? "Calendar View" : "Last 7 Days"}
            </span>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-0.5 text-[8px] sm:text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold transition-colors py-0.5 px-1"
            >
              {expanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />More</>}
            </button>
          </div>

          {expanded ? (
            <div className="space-y-2">
              {/* Month Navigation */}
              <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 px-2 py-1 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="px-2 py-0.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-xs font-bold cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  ←
                </button>
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                  {calendarDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="px-2 py-0.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-xs font-bold cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  →
                </button>
              </div>

              {/* Weekdays Row */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[7.5px] sm:text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                  <div key={idx} className="py-0.5">{day}</div>
                ))}
              </div>

              {/* Month Days Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarDays.map(({ dateStr, dayNum, isCurrentMonth, isPast }) => {
                  const isCompleted = !!habit.completions[dateStr];
                  const isToday = dateStr === today;

                  return (
                    <motion.button
                      key={dateStr}
                      whileHover={isPast || isArchived ? {} : { scale: 1.08 }}
                      whileTap={isPast || isArchived ? {} : { scale: 0.92 }}
                      onClick={() => { if (!isPast && !isArchived) onToggle(habit.id, dateStr); }}
                      disabled={isPast || isArchived}
                      title={isArchived ? "Archived habit" : isPast ? "Past dates are read-only" : "Toggle today"}
                      className={`flex flex-col items-center justify-center rounded-lg border border-solid transition-all duration-150 p-1 py-1.5 min-h-[30px]
                        ${!isCurrentMonth ? "opacity-25" : ""}
                        ${isPast
                          ? isCompleted
                            ? `${colors.completedPastBg} ${colors.completedPastBorder} ${colors.completedPastText} font-bold cursor-default`
                            : "bg-slate-50/30 dark:bg-slate-900/15 border-transparent text-slate-350 dark:text-slate-700 cursor-default"
                          : isCompleted
                          ? "bg-gradient-to-b from-amber-400 to-orange-500 text-white border-transparent font-bold"
                          : isToday
                          ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40 text-orange-500 font-bold hover:bg-orange-100 dark:hover:bg-orange-950/30"
                          : "bg-slate-50 dark:bg-slate-850 border-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                      <span className="text-[9px] font-bold leading-none">{dayNum}</span>
                      {isCompleted && (
                        <Check className={`h-1.5 w-1.5 stroke-[4] mt-[1px] shrink-0 ${isPast ? colors.completedPastText : "text-white"}`} />
                      )}
                      {!isCompleted && isPast && (
                        <Lock className="h-1.5 w-1.5 stroke-[2] mt-[1px] text-slate-300 dark:text-slate-700 shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 7-Day Strip (default view) */
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {last7.map(day => {
                const isCompleted = !!habit.completions[day.dateString];
                const isPast = day.isPast;

                return (
                  <motion.button
                    key={day.dateString}
                    whileHover={isPast || isArchived ? {} : { scale: 1.07 }}
                    whileTap={isPast || isArchived ? {} : { scale: 0.93 }}
                    onClick={() => { if (!isPast && !isArchived) onToggle(habit.id, day.dateString); }}
                    disabled={isPast || isArchived}
                    title={isArchived ? "Archived" : isPast ? "Past dates are read-only" : "Toggle today"}
                    className={`flex flex-col items-center justify-center rounded-md sm:rounded-lg border border-solid transition-all duration-200 p-0.5 sm:p-1 py-1.5 sm:py-2 min-w-[28px] min-h-[36px]
                      ${isPast
                        ? isCompleted
                          ? `${colors.completedPastBg} ${colors.completedPastBorder} ${colors.completedPastText} opacity-75 cursor-default`
                          : "bg-slate-50/30 dark:bg-slate-900/20 border-transparent opacity-35 cursor-default"
                        : isCompleted
                          ? "bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-500/25 border-transparent"
                          : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-950/30"
                      }`}
                  >
                    <span className={`text-[6.5px] sm:text-[8px] font-bold uppercase tracking-tight leading-none ${isPast && !isCompleted ? "text-slate-300 dark:text-slate-700" : "opacity-70"}`}>
                      {day.dayName}
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-black mt-0.5 flex items-center gap-[1px] leading-none">
                      {day.dayNumber}
                      {isCompleted && isPast  && <Check className={`h-[5px] w-[5px] stroke-[3.5] ${colors.completedPastText} shrink-0`} />}
                      {isCompleted && !isPast && <Check className="h-[5px] w-[5px] stroke-[3.5] shrink-0" />}
                      {!isCompleted && isPast && <Lock className="h-[5px] w-[5px] stroke-[2.5] text-slate-300 dark:text-slate-700 shrink-0" />}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const HabitPage: React.FC = () => {
  const habits = useStore(state => state.habits);
  const addHabit = useStore(state => state.addHabit);
  const updateHabit = useStore(state => state.updateHabit);
  const toggleHabitDay = useStore(state => state.toggleHabitDay);
  const deleteHabit = useStore(state => state.deleteHabit);
  const gainXp = useStore(state => state.gainXp);

  const [input, setInput] = useState<HabitInput>({
    title: "",
    category: "",
    frequency: "daily",
  });
  const [showForm, setShowForm] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  
  // High-Tech Search & Mute settings
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("All");
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("habit_sound_enabled") !== "false");

  // Claimed quests state
  const [claimedQuests, setClaimedQuests] = useState<Record<string, boolean>>(() => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const data = localStorage.getItem(`claimed_quests_${todayStr}`);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  });

  const today = useMemo(() => getTodayStr(), []);
  const past14 = useMemo(() => getPastDays(14), [today]);
  const past7  = past14.slice(-7);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem("habit_sound_enabled", String(next));
      return next;
    });
  };

  const handleClaimQuest = (questId: string, xpAmount: number, questTitle: string) => {
    gainXp(xpAmount, `Daily Quest: "${questTitle}"`);
    
    try {
      if (soundEnabled) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;
        
        const playTone = (freq: number, start: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + duration);
        };
        
        playTone(523.25, now, 0.4);       // C5
        playTone(659.25, now + 0.08, 0.4); // E5
        playTone(783.99, now + 0.16, 0.4); // G5
        playTone(1046.50, now + 0.24, 0.6); // C6
      }
    } catch (e) {
      console.error("Audio claim error:", e);
    }

    setClaimedQuests(prev => {
      const next = { ...prev, [questId]: true };
      const todayStr = new Date().toISOString().split("T")[0];
      localStorage.setItem(`claimed_quests_${todayStr}`, JSON.stringify(next));
      return next;
    });
  };

  const handleAdd = () => {
    if (!input.title.trim() || !input.category) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      title: input.title.trim(),
      category: input.category,
      frequency: input.frequency,
      streak: 0,
      completions: {},
      createdAt: new Date().toISOString(),
      archived: false,
    };
    addHabit(newHabit);
    setInput(prev => ({ ...prev, title: "", category: "" }));
    setShowForm(false);
  };

  const handleToggle = (id: string, date: string) => {
    if (date !== today) return;
    toggleHabitDay(id, date);
  };

  const handleArchive = (id: string, archive: boolean) => {
    updateHabit(id, { archived: archive });
  };

  // Filter Habits based on Search & Tabs
  const filteredHabits = useMemo(() => {
    return habits.filter(h => {
      const matchesSearch = h.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (selectedTab === "Archived") {
        return !!h.archived && matchesSearch;
      }
      if (h.archived) return false; // Filter out archived by default
      if (selectedTab === "All") return matchesSearch;
      return h.category === selectedTab && matchesSearch;
    });
  }, [habits, searchQuery, selectedTab]);

  // active habits counts
  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  // ── Stats ──
  const completedToday = activeHabits.filter(h => !!h.completions[today]).length;
  const bestStreak     = activeHabits.length > 0 ? Math.max(...activeHabits.map(h => computeLongestStreak(h.completions)), 0) : 0;
  const totalPossible  = activeHabits.length * 7;
  let completedLast7 = 0;
  activeHabits.forEach(h => { past7.forEach(d => { if (h.completions[d.dateString]) completedLast7++; }); });
  const consistency = totalPossible > 0 ? Math.round((completedLast7 / totalPossible) * 100) : 0;
  const allDoneToday = activeHabits.length > 0 && completedToday === activeHabits.length;

  const quests = useMemo(() => {
    return [
      {
        id: "quest_focus",
        title: "Daily Focus",
        desc: "Complete at least 1 habit today.",
        xp: 10,
        check: () => completedToday >= 1,
        progress: () => `${completedToday} / 1`,
      },
      {
        id: "quest_synapse",
        title: "Perfect Synapse",
        desc: "Complete all active habits today.",
        xp: 20,
        check: () => activeHabits.length > 0 && completedToday === activeHabits.length,
        progress: () => `${completedToday} / ${activeHabits.length}`,
      },
      {
        id: "quest_charger",
        title: "Streak Charger",
        desc: "Maintain at least one streak of 3+ days.",
        xp: 15,
        check: () => activeHabits.some(h => computeCurrentStreak(h.completions) >= 3),
        progress: () => {
          const maxCurrent = activeHabits.length > 0
            ? Math.max(...activeHabits.map(h => computeCurrentStreak(h.completions)), 0)
            : 0;
          return `${maxCurrent} / 3 days`;
        },
      },
    ];
  }, [completedToday, activeHabits]);

  const statCards = [
    { label: "Active Habits",  value: activeHabits.length, suffix: "",                  icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />, iconBg: "bg-blue-50 dark:bg-blue-950/30 text-blue-500",     bar: "from-blue-500 to-indigo-500"   },
    { label: "Done Today",    value: completedToday, suffix: activeHabits.length > 0 ? `/ ${activeHabits.length}` : "", icon: <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />, iconBg: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500", bar: "from-emerald-500 to-teal-500" },
    { label: "Best Streak",   value: bestStreak,     suffix: "days",             icon: <Flame className="h-4 w-4 sm:h-5 sm:w-5 fill-orange-400/20 animate-pulse" />, iconBg: "bg-orange-50 dark:bg-orange-950/30 text-orange-500", bar: "from-orange-500 to-amber-500"  },
    { label: "7-Day Rate",    value: consistency,    suffix: "%",                icon: <Activity className="h-4 w-4 sm:h-5 sm:w-5" />, iconBg: "bg-purple-50 dark:bg-purple-950/30 text-purple-500", bar: "from-purple-500 to-pink-500"   },
  ];

  // ── High-Tech Cyber Insights ──
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; pct: number; color: string }> = {};
    CATEGORIES.forEach(c => {
      stats[c.label] = { total: 0, done: 0, pct: 0, color: c.color };
    });

    activeHabits.forEach(h => {
      if (stats[h.category]) {
        stats[h.category].total += 7;
        past7.forEach(d => {
          if (h.completions[d.dateString]) stats[h.category].done++;
        });
      }
    });

    Object.keys(stats).forEach(k => {
      if (stats[k].total > 0) {
        stats[k].pct = Math.round((stats[k].done / stats[k].total) * 100);
      }
    });

    return stats;
  }, [activeHabits, past7]);

  const bestCategory = useMemo(() => {
    let best = "None yet";
    let maxPct = 0;
    Object.entries(categoryStats).forEach(([cat, data]) => {
      if (data.total > 0 && data.pct > maxPct) {
        maxPct = data.pct;
        best = `${cat} (${data.pct}%)`;
      }
    });
    return best;
  }, [categoryStats]);

  const bestWeekday = useMemo(() => {
    const weekdayCounts: Record<string, number> = {};
    activeHabits.forEach(h => {
      Object.keys(h.completions).forEach(dateStr => {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
          weekdayCounts[dayName] = (weekdayCounts[dayName] || 0) + 1;
        }
      });
    });

    let bestDay = "None yet";
    let maxCompletions = 0;
    Object.entries(weekdayCounts).forEach(([day, count]) => {
      if (count > maxCompletions) {
        maxCompletions = count;
        bestDay = day;
      }
    });
    return bestDay;
  }, [activeHabits]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full mx-auto px-2 sm:px-0">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md pt-4 pb-3 sm:pt-6 sm:pb-4 md:pt-8 z-20 -mx-2 px-2 sm:-mx-4 sm:px-4 md:-mx-8 md:px-8 border-b border-slate-200/30 dark:border-slate-800/30">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold flex items-center gap-2 sm:gap-2.5 tracking-tight text-slate-800 dark:text-slate-100">
              <span className="relative shrink-0">
                <Flame className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-orange-500 animate-pulse" />
                {allDoneToday && (
                  <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500" />
                  </span>
                )}
              </span>
              <span className="truncate">Habit Ring</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 truncate">
              Build consistency · earn +10 XP · only <span className="font-semibold text-orange-500">today</span> can be marked
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Audio Toggle Button */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border border-solid transition-colors ${
                soundEnabled
                  ? "bg-orange-50 dark:bg-orange-950/20 text-orange-500 border-orange-100 dark:border-orange-900/40"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800"
              }`}
              title={soundEnabled ? "Mute Completion Chime" : "Enable Completion Chime"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Insights button */}
            <button
              onClick={() => setShowInsights(v => !v)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border border-solid font-bold text-xs sm:text-sm transition-colors ${
                showInsights
                  ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-150 dark:border-indigo-900/40"
                  : "bg-slate-55 dark:bg-slate-900 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-800"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Insights</span>
            </button>

            {/* Add Habit button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/20 shrink-0"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span className="hidden xs:inline sm:inline">{showForm ? "Cancel" : "New Habit"}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className="glass-card p-3 sm:p-4 md:p-4.5 rounded-xl sm:rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="space-y-0 sm:space-y-0.5 min-w-0">
              <span className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                {stat.label}
              </span>
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-lg sm:text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{stat.value}</span>
                {stat.suffix && <span className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-slate-400">{stat.suffix}</span>}
              </div>
            </div>
            <div className={`p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${stat.iconBg}`}>{stat.icon}</div>
            <div className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r ${stat.bar} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
          </div>
        ))}
      </div>

      {/* ── Daily Cyber-Quests Panel ── */}
      <div className="glass-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-solid border-slate-100 dark:border-slate-800/60 relative overflow-hidden text-left">
        {/* Futuristic background grid line decor */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 relative z-10">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
              <Sword className="h-4 w-4 text-amber-500 fill-amber-500/15 animate-pulse" />
              Daily Cyber-Quests
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-505 font-medium mt-0.5">
              Complete these daily challenges to earn bonus Scholar XP! Resets daily.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
            <Sparkles className="h-3 w-3" />
            <span>Bonus XP Awaiting</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
          {quests.map(q => {
            const isCompleted = q.check();
            const isClaimed = !!claimedQuests[q.id];

            return (
              <div 
                key={q.id}
                className={`p-3.5 rounded-xl border border-solid transition-all duration-300 flex flex-col justify-between gap-3
                  ${isClaimed 
                    ? "bg-slate-50/50 dark:bg-slate-900/10 border-slate-200/45 dark:border-slate-800/30 opacity-60" 
                    : isCompleted 
                    ? "bg-gradient-to-br from-amber-500/[0.04] to-orange-500/[0.04] border-amber-300/45 dark:border-amber-800/30 shadow-sm" 
                    : "bg-slate-50/20 dark:bg-slate-900/5 border-slate-100/60 dark:border-slate-800/20"
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[8.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full
                      ${isClaimed 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-500" 
                        : isCompleted 
                        ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-350" 
                        : "bg-slate-100 dark:bg-slate-850/60 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {isClaimed ? "Claimed" : isCompleted ? "Complete" : "Active"}
                    </span>
                    <span className="text-[10px] font-black text-amber-500 flex items-center gap-0.5">
                      +{q.xp} XP
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 mt-2 leading-tight">
                    {q.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1 leading-snug">
                    {q.desc}
                  </p>
                </div>

                <div className="mt-1">
                  {isClaimed ? (
                    <div className="w-full text-center py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1">
                      <Check className="h-3.5 w-3.5 text-slate-450 dark:text-slate-600" />
                      Quest Cleared
                    </div>
                  ) : isCompleted ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleClaimQuest(q.id, q.xp, q.title)}
                      className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-md shadow-orange-500/10 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      Claim Reward
                    </motion.button>
                  ) : (
                    <div className="w-full text-center py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-lg bg-slate-50/10 dark:bg-slate-900/10">
                      Progress: {q.progress()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Collapsible Cyber Insights & Analytics Panel ── */}
      <AnimatePresence>
        {showInsights && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-indigo-250/50 dark:border-indigo-800/25 grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Category Breakdown list */}
              <div className="md:col-span-2 space-y-3 text-left">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-350 flex items-center gap-1.5 uppercase tracking-wider">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  Category Consistency Breakdown
                </h4>
                <div className="space-y-2.5">
                  {CATEGORIES.map(c => {
                    const data = categoryStats[c.label] || { pct: 0, total: 0 };
                    const colors = COLOR_PALETTE[c.color as string] ?? COLOR_PALETTE.slate;
                    return (
                      <div key={c.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${colors.barColor}`} />
                            {c.label}
                          </span>
                          <span>{data.total > 0 ? `${data.pct}%` : "Not Tracked"}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-900/60 rounded-full overflow-hidden border border-slate-200/20">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${data.pct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`h-full ${colors.barColor} rounded-full`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Insights Summary */}
              <div className="flex flex-col justify-between space-y-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/60 text-left">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Cyber Insights
                </h4>
                
                <div className="space-y-3.5 flex-1 mt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Top Category</span>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      {bestCategory}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Most Consistent Day</span>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-indigo-500" />
                      {bestWeekday}
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 dark:text-slate-550 italic leading-snug">
                  *Stats calculated based on completions logged over the current active habits' lifetime.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Habit Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass-card p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-orange-200/50 dark:border-orange-800/20 shadow-lg shadow-orange-500/5"
          >
            <h2 className="text-xs sm:text-sm md:text-base font-bold flex items-center gap-1.5 sm:gap-2 text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
              Start a New Habit
            </h2>

            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3">
              {/* Title */}
              <div className="sm:col-span-12 md:col-span-5">
                <label className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Habit name</label>
                <input
                  type="text"
                  placeholder="e.g. Read 30 mins, Drink 2L water…"
                  value={input.title}
                  onChange={e => setInput(prev => ({ ...prev, title: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  autoFocus
                  className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all font-medium text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-600"
                />
              </div>

              {/* Category icons */}
              <div className="sm:col-span-12 md:col-span-4">
                <label className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Category</label>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {CATEGORIES.map(c => {
                    const CIcon = c.icon;
                    const selected = input.category === c.label;
                    return (
                      <button
                        key={c.label}
                        onClick={() => setInput(prev => ({ ...prev, category: c.label }))}
                        title={c.label}
                        className={`flex items-center gap-0.5 sm:gap-1 px-2 py-1.5 sm:px-2.5 rounded-lg text-[9px] sm:text-xs font-bold transition-all border border-solid ${
                          selected
                            ? `bg-gradient-to-r ${c.gradient} text-white border-transparent shadow-md`
                            : "bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <CIcon className="h-3 w-3" />
                        <span className="text-[9px] sm:text-xs">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frequency + Add button row */}
              <div className="flex gap-2 sm:contents">
                <div className="flex-1 sm:col-span-6 md:col-span-2">
                  <label className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Frequency</label>
                  <select
                    value={input.frequency}
                    onChange={e => setInput(prev => ({ ...prev, frequency: e.target.value as any }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all font-semibold text-sm text-gray-700 dark:text-gray-300"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                {/* Add button */}
                <div className="flex items-end sm:col-span-6 md:col-span-1">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleAdd}
                    disabled={!input.title.trim() || !input.category}
                    className="w-full px-4 sm:px-0 py-2.5 bg-gradient-to-tr from-amber-500 to-orange-500 hover:opacity-95 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-1 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sm:hidden">Add</span>
                    <span className="hidden md:inline">Add</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Today-only notice */}
            <div className="mt-3 flex items-center gap-2 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/20 rounded-xl px-3 py-2">
              <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-400 font-medium">
                Only <strong>today</strong> can be marked — past dates are locked and shown as read-only history.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── High-Tech Search & Filters Panel ── */}
      <div className="glass-card p-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 relative select-none">
        {/* Search bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search active habits..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/35 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Categories Tab selector */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <button
            onClick={() => setSelectedTab("All")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-solid ${
              selectedTab === "All"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-transparent shadow-md"
                : "bg-white dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:border-slate-350"
            }`}
          >
            All Habits
          </button>
          
          {CATEGORIES.map(c => {
            const hasActiveHabit = activeHabits.some(h => h.category === c.label);
            return (
              <button
                key={c.label}
                onClick={() => setSelectedTab(c.label)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-solid flex items-center gap-1 ${
                  selectedTab === c.label
                    ? `bg-gradient-to-r ${c.gradient} text-white border-transparent shadow-md ${c.glow}`
                    : "bg-white dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:border-slate-350"
                }`}
              >
                <span>{c.label}</span>
                {hasActiveHabit && (
                  <span className="w-1 h-1 rounded-full bg-current block" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => setSelectedTab("Archived")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-solid flex items-center gap-1 ${
              selectedTab === "Archived"
                ? "bg-indigo-650 text-white border-transparent shadow-md"
                : "bg-white dark:bg-slate-900/60 text-slate-550 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 hover:border-slate-350"
            }`}
          >
            <Archive className="h-3 w-3 shrink-0" />
            <span>Archived</span>
          </button>
        </div>
      </div>

      {/* ── Habits Grid ── */}
      <AnimatePresence mode="popLayout">
        {filteredHabits.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-8 sm:p-12 md:p-16 text-center rounded-2xl sm:rounded-3xl"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-5 bg-orange-50 dark:bg-orange-950/30 rounded-2xl mb-1">
                <Flame className="h-10 w-10 text-orange-450 animate-pulse" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-700 dark:text-slate-300">
                {selectedTab === "Archived" ? "No archived habits" : searchQuery ? "No search matches" : "No habits found"}
              </h3>
              <p className="text-sm text-slate-400 max-w-xs">
                {selectedTab === "Archived" 
                  ? "Archive habits from your main screen when you want to take a break from them." 
                  : searchQuery 
                  ? "Try checking your spelling or selecting a different category tab."
                  : "Set your first habit, mark it daily, build streaks, and earn XP!"}
              </p>
              {!searchQuery && selectedTab !== "Archived" && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowForm(true)}
                  className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Add First Habit
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
            {filteredHabits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                past14={past14}
                today={today}
                onToggle={handleToggle}
                onDelete={deleteHabit}
                onArchive={handleArchive}
                soundEnabled={soundEnabled}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HabitPage;
