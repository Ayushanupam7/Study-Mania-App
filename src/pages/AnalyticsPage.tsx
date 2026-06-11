// src/pages/AnalyticsPage.tsx
import React from "react";
import { useStore } from "../store/store";
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
  Cell
} from "recharts";
import { 
  BarChart2, 
  CheckCircle, 
  Clock, 
  Flame, 
  TrendingUp,
  Sparkles
} from "lucide-react";

const AnalyticsPage: React.FC = () => {
  const todos = useStore(state => state.todos);
  const habits = useStore(state => state.habits);
  const sessionCount = useStore(state => state.sessionCount);
  const todayMinutes = useStore(state => state.todayMinutes);

  // Todo calculations
  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.completed).length;
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  // Study hours mock trend for the week (with today's live minutes included)
  const studyData = [
    { name: "Mon", minutes: 30 },
    { name: "Tue", minutes: 45 },
    { name: "Wed", minutes: 60 },
    { name: "Thu", minutes: 40 },
    { name: "Fri", minutes: 90 },
    { name: "Sat", minutes: 120 },
    { name: "Sun", minutes: todayMinutes }, // bind to store minutes
  ];

  // Habit completion counts
  const habitChartData = habits.map(h => {
    const totalCompletions = Object.values(h.completions).filter(Boolean).length;
    return {
      name: h.title.length > 10 ? h.title.slice(0, 10) + "..." : h.title,
      completions: totalCompletions + h.streak // add streak as simulated past completions
    };
  });

  const COLORS = ["#0ea5e9", "#a78bfa", "#f59e0b", "#10b981", "#ec4899"];

  return (
    <div className="space-y-8">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md pt-6 pb-4 md:pt-8 lg:pt-10 z-20 -mx-4 px-4 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10 border-b border-slate-200/30 dark:border-slate-800/30">
        <h1 className="text-3xl font-extrabold flex items-center gap-2 tracking-tight">
          <BarChart2 className="text-sky-500 h-8 w-8" />
          <span>Productivity Insights</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          A visual overview of your focus, work execution, and habits development.
        </p>
      </div>

      {/* Mini Stat row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 rounded-3xl flex items-center gap-4 border border-sky-500/10">
          <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-500">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black">{completionRate}%</div>
            <div className="text-xs text-gray-500">Task Completion Rate</div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-3xl flex items-center gap-4 border border-emerald-500/10">
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black">{todayMinutes} mins</div>
            <div className="text-xs text-gray-500">Focus Minutes Today</div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-3xl flex items-center gap-4 border border-orange-500/10">
          <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-500">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black">{sessionCount}</div>
            <div className="text-xs text-gray-500">Focus Cycles Finished</div>
          </div>
        </div>
      </div>

      {/* Chart Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Study Trend Area Chart */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-sky-500" />
              <span>Weekly Study Minutes</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-gray-400">Live Sync</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={studyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: "rgba(15, 23, 42, 0.9)", 
                    border: "none", 
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px"
                  }} 
                />
                <Area type="monotone" dataKey="minutes" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorMinutes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Habits Completion Bar Chart */}
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
              <span>Habits Frequency Tracker</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-gray-400">All-time</span>
          </div>
          <div className="h-72">
            {habitChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                No habits logged. Complete daily habits to view trends!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={habitChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ 
                      background: "rgba(15, 23, 42, 0.9)", 
                      border: "none", 
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px"
                    }}
                  />
                  <Bar dataKey="completions" radius={[8, 8, 0, 0]} maxBarSize={45}>
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
    </div>
  );
};

export default AnalyticsPage;
