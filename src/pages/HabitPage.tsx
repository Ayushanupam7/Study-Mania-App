// src/pages/HabitPage.tsx
import React, { useState } from "react";
import { useStore } from "../store/store";
import type { Habit } from "../store/store";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Flame, 
  Plus, 
  Trash2, 
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  Activity,
  Check
} from "lucide-react";

interface HabitInput {
  title: string;
  category: string;
  frequency: "daily" | "weekly";
}

const HabitPage: React.FC = () => {
  const habits = useStore(state => state.habits);
  const addHabit = useStore(state => state.addHabit);
  const toggleHabitDay = useStore(state => state.toggleHabitDay);
  const deleteHabit = useStore(state => state.deleteHabit);

  const [input, setInput] = useState<HabitInput>({
    title: "",
    category: "Health",
    frequency: "daily"
  });

  const categories = ["Coding", "Health", "Academics", "Mindfulness", "Fitness", "Reading"];

  // Helper to generate last 7 days including today
  const getPast7Days = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push({
        dateString: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("en-US", { weekday: "narrow" }),
        dayNumber: d.getDate(),
        isToday: i === 0
      });
    }
    return list;
  };

  const past7Days = getPast7Days();

  const handleAdd = () => {
    if (!input.title.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      title: input.title.trim(),
      category: input.category,
      frequency: input.frequency,
      streak: 0,
      completions: {},
      createdAt: new Date().toISOString()
    };
    addHabit(newHabit);
    setInput(prev => ({ ...prev, title: "" }));
  };

  // Helper to get category colors & styles
  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case "Coding":
        return {
          bg: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border-sky-100 dark:border-sky-900/30",
          border: "border-l-4 border-l-sky-500",
          glow: "group-hover:shadow-sky-500/10 hover:border-sky-300 dark:hover:border-sky-800",
          indicator: "bg-sky-500"
        };
      case "Health":
        return {
          bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
          border: "border-l-4 border-l-emerald-500",
          glow: "group-hover:shadow-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-800",
          indicator: "bg-emerald-500"
        };
      case "Mindfulness":
        return {
          bg: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-100 dark:border-purple-900/30",
          border: "border-l-4 border-l-purple-500",
          glow: "group-hover:shadow-purple-500/10 hover:border-purple-300 dark:hover:border-purple-800",
          indicator: "bg-purple-500"
        };
      case "Academics":
        return {
          bg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30",
          border: "border-l-4 border-l-indigo-500",
          glow: "group-hover:shadow-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-800",
          indicator: "bg-indigo-500"
        };
      case "Fitness":
        return {
          bg: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
          border: "border-l-4 border-l-rose-500",
          glow: "group-hover:shadow-rose-500/10 hover:border-rose-300 dark:hover:border-rose-800",
          indicator: "bg-rose-500"
        };
      case "Reading":
        return {
          bg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
          border: "border-l-4 border-l-amber-500",
          glow: "group-hover:shadow-amber-500/10 hover:border-amber-300 dark:hover:border-amber-800",
          indicator: "bg-amber-500"
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-100 dark:border-slate-800",
          border: "border-l-4 border-l-slate-400",
          glow: "group-hover:shadow-slate-500/10 hover:border-slate-300 dark:hover:border-slate-700",
          indicator: "bg-slate-400"
        };
    }
  };

  // Stats Calculation
  const todayStr = new Date().toISOString().split("T")[0];
  const completedToday = habits.filter(h => !!h.completions[todayStr]).length;
  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak), 0) : 0;
  
  const totalPossible = habits.length * 7;
  let completedCount = 0;
  habits.forEach(h => {
    past7Days.forEach(day => {
      if (h.completions[day.dateString]) {
        completedCount++;
      }
    });
  });
  const consistency = totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-0">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md pt-6 pb-4 md:pt-8 z-20 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200/30 dark:border-slate-800/30">
        <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2 tracking-tight text-slate-800 dark:text-slate-100">
          <Flame className="text-orange-500 h-7 w-7 sm:h-8 sm:w-8 animate-pulse" />
          <span>Habit Ring</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
          Build consistency. Log completions daily to grow streaks and earn +10 XP.
        </p>
      </div>

      {/* Habit Stats Dashboard Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Habits Card */}
        <div className="glass-card p-4.5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Habits</span>
            <span className="text-xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight block">
              {habits.length}
            </span>
          </div>
          <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-500 shrink-0">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </div>

        {/* Completions Today Card */}
        <div className="glass-card p-4.5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Completed Today</span>
            <span className="text-xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight block">
              {completedToday}
            </span>
          </div>
          <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-500 shrink-0">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </div>

        {/* Best Streak Card */}
        <div className="glass-card p-4.5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Best Streak</span>
            <span className="text-xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight block flex items-baseline gap-1">
              {bestStreak} <span className="text-[10px] sm:text-xs font-semibold text-orange-500">days</span>
            </span>
          </div>
          <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl text-orange-500 shrink-0">
            <Flame className="h-4 w-4 sm:h-5 sm:w-5 fill-orange-500/10 animate-pulse" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </div>

        {/* 7-Day Consistency Card */}
        <div className="glass-card p-4.5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">7-Day Consistency</span>
            <span className="text-xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight block">
              {consistency}%
            </span>
          </div>
          <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl text-purple-500 shrink-0">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </div>
      </div>

      {/* Habit Builder Form */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-4">
        <h2 className="text-md sm:text-lg font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <PlusCircle className="h-5 w-5 text-orange-500" />
          <span>Start a New Habit</span>
        </h2>
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-6">
            <input
              type="text"
              placeholder="e.g. Read for 30 minutes, Drink water..."
              value={input.title}
              onChange={e => setInput(prev => ({ ...prev, title: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium text-slate-850 dark:text-slate-100 text-sm sm:text-base placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          <div className="col-span-6 md:col-span-3">
            <select
              value={input.category}
              onChange={e => setInput(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium text-sm text-gray-700 dark:text-gray-300"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="col-span-6 md:col-span-2">
            <select
              value={input.frequency}
              onChange={e => setInput(prev => ({ ...prev, frequency: e.target.value as any }))}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="col-span-12 md:col-span-1">
            <button
              onClick={handleAdd}
              className="w-full h-full min-h-[44px] bg-gradient-to-tr from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center justify-center py-2.5"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {habits.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="md:col-span-2 glass-card p-10 sm:p-14 text-center text-gray-500 dark:text-gray-400 rounded-3xl"
            >
              🔥 No habits active. Set your first habit and build a streak!
            </motion.div>
          ) : (
            habits.map(habit => {
              const styles = getCategoryStyles(habit.category);
              return (
                <motion.div
                  layout
                  key={habit.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className={`glass-card p-4 sm:p-5 rounded-3xl flex flex-col justify-between space-y-4 border-l-4 border-t-0 border-r-0 border-b-0 border-solid hover:shadow-md transition-all duration-300 group ${styles.border} ${styles.glow}`}
                >
                  {/* Habit Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-solid ${styles.bg}`}>
                        {habit.category}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base mt-2 truncate text-slate-800 dark:text-slate-100">
                        {habit.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium capitalize">
                        {habit.frequency} frequency
                      </p>
                    </div>
                    
                    {/* Streak & Trash */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 font-black text-xs sm:text-sm border border-orange-100 dark:border-orange-900/25 shadow-sm shadow-orange-500/5">
                        <Flame className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 fill-current animate-pulse" />
                        <span>{habit.streak}</span>
                      </div>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                      >
                        <Trash2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </button>
                    </div>
                  </div>

                  {/* 7 Day Calendar Grid Strip */}
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-2.5 block">
                      Last 7 Days Activity
                    </span>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {past7Days.map(day => {
                        const isCompleted = !!habit.completions[day.dateString];
                        return (
                          <motion.button
                            key={day.dateString}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleHabitDay(habit.id, day.dateString)}
                            className={`flex flex-col items-center justify-center p-1 sm:p-2 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl transition-all border border-solid border-transparent ${
                              isCompleted
                                ? "bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-500/20"
                                : day.isToday
                                ? "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-400"
                                : "bg-slate-50 dark:bg-slate-850 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span className="text-[7.5px] sm:text-[8.5px] font-bold uppercase tracking-tight opacity-75">{day.dayName}</span>
                            <span className="text-[10px] sm:text-xs font-black mt-0.5 sm:mt-1 flex items-center gap-0.5">
                              {day.dayNumber}
                              {isCompleted && <Check className="h-2 w-2 sm:h-2.5 sm:w-2.5 stroke-[3.5] shrink-0" />}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HabitPage;
