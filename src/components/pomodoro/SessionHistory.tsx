import React from "react";
import { Clock, Trash2, PlayCircle, StopCircle } from "lucide-react";

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
  return (
    <div className="glass-card p-4 sm:p-5 rounded-3xl border border-indigo-500/10 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 animate-pulse shrink-0" />
          <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Session History
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
          {studySessions.length} Logged
        </span>
      </div>

      {/* Empty state */}
      {studySessions.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Clock className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">
            No sessions yet. Start studying to log your first session!
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
};
