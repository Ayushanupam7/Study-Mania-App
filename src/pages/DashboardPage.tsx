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
  Activity,
  Zap,
  Sparkles
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
  const sessionCount = useStore(state => state.sessionCount);
  const updateTodo = useStore(state => state.updateTodo);
  const updateStickyNote = useStore(state => state.updateStickyNote);
  const stickyNotes = useStore(state => state.stickyNotes) || [];
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
      console.log("📡 Dashboard: Arena feed snapshot received, doc count:", snapshot.docs.length);
      if (snapshot.empty) {
        console.log("📭 Dashboard: Arena feed is empty, showing mock data");
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
      console.log("✅ Dashboard: Arena feed loaded:", events.length, "events");
      setFeedEvents(events);
    }, (err: any) => {
      console.error("❌ Dashboard: Arena feed listener error:", {
        code: err.code,
        message: err.message,
        details: err
      });
      if (err.code === "permission-denied") {
        console.error("🔒 Permission denied! Check Firestore rules for arena_feed collection");
      }
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
      const totalStudyTimeBase = c.totalStudyTime || 0;

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

  const todayDate = new Date(today);
  const todayTasks = todos.filter(t => !t.completed).filter(t => {
    if (!t.dueDate) return false;
    if (t.startDate) {
      const start = new Date(t.startDate);
      const end = new Date(t.dueDate);
      return todayDate >= start && todayDate <= end;
    }
    return t.dueDate === today;
  });

  const todayStickyNotes = stickyNotes.filter(n => !n.completed).filter(note => {
    const type = note.targetDateType || "today";
    if (type === "daily") return true;
    if (type === "today") {
      return !note.targetDate || note.targetDate === today;
    }
    if (type === "specific") {
      return note.targetDate === today;
    }
    return true;
  });

  const pendingTodosCount = todos.filter(t => !t.completed).length + stickyNotes.filter(n => !n.completed).length;

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
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 sm:px-5 sm:py-4 rounded-2xl border border-white/20 shadow-md shadow-black/5 hover:bg-white/15 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 transition-all duration-300 flex-1 md:flex-initial">
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
          <div className="bg-white/10 backdrop-blur-md p-4 sm:px-5 sm:py-4 rounded-2xl border border-white/20 shadow-md shadow-black/5 hover:bg-white/15 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 transition-all duration-300 w-full md:w-[320px] shrink-0">
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
          className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 sm:h-36 border border-sky-500/10 hover:border-sky-500/40 hover:bg-sky-50/10 dark:hover:bg-sky-950/10 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(14,165,233,0.15)] transition-all duration-300 group"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-500 border border-sky-100 dark:border-sky-900/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shrink-0">
              <CheckSquare className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-sky-500">Tasks</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold">{pendingTodosCount}</div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Remaining items</div>
          </div>
        </Link>

        {/* Habits Card */}
        <Link
          to="/habits"
          className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 sm:h-36 border border-orange-500/10 hover:border-orange-500/40 hover:bg-orange-50/10 dark:hover:bg-orange-950/10 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(249,115,22,0.15)] transition-all duration-300 group"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-500 border border-orange-100 dark:border-orange-900/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shrink-0">
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
          className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 sm:h-36 border border-purple-500/10 hover:border-purple-500/40 hover:bg-purple-50/10 dark:hover:bg-purple-950/10 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(168,85,247,0.15)] transition-all duration-300 group"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 border border-purple-100 dark:border-purple-900/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shrink-0">
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
          className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-32 sm:h-36 border border-emerald-500/10 hover:border-emerald-500/40 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(16,185,129,0.15)] transition-all duration-300 group"
        >
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 border border-emerald-100 dark:border-emerald-900/30 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 shrink-0">
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
            <ChevronRight className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-emerald-500 shrink-0 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </Link>
      </motion.div>

      {/* Main Dashboard Layout Content Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8"
      >
        {/* Today's Tasks & Notes (Task Panel) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <CheckSquare className="h-5 w-5 text-sky-500" />
              <span>Today's Tasks</span>
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                {todayTasks.length + todayStickyNotes.length}
              </span>
            </h3>
            <Link
              to="/todos"
              className="text-xs sm:text-sm font-semibold text-sky-500 hover:text-sky-600 flex items-center gap-1 hover:underline shrink-0"
            >
              <span>View all</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
            {todayTasks.length === 0 && todayStickyNotes.length === 0 ? (
              <div className="glass-card p-8 text-center text-gray-500 dark:text-gray-400 rounded-2xl text-xs sm:text-sm">
                🌅 No tasks or sticky notes today. Have a productive day!
              </div>
            ) : (
              <>
                {/* Standard Tasks */}
                {todayTasks.map(todo => (
                  <div
                    key={todo.id}
                    className="glass-card p-3 sm:p-4 rounded-xl flex items-center justify-between border-l-4 border-l-sky-500 hover:scale-[1.01] transition-transform duration-200 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => updateTodo(todo.id, { completed: !todo.completed })}
                        className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          todo.completed
                            ? "bg-sky-500 border-sky-500 text-white"
                            : "border-slate-350 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 hover:border-sky-500"
                        }`}
                      >
                        {todo.completed && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${
                            todo.priority === "high" ? "bg-red-500" : todo.priority === "medium" ? "bg-orange-400" : "bg-green-400"
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
                ))}

                {/* Sticky Notes */}
                {todayStickyNotes.map(note => (
                  <div
                    key={note.id}
                    className="glass-card p-3 sm:p-4 rounded-xl flex items-center justify-between border-l-4 border-l-amber-500 hover:scale-[1.01] transition-transform duration-200 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => updateStickyNote(note.id, { completed: !note.completed })}
                        className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          note.completed
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-slate-350 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 hover:border-amber-500"
                        }`}
                      >
                        {note.completed && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                          <span className="font-semibold text-xs sm:text-sm truncate text-slate-800 dark:text-slate-300">
                            {note.content.trim() || <span className="italic opacity-60">Empty Sticky Note</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium whitespace-nowrap shrink-0 self-start mt-0.5 ${
                      note.color === "yellow" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" :
                      note.color === "pink" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" :
                      note.color === "blue" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" :
                      note.color === "green" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" :
                      "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                    }`}>
                      Sticky
                    </span>
                  </div>
                ))}
              </>
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


      {/* ===== DAILY QUESTS SECTION ===== */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
            <span>Daily Quests</span>
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                {[
                  todayMinutes >= 1,
                  todayMinutes >= 25,
                  todayMinutes >= 60,
                  todayMinutes >= 120,
                  sessionCount >= 1,
                  sessionCount >= 3,
                  habits.filter(h => !!h.completions[today]).length >= 1,
                  habits.filter(h => !!h.completions[today]).length >= habits.length && habits.length > 0,
                ].filter(Boolean).length * [10, 25, 50, 100, 15, 40, 20, 60][0]} XP today
              </span>
            </div>
          </div>
        </div>

        {/* Quest Grid */}
        {(() => {
          const completedHabitsToday = habits.filter(h => !!h.completions[today]).length;
          const completedTodosToday = todos.filter(t => t.completed).length;

          const quests = [
            {
              id: "q_ignite",
              icon: "🔥",
              title: "Ignite the Engine",
              desc: "Log your first focus minute today",
              xp: 10,
              rarity: "common" as const,
              current: Math.min(1, todayMinutes),
              total: 1,
              completed: todayMinutes >= 1,
              category: "Focus",
              link: "/pomodoro",
            },
            {
              id: "q_focus25",
              icon: "🍅",
              title: "Pomodoro Master",
              desc: "Focus for 25 minutes total today",
              xp: 25,
              rarity: "common" as const,
              current: Math.min(25, todayMinutes),
              total: 25,
              completed: todayMinutes >= 25,
              category: "Focus",
              link: "/pomodoro",
            },
            {
              id: "q_focus60",
              icon: "⏰",
              title: "Deep Worker",
              desc: "Accumulate 1 hour of focus today",
              xp: 50,
              rarity: "rare" as const,
              current: Math.min(60, todayMinutes),
              total: 60,
              completed: todayMinutes >= 60,
              category: "Focus",
              link: "/pomodoro",
            },
            {
              id: "q_focus120",
              icon: "🧠",
              title: "Flow State",
              desc: "Reach 2 hours of deep focus today",
              xp: 100,
              rarity: "epic" as const,
              current: Math.min(120, todayMinutes),
              total: 120,
              completed: todayMinutes >= 120,
              category: "Focus",
              link: "/pomodoro",
            },
            {
              id: "q_session1",
              icon: "⚡",
              title: "First Session",
              desc: "Complete 1 full Pomodoro session",
              xp: 15,
              rarity: "common" as const,
              current: Math.min(1, sessionCount),
              total: 1,
              completed: sessionCount >= 1,
              category: "Sessions",
              link: "/pomodoro",
            },
            {
              id: "q_session3",
              icon: "🏆",
              title: "Triple Crown",
              desc: "Complete 3 Pomodoro sessions",
              xp: 40,
              rarity: "rare" as const,
              current: Math.min(3, sessionCount),
              total: 3,
              completed: sessionCount >= 3,
              category: "Sessions",
              link: "/pomodoro",
            },
            {
              id: "q_habit1",
              icon: "🌱",
              title: "Habit Starter",
              desc: "Complete at least 1 habit today",
              xp: 20,
              rarity: "common" as const,
              current: Math.min(1, completedHabitsToday),
              total: 1,
              completed: completedHabitsToday >= 1,
              category: "Habits",
              link: "/habits",
            },
            {
              id: "q_habitall",
              icon: "💎",
              title: "Perfect Day",
              desc: "Complete ALL your habits today",
              xp: 60,
              rarity: habits.length > 0 ? "epic" as const : "common" as const,
              current: completedHabitsToday,
              total: Math.max(1, habits.length),
              completed: habits.length > 0 && completedHabitsToday >= habits.length,
              category: "Habits",
              link: "/habits",
            },
            {
              id: "q_task3",
              icon: "✅",
              title: "Task Slayer",
              desc: "Mark 3 tasks as completed",
              xp: 30,
              rarity: "rare" as const,
              current: Math.min(3, completedTodosToday),
              total: 3,
              completed: completedTodosToday >= 3,
              category: "Tasks",
              link: "/todos",
            },
            {
              id: "q_legendary",
              icon: "👑",
              title: "Legendary Scholar",
              desc: "Focus 2h + 3 sessions + all habits",
              xp: 200,
              rarity: "legendary" as const,
              current: [todayMinutes >= 120, sessionCount >= 3, habits.length > 0 && completedHabitsToday >= habits.length].filter(Boolean).length,
              total: 3,
              completed: todayMinutes >= 120 && sessionCount >= 3 && habits.length > 0 && completedHabitsToday >= habits.length,
              category: "Ultimate",
              link: "/pomodoro",
            },
          ];

          const rarityConfig = {
            common: { label: "Common", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700", badge: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300", bar: "from-slate-400 to-slate-500", glow: "" },
            rare: { label: "Rare", bg: "bg-sky-500/5 dark:bg-sky-500/5", border: "border-sky-400/30 dark:border-sky-500/20", badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20", bar: "from-sky-400 to-blue-500", glow: "shadow-sky-500/10" },
            epic: { label: "Epic", bg: "bg-violet-500/5 dark:bg-violet-500/5", border: "border-violet-400/30 dark:border-violet-500/20", badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20", bar: "from-violet-400 to-purple-600", glow: "shadow-violet-500/15" },
            legendary: { label: "Legendary", bg: "bg-amber-500/5 dark:bg-amber-500/5", border: "border-amber-400/40 dark:border-amber-500/25", badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30", bar: "from-amber-400 to-orange-500", glow: "shadow-amber-500/20" },
          };

          const totalXpEarned = quests.filter(q => q.completed).reduce((sum, q) => sum + q.xp, 0);
          const totalXpAvail = quests.reduce((sum, q) => sum + q.xp, 0);

          return (
            <>
              {/* XP summary bar */}
              <div className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:shadow-md hover:shadow-amber-500/5 hover:border-amber-500/20 transition-all duration-300">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <Zap className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      Today's Quest XP
                    </span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                      {totalXpEarned} / {totalXpAvail} XP
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 transition-all duration-700 shadow-sm"
                      style={{ width: `${totalXpAvail > 0 ? Math.round((totalXpEarned / totalXpAvail) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                    {quests.filter(q => q.completed).length} / {quests.length} quests completed today
                  </p>
                </div>
              </div>

              {/* Quest cards — infinite auto-scroll marquee */}
              <style>{`
                @keyframes quest-scroll {
                  0%   { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .quest-track {
                  animation: quest-scroll 40s linear infinite;
                }
                .quest-track:hover {
                  animation-play-state: paused;
                }
              `}</style>

              <div className="overflow-hidden relative w-full">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />

                <div className="quest-track flex gap-3 pb-1" style={{ width: "max-content" }}>
                  {/* Render twice for seamless loop */}
                  {[...quests, ...quests].map((quest, i) => {
                    const rc = rarityConfig[quest.rarity];
                    const pct = quest.total > 0 ? Math.min(100, Math.round((quest.current / quest.total) * 100)) : 0;

                    return (
                      <Link
                        key={`${quest.id}-${i}`}
                        to={quest.link}
                        className={`relative flex flex-col gap-2 p-3.5 rounded-2xl border transition-all duration-200 shrink-0 w-44
                          ${rc.bg} ${rc.border}
                          ${quest.completed ? "opacity-70" : "hover:scale-[1.03] hover:shadow-md " + rc.glow}
                        `}
                      >
                        {/* Completed checkmark */}
                        {quest.completed && (
                          <div className="absolute top-2 right-2">
                            <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                              <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Emoji */}
                        <span className="text-2xl select-none leading-none">{quest.icon}</span>

                        {/* Rarity + XP badges */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide ${rc.badge}`}>
                            {rc.label}
                          </span>
                          <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                            +{quest.xp} XP
                          </span>
                        </div>

                        {/* Title */}
                        <p className="font-extrabold text-[11px] text-slate-800 dark:text-white leading-tight">
                          {quest.title}
                        </p>

                        {/* Progress */}
                        <div className="mt-auto space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{quest.category}</span>
                            <span className="text-[8px] font-black text-slate-500 dark:text-slate-400">{quest.current}/{quest.total}</span>
                          </div>
                          <div className="h-1 rounded-full bg-slate-200/60 dark:bg-slate-700/60 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${quest.completed ? "from-emerald-400 to-emerald-500" : rc.bar} transition-all duration-700`}
                              style={{ width: `${quest.completed ? 100 : pct}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}
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

          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Leaderboard header bar */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/5 dark:via-purple-500/5 dark:to-pink-500/5 border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Live Leaderboard</span>
              </div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                Today's Focus
              </span>
            </div>

            {competitors.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs space-y-2">
                <Trophy className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p>No competitors active in the arena yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[340px] overflow-y-auto">
                {competitors.slice(0, 5).map((comp, idx) => {
                  const rank = idx + 1;
                  const displayMins = Math.floor(comp.seconds / 60);
                  const topMins = Math.floor(competitors[0].seconds / 60) || 1;
                  const barPct = Math.min(100, Math.round((displayMins / topMins) * 100));

                  const rankStyles: Record<number, { bg: string; text: string; label: string }> = {
                    1: { bg: "from-amber-400 to-yellow-500", text: "text-white", label: "🥇" },
                    2: { bg: "from-slate-400 to-slate-500", text: "text-white", label: "🥈" },
                    3: { bg: "from-orange-400 to-amber-500", text: "text-white", label: "🥉" },
                  };
                  const rs = rankStyles[rank];

                  const barColor =
                    rank === 1 ? "from-amber-400 to-yellow-400" :
                      rank === 2 ? "from-slate-400 to-slate-500" :
                        rank === 3 ? "from-orange-400 to-amber-400" :
                          comp.isUser ? "from-emerald-400 to-teal-500" :
                            "from-indigo-400 to-purple-500";

                  return (
                    <div
                      key={comp.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${comp.isUser
                        ? "bg-emerald-500/5 dark:bg-emerald-500/8"
                        : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                        }`}
                    >
                      {/* Rank badge */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 ${rs ? `bg-gradient-to-br ${rs.bg} shadow-sm` : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        }`}>
                        {rs ? rs.label : <span className="text-[10px]">{rank}</span>}
                      </div>

                      {/* Avatar + status dot */}
                      <div className="relative shrink-0">
                        <img
                          src={comp.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                          alt={comp.name}
                          className={`w-8 h-8 rounded-xl object-cover bg-white dark:bg-slate-900 border-2 ${comp.isUser
                            ? "border-emerald-400 ring-2 ring-emerald-400/20"
                            : "border-slate-200 dark:border-slate-700"
                            }`}
                        />
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${comp.status === "studying" ? "bg-purple-500" :
                          comp.status === "online" ? "bg-emerald-400" : "bg-slate-400"
                          }`} />
                      </div>

                      {/* Name + activity + bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                            {(comp.name || "Scholar").replace(" (You)", "")}
                          </span>
                          {comp.isUser && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              YOU
                            </span>
                          )}
                          {comp.status === "studying" && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-0.5">
                              <span className="h-1 w-1 rounded-full bg-purple-500 animate-pulse inline-block" />
                              Live
                            </span>
                          )}
                        </div>
                        {comp.status === "studying" && comp.activity && (
                          <p className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold truncate mb-1">
                            📚 {comp.activity}
                          </p>
                        )}
                        {/* Progress bar */}
                        <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Minutes */}
                      <div className="text-right shrink-0">
                        <div className="font-black text-sm text-slate-700 dark:text-slate-200 font-mono leading-none">
                          {displayMins}
                        </div>
                        <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                          min
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer CTA */}
            <div className="border-t border-slate-100 dark:border-slate-800/50 px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                {competitors.filter(c => c.status === "studying").length} studying now
              </span>
              <Link to="/pomodoro" className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5 hover:underline">
                Full leaderboard <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
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



    </motion.div>
  );
};

export default DashboardPage;
