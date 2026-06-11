// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from "react";
import { useStore } from "../store/store";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Flame,
  Calendar,
  Timer,
  ChevronRight,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Trophy,
  Activity
} from "lucide-react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

const DashboardPage: React.FC = () => {
  const user = useStore(state => state.user);
  const todos = useStore(state => state.todos);
  const habits = useStore(state => state.habits);
  const countdowns = useStore(state => state.countdowns);
  const toggleHabitDay = useStore(state => state.toggleHabitDay);
  const todayMinutes = useStore(state => state.todayMinutes);
  const updateTodo = useStore(state => state.updateTodo);
  const checkDailyReset = useStore(state => state.checkDailyReset);
  const today = new Date().toISOString().split("T")[0];

  const userUid = useStore(state => state.userUid);
  const [feedEvents, setFeedEvents] = useState<any[]>([]);
  const [dbCompetitors, setDbCompetitors] = useState<any[]>([]);

  const formatHhMmSs = (mins: number) => {
    const totalSecs = mins * 60;
    const h = Math.floor(totalSecs / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, "0");
    const s = (totalSecs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [todoFilter, setTodoFilter] = useState<"all" | "today">("today");

  const firstName = user.name ? user.name.split(" ")[0] : "Scholar";
  const quotes = React.useMemo(() => [
    {
      title: `Level Up Your Learning Journey, ${firstName}!`,
      text: "Complete tasks, maintain streaks, and focus to earn XP and level up."
    },
    {
      title: `Stay Consistent, ${firstName}!`,
      text: "Success is the sum of small efforts, repeated day in and day out."
    },
    {
      title: `Fuel the Fire, ${firstName}!`,
      text: "Only you can control your future. Make every study session count."
    },
    {
      title: `Conquer Procrastination, ${firstName}!`,
      text: "The secret of getting ahead is getting started. Take the first step now."
    },
    {
      title: `Embrace the Challenge, ${firstName}!`,
      text: "Difficulties strengthen the mind, as labor does the body."
    },
    {
      title: `Unlock Your Mind, ${firstName}!`,
      text: "Learning is a treasure that will follow its owner everywhere."
    }
  ], [firstName]);

  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    checkDailyReset();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      checkDailyReset();
    }, 1000);
    return () => clearInterval(timer);
  }, [checkDailyReset]);

  useEffect(() => {
    const quoteTimer = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % quotes.length);
    }, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(quoteTimer);
  }, [quotes.length]);

  // Real-time Firestore Live Feed synchronization
  useEffect(() => {
    const q = query(collection(db, "arena_feed"), orderBy("timestamp", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setFeedEvents([
          { id: 1, text: "Chloe Chen started a 50m session on Chemistry 📐", time: "2m ago" },
          { id: 2, text: "Alex Rivera entered the Focus Arena ⚡", time: "5m ago" },
          { id: 3, text: "Seraphina Vo earned a Double Down badge (+40 XP) 🏆", time: "10m ago" },
        ]);
        return;
      }
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        const elapsedSecs = Math.floor((Date.now() - (data.timestamp || Date.now())) / 1000);
        let timeStr = "Just now";
        if (elapsedSecs >= 3600) {
          const hours = Math.floor(elapsedSecs / 3600);
          timeStr = `${hours}h ago`;
        } else if (elapsedSecs >= 60) {
          const mins = Math.floor(elapsedSecs / 60);
          timeStr = `${mins}m ago`;
        } else if (elapsedSecs > 10) {
          timeStr = `${elapsedSecs}s ago`;
        }
        return {
          id: doc.id,
          text: data.text,
          time: timeStr
        };
      });
      setFeedEvents(events);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Arena Competitors synchronization
  useEffect(() => {
    const q = query(collection(db, "arena_sessions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          avatar: data.avatar,
          secondsBase: data.secondsBase || 0,
          sessionStartTime: data.sessionStartTime || null,
          timerType: data.timerType || "pomodoro",
          pomodoroDuration: data.pomodoroDuration || 0,
          status: data.status || "online",
          cheers: data.cheers || [],
          lastActive: data.lastActive || 0,
          totalStudyTime: data.totalStudyTime || 0,
          activity: data.activity || "",
          comment: data.comment || ""
        };
      });
      setDbCompetitors(items);
    });
    return () => unsubscribe();
  }, []);

  const getMostRecentResetTime = () => {
    const now = new Date();
    const todayReset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0, 0); // fallback reset hour 4
    if (now.getTime() < todayReset.getTime()) {
      todayReset.setDate(todayReset.getDate() - 1);
    }
    return todayReset.getTime();
  };

  const competitors = [
    // 1. User fallback if not in dbCompetitors yet
    ...(dbCompetitors.some(c => c.id === userUid) ? [] : [{
      id: "user",
      name: (user.name || "Scholar") + " (You)",
      avatar: user.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar",
      seconds: todayMinutes * 60,
      totalStudyTime: useStore.getState().totalStudyTime || 0,
      status: "online" as const,
      isUser: true,
      color: "from-emerald-400 via-teal-500 to-cyan-600",
      activity: "",
      comment: ""
    }]),
    // 2. Real-time Database Competitors
    ...dbCompetitors.map(c => {
      const mostRecentReset = getMostRecentResetTime();
      const isStale = (c.lastActive || 0) < mostRecentReset;

      let currentSessionSeconds = 0;
      if (c.status === "studying" && c.sessionStartTime && !isStale) {
        const elapsed = Math.floor((Date.now() - c.sessionStartTime) / 1000);
        currentSessionSeconds = c.timerType === "pomodoro"
          ? Math.min(elapsed, c.pomodoroDuration || 0)
          : elapsed;
      }

      const secondsBase = isStale ? 0 : (c.secondsBase || 0);
      const displayStatus = isStale ? ("offline" as const) : c.status;
      const totalStudyTimeBase = isStale ? 0 : (c.totalStudyTime || 0);

      return {
        id: c.id,
        name: c.id === userUid ? (user.name || "Scholar") + " (You)" : (c.name || "Unknown Scholar"),
        avatar: c.id === userUid ? (user.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar") : (c.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Unknown"),
        seconds: secondsBase + currentSessionSeconds,
        totalStudyTime: totalStudyTimeBase + currentSessionSeconds / 60,
        status: displayStatus,
        isUser: c.id === userUid,
        color: c.id === userUid ? "from-emerald-400 via-teal-500 to-cyan-600" : "from-purple-400 to-indigo-500",
        activity: c.activity || "",
        comment: c.comment || ""
      };
    })
  ].sort((a, b) => b.seconds - a.seconds);

  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dayString = currentTime.toLocaleDateString([], { weekday: 'long' });
  const dateString = currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const pendingTodos = todos.filter(t => !t.completed);
  const todayDate = new Date(today);
  const filteredTodos = todoFilter === "today"
    ? pendingTodos.filter(t => {
      if (!t.dueDate) return false;
      if (t.startDate) {
        const start = new Date(t.startDate);
        const end = new Date(t.dueDate);
        return todayDate >= start && todayDate <= end;
      }
      return t.dueDate === today;
    })
    : pendingTodos;
  const activeHabits = habits.length;
  const closestCountdown = countdowns.length > 0
    ? [...countdowns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    : null;

  // Calculate days left for closest countdown
  const getDaysLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 md:space-y-8 pt-4 sm:pt-6 md:pt-8 pb-0"
    >
      {/* Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl gradient-primary text-white p-5 sm:p-6 md:p-8 shadow-xl shadow-blue-500/25 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6"
      >
        <div className="relative z-10 space-y-2 sm:space-y-2.5 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-semibold">
            <Award className="h-3.5 w-3.5" />
            <span>Scholar Path unlocked</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            {quotes[quoteIndex]?.title}
          </h2>
          <p className="text-blue-100 max-w-xl text-xs sm:text-sm md:text-base">
            {quotes[quoteIndex]?.text}
          </p>
        </div>

        {/* Right Info Controls Panel */}
        <div className="relative z-10 flex flex-col md:flex-row items-stretch gap-4 shrink-0 w-full xl:w-auto">
          {/* Time, Day, Date Card */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 sm:px-5 sm:py-4 rounded-2xl border border-white/20 shadow-md shadow-black/5 hover:bg-white/15 transition-all flex-1 md:flex-initial">
            <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10 shrink-0">
              <Calendar className="h-5 w-5 text-sky-200" />
            </div>
            <div>
              <div className="text-[10px] text-blue-200 font-bold uppercase tracking-widest leading-none mb-1">
                {dayString}
              </div>
              <div className="font-extrabold text-sm sm:text-base whitespace-nowrap leading-none mb-1.5">
                {dateString}
              </div>
              <div className="font-mono text-[10px] sm:text-xs tracking-wider text-sky-200 font-semibold bg-blue-950/30 px-2.5 py-1 rounded-lg border border-white/5 inline-block w-fit">
                {timeString}
              </div>
            </div>
          </div>

          {/* Scholar Progress Card */}
          <div className="bg-white/10 backdrop-blur-md p-4 sm:px-5 sm:py-4 rounded-2xl border border-white/20 shadow-md shadow-black/5 hover:bg-white/15 transition-all w-full md:w-[320px] shrink-0">
            <div className="flex items-center gap-4">
              {/* Level Circle */}
              <div className="relative shrink-0">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-4 border-white/20 flex items-center justify-center font-black text-lg sm:text-xl bg-white/10">
                  {user.level}
                </div>
              </div>

              {/* Level + XP Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-blue-200 font-bold uppercase tracking-widest truncate">
                      Scholar Rank
                    </p>
                    <h3 className="font-extrabold text-sm sm:text-lg truncate">
                      Level {user.level}
                    </h3>
                  </div>

                  <span className="text-[10px] bg-emerald-500/25 text-emerald-200 border border-emerald-400/20 px-2 py-0.5 rounded-full font-bold shrink-0">
                    Active
                  </span>
                </div>

                {/* XP */}
                <div className="mt-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-bold text-sky-100">
                    {user.xp} XP
                  </span>
                  <span className="text-blue-200 text-[10px] sm:text-xs truncate">
                    {user.level * 200 - user.xp} XP to level up
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-1.5 h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-300 to-blue-100 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        (user.xp / (user.level * 200)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative ambient blobs */}
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl -translate-y-12 translate-x-12 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl translate-y-12 pointer-events-none" />
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
      >
        {/* Todo Card */}
        <Link
          to="/todos"
          className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 sm:h-36 border border-sky-500/10 hover:border-sky-500/40 hover:bg-sky-50/10 dark:hover:bg-sky-950/10 transition-all duration-300"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-500 border border-sky-100 dark:border-sky-900/30">
              <CheckSquare className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-sky-500">Tasks</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold">{pendingTodos.length}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Remaining items</div>
          </div>
        </Link>

        {/* Habits Card */}
        <Link
          to="/habits"
          className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 sm:h-36 border border-orange-500/10 hover:border-orange-500/40 hover:bg-orange-50/10 dark:hover:bg-orange-950/10 transition-all duration-300"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-500 border border-orange-100 dark:border-orange-900/30">
              <Flame className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-orange-500">Habits</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold">{activeHabits}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Habits tracked</div>
          </div>
        </Link>

        {/* Countdowns Card */}
        <Link
          to="/countdowns"
          className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 sm:h-36 border border-purple-500/10 hover:border-purple-500/40 hover:bg-purple-50/10 dark:hover:bg-purple-950/10 transition-all duration-300"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 border border-purple-100 dark:border-purple-900/30">
              <Calendar className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-purple-500">Closest Exam</span>
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-extrabold truncate">
              {closestCountdown ? `${getDaysLeft(closestCountdown.date)} Days` : "No Exams"}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
              {closestCountdown ? closestCountdown.title : "All clear"}
            </div>
          </div>
        </Link>

        {/* Focus Timer Launch Card */}
        <Link
          to="/pomodoro"
          className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 sm:h-36 border border-emerald-500/10 hover:border-emerald-500/40 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 transition-all duration-300"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 border border-emerald-100 dark:border-emerald-900/30">
              <Timer className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-500">Pomodoro</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-md sm:text-lg font-extrabold truncate">Start Timer</div>
              <div className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-extrabold font-mono tracking-wider truncate">
                {formatHhMmSs(todayMinutes)}
              </div>
            </div>
            <ChevronRight className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-emerald-500 shrink-0" />
          </div>
        </Link>
      </motion.div>

      {/* Main Dashboard Layout Content Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8"
      >
        {/* Next Up (Task Panel) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <CheckSquare className="h-5 w-5 text-sky-500" />
              <span>Next Up Tasks</span>
            </h3>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              {/* Filter Toggle */}
              <div className="inline-flex p-0.5 rounded-xl bg-slate-200/50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shrink-0">
                <button
                  onClick={() => setTodoFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${todoFilter === "all"
                    ? "bg-white dark:bg-slate-800 text-sky-500 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTodoFilter("today")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${todoFilter === "today"
                    ? "bg-white dark:bg-slate-800 text-sky-500 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                    }`}
                >
                  Today
                </button>
              </div>

              <Link
                to="/todos"
                className="text-xs sm:text-sm font-semibold text-sky-500 hover:text-sky-600 flex items-center gap-1 hover:underline shrink-0"
              >
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTodos.length === 0 ? (
              <div className="glass-card p-8 text-center text-gray-500 dark:text-gray-400 rounded-2xl text-xs sm:text-sm">
                {todoFilter === "today"
                  ? "🌅 No tasks due today. Have a productive day!"
                  : "🎉 No pending tasks! You are all caught up."}
              </div>
            ) : (
              filteredTodos.slice(0, 3).map(todo => (
                <div
                  key={todo.id}
                  className="glass-card p-3 sm:p-4 rounded-xl flex items-center justify-between border-l-4 border-l-sky-500 hover:scale-[1.01] transition-transform duration-200 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => updateTodo(todo.id, { completed: !todo.completed })}
                      className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer ${todo.completed
                        ? "bg-sky-500 border-sky-500 text-white"
                        : "border-slate-300 dark:border-slate-700 hover:border-sky-500"
                        }`}
                    >
                      {todo.completed && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${todo.priority === "high" ? "bg-red-500" : todo.priority === "medium" ? "bg-orange-400" : "bg-green-400"
                          }`} />
                        <span className="font-semibold text-xs sm:text-sm truncate text-slate-800 dark:text-slate-300">{todo.title}</span>
                      </div>
                      {todo.dueDate && (
                        <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-4 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="truncate">
                            {todo.startDate ? `${todo.startDate} to ` : ""}
                            {todo.dueDate}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap shrink-0 self-start mt-0.5">
                    {todo.category || "General"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Habits Quick Checklist */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
            <span>Habits Today</span>
          </h3>

          <div className="glass-card p-4 sm:p-5 rounded-2xl space-y-4">
            {habits.length === 0 ? (
              <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 py-4">
                No habits added yet. Let's create one!
                <Link to="/habits" className="mt-3 block text-sky-500 font-bold hover:underline">Add Habit</Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {habits.map(habit => {
                  const completedToday = !!habit.completions[today];
                  return (
                    <div key={habit.id} className="flex items-center justify-between gap-2 min-w-0">
                      <span className={`font-semibold text-xs sm:text-sm truncate text-slate-800 dark:text-slate-300 ${completedToday ? "line-through text-gray-400" : ""}`}>
                        {habit.title}
                      </span>
                      <button
                        onClick={() => toggleHabitDay(habit.id, today)}
                        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200 shrink-0 ${completedToday
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                      >
                        {completedToday ? "✓ Done" : "Mark"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Study Arena & Live Feed Section */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8"
      >
        {/* Study Arena Standings Widget */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
              <span>Study Arena Standings</span>
            </h3>
            <Link
              to="/pomodoro"
              className="text-xs sm:text-sm font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 hover:underline"
            >
              <span>Join Arena</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {competitors.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                No competitors active in the arena.
              </div>
            ) : (
              <div className="space-y-3">
                {competitors.slice(0, 5).map((comp, idx) => {
                  const rank = idx + 1;
                  const displayMins = Math.floor(comp.seconds / 60);
                  return (
                    <div
                      key={comp.id}
                      className={`flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800/40 ${comp.isUser
                        ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-l-4 border-l-emerald-500 border-emerald-500/25 shadow-sm"
                        : "bg-white/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50"
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 border ${rank === 1 ? "bg-amber-400 text-white border-amber-300" :
                          rank === 2 ? "bg-slate-300 text-white border-slate-300" :
                            rank === 3 ? "bg-orange-400 text-white border-orange-300" :
                              "bg-slate-100 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-800/50 text-slate-500 dark:text-slate-400"
                          }`}>
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                        </span>
                        <div className="relative shrink-0">
                          <img
                            src={comp.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                            alt={comp.name || "Scholar"}
                            className={`w-7.5 h-7.5 rounded-lg object-cover bg-white dark:bg-slate-950 p-0.5 border ${comp.isUser ? "border-emerald-500/60 ring-2 ring-emerald-500/15" : "border-slate-200 dark:border-slate-800"
                              }`}
                          />
                          <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white dark:border-slate-900 ${comp.status === "studying" ? "bg-purple-500" :
                            comp.status === "online" ? "bg-emerald-500" : "bg-slate-400"
                            }`} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block truncate">
                            {(comp.name || "Scholar").replace(" (You)", "")}
                          </span>
                          {comp.status === "studying" && comp.activity && (
                            <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 block truncate max-w-[150px] sm:max-w-[200px]">
                              Focusing: {comp.activity}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800/30 px-2 py-0.5 rounded-lg shrink-0">
                        {displayMins}m
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Arena Activity Feed Widget */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Activity className="h-5 w-5 text-indigo-500 animate-pulse" />
            <span>Live Arena Feed</span>
          </h3>

          <div className="glass-card p-4 sm:p-5 rounded-2xl space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {feedEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                No active updates in the arena feed.
              </div>
            ) : (
              <div className="space-y-2.5">
                {feedEvents.slice(0, 5).map(event => {
                  const text = event.text as string;
                  let IconEmoji = "📢";
                  let borderTheme = "border-slate-200/30 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20";
                  if (text.includes("motiv") || text.includes("cheered")) {
                    IconEmoji = "⚡";
                    borderTheme = "border-pink-500/20 dark:border-pink-500/10 bg-pink-500/5 dark:bg-pink-500/5 text-pink-600 dark:text-pink-400";
                  } else if (text.includes("completed") || text.includes("achievement") || text.includes("earned") || text.includes("XP")) {
                    IconEmoji = "🏆";
                    borderTheme = "border-amber-500/25 dark:border-amber-500/10 bg-amber-500/5 dark:bg-amber-500/5";
                  } else if (text.includes("focusing") || text.includes("started") || text.includes("entered")) {
                    IconEmoji = "🔥";
                    borderTheme = "border-purple-500/20 dark:border-purple-500/10 bg-purple-500/5 dark:bg-purple-500/5";
                  } else if (text.includes("break")) {
                    IconEmoji = "☕";
                    borderTheme = "border-sky-500/20 dark:border-sky-500/10 bg-sky-500/5 dark:bg-sky-500/5";
                  }

                  return (
                    <div
                      key={event.id}
                      className={`flex justify-between items-start gap-2 text-[10px] p-2.5 rounded-xl border ${borderTheme} shadow-sm`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-xs select-none shrink-0 mt-0.5">{IconEmoji}</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300 leading-normal truncate max-w-[150px] sm:max-w-[200px]">
                          {event.text}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold shrink-0 mt-0.5">
                        {event.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Professional Dashboard Footer */}
      <footer className="pt-6 pb-6 border-t border-slate-200/30 dark:border-slate-800/40 mt-2 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 justify-center sm:justify-start">
            <div className="w-5.5 h-5.5 rounded-lg gradient-primary flex items-center justify-center text-white text-[9px] font-black shrink-0 shadow-sm shadow-blue-500/15">
              S
            </div>
            <span className="text-slate-700 dark:text-slate-300 font-extrabold">Study Mania</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-sky-500 font-bold border border-slate-200/20 dark:border-slate-800/30">
              Version 1.3.0
            </span>
          </div>

          <div className="flex items-center justify-center gap-1 select-none">
            <span>Developed by</span>
            <span className="text-slate-700 dark:text-slate-300 font-extrabold hover:text-sky-500 transition-colors">
              Ayush Anupam
            </span>
          </div>

          <div className="opacity-80 leading-none">
            &copy; {new Date().getFullYear()} Study Mania. All rights reserved.
          </div>
        </div>
      </footer>
    </motion.div>
  );
};

export default DashboardPage;
