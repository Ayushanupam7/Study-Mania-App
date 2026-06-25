// src/pages/TodoPage.tsx
import React, { useState } from "react";
import { useStore } from "../store/store";
import type { Todo, StickyNote } from "../store/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Plus,
  Trash2,
  Search,
  Tag,
  CheckCircle2,
  Clock,
  Calendar,
  SlidersHorizontal,
  Check,
  StickyNote as StickyIcon,
  Pin,
  LayoutGrid,
  List
} from "lucide-react";

interface TodoInput {
  title: string;
  priority: "high" | "medium" | "low";
  category: string;
  startDate: string;
  dueDate: string;
}

const TodoPage: React.FC = () => {
  const todos = useStore(state => state.todos);
  const addTodo = useStore(state => state.addTodo);
  const updateTodo = useStore(state => state.updateTodo);
  const deleteTodo = useStore(state => state.deleteTodo);

  const stickyNotes = useStore(state => state.stickyNotes) || [];
  const addStickyNote = useStore(state => state.addStickyNote);
  const updateStickyNote = useStore(state => state.updateStickyNote);
  const deleteStickyNote = useStore(state => state.deleteStickyNote);

  const [input, setInput] = useState<TodoInput>({
    title: "",
    priority: "medium",
    category: "Academics",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0]
  });

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [statusTab, setStatusTab] = useState<"active" | "completed" | "all">("active");
  const [showInputDetails, setShowInputDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [stickyViewMode, setStickyViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("sticky_view_mode") as "grid" | "list") || "grid";
    }
    return "grid";
  });

  const handleSetViewMode = (mode: "grid" | "list") => {
    setStickyViewMode(mode);
    localStorage.setItem("sticky_view_mode", mode);
  };

  const categories = ["Academics", "Coding", "Health", "Personal", "Work"];

  // Helper to format dates cleanly
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch (e) {
      return dateStr;
    }
  };

  // Stats calculation (combining standard tasks and sticky notes)
  const activeTodosCount = todos.filter(t => !t.completed).length;
  const completedTodosCount = todos.filter(t => t.completed).length;

  const activeStickyCount = stickyNotes.filter(n => !n.completed).length;
  const completedStickyCount = stickyNotes.filter(n => n.completed).length;

  const activeCount = activeTodosCount + activeStickyCount;
  const completedCount = completedTodosCount + completedStickyCount;
  const totalCount = todos.length + stickyNotes.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter tasks due today (adjusted for local timezone)
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
  const todayTasks = todos.filter(todo => todo.dueDate === todayStr);

  // Filter sticky notes: only show those for today, daily, or specific date matching todayStr
  const filteredStickyNotes = stickyNotes.filter(note => {
    const type = note.targetDateType || "today";
    if (type === "daily") return true;
    if (type === "today") {
      return !note.targetDate || note.targetDate === todayStr;
    }
    if (type === "specific") {
      return note.targetDate === todayStr;
    }
    return true;
  });

  const nextDeadline = todos
    .filter(t => !t.completed && t.dueDate)
    .map(t => new Date(t.dueDate!))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const nextDeadlineString = nextDeadline
    ? nextDeadline.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "No deadlines";

  const handleAdd = () => {
    if (!input.title.trim()) return;
    const newTodo: Todo = {
      id: Date.now().toString(),
      title: input.title.trim(),
      completed: false,
      priority: input.priority,
      category: input.category,
      startDate: input.startDate,
      dueDate: input.dueDate
    };
    addTodo(newTodo);
    setInput(prev => ({
      ...prev,
      title: "",
      priority: "medium",
      category: "Academics",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: new Date().toISOString().split("T")[0]
    }));
    setShowInputDetails(false);
  };

  const handleAddSticky = () => {
    const colors: StickyNote["color"][] = ["yellow", "pink", "blue", "green", "purple"];
    const newNote: StickyNote = {
      id: Date.now().toString(),
      content: "",
      completed: false,
      color: colors[Math.floor(Math.random() * colors.length)],
      createdAt: new Date().toISOString(),
      targetDateType: "today",
      targetDate: todayStr
    };
    addStickyNote(newNote);
  };

  const toggleComplete = (id: string, currentStatus: boolean) => {
    updateTodo(id, { completed: !currentStatus });
  };

  const handleDelete = (id: string) => {
    deleteTodo(id);
  };

  // Filter logic
  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "All" || todo.category === filterCategory;
    const matchesPriority = filterPriority === "All" || todo.priority === filterPriority;

    let matchesStatus = true;
    if (statusTab === "active") matchesStatus = !todo.completed;
    if (statusTab === "completed") matchesStatus = todo.completed;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
      case "medium": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      default: return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Academics": return "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/20 dark:border-indigo-900/20";
      case "Coding": return "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200/20 dark:border-sky-900/20";
      case "Health": return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/20 dark:border-emerald-900/20";
      case "Work": return "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200/20 dark:border-purple-900/20";
      default: return "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800";
    }
  };

  const getStickyColorClasses = (color: StickyNote["color"], completed: boolean) => {
    if (completed) {
      return "bg-slate-100/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60";
    }
    switch (color) {
      case "pink":
        return "bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 border-rose-200/40 dark:border-rose-900/30";
      case "blue":
        return "bg-sky-50 dark:bg-sky-950/20 text-sky-900 dark:text-sky-100 border-sky-200/40 dark:border-sky-900/30";
      case "green":
        return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 border-emerald-200/40 dark:border-emerald-900/30";
      case "purple":
        return "bg-purple-50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-100 border-purple-200/40 dark:border-purple-900/30";
      default: // yellow
        return "bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-amber-200/40 dark:border-amber-900/30";
    }
  };

  const activeFiltersCount = (filterCategory !== "All" ? 1 : 0) + (filterPriority !== "All" ? 1 : 0);

  return (
    <div className="space-y-8">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md pt-6 pb-4 md:pt-8 lg:pt-10 z-20 -mx-4 px-4 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10 border-b border-slate-200/30 dark:border-slate-800/30">
        <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2 tracking-tight">
          <CheckSquare className="text-sky-500 h-7 w-7 sm:h-8 sm:w-8" />
          <span>Task Manager</span>
        </h1>
        <p className="hidden sm:block text-gray-500 dark:text-gray-400 text-sm mt-1">
          Stay organized, get things done, and earn +20 XP for every task completed.
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Tasks */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5 hover:shadow-lg hover:-translate-y-0.5 border-l-4 border-sky-400 dark:border-sky-500 transition-all duration-300">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Active Tasks</div>
            <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-200">{activeCount}</div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5 hover:shadow-lg hover:-translate-y-0.5 border-l-4 border-emerald-400 dark:border-emerald-500 transition-all duration-300">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Completed</div>
            <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-200">{completedCount}</div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="glass-card p-4 rounded-2xl flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5 border-l-4 border-indigo-400 dark:border-indigo-500 transition-all duration-300">
          <div className="flex items-center gap-3.5 w-full">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 shrink-0">
              <Clock className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Completion</div>
              <div className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-200">{completionRate}%</div>
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.8 }}
              className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
            />
          </div>
        </div>

        {/* Next Deadline */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5 hover:shadow-lg hover:-translate-y-0.5 border-l-4 border-amber-400 dark:border-amber-500 transition-all duration-300">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-550 dark:bg-amber-500/20 shrink-0">
            <Calendar className="h-5 w-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">Next Due</div>
            <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 truncate">{nextDeadlineString}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Todos and Sticky Notes side-by-side on desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
        {/* Left Side: Tasks (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Input Bar Card */}
          <div className="glass-card p-5 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Plus className="h-4.5 w-4.5 text-sky-500" />
                <span>Create New Task</span>
              </h2>

              <button
                onClick={() => setShowInputDetails(!showInputDetails)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${showInputDetails
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-500 shadow-sm shadow-sky-500/5"
                  : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>{showInputDetails ? "Hide Options" : "More Options"}</span>
                {(!showInputDetails && (input.priority !== "medium" || input.startDate !== new Date().toISOString().split("T")[0] || input.dueDate !== new Date().toISOString().split("T")[0])) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                )}
              </button>
            </div>

            <div className="space-y-4">
              {/* Primary Row: Title, Category, Add Button */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="What needs to be done?"
                    value={input.title}
                    onChange={e => setInput(prev => ({ ...prev, title: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleAdd()}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-medium text-sm text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex gap-3 shrink-0">
                  <select
                    value={input.category}
                    onChange={e => setInput(prev => ({ ...prev, category: e.target.value }))}
                    className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-semibold text-sm text-slate-700 dark:text-slate-355 cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleAdd}
                    className="px-5 py-3 gradient-primary hover:opacity-95 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center cursor-pointer"
                    title="Add Task"
                  >
                    <Plus className="h-5 w-5 mr-1" />
                    <span className="text-sm">Add</span>
                  </button>
                </div>
              </div>

              {/* Secondary Expandable Row: Priority, Start Date, Due Date */}
              <AnimatePresence initial={false}>
                {showInputDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Priority */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          <span>Priority Level</span>
                        </label>
                        <select
                          value={input.priority}
                          onChange={e => setInput(prev => ({ ...prev, priority: e.target.value as any }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-semibold text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <option value="high">🔴 High Priority</option>
                          <option value="medium">🟡 Medium Priority</option>
                          <option value="low">🟢 Low Priority</option>
                        </select>
                      </div>

                      {/* Start Date */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Start Date</span>
                        </label>
                        <input
                          type="date"
                          value={input.startDate}
                          onChange={e => setInput(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-semibold text-sm text-slate-700 dark:text-slate-350 cursor-pointer"
                        />
                      </div>

                      {/* Due Date */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Due Date</span>
                        </label>
                        <input
                          type="date"
                          value={input.dueDate}
                          onChange={e => setInput(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-semibold text-sm text-slate-700 dark:text-slate-355 cursor-pointer"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Filter and List Panel */}
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex bg-slate-200/50 dark:bg-slate-900/60 p-1 rounded-xl w-full lg:w-auto border border-slate-200/30 dark:border-slate-800/30">
                  <button
                    onClick={() => setStatusTab("active")}
                    className={`flex-1 lg:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusTab === "active" ? "bg-white dark:bg-slate-800 shadow text-sky-500 dark:text-white" : "text-gray-500"
                      }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setStatusTab("completed")}
                    className={`flex-1 lg:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusTab === "completed" ? "bg-white dark:bg-slate-800 shadow text-sky-500 dark:text-white" : "text-gray-500"
                      }`}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => setStatusTab("all")}
                    className={`flex-1 lg:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusTab === "all" ? "bg-white dark:bg-slate-800 shadow text-sky-500 dark:text-white" : "text-gray-500"
                      }`}
                  >
                    All
                  </button>
                </div>

                {/* Search and Filters Toggle */}
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 lg:flex-initial">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full lg:w-48 pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-medium text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Filters Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${showFilters
                      ? "bg-sky-500/10 border-sky-500/30 text-sky-500"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="flex items-center justify-center bg-sky-500 text-white text-[9px] font-black h-4.5 w-4.5 rounded-full shrink-0">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Dropdown Filters Expandable Panel */}
              <AnimatePresence initial={false}>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
                      {/* Category Filter */}
                      <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Category</span>
                        <select
                          value={filterCategory}
                          onChange={e => setFilterCategory(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/55 font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
                        >
                          <option value="All">All Categories</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      {/* Priority Filter */}
                      <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Priority</span>
                        <select
                          value={filterPriority}
                          onChange={e => setFilterPriority(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/55 font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
                        >
                          <option value="All">All Priorities</option>
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Task List */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredTodos.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass-card p-12 text-center text-gray-500 rounded-3xl"
                  >
                    No tasks match your selection. Start forging!
                  </motion.div>
                ) : (
                  filteredTodos.map(todo => {
                    const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <motion.div
                        layout
                        key={todo.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className={`glass-card p-4 rounded-2xl flex items-center justify-between border-l-4 transition-all duration-300 group ${todo.priority === "high"
                          ? "border-l-rose-500 hover:shadow-[0_4px_20px_rgba(244,63,94,0.08)]"
                          : todo.priority === "medium"
                            ? "border-l-amber-500 hover:shadow-[0_4px_20px_rgba(245,158,11,0.08)]"
                            : "border-l-emerald-500 hover:shadow-[0_4px_20px_rgba(16,185,129,0.08)]"
                          } hover:scale-[1.005] ${todo.completed ? "opacity-75" : ""}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Premium Checkbox */}
                          <button
                            onClick={() => toggleComplete(todo.id, todo.completed)}
                            className={`h-5.5 w-5.5 rounded-xl border flex items-center justify-center transition-all duration-300 shrink-0 cursor-pointer ${todo.completed
                              ? "bg-gradient-to-tr from-sky-400 to-blue-500 border-sky-500 text-white shadow-sm shadow-blue-500/20 scale-105"
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-500 dark:hover:border-sky-400"
                              }`}
                          >
                            {todo.completed ? (
                              <Check className="h-3.5 w-3.5 text-white" />
                            ) : (
                              <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 transition-all duration-300 group-hover:bg-sky-500 group-hover:scale-125" />
                            )}
                          </button>

                          {/* Content */}
                          <div className="min-w-0 flex-1 pr-2">
                            <p className={`font-bold text-sm truncate transition-all duration-300 ${todo.completed ? "line-through text-slate-400 dark:text-slate-500 font-medium" : "text-slate-800 dark:text-slate-200"
                              }`}>
                              {todo.title}
                            </p>

                            {/* Meta tags */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {/* Category Tag */}
                              <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md ${getCategoryColor(todo.category)}`}>
                                <Tag className="h-2.5 w-2.5" />
                                <span>{todo.category}</span>
                              </span>

                              {/* Due Date Tag */}
                              {todo.dueDate && (
                                <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${isOverdue
                                  ? "bg-rose-55 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/30 dark:border-rose-900/30 animate-pulse"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                                  }`}>
                                  <Clock className="h-2.5 w-2.5" />
                                  <span>
                                    {todo.startDate && todo.startDate !== todo.dueDate
                                      ? `${formatDateShort(todo.startDate)} - ${formatDateShort(todo.dueDate)}`
                                      : formatDate(todo.dueDate)}
                                    {isOverdue && " (Overdue)"}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions and priority */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Priority Badge */}
                          <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${getPriorityColor(todo.priority)}`}>
                            {todo.priority}
                          </span>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(todo.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/25 transition-all cursor-pointer hover:scale-105"
                            title="Delete task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Side: Today's Tasks & Today's Sticky Notes Board (4 cols) */}
        <div className="xl:col-span-4 flex flex-col space-y-6">
          {/* Small Card: Today's Task List */}
          <div className="glass-card p-5 rounded-3xl flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-sky-500" />
                <span>Today's Tasks</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                  {todayTasks.length + filteredStickyNotes.length}
                </span>
              </h2>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
              {todayTasks.length === 0 && filteredStickyNotes.length === 0 ? (
                <div className="text-center py-6 text-slate-450 dark:text-slate-500 text-xs font-semibold leading-normal">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1 opacity-70 animate-pulse" />
                  No tasks or sticky notes today.
                </div>
              ) : (
                <>
                  {/* Today's Tasks */}
                  {todayTasks.map(todo => (
                    <div
                      key={todo.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/30 transition-all hover:bg-slate-100/40 dark:hover:bg-slate-900/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => toggleComplete(todo.id, todo.completed)}
                          className={`h-4.5 w-4.5 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            todo.completed
                              ? "bg-sky-500 border-sky-500 text-white"
                              : "border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-500"
                          }`}
                        >
                          {todo.completed && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <span
                          className={`text-xs font-semibold truncate ${
                            todo.completed
                              ? "line-through text-slate-450 dark:text-slate-500"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {todo.title}
                        </span>
                      </div>

                      <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-full shrink-0 ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                    </div>
                  ))}

                  {/* Today's Sticky Notes */}
                  {filteredStickyNotes.map(note => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/30 transition-all hover:bg-slate-100/40 dark:hover:bg-slate-900/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => updateStickyNote(note.id, { completed: !note.completed })}
                          className={`h-4.5 w-4.5 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            note.completed
                              ? "bg-amber-500 border-amber-500 text-white"
                              : "border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-500"
                          }`}
                        >
                          {note.completed && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <span
                          className={`text-xs font-semibold truncate ${
                            note.completed
                              ? "line-through text-slate-450 dark:text-slate-500"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {note.content.trim() || <span className="italic opacity-60">Empty Sticky Note</span>}
                        </span>
                      </div>

                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
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

          {/* Today's Sticky Notes Board */}
          <div className="glass-card p-5 rounded-3xl flex-1 flex flex-col space-y-4 min-h-[400px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 xl:flex-col xl:items-start 2xl:flex-row 2xl:items-center">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <StickyIcon className="h-3.5 w-3.5 text-amber-500" />
                <span>To-do sticky</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                  {filteredStickyNotes.length}
                </span>
              </h2>

              <div className="flex items-center gap-2.5 w-full sm:w-auto xl:w-full 2xl:w-auto justify-between sm:justify-start xl:justify-between 2xl:justify-start">
                {/* View Mode Toggle */}
                {filteredStickyNotes.length > 0 && (
                  <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200/50 dark:border-slate-800/50">
                    <button
                      onClick={() => handleSetViewMode("grid")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        stickyViewMode === "grid"
                          ? "bg-white dark:bg-slate-800 text-amber-500 shadow-sm"
                          : "text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleSetViewMode("list")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        stickyViewMode === "list"
                          ? "bg-white dark:bg-slate-800 text-amber-500 shadow-sm"
                          : "text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                      title="List View"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleAddSticky}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 hover:opacity-90 text-white font-bold text-[10px] shadow-sm cursor-pointer shrink-0"
                  title="Add Sticky Note"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Note</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[600px] xl:max-h-none">
              {filteredStickyNotes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-450 dark:text-slate-500 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
                  <StickyIcon className="h-8 w-8 text-amber-400 animate-pulse" />
                      <div className="text-xs font-bold">No Sticky Notes</div>
                  <p className="text-[10px] leading-normal max-w-[180px]">
                    Create colorful sticky notes for today, daily, or specific dates.
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  <div className={stickyViewMode === "list" ? "flex flex-col gap-3.5" : "grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 gap-2 sm:gap-3.5"}>
                    {filteredStickyNotes.map(note => (
                      <motion.div
                        layout
                        key={note.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        className={`p-2.5 sm:p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 relative shadow-sm border w-full ${stickyViewMode === "list" ? "h-[140px]" : "h-[185px]"
                          } ${getStickyColorClasses(
                            note.color,
                            note.completed
                          )}`}
                      >
                        {/* Top: checkbox + delete */}
                        <div className="flex items-start justify-between gap-1.5 sm:gap-3 mb-1 sm:mb-2 shrink-0">
                          {/* Checkbox */}
                          <button
                            onClick={() => updateStickyNote(note.id, { completed: !note.completed })}
                            className={`h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${note.completed
                              ? "bg-slate-500 border-slate-500 text-white"
                              : "border-slate-300 dark:border-slate-700 bg-white/40 hover:border-slate-450"
                              }`}
                            title={note.completed ? "Mark incomplete" : "Mark complete"}
                          >
                            {note.completed && <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />}
                          </button>

                          {/* Pin & Delete Actions */}
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <button
                              onClick={() => updateStickyNote(note.id, { pinned: !note.pinned })}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${note.pinned
                                ? "text-sky-500 bg-sky-500/10 hover:bg-sky-500/20"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 hover:bg-white/40"
                                }`}
                              title={note.pinned ? "Unpin note" : "Pin note"}
                            >
                              <Pin className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${note.pinned ? "fill-sky-500" : ""}`} />
                            </button>

                            <button
                              onClick={() => deleteStickyNote(note.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-450 hover:bg-white/40 transition-colors cursor-pointer"
                              title="Delete sticky note"
                            >
                              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Mid: Content text-area */}
                        <div className="flex-1 w-full my-1 sm:my-1.5 overflow-hidden">
                          <textarea
                            value={note.content}
                            onChange={e => updateStickyNote(note.id, { content: e.target.value })}
                            placeholder="Write some notes..."
                            className={`w-full h-full bg-transparent resize-none border-none outline-none focus:ring-0 p-0 text-[10px] sm:text-xs font-semibold leading-normal custom-scrollbar ${note.completed
                              ? "line-through text-slate-455 dark:text-slate-500 font-medium"
                              : "text-slate-800 dark:text-slate-100"
                              }`}
                          />
                        </div>

                        {/* Bottom: Color switcher & Date Type Selector */}
                        <div className="flex items-center justify-between mt-2 sm:mt-3 shrink-0 gap-2 flex-wrap sm:flex-nowrap">
                          {/* Color dots */}
                          <div className="flex items-center gap-1">
                            {(["yellow", "pink", "blue", "green", "purple"] as const).map(c => (
                              <button
                                key={c}
                                onClick={() => updateStickyNote(note.id, { color: c })}
                                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border transition-all cursor-pointer ${note.color === c ? "ring-2 ring-sky-500 scale-110" : "hover:scale-105"
                                  } ${c === "yellow" ? "bg-amber-400 border-amber-500" :
                                    c === "pink" ? "bg-rose-450 border-rose-500" :
                                      c === "blue" ? "bg-sky-400 border-sky-500" :
                                        c === "green" ? "bg-emerald-400 border-emerald-500" :
                                          "bg-purple-400 border-purple-500"
                                  }`}
                                title={`${c} color`}
                              />
                            ))}
                          </div>

                          {/* Date type dropdown + specific date input */}
                          <div className="flex items-center gap-1 min-w-0">
                            <select
                              value={note.targetDateType || "today"}
                              onChange={e => {
                                const val = e.target.value as "today" | "daily" | "specific";
                                updateStickyNote(note.id, {
                                  targetDateType: val,
                                  targetDate: val === "specific" ? (note.targetDate || todayStr) : todayStr
                                });
                              }}
                              className="text-[9px] font-bold bg-white/40 dark:bg-slate-950/40 border border-slate-300/40 dark:border-slate-800/40 rounded px-1 py-0.5 outline-none cursor-pointer text-slate-700 dark:text-slate-200"
                            >
                              <option value="today" className="bg-slate-100 dark:bg-slate-900 text-slate-850 dark:text-slate-150">Today</option>
                              <option value="daily" className="bg-slate-100 dark:bg-slate-900 text-slate-850 dark:text-slate-150">Daily</option>
                              <option value="specific" className="bg-slate-100 dark:bg-slate-900 text-slate-850 dark:text-slate-150">Date</option>
                            </select>
                            {note.targetDateType === "specific" && (
                              <input
                                type="date"
                                value={note.targetDate || todayStr}
                                onChange={e => updateStickyNote(note.id, { targetDate: e.target.value })}
                                className="text-[9px] font-semibold bg-white/40 dark:bg-slate-950/40 border border-slate-300/40 dark:border-slate-800/40 rounded px-1 py-0.5 outline-none cursor-pointer text-slate-700 dark:text-slate-200 w-[70px] sm:w-[80px]"
                              />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoPage;
