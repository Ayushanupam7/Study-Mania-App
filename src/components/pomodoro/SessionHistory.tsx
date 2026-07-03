import React, { useState, useMemo } from "react";
import { Clock, Trash2, PlayCircle, StopCircle, List, Calendar } from "lucide-react";

export interface Session {
  id: string;
  sessionNumber?: number;
  sessionType: "pomodoro" | "stopwatch";
  durationMinutes: number;
  timestamp: number;
  totalStudyTime?: number;
  startTime?: number;
  endTime?: number;
}

interface SessionHistoryProps {
  studySessions: Session[];
  formatSessionDate?: (epochMs: number) => string;
  formatStudyTime: (mins: number) => string;
  onDeleteSession: (session: Session) => void;
}

const formatTime = (epochMs: number) => {
  if (!epochMs) return "—";
  const d = new Date(epochMs);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateFull = (epochMs: number) => {
  if (!epochMs) return "";
  const d = new Date(epochMs);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const isYesterday =
    d.getDate() === now.getDate() - 1 &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  studySessions,
  formatStudyTime,
  onDeleteSession,
}) => {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Group sessions by date for calendar view
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, Session[]> = {};
    studySessions.forEach(session => {
      const endEpoch = session.endTime ?? session.timestamp;
      const d = new Date(endEpoch);
      const dateKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [studySessions]);

  // Calculate total minutes for each date
  const dailyStats = useMemo(() => {
    const stats: Record<string, { count: number; totalMinutes: number }> = {};
    Object.entries(sessionsByDate).forEach(([date, sessions]) => {
      const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
      stats[date] = {
        count: sessions.length,
        totalMinutes
      };
    });
    return stats;
  }, [sessionsByDate]);

  return (
    <div className="glass-card p-4 sm:p-5 rounded-3xl border border-indigo-500/10 space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 animate-pulse shrink-0" />
          <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Session History
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
            {studySessions.length} Logged
          </span>
          {/* View Toggle */}
          <div className="flex gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "calendar"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Calendar View"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {studySessions.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Clock className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">
            No sessions yet. Start studying to log your first session!
          </p>
        </div>
      ) : viewMode === "list" ? (
        // LIST VIEW
        <div className="space-y-2.5 max-h-[340px] sm:max-h-[300px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {studySessions.map((session, idx) => {
            const displayNum = session.sessionNumber ?? studySessions.length - idx;
            const isPomodoro = session.sessionType === "pomodoro";
            const duration = session.durationMinutes;

            const endEpoch = session.endTime ?? session.timestamp;
            const startEpoch = session.startTime ?? endEpoch - duration * 60 * 1000;
            const dateLabel = formatDateFull(startEpoch);
            const startStr = formatTime(startEpoch);
            const endStr = formatTime(endEpoch);

            return (
              <div
                key={session.id}
                className="rounded-2xl bg-slate-50/60 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 overflow-hidden transition-all hover:border-slate-200 dark:hover:border-slate-700/60 hover:shadow-sm"
              >
                {/* Top row: session label + type badge + duration + delete */}
                <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
                  {/* Left: icon + name + type */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${isPomodoro
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-indigo-500/10 text-indigo-500"
                        }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-white leading-none">
                        {dateLabel}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 leading-none">
                          Session #{displayNum}
                        </span>
                        <span
                          className={`hidden xs:inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black leading-none ${isPomodoro
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                            }`}
                        >
                          {isPomodoro ? "🍅 Pomodoro" : "⏱ Stopwatch"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: duration pill + delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${isPomodoro
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        }`}
                    >
                      {duration}m
                    </span>
                    <button
                      onClick={() => onDeleteSession(session)}
                      className="p-1.5 rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                      title="Delete Session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom row: start → end times + total study time */}
                <div className="flex items-center justify-between gap-2 px-3 pb-2.5 flex-wrap">
                  {/* Time range */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <PlayCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                        Start
                      </span>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                        {startStr}
                      </span>
                    </div>

                    <span className="text-[9px] text-slate-300 dark:text-slate-700 font-bold">→</span>

                    <div className="flex items-center gap-1">
                      <StopCircle className="h-3 w-3 text-rose-500 shrink-0" />
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                        End
                      </span>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                        {endStr}
                      </span>
                    </div>
                  </div>

                  {/* Total study time cumulative */}
                  {session.totalStudyTime !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">
                        Total:
                      </span>
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                        {formatStudyTime(session.totalStudyTime)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // CALENDAR VIEW
        <div className="space-y-3 max-h-[340px] sm:max-h-[300px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {Object.entries(sessionsByDate)
            .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
            .map(([dateKey, sessions]) => {
              const [year, month, day] = dateKey.split("-");
              const dateObj = new Date(`${year}-${month}-${day}`);
              const stats = dailyStats[dateKey];
              const dateLabel = formatDateFull(dateObj.getTime());
              
              return (
                <div key={dateKey} className="rounded-2xl bg-slate-50/60 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 overflow-hidden">
                  {/* Date header */}
                  <div className="px-3 py-2.5 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200/30 dark:border-indigo-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-extrabold text-indigo-900 dark:text-indigo-100">
                          {dateLabel}
                        </p>
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
                          {dateKey}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                            {stats.count} {stats.count === 1 ? "Session" : "Sessions"}
                          </p>
                          <p className="text-xs font-extrabold text-indigo-900 dark:text-indigo-100">
                            {stats.totalMinutes}m
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sessions for this date */}
                  <div className="space-y-2 p-3">
                    {sessions.map((session) => {
                      const isPomodoro = session.sessionType === "pomodoro";
                      const duration = session.durationMinutes;
                      const endEpoch = session.endTime ?? session.timestamp;
                      const startEpoch = session.startTime ?? endEpoch - duration * 60 * 1000;
                      const startStr = formatTime(startEpoch);
                      const endStr = formatTime(endEpoch);

                      return (
                        <div
                          key={session.id}
                          className="rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-2.5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className={`p-1 rounded-md shrink-0 ${
                                isPomodoro
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-indigo-500/10 text-indigo-500"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black text-slate-700 dark:text-white">
                                {startStr} → {endStr}
                              </p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400">
                                {isPomodoro ? "🍅 Pomodoro" : "⏱️ Stopwatch"} • {duration}m
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => onDeleteSession(session)}
                            className="p-1 ml-2 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all shrink-0"
                            title="Delete Session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
