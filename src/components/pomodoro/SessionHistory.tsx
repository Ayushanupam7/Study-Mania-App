import React from "react";
import { Clock, Trash2 } from "lucide-react";

export interface Session {
  id: string;
  sessionNumber?: number;
  sessionType: "pomodoro" | "stopwatch";
  durationMinutes: number;
  timestamp: number;
  totalStudyTime?: number;
}

interface SessionHistoryProps {
  studySessions: Session[];
  formatSessionDate: (epochMs: number) => string;
  formatStudyTime: (mins: number) => string;
  onDeleteSession: (session: Session) => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  studySessions,
  formatSessionDate,
  formatStudyTime,
  onDeleteSession
}) => {
  return (
    <div className="glass-card p-5 rounded-3xl border border-indigo-500/10 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-500 animate-pulse" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Focus Sessions History
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500">
          {studySessions.length} Logged
        </span>
      </div>

      {studySessions.length === 0 ? (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
          No focus sessions recorded yet. Start studying to log your first session!
        </div>
      ) : (
        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-850">
          {studySessions.map((session, idx) => {
            const displayNum = session.sessionNumber ?? (studySessions.length - idx);
            const isPomodoro = session.sessionType === "pomodoro";
            const duration = session.durationMinutes;

            return (
              <div
                key={session.id}
                className="p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900/50 flex items-center justify-between gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl ${isPomodoro ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"} shrink-0`}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-white truncate">
                      Session #{displayNum}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                      {formatSessionDate(session.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-3">
                  {session.totalStudyTime !== undefined && (
                    <div className="text-left">
                      <div className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total Time</div>
                      <div className="text-[10px] font-black text-slate-700 dark:text-slate-350">
                        {formatStudyTime(session.totalStudyTime)}
                      </div>
                    </div>
                  )}
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${isPomodoro ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"}`}>
                    {duration} min
                  </span>
                  <button
                    onClick={() => onDeleteSession(session)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shrink-0"
                    title="Delete Session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
