import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../firebase";
import { doc, setDoc, addDoc, collection, arrayUnion } from "firebase/firestore";
import {
  Trophy,
  Award,
  Activity,
  Globe,
  Users,
  Settings,
  Clock,
  Flame
} from "lucide-react";

export interface Competitor {
  id: string;
  name: string;
  avatar: string;
  seconds: number;
  totalStudyTime: number;
  status: "online" | "offline" | "studying";
  isUser: boolean;
  color: string;
  activity: string;
  comment: string;
}

export interface Quest {
  id: string;
  title: string;
  desc: string;
  xp: string;
  completed: boolean;
  progress: string;
}

export interface FeedEvent {
  id: string | number;
  text: string;
  time: string;
}

interface ArenaHubProps {
  rightTab: "duel" | "quests" | "feed";
  setRightTab: (tab: "duel" | "quests" | "feed") => void;
  arenaFilter: "worldwide" | "friends";
  setArenaFilter: (filter: "worldwide" | "friends") => void;
  arenaSort: "today" | "allTime";
  setArenaSort: (sort: "today" | "allTime") => void;
  filteredCompetitors: Competitor[];
  dbCompetitors: any[];
  userUid: string;
  user: { name: string; avatar: string };
  dailyGoalHours: number;
  dailyResetHour: number;
  arenaComment: string;
  setArenaComment: (comment: string) => void;
  showStandingsSettings: boolean;
  setShowStandingsSettings: (show: boolean) => void;
  cheeredFriends: Record<string, boolean>;
  setCheeredFriends: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  quests: Quest[];
  isRunning: boolean;
  todayMinutes: number;
  sessionCount: number;
  feedEvents: FeedEvent[];
  showToast: (message: string, type?: "success" | "info") => void;
  updateSettings: (settings: { dailyResetHour: number; dailyGoalHours: number }) => void;
  customResetHour: number;
  setCustomResetHour: (hour: number) => void;
  customGoalHours: number | string;
  setCustomGoalHours: (hours: number | string) => void;
}

export const ArenaHub: React.FC<ArenaHubProps> = ({
  rightTab,
  setRightTab,
  arenaFilter,
  setArenaFilter,
  arenaSort,
  setArenaSort,
  filteredCompetitors,
  dbCompetitors,
  userUid,
  user,
  dailyGoalHours,
  dailyResetHour,
  showStandingsSettings,
  setShowStandingsSettings,
  cheeredFriends,
  setCheeredFriends,
  quests,
  feedEvents,
  showToast,
  updateSettings,
  customResetHour,
  setCustomResetHour,
  customGoalHours,
  setCustomGoalHours
}) => {
  const activeStudyingCount = filteredCompetitors.filter(c => c.status === "studying").length;
  const myRankIndex = filteredCompetitors.findIndex(c => c.isUser || c.id === userUid);
  const myCompetitor = myRankIndex !== -1 ? filteredCompetitors[myRankIndex] : null;
  const competitorAhead = myRankIndex > 0 ? filteredCompetitors[myRankIndex - 1] : null;
  const diffSeconds = competitorAhead ? competitorAhead.seconds - (myCompetitor?.seconds || 0) : 0;
  const diffMins = Math.ceil(diffSeconds / 60);

  const formatResetHour = (hour: number) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  return (
    <div className="glass-card rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col h-[900px]">
      {/* Tabs Header */}
      <div className="flex bg-slate-100 dark:bg-slate-950 border-b border-slate-200/50 dark:border-slate-800/50 p-1 gap-1 relative z-0">
        {(["duel", "quests", "feed"] as const).map(tab => {
          const isActive = rightTab === tab;
          const Icon = tab === "duel" ? Trophy : tab === "quests" ? Award : Activity;
          const label = tab === "duel" ? "Focus Duel" : tab === "quests" ? "Quests" : "Live Feed";

          return (
            <button
              key={tab}
              onClick={() => setRightTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-colors relative cursor-pointer ${isActive ? "text-indigo-600 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
                }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-white dark:bg-slate-800 shadow-sm border border-slate-200/20 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`h-3.5 w-3.5 transition-transform ${isActive ? "scale-110 text-indigo-500" : ""}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden space-y-4">
        {rightTab === "duel" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3.5">
            {/* Header Title & Scope Filter Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-2.5 shrink-0">
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 animate-none">
                  <Trophy className="h-4 w-4 text-amber-500 animate-pulse" />
                  <span>Study Arena Standings</span>
                  {activeStudyingCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[8px] font-black border border-purple-500/20 uppercase tracking-widest animate-pulse shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping" />
                      <span>{activeStudyingCount} In Arena</span>
                    </span>
                  )}
                  <button
                    onClick={() => setShowStandingsSettings(!showStandingsSettings)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer flex items-center justify-center border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/30"
                    title="Standings Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </h4>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {arenaSort === "allTime"
                    ? "All-time accumulated focus hours."
                    : `Resets daily at ${formatResetHour(dailyResetHour)}. Goal: ${dailyGoalHours}h.`}
                </p>
              </div>

              {/* Scope Filter (Worldwide vs Friends) */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 relative z-0 shrink-0 self-start sm:self-center">
                {(["worldwide", "friends"] as const).map(filter => {
                  const isActive = arenaFilter === filter;
                  const Icon = filter === "worldwide" ? Globe : Users;
                  const label = filter === "worldwide" ? "Worldwide" : "Friends";
                  return (
                    <button
                      key={filter}
                      onClick={() => setArenaFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-colors relative cursor-pointer flex items-center gap-1 ${isActive ? "text-white font-extrabold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                        }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="scopeFilterIndicator"
                          className="absolute inset-0 bg-emerald-500 rounded-lg shadow-sm shadow-emerald-500/10 -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className="h-3 w-3 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Sort Control Row (Today vs All-Time) */}
            <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/10 p-2 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shrink-0">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1.5">
                Leaderboard Period
              </span>

              {/* Time Sort (Today vs All-Time) */}
              <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 relative z-0">
                {(["today", "allTime"] as const).map(sort => {
                  const isActive = arenaSort === sort;
                  const Icon = sort === "today" ? Clock : Trophy;
                  const label = sort === "today" ? "Today" : "All-Time";
                  return (
                    <button
                      key={sort}
                      onClick={() => setArenaSort(sort)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-colors relative cursor-pointer flex items-center gap-1 ${isActive ? "text-white font-extrabold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                        }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="timeFilterIndicator"
                          className="absolute inset-0 bg-indigo-500 rounded-lg shadow-sm shadow-indigo-500/10 -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className="h-3 w-3 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Collapsible Standings Settings Panel */}
            <AnimatePresence>
              {showStandingsSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4.5 space-y-4 shadow-inner"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Reset Time Select */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        Daily Reset Time
                      </label>
                      <select
                        value={customResetHour}
                        onChange={e => setCustomResetHour(parseInt(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-semibold text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>
                            {formatResetHour(h)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Daily Focus Goal */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        Daily Focus Goal (Hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={customGoalHours}
                        onChange={e => setCustomGoalHours(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-semibold text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => {
                        setCustomResetHour(dailyResetHour);
                        setCustomGoalHours(dailyGoalHours);
                        setShowStandingsSettings(false);
                      }}
                      className="px-4 py-2 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const parsedGoal = parseInt(String(customGoalHours));
                        const validGoal = isNaN(parsedGoal) ? 8 : Math.max(1, Math.min(24, parsedGoal));
                        updateSettings({
                          dailyResetHour: customResetHour,
                          dailyGoalHours: validGoal
                        });
                        setCustomGoalHours(validGoal);
                        setShowStandingsSettings(false);
                        showToast("Standings configuration saved!");
                      }}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10 cursor-pointer transition-all active:scale-95"
                    >
                      Save Settings
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rank Summary Card */}
            {filteredCompetitors.length > 0 && myRankIndex !== -1 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-sm ${myRankIndex === 0
                  ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 dark:from-amber-900/20 dark:to-yellow-900/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
                  : "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/20 dark:to-teal-900/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${myRankIndex === 0 ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"}`}>
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <span className="font-black block text-[11px] uppercase tracking-wider leading-none">
                      {myRankIndex === 0 ? "🏆 Champion Position" : `⚡ Rank #${myRankIndex + 1} of ${filteredCompetitors.length}`}
                    </span>
                    <span className="text-[10px] opacity-90 block mt-1 truncate font-semibold">
                      {myRankIndex === 0
                        ? "You are leading the arena! Keep defending your crown!"
                        : competitorAhead
                          ? `Only ${diffMins}m behind ${(competitorAhead.name || "Scholar").replace(" (You)", "")} to overtake!`
                          : "Start focusing to rise in the standings!"}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono font-black text-xs">
                  {(() => {
                    const totalMins = arenaSort === "allTime"
                      ? Math.floor((myCompetitor?.totalStudyTime || 0) * 60)
                      : Math.floor((myCompetitor?.seconds || 0) / 60);
                    const h = Math.floor(totalMins / 60);
                    const m = totalMins % 60;
                    return `${h}h${String(m).padStart(2, "0")}m`;
                  })()}
                </div>
              </motion.div>
            )}

            {filteredCompetitors.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
                No study partners active under this filter.
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="flex items-end justify-center gap-1.5 sm:gap-3 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-4 bg-slate-50/30 dark:bg-slate-900/10 p-2.5 sm:p-4 rounded-3xl shrink-0">
                  {/* Rank 2 (Left Pedestal) */}
                  <div className="w-1/3 min-w-0 flex flex-col items-center justify-end h-[135px] sm:h-[160px]">
                    {filteredCompetitors[1] ? (
                      <motion.div
                        whileHover={{ y: -4 }}
                        className="w-full flex flex-col items-center cursor-pointer"
                      >
                        <div className="flex flex-col items-center bg-white dark:bg-slate-900/40 rounded-t-2xl p-1.5 sm:p-2.5 border border-b-0 border-slate-200/60 dark:border-slate-800/60 shadow-sm relative pt-4 h-[90px] sm:h-[110px] justify-between w-full z-10">
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                            {/* Avatar with status */}
                            <div className="relative">
                              <img
                                src={filteredCompetitors[1].avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                                alt={filteredCompetitors[1].name || "Scholar"}
                                className={`w-7.5 h-7.5 sm:w-10 sm:h-10 rounded-xl p-0.5 border bg-white dark:bg-slate-900 object-cover border-slate-300 dark:border-slate-600 shadow-sm ${filteredCompetitors[1].isUser ? "ring-2 ring-emerald-500/30" : "ring-2 ring-slate-400/25"
                                  }`}
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                                <span
                                  className={`relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 border border-white dark:border-slate-900 ${filteredCompetitors[1].status === "studying"
                                    ? "bg-purple-500"
                                    : filteredCompetitors[1].status === "online"
                                      ? "bg-emerald-500"
                                      : "bg-slate-400"
                                    }`}
                                ></span>
                              </span>
                            </div>
                          </div>
                          <div className="text-center w-full mt-4 space-y-0.5 min-w-0">
                            <div className="text-[8px] sm:text-[10px] font-black text-amber-750 dark:text-amber-500">2ND PLACE</div>
                            <div className="text-[10px] sm:text-[12px] font-black text-slate-900 dark:text-white w-full px-1 flex items-center justify-center gap-1 min-w-0">
                              <span className="truncate">{(filteredCompetitors[1].name || "Scholar").replace(" (You)", "")}</span>
                              {filteredCompetitors[1].isUser && (
                                <span className="px-1 py-0.2 rounded bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider scale-90 shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700 font-mono text-[8px] sm:text-[9px] font-black text-slate-605 dark:text-slate-400">
                            {(() => {
                              const totalMins = Math.floor(
                                (arenaSort === "allTime" ? Math.floor((filteredCompetitors[1].totalStudyTime || 0) * 60) : filteredCompetitors[1].seconds) / 60
                              );
                              const h = Math.floor(totalMins / 60);
                              const m = totalMins % 60;
                              return `${h}h${String(m).padStart(2, "0")}m`;
                            })()}
                          </div>
                        </div>
                        <div className="w-full h-8 sm:h-10 bg-gradient-to-b from-slate-200/50 to-slate-350/20 dark:from-slate-800/50 dark:to-slate-900/20 border border-slate-200/60 dark:border-slate-800/60 rounded-b-2xl flex items-center justify-center shadow-inner relative z-0">
                          <span className="text-sm sm:text-xl font-black text-slate-400 dark:text-slate-500 font-sans tracking-tight drop-shadow-[0_0_4px_rgba(148,163,184,0.3)]">
                            2
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full h-[125px] sm:h-[150px] bg-slate-50/20 dark:bg-slate-900/5 rounded-3xl border border-dashed border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center gap-1 text-[10px] text-slate-400/60 dark:text-slate-600 italic">
                        <span>Empty Podium</span>
                      </div>
                    )}
                  </div>

                  {/* Rank 1 (Center Pedestal - Elevated) */}
                  <div className="w-1/3 min-w-0 flex flex-col items-center justify-end h-[150px] sm:h-[181px]">
                    {filteredCompetitors[0] ? (
                      <motion.div
                        whileHover={{ y: -4 }}
                        className="w-full flex flex-col items-center cursor-pointer relative -top-1"
                      >
                        <div className="mt-4 flex flex-col items-center bg-gradient-to-b from-amber-50/80 to-white dark:from-amber-900/10 dark:to-slate-900/40 rounded-t-2xl p-1.5 sm:p-2.5 border border-b-0 border-amber-200/60 dark:border-amber-900/40 shadow-md shadow-amber-500/5 relative pt-5 h-[100px] sm:h-[125px] justify-between z-20 w-full">
                          <div className="absolute -top-4.5 sm:-top-6 left-1/2 -translate-x-1/2">
                            {/* Avatar with status and Crown */}
                            <div className="relative">
                              <motion.div
                                animate={{ y: [0, -2, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-3.5 sm:-top-4.5 left-1/2 -translate-x-1/2 text-[10px] sm:text-base drop-shadow-md select-none z-30"
                              >
                                👑
                              </motion.div>
                              <div className="relative">
                                <img
                                  src={filteredCompetitors[0].avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                                  alt={filteredCompetitors[0].name || "Scholar"}
                                  className={`w-9 h-9 sm:w-12 sm:h-12 rounded-2xl p-0.5 border-2 bg-white dark:bg-slate-950 object-cover border-amber-400 dark:border-amber-500 shadow-md ${filteredCompetitors[0].isUser ? "ring-2 ring-emerald-500/35" : ""
                                    }`}
                                />
                                {/* Champion Glowing Ring */}
                                <span className="absolute inset-0 rounded-2xl border border-amber-400/50 dark:border-amber-500/50 animate-ping opacity-30 pointer-events-none" />
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 flex h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 z-10">
                                <span
                                  className={`relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 border border-white dark:border-slate-900 ${filteredCompetitors[0].status === "studying"
                                    ? "bg-purple-500"
                                    : filteredCompetitors[0].status === "online"
                                      ? "bg-emerald-500"
                                      : "bg-slate-400"
                                    }`}
                                ></span>
                              </span>
                            </div>
                          </div>
                          <div className="text-center w-full mt-4 space-y-0.5 min-w-0">
                            <div className="text-[8px] sm:text-[10px] font-black text-amber-600 dark:text-amber-400">CHAMPION</div>
                            <div className="text-[10px] sm:text-[12px] font-black text-slate-900 dark:text-white w-full px-1 flex items-center justify-center gap-1 min-w-0">
                              <span className="truncate">{(filteredCompetitors[0].name || "Scholar").replace(" (You)", "")}</span>
                              {filteredCompetitors[0].isUser && (
                                <span className="px-1 py-0.2 rounded bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider scale-90 shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="px-1.5 sm:px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-400/30 font-mono text-[8px] sm:text-[10px] font-black text-amber-700 dark:text-amber-450 shadow-sm">
                            {(() => {
                              const totalMins = Math.floor(
                                (arenaSort === "allTime" ? Math.floor((filteredCompetitors[0].totalStudyTime || 0) * 60) : filteredCompetitors[0].seconds) / 60
                              );
                              const h = Math.floor(totalMins / 60);
                              const m = totalMins % 60;
                              return `${h}h${String(m).padStart(2, "0")}m`;
                            })()}
                          </div>
                        </div>
                        <div className="w-full h-10 sm:h-14 bg-gradient-to-b from-amber-200/30 to-amber-300/10 dark:from-amber-900/30 dark:to-amber-900/10 border border-amber-200/60 dark:border-amber-900/40 rounded-b-2xl flex items-center justify-center shadow-lg shadow-amber-500/5 relative z-10">
                          <span className="text-sm sm:text-2xl font-black text-amber-500 dark:text-amber-400 font-sans tracking-tight drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]">
                            1
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full h-[150px] sm:h-[181px] bg-slate-50/20 dark:bg-slate-900/5 rounded-3xl border border-dashed border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center gap-1 text-[10px] text-slate-400/60 dark:text-slate-600 italic">
                        <span>Empty Podium</span>
                      </div>
                    )}
                  </div>

                  {/* Rank 3 (Right Pedestal) */}
                  <div className="w-1/3 min-w-0 flex flex-col items-center justify-end h-[110px] sm:h-[128px]">
                    {filteredCompetitors[2] ? (
                      <motion.div
                        whileHover={{ y: -4 }}
                        className="w-full flex flex-col items-center cursor-pointer"
                      >
                        <div className="flex flex-col items-center bg-white dark:bg-slate-900/40 rounded-t-2xl p-1.5 sm:p-2.5 border border-b-0 border-slate-200/60 dark:border-slate-800/60 shadow-sm relative pt-4 h-[80px] sm:h-[100px] justify-between w-full z-10">
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                            {/* Avatar with status */}
                            <div className="relative">
                              <img
                                src={filteredCompetitors[2].avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                                alt={filteredCompetitors[2].name || "Scholar"}
                                className={`w-6.5 h-6.5 sm:w-9 sm:h-9 rounded-xl p-0.5 border bg-white dark:bg-slate-900 object-cover border-amber-700/50 dark:border-amber-700 shadow-sm ${filteredCompetitors[2].isUser ? "ring-2 ring-emerald-500/30" : "ring-2 ring-amber-600/20"
                                  }`}
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                                <span
                                  className={`relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 border border-white dark:border-slate-900 ${filteredCompetitors[2].status === "studying"
                                    ? "bg-purple-500"
                                    : filteredCompetitors[2].status === "online"
                                      ? "bg-emerald-500"
                                      : "bg-slate-400"
                                    }`}
                                ></span>
                              </span>
                            </div>
                          </div>
                          <div className="text-center w-full mt-4 space-y-0.5 min-w-0">
                            <div className="text-[8px] sm:text-[10px] font-black text-amber-750 dark:text-amber-500">3RD PLACE</div>
                            <div className="text-[9px] sm:text-[11px] font-extrabold text-slate-800 dark:text-white w-full px-1 flex items-center justify-center gap-1 min-w-0">
                              <span className="truncate">{(filteredCompetitors[2].name || "Scholar").replace(" (You)", "")}</span>
                              {filteredCompetitors[2].isUser && (
                                <span className="px-1 py-0.2 rounded bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[3px] font-black uppercase tracking-wider scale-90 shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700 font-mono text-[8px] sm:text-[9px] font-black text-slate-605 dark:text-slate-400">
                            {(() => {
                              const totalMins = Math.floor(
                                (arenaSort === "allTime" ? Math.floor((filteredCompetitors[2].totalStudyTime || 0) * 60) : filteredCompetitors[2].seconds) / 60
                              );
                              const h = Math.floor(totalMins / 60);
                              const m = totalMins % 60;
                              return `${h}h${String(m).padStart(2, "0")}m`;
                            })()}
                          </div>
                        </div>
                        <div className="w-full h-6 sm:h-7 bg-gradient-to-b from-orange-200/30 to-orange-300/15 dark:from-orange-900/30 dark:to-orange-950/15 border border-slate-200/60 dark:border-slate-800/60 rounded-b-2xl flex items-center justify-center shadow-inner relative z-0">
                          <span className="text-[10px] sm:text-lg font-black text-orange-900 dark:text-orange-100 font-sans tracking-tight drop-shadow-[0_0_4px_rgba(249,115,22,0.3)]">
                            3
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full h-[110px] sm:h-[128px] bg-slate-50/20 dark:bg-slate-900/5 rounded-3xl border border-dashed border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center gap-1 text-[10px] text-slate-400/60 dark:text-slate-600 italic">
                        <span>Empty Podium</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Standings List Header */}
                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 pt-2">
                  <span>Standings Detail</span>
                  <span>{filteredCompetitors.length} total</span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                  {filteredCompetitors.map((comp, idx) => {
                    const rank = idx + 1;
                    const displaySeconds = arenaSort === "allTime" ? Math.floor((comp.totalStudyTime || 0) * 60) : comp.seconds;
                    const maxSeconds =
                      arenaSort === "today"
                        ? dailyGoalHours * 3600
                        : Math.max(...filteredCompetitors.map(c => (arenaSort === "allTime" ? Math.floor((c.totalStudyTime || 0) * 60) : c.seconds)), 3600);
                    const percent = Math.min(100, Math.floor((displaySeconds / maxSeconds) * 100));
                    const cheered = !!cheeredFriends[comp.id];

                    const hours = Math.floor(displaySeconds / 3600);
                    const minutes = Math.floor((displaySeconds % 3600) / 60);

                    return (
                      <motion.div
                        layoutId={`competitor-${comp.id}`}
                        key={comp.id}
                        className={`p-3 rounded-2xl border transition-all duration-305 space-y-2 relative overflow-hidden ${comp.isUser
                          ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/10 border-l-4 border-l-emerald-500"
                          : "bg-white/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-350 dark:hover:border-slate-700/80 hover:shadow-sm"
                          }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Rank Badge */}
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 border ${rank === 1
                                ? "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-white shadow-md shadow-amber-500/20"
                                : rank === 2
                                  ? "bg-gradient-to-br from-slate-300 to-slate-500 border-slate-200 text-white shadow-md shadow-slate-500/15"
                                  : rank === 3
                                    ? "bg-gradient-to-br from-orange-450 to-orange-600 border-orange-400 text-white shadow-md shadow-orange-500/15"
                                    : "bg-slate-100 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-800/50 text-slate-500 dark:text-slate-400"
                                }`}
                            >
                              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                            </span>

                            {/* Competitor Avatar */}
                            <div className="relative shrink-0">
                              <img
                                src={comp.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                                alt={comp.name || "Scholar"}
                                className={`w-7.5 h-7.5 rounded-xl p-0.5 border bg-white dark:bg-slate-950 shrink-0 object-cover ${comp.isUser ? "border-emerald-500/60 ring-2 ring-emerald-500/15 shadow-sm" : "border-slate-200 dark:border-slate-800"
                                  }`}
                              />
                              {comp.status === "studying" && (
                                <>
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 z-10">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500 border border-white dark:border-slate-900"></span>
                                  </span>
                                  <span className="absolute inset-0 rounded-xl border border-purple-400 animate-pulse opacity-40 pointer-events-none" />
                                </>
                              )}
                              {comp.status === "online" && (
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-slate-900"></span>
                                </span>
                              )}
                              {comp.status === "offline" && (
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400 border border-white dark:border-slate-900"></span>
                                </span>
                              )}
                            </div>

                            {/* Competitor Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`truncate text-xs ${comp.isUser ? "font-extrabold text-slate-900 dark:text-white" : "font-bold text-slate-700 dark:text-slate-300"}`}>
                                  {(comp.name || "Scholar").replace(" (You)", "")}
                                </span>
                                {comp.isUser && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider">
                                    You
                                  </span>
                                )}
                              </div>

                              {comp.status === "studying" && (
                                <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 block truncate w-full max-w-[180px] sm:max-w-[240px] mt-0.5">
                                  Focusing: {comp.comment && (comp.activity === "General Study" || !comp.activity) ? comp.comment : (comp.activity || "General Study")}
                                </span>
                              )}
                              {comp.comment && !(comp.status === "studying" && (comp.activity === "General Study" || !comp.activity)) && (
                                <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[180px] sm:max-w-[240px] italic">
                                  <span className="opacity-60 select-none">“</span>
                                  <span>{comp.comment}</span>
                                  <span className="opacity-60 select-none">”</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status Times and Cheer Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div
                              className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border shadow-sm transition-all duration-300 text-[9px] sm:text-[10px] font-black tracking-tight flex items-center gap-1 ${comp.status === "studying"
                                ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400 shadow-purple-500/5 animate-pulse"
                                : comp.status === "online"
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/5"
                                  : "bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-800/30 text-slate-400 dark:text-slate-500 opacity-65"
                                }`}
                            >
                              {comp.status === "studying" && <Flame className="h-3 w-3 text-purple-500 animate-bounce" />}
                              <span>
                                {hours}h{String(minutes).padStart(2, "0")}m
                              </span>
                            </div>
                            {!comp.isUser && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  setCheeredFriends(prev => ({ ...prev, [comp.id]: true }));
                                  showToast(`Sent motivating spark to ${comp.name}! ⚡`);
                                  setTimeout(() => {
                                    setCheeredFriends(prev => ({ ...prev, [comp.id]: false }));
                                  }, 5000);

                                  addDoc(collection(db, "arena_feed"), {
                                    text: `${user.name} sent a motivating spark to ${comp.name}! ⚡`,
                                    timestamp: Date.now()
                                  }).catch(console.error);

                                  if (comp.id.startsWith("sim-")) {
                                    // Simulated competitor cheers back after a random delay (3 to 8 seconds)
                                    const delay = 3000 + Math.random() * 5000;
                                    setTimeout(() => {
                                      if (!userUid) return;
                                      const mySessionRef = doc(db, "arena_sessions", userUid);
                                      const cheerId = Math.random().toString(36).substring(2, 9);
                                      setDoc(
                                        mySessionRef,
                                        {
                                          cheers: arrayUnion({
                                            id: cheerId,
                                            senderId: comp.id,
                                            senderName: comp.name,
                                            timestamp: Date.now()
                                          })
                                        },
                                        { merge: true }
                                      ).catch(console.error);

                                      // Post cheer-back event to the feed
                                      addDoc(collection(db, "arena_feed"), {
                                        text: `${comp.name} sent a motivating spark back to ${user.name}! ⚡`,
                                        timestamp: Date.now()
                                      }).catch(console.error);
                                    }, delay);
                                  } else if (dbCompetitors.some(c => c.id === comp.id)) {
                                    const friendSessionRef = doc(db, "arena_sessions", comp.id);
                                    const cheerId = Math.random().toString(36).substring(2, 9);
                                    setDoc(
                                      friendSessionRef,
                                      {
                                        cheers: arrayUnion({
                                          id: cheerId,
                                          senderId: userUid,
                                          senderName: user.name,
                                          timestamp: Date.now()
                                        })
                                      },
                                      { merge: true }
                                    ).catch(console.error);
                                  }
                                }}
                                disabled={cheered || comp.status === "offline"}
                                className={`p-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${cheered
                                  ? "bg-pink-100 border-pink-200 text-pink-600 dark:bg-pink-900/30 dark:border-pink-900/30 dark:text-pink-400 scale-95"
                                  : comp.status === "offline"
                                    ? "opacity-20 border-transparent text-slate-400 cursor-not-allowed"
                                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-pink-50 hover:text-pink-500 dark:hover:bg-pink-900/20 hover:border-pink-200/50 hover:scale-105 active:scale-95"
                                  }`}
                                title={`Cheer ${comp.name}`}
                              >
                                {cheered ? "❤️" : "⚡"}
                              </motion.button>
                            )}
                          </div>
                        </div>

                        {/* Progress Line */}
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200/20 dark:border-slate-800/50 relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            className={`h-full rounded-full bg-gradient-to-r relative overflow-hidden transition-all duration-1000 ${comp.isUser
                              ? "from-emerald-400 via-teal-500 to-cyan-500 shadow-sm shadow-emerald-500/10"
                              : comp.status === "studying"
                                ? "from-purple-400 to-indigo-500"
                                : "from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800"
                              }`}
                            style={{ transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
                          >
                            {/* Sweep animation for active study */}
                            {comp.status === "studying" && (
                              <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: "100%" }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none"
                              />
                            )}
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {rightTab === "quests" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 shrink-0">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">Daily Milestones</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Complete focus milestones to claim daily scholar XP.</p>
              </div>
            </div>

            {/* Milestone Progress Banner */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-slate-200/40 dark:border-slate-800/40 p-4 rounded-2xl space-y-2.5 shadow-sm shrink-0">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-[10px] text-slate-800 dark:text-white uppercase tracking-wider">Milestones Progress</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    {quests.filter(q => q.completed).length} of {quests.length} completed today
                  </p>
                </div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-500/10 dark:bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/10">
                  {Math.round((quests.filter(q => q.completed).length / quests.length) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((quests.filter(q => q.completed).length / quests.length) * 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-sm shadow-indigo-500/10"
                />
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {quests.map(quest => (
                <motion.div
                  key={quest.id}
                  whileHover={{ y: -1 }}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all shadow-sm ${quest.completed
                    ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80"
                    }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold text-sm truncate ${quest.completed ? "text-emerald-700 dark:text-emerald-400 line-through opacity-85" : "text-slate-800 dark:text-white"}`}>
                        {quest.title}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border shrink-0 ${quest.completed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                          }`}
                      >
                        {quest.xp}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-normal">{quest.desc}</p>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 border shadow-sm ${quest.completed ? "bg-emerald-500 border-emerald-500 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                  >
                    {quest.completed ? "✓ Claimed" : quest.progress}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {rightTab === "feed" && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-2 shrink-0">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">Live Activity Logs</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Real-time study updates from partners in the arena.</p>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {feedEvents.map(event => {
                  const text = event.text;
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
                    <motion.div
                      layout
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex justify-between items-start gap-3 text-[11px] p-3 rounded-2xl border ${borderTheme} shadow-sm`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-sm select-none shrink-0 mt-0.5">{IconEmoji}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 leading-normal">{event.text}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold shrink-0 mt-0.5 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{event.time}</span>
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
