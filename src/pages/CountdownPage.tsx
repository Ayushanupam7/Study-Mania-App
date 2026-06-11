// src/pages/CountdownPage.tsx
import React, { useState, useEffect } from "react";
import { useStore } from "../store/store";
import type { Countdown } from "../store/store";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Clock, 
  AlertCircle
} from "lucide-react";

interface CountdownInput {
  title: string;
  date: string;
  category: string;
  color: string;
}

const CountdownPage: React.FC = () => {
  const countdowns = useStore(state => state.countdowns);
  const addCountdown = useStore(state => state.addCountdown);
  const deleteCountdown = useStore(state => state.deleteCountdown);

  const [input, setInput] = useState<CountdownInput>({
    title: "",
    date: "",
    category: "Academics",
    color: "sky"
  });

  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = () => {
    if (!input.title.trim() || !input.date) return;
    const newCD: Countdown = {
      id: Date.now().toString(),
      title: input.title.trim(),
      date: input.date,
      category: input.category,
      color: input.color
    };
    addCountdown(newCD);
    setInput({
      title: "",
      date: "",
      category: "Academics",
      color: "sky"
    });
  };

  const getRemainingTime = (targetDateStr: string) => {
    const diff = new Date(targetDateStr).getTime() - tick;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

    const totalSecs = Math.floor(diff / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    return { days, hours, minutes, seconds, expired: false };
  };

  const colors = [
    { name: "sky", class: "from-sky-400 to-blue-500 text-sky-500 bg-sky-500/10" },
    { name: "rose", class: "from-rose-400 to-pink-500 text-rose-500 bg-rose-500/10" },
    { name: "amber", class: "from-amber-400 to-orange-500 text-amber-500 bg-amber-500/10" },
    { name: "emerald", class: "from-emerald-400 to-teal-500 text-emerald-500 bg-emerald-500/10" },
    { name: "indigo", class: "from-indigo-400 to-purple-500 text-indigo-500 bg-indigo-500/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md pt-6 pb-4 md:pt-8 lg:pt-10 z-20 -mx-4 px-4 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10 border-b border-slate-200/30 dark:border-slate-800/30">
        <h1 className="text-3xl font-extrabold flex items-center gap-2 tracking-tight">
          <Calendar className="text-indigo-500 h-8 w-8" />
          <span>Exam & Event Countdowns</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Never miss an deadline. Track exam countdowns in real-time and gain +10 XP.
        </p>
      </div>

      {/* Countdown Builder */}
      <div className="glass-card p-5 rounded-3xl space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Clock className="h-5 w-5 text-indigo-500" />
          <span>New Target Countdown</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="md:col-span-4">
            <input
              type="text"
              placeholder="Event Name (e.g. Physics Midterm)"
              value={input.title}
              onChange={e => setInput(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
            />
          </div>
          <div className="md:col-span-3">
            <input
              type="date"
              value={input.date}
              onChange={e => setInput(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm text-gray-700 dark:text-gray-300"
            />
          </div>
          <div className="md:col-span-2">
            <select
              value={input.category}
              onChange={e => setInput(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none"
            >
              <option value="Academics">Academics</option>
              <option value="Personal">Personal</option>
              <option value="Coding">Coding</option>
              <option value="Competition">Competition</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-center justify-around gap-2 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            {colors.map(c => (
              <button
                key={c.name}
                onClick={() => setInput(prev => ({ ...prev, color: c.name }))}
                className={`h-5 w-5 rounded-full bg-gradient-to-tr ${c.class.split(" ").slice(0, 2).join(" ")} transition-all ${
                  input.color === c.name ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : ""
                }`}
              />
            ))}
          </div>
          <div className="md:col-span-1">
            <button
              onClick={handleAdd}
              className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center py-3"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Countdown Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {countdowns.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:col-span-2 glass-card p-12 text-center text-gray-500 rounded-3xl"
            >
              📅 No countdowns set. Get ahead of your deadlines!
            </motion.div>
          ) : (
            countdowns.map(cd => {
              const rem = getRemainingTime(cd.date);
              const colorInfo = colors.find(c => c.name === cd.color) || colors[0];
              return (
                <motion.div
                  layout
                  key={cd.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card p-6 rounded-3xl flex flex-col justify-between space-y-6"
                >
                  {/* Card Top */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">
                        {cd.category}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">
                        {cd.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => deleteCountdown(cd.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Countdown Numbers */}
                  {rem.expired ? (
                    <div className="flex items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-500">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-bold text-sm">Event has passed!</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                        <div className="text-2xl font-black text-gradient">{rem.days}</div>
                        <div className="text-[9px] uppercase font-bold text-gray-400">Days</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                        <div className="text-2xl font-black text-gradient">{rem.hours}</div>
                        <div className="text-[9px] uppercase font-bold text-gray-400">Hours</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                        <div className="text-2xl font-black text-gradient">{rem.minutes}</div>
                        <div className="text-[9px] uppercase font-bold text-gray-400">Mins</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 animate-pulse">
                        <div className="text-2xl font-black text-gradient-accent">{rem.seconds}</div>
                        <div className="text-[9px] uppercase font-bold text-gray-400">Secs</div>
                      </div>
                    </div>
                  )}

                  {/* Date Badge */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{cd.date}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${colorInfo.class}`}>
                      {cd.color}
                    </span>
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

export default CountdownPage;
