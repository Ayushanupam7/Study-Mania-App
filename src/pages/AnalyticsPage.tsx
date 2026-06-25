// src/pages/AnalyticsPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "../store/store";
import { db } from "../firebase";
import { collection, addDoc, deleteDoc, doc, query, onSnapshot, orderBy } from "firebase/firestore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import {
  BarChart2,
  CheckCircle2,
  Clock,
  ClockCheck,
  Flame,
  TrendingUp,
  Sparkles,
  Award,
  Calendar,
  Trash2,
  Eye,
  X,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AnalyticsPage: React.FC = () => {
  const userUid = useStore(state => state.userUid);
  const user = useStore(state => state.user);
  const dailyResetHour = useStore(state => state.dailyResetHour) ?? 4;
  const todos = useStore(state => state.todos);
  const stickyNotes = useStore(state => state.stickyNotes) || [];
  const habits = useStore(state => state.habits);
  const gainXp = useStore(state => state.gainXp);
  const totalStudyTime = useStore(state => state.totalStudyTime) || 0;

  const [timeRange, setTimeRange] = useState<"7days" | "30days">("7days");
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);

  // Firestore-fetched study sessions
  const [studySessions, setStudySessions] = useState<any[]>([]);

  // Todo calculations
  const totalTodos = todos.length + stickyNotes.length;
  const completedTodos = todos.filter(t => t.completed).length + stickyNotes.filter(n => n.completed).length;
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  // Real-time Firestore Study Sessions Log synchronization
  useEffect(() => {
    if (!userUid) {
      setStudySessions([]);
      return;
    }
    const q = query(
      collection(db, "users", userUid, "study_sessions"),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setStudySessions(sessions);
    }, (err) => {
      console.error("Firestore study_sessions query error:", err);
    });
    return () => unsubscribe();
  }, [userUid]);

  const totalFocusSessions = studySessions.length;

  // Dynamically calculated today's study stats
  const todaySessionsData = useMemo(() => {
    const d = new Date();
    const resetHour = dailyResetHour;

    const todayReset = new Date();
    todayReset.setHours(resetHour, 0, 0, 0);

    if (d.getHours() < resetHour) {
      todayReset.setDate(todayReset.getDate() - 1);
    }

    const resetTimestamp = todayReset.getTime();

    const todays = studySessions.filter(s => s.timestamp >= resetTimestamp);
    const minutes = todays.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const sessionsCount = todays.length;

    return { minutes, sessionsCount };
  }, [studySessions, dailyResetHour]);

  const formatMinsToHhMm = (totalMins: number) => {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs.toString().padStart(2, "0")}h${mins.toString().padStart(2, "0")}m`;
  };

  // Real Study history parser for the last 7 or 30 days
  const studyData = useMemo(() => {
    const daysToGenerate = timeRange === "7days" ? 7 : 30;

    // Parse studySessions into a date map
    const historyMap: Record<string, number> = {};
    studySessions.forEach(s => {
      if (s.timestamp) {
        const dateObj = new Date(s.timestamp);
        const formattedDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, "0")}-${dateObj.getDate().toString().padStart(2, "0")}`;
        historyMap[formattedDate] = (historyMap[formattedDate] || 0) + (s.durationMinutes || 0);
      }
    });

    return Array.from({ length: daysToGenerate }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (daysToGenerate - 1 - i));
      const formattedDate = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      const dayLabel = timeRange === "7days"
        ? d.toLocaleDateString([], { weekday: 'short' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const minutes = historyMap[formattedDate] || 0;
      return { name: dayLabel, minutes };
    });
  }, [studySessions, timeRange]);

  // Task Completed Distribution by Category
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};

    // Process standard tasks
    todos.filter(t => t.completed).forEach(t => {
      const cat = t.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    // Process completed sticky notes
    const completedStickiesCount = stickyNotes.filter(n => n.completed).length;
    if (completedStickiesCount > 0) {
      counts["Sticky Notes"] = completedStickiesCount;
    }

    const list = Object.keys(counts).map(name => ({
      name,
      value: counts[name]
    }));

    return list;
  }, [todos, stickyNotes]);

  // Habit completion counts
  const habitChartData = habits.map(h => {
    const totalCompletions = Object.values(h.completions).filter(Boolean).length;
    return {
      name: h.title.length > 10 ? h.title.slice(0, 10) + "..." : h.title,
      completions: totalCompletions + h.streak // include streak for simulated historical consistency
    };
  });

  const COLORS = ["#0ea5e9", "#a78bfa", "#f59e0b", "#10b981", "#ec4899"];

  // AI Coach Insights generator based on stats
  const coachAdvice = useMemo(() => {
    const todayMins = todaySessionsData.minutes;
    if (todayMins === 0) {
      return "The secret of getting ahead is getting started. Today is a clean slate. I recommend launching a single 25-minute Pomodoro study block to build momentum!";
    }
    if (todayMins > 0 && todayMins < 50) {
      return "Great start today! You've logged some valuable focus minutes. Try to complete one more focus cycle to lock in your learnings.";
    }
    if (todayMins >= 50 && todayMins < 120) {
      return "Excellent focus today! You are in the flow zone. Remember to take short breaks to keep your brain fresh and retain information.";
    }
    if (todayMins >= 120) {
      return "Outstanding! You're a study machine today. Make sure you stretch, stay hydrated, and celebrate this highly productive day.";
    }
    if (completionRate < 40 && totalTodos > 3) {
      return "Your task completion rate is a bit low. Try breaking down larger tasks into smaller, bite-sized steps (under 15 mins each) to avoid overwhelm.";
    }
    if (habits.length === 0) {
      return "Consistency builds character. Try adding at least one simple daily habit (like drinking water or reviewing notes) to build compound success.";
    }
    return "You're building solid consistency. Keep logging your habits, tasks, and focus sessions to keep your levels rising!";
  }, [todaySessionsData.minutes, completionRate, totalTodos, habits.length]);

  // Synchronize saved snapshots from Firebase
  useEffect(() => {
    if (!userUid) {
      setSnapshots([]);
      setLoadingSnapshots(false);
      return;
    }

    const q = query(
      collection(db, "users", userUid, "productivity_insights"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setSnapshots(list);
      setLoadingSnapshots(false);
    }, (err) => {
      console.error("Error loading snapshots:", err);
      setLoadingSnapshots(false);
    });

    return () => unsubscribe();
  }, [userUid]);

  const handleSaveSnapshot = async () => {
    if (!userUid) return;

    const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    // Avoid duplicates on the exact same timestamp range (or close daily snapshots)
    const newSnapshot = {
      timestamp: Date.now(),
      date: dateStr,
      completionRate,
      focusMinutes: todaySessionsData.minutes,
      sessionsFinished: todaySessionsData.sessionsCount,
      activeHabitsCount: habits.length,
      userLevel: user.level,
      coachAdvice
    };

    try {
      await addDoc(collection(db, "users", userUid, "productivity_insights"), newSnapshot);
      gainXp(10, "Logged Productivity Insight");
    } catch (e) {
      console.error("Error saving progress snapshot:", e);
    }
  };

  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userUid) return;
    try {
      await deleteDoc(doc(db, "users", userUid, "productivity_insights", id));
    } catch (e) {
      console.error("Error deleting snapshot:", e);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pt-4 pb-10">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md pt-2 pb-4 md:pt-4 z-20 border-b border-slate-200/30 dark:border-slate-800/30 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold flex items-center gap-2 tracking-tight text-slate-800 dark:text-slate-200">
            <BarChart2 className="text-sky-500 h-6 w-6 sm:h-7 sm:w-7" />
            <span>Productivity Insights</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs mt-0.5 max-w-lg">
            A visual overview of your focus, work execution, and habits development.
          </p>
        </div>

        <button
          onClick={handleSaveSnapshot}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-500 hover:opacity-90 text-white font-bold text-[10px] sm:text-xs shadow-md shadow-blue-500/15 cursor-pointer shrink-0 transition-transform active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save Progress Snapshot</span>
          <span className="sm:hidden">Save Log</span>
        </button>
      </div>

      {/* Mini Stat row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <div className="glass-card p-3 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-4 border border-sky-500/10">
          <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-500 shrink-0">
            <CheckCircle2 className="h-4.5 w-4.5 sm:h-6 sm:w-6 " />
          </div>
          <div className="text-center sm:text-left min-w-0">
            <div className="text-base sm:text-2xl font-black truncate">{completionRate}%</div>
            <div className="text-[9px] sm:text-xs text-gray-500 font-medium truncate">Completion Rate</div>
          </div>
        </div>

        <div className="glass-card p-3 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-4 border border-emerald-500/10">
          <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 shrink-0">
            <Clock className="h-4.5 w-4.5 sm:h-6 sm:w-6 animate-pulse" />
          </div>
          <div className="text-center sm:text-left min-w-0">
            <div className="text-base sm:text-2xl font-black truncate">{formatMinsToHhMm(totalStudyTime)}</div>
            <div className="text-[9px] sm:text-xs text-gray-500 font-medium truncate">Total Focus Study</div>
            <div className="text-[9px] text-emerald-500 font-bold mt-0.5">Today: {formatMinsToHhMm(todaySessionsData.minutes)}</div>
          </div>
        </div>

        <div className="glass-card p-3 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-4 border border-orange-500/10">
          <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-500 shrink-0">
            <ClockCheck className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
          </div>
          <div className="text-center sm:text-left min-w-0">
            <div className="text-base sm:text-2xl font-black truncate">{totalFocusSessions}</div>
            <div className="text-[9px] sm:text-xs text-gray-500 font-medium truncate">Total Focus Sessions</div>
            <div className="text-[9px] text-orange-500 font-bold mt-0.5">Today: {todaySessionsData.sessionsCount}</div>
          </div>
        </div>
      </div>

      {/* Main Charts & Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        {/* Study Trend Area Chart (2 cols width) */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 border border-slate-200/20 dark:border-slate-800/30">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-xs sm:text-sm md:text-base flex items-center gap-2 text-slate-850 dark:text-slate-150">
              <TrendingUp className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-sky-500" />
              <span>Study Focus Trend</span>
            </h3>

            {/* Range Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200/50 dark:border-slate-800/50">
              <button
                onClick={() => setTimeRange("7days")}
                className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer ${timeRange === "7days"
                  ? "bg-white dark:bg-slate-800 text-sky-500 shadow-xs"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
                  }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange("30days")}
                className={`px-2 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer ${timeRange === "30days"
                  ? "bg-white dark:bg-slate-800 text-sky-500 shadow-xs"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350"
                  }`}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="h-60 sm:h-72 w-full min-w-0 relative">
            {studySessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-450 dark:text-slate-500 space-y-1">
                <Clock className="h-8 w-8 text-sky-300 animate-pulse" />
                <div className="text-xs font-bold">No Study History Recorded</div>
                <p className="text-[10px] leading-normal max-w-[180px]">Start the Pomodoro Focus timer to record focus minutes!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={studyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/40" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "10px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)"
                    }}
                  />
                  <Area type="monotone" dataKey="minutes" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMinutes)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tasks Completed by Category Donut (1 col width) */}
        <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 border border-slate-200/20 dark:border-slate-800/30">
          <div>
            <h3 className="font-extrabold text-xs sm:text-sm md:text-base flex items-center gap-2 text-slate-850 dark:text-slate-150">
              <Award className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-purple-500" />
              <span>Completed Categories</span>
            </h3>
            <p className="text-[10px] text-slate-455 dark:text-slate-500 font-semibold mt-0.5">Tasks completed per category</p>
          </div>

          <div className="h-60 sm:h-72 w-full min-w-0 relative">
            {completedTodos === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-slate-455 dark:text-slate-500 space-y-1">
                <CheckCircle2 className="h-8 w-8 text-purple-300" />
                <div className="text-xs font-bold">No Completed Tasks</div>
                <p className="text-[10px] leading-normal max-w-[180px]">Complete To-do tasks to build this distribution chart.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "10px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)"
                    }}
                  />
                  <Legend verticalAlign="bottom" height={24} iconType="circle" fontSize={9} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* AI Coach Insights & Habits Double Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

        {/* AI Coach Insights Box */}
        <div className="glass-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/20 dark:border-slate-800/30 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs sm:text-sm md:text-base flex items-center gap-2 text-slate-850 dark:text-slate-150">
                <Sparkles className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-amber-500" />
                <span>AI Study Coach</span>
              </h3>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-400/20">
                Level {user.level} {user.title || "Scholar"}
              </span>
            </div>

            {/* Coach Speech bubble */}
            <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40">
              <div className="absolute top-4 -left-2 w-4 h-4 bg-slate-50 dark:bg-slate-900 border-l border-t border-slate-100 dark:border-slate-800/40 rotate-[-45deg] hidden sm:block" />
              <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold italic text-left">
                "{coachAdvice}"
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40 mt-4 flex items-center justify-between">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Analysis Score</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const score = Math.round((completionRate + (todaySessionsData.minutes / 60) * 20) / 2) / 10;
                const starVal = i + 1;
                return (
                  <Zap
                    key={i}
                    className={`h-3 w-3 ${starVal <= score ? "text-amber-500 fill-amber-500" : "text-slate-200 dark:text-slate-850"
                      }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Habits Frequency Tracker (2 cols width) */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4 border border-slate-200/20 dark:border-slate-800/30">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-xs sm:text-sm md:text-base flex items-center gap-2 text-slate-850 dark:text-slate-150">
              <Sparkles className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-amber-500" />
              <span>Habit Frequency Tracker</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-gray-400">Streak + Completions</span>
          </div>

          <div className="h-60 sm:h-64 w-full min-w-0 relative">
            {habitChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-450 dark:text-slate-500 space-y-1">
                <Flame className="h-8 w-8 text-amber-300" />
                <div className="text-xs font-bold">No Habits Found</div>
                <p className="text-[10px] leading-normal max-w-[180px]">Mark daily habits as completed to build consistency tracking charts!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habitChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/40" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "10px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)"
                    }}
                  />
                  <Bar dataKey="completions" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {habitChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Snapshots Log: private history stored in Firebase */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/20 dark:border-slate-800/30 space-y-4">
        <div>
          <h3 className="font-extrabold text-xs sm:text-sm md:text-base flex items-center gap-2 text-slate-850 dark:text-slate-150">
            <Calendar className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-blue-500" />
            <span>Productivity Snapshot History</span>
          </h3>
          <p className="text-[10px] text-slate-455 dark:text-slate-500 font-semibold mt-0.5">Historical logs saved in your private Firebase storage</p>
        </div>

        {loadingSnapshots ? (
          <div className="py-8 flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-455 dark:text-slate-550 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
            No productivity snapshots logged yet. Click **Save Progress Snapshot** above to log your achievements and earn XP!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-slate-450 dark:text-slate-500 font-black uppercase text-[10px] tracking-wider font-sans">
                  <th className="py-2.5 px-4 font-extrabold">Date</th>
                  <th className="py-2.5 px-4 font-extrabold">Level</th>
                  <th className="py-2.5 px-4 text-center font-extrabold">Tasks Completed</th>
                  <th className="py-2.5 px-4 text-center font-extrabold">Focus Time</th>
                  <th className="py-2.5 px-4 text-center font-extrabold">Active Habits</th>
                  <th className="py-2.5 px-4 text-right font-extrabold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/20 font-bold text-slate-700 dark:text-slate-350">
                {snapshots.map(snap => (
                  <tr
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer group text-slate-800 dark:text-slate-300"
                  >
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100">{snap.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-sky-50 dark:bg-sky-950/45 text-sky-500 px-2 py-0.5 rounded-full border border-sky-400/10">
                        Lvl {snap.userLevel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-emerald-500">{snap.completionRate}%</td>
                    <td className="py-3.5 px-4 text-center text-amber-500">{snap.focusMinutes} mins</td>
                    <td className="py-3.5 px-4 text-center text-purple-500">{snap.activeHabitsCount}</td>
                    <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          onClick={() => setSelectedSnapshot(snap)}
                          className="p-1.5 rounded-lg text-slate-450 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                          title="View analysis report details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={e => handleDeleteSnapshot(snap.id, e)}
                          className="p-1.5 rounded-lg text-slate-450 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete snapshot log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot Detailed Analysis Modal Overlay */}
      <AnimatePresence>
        {selectedSnapshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSnapshot(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-6 overflow-hidden text-left"
            >
              {/* Top info */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Saved Productivity snapshot</span>
                  <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-0.5 font-sans">
                    <Calendar className="h-5 w-5 text-sky-500" />
                    <span>Report for {selectedSnapshot.date}</span>
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              {/* Grid data */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/30">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Task completion</p>
                  <p className="text-xl font-black text-emerald-500 mt-1">{selectedSnapshot.completionRate}%</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/30">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Focus time</p>
                  <p className="text-xl font-black text-amber-500 mt-1">{selectedSnapshot.focusMinutes} mins</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/30">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Focus cycles</p>
                  <p className="text-xl font-black text-orange-500 mt-1">{selectedSnapshot.sessionsFinished} sessions</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/30">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Active Habits</p>
                  <p className="text-xl font-black text-purple-500 mt-1">{selectedSnapshot.activeHabitsCount} habits</p>
                </div>
              </div>

              {/* Coach dialogue box */}
              <div className="mt-6 space-y-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Coach Analysis & Suggestions</p>
                <div className="p-4 rounded-2xl bg-sky-500/5 dark:bg-sky-500/5 border border-sky-400/20 text-sky-600 dark:text-sky-300 italic font-semibold text-xs leading-relaxed">
                  "{selectedSnapshot.coachAdvice}"
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 mt-8">
                <span className="text-[10px] text-slate-455 dark:text-slate-500 self-center font-bold">
                  User standing: Lvl {selectedSnapshot.userLevel}
                </span>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalyticsPage;
