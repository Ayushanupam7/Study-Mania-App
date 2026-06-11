// src/pages/TodoPage.tsx
import React, { useState } from "react";
import { useStore } from "../store/store";
import type { Todo } from "../store/store";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Search, 
  Tag, 
  CheckCircle2, 
  Clock,
  Calendar
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

  const categories = ["Academics", "Coding", "Health", "Personal", "Work"];

  // Stats calculation
  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;
  const completionRate = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;
  
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
    setInput(prev => ({ ...prev, title: "" }));
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

  return (
    <div className="space-y-8">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md pt-6 pb-4 md:pt-8 lg:pt-10 z-20 -mx-4 px-4 md:-mx-8 md:px-8 lg:-mx-10 lg:px-10 border-b border-slate-200/30 dark:border-slate-800/30">
        <h1 className="text-3xl font-extrabold flex items-center gap-2 tracking-tight">
          <CheckSquare className="text-sky-500 h-8 w-8" />
          <span>Task Manager</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Stay organized, get things done, and earn +20 XP for every task completed.
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Tasks */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5 hover:shadow-md transition-all duration-300">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Active Tasks</div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-200">{activeCount}</div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5 hover:shadow-md transition-all duration-300">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Completed</div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-200">{completedCount}</div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5 hover:shadow-md transition-all duration-300">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 shrink-0">
            <Clock className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Completion</div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-200">{completionRate}%</div>
          </div>
        </div>

        {/* Next Deadline */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3.5 hover:shadow-md transition-all duration-300">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 shrink-0">
            <Calendar className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Next Due</div>
            <div className="text-sm font-black text-slate-800 dark:text-slate-200 truncate max-w-[110px]">{nextDeadlineString}</div>
          </div>
        </div>
      </div>

      {/* Input Bar Card */}
      <div className="glass-card p-5 rounded-3xl space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Plus className="h-4.5 w-4.5 text-sky-500" />
          <span>Create New Task</span>
        </h2>
        <div className="grid grid-cols-12 gap-3.5">
          {/* Title */}
          <div className="col-span-12 md:col-span-3">
            <input
              type="text"
              placeholder="What needs to be done?"
              value={input.title}
              onChange={e => setInput(prev => ({ ...prev, title: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-medium text-sm text-slate-800 dark:text-slate-350"
            />
          </div>
          {/* Category selection */}
          <div className="col-span-6 md:col-span-2">
            <select
              value={input.category}
              onChange={e => setInput(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-semibold text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {/* Priority selection */}
          <div className="col-span-6 md:col-span-2">
            <select
              value={input.priority}
              onChange={e => setInput(prev => ({ ...prev, priority: e.target.value as any }))}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-semibold text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="high">🔴 High Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="low">🟢 Low Priority</option>
            </select>
          </div>
          {/* Start Date selection */}
          <div className="col-span-6 md:col-span-2">
            <input
              type="date"
              value={input.startDate}
              onChange={e => setInput(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-semibold text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Start Date (From)"
            />
          </div>
          {/* Due Date selection */}
          <div className="col-span-6 md:col-span-2">
            <input
              type="date"
              value={input.dueDate}
              onChange={e => setInput(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-semibold text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              title="End/Due Date (To)"
            />
          </div>
          {/* Submit */}
          <div className="col-span-12 md:col-span-1">
            <button
              onClick={handleAdd}
              className="w-full h-full gradient-primary hover:opacity-95 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center py-3 cursor-pointer"
              title="Add Task"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and List Panel */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-slate-200/50 dark:bg-slate-900/60 p-1 rounded-xl w-full lg:w-auto border border-slate-200/30 dark:border-slate-800/30">
            <button
              onClick={() => setStatusTab("active")}
              className={`flex-1 lg:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTab === "active" ? "bg-white dark:bg-slate-800 shadow text-sky-500 dark:text-white" : "text-gray-500"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusTab("completed")}
              className={`flex-1 lg:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTab === "completed" ? "bg-white dark:bg-slate-800 shadow text-sky-500 dark:text-white" : "text-gray-500"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusTab("all")}
              className={`flex-1 lg:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusTab === "all" ? "bg-white dark:bg-slate-800 shadow text-sky-500 dark:text-white" : "text-gray-500"
              }`}
            >
              All
            </button>
          </div>

          {/* Search and drop-down filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all font-medium text-slate-800 dark:text-slate-200"
              />
            </div>
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-semibold cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <option value="All">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
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
                const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date(new Date().setHours(0,0,0,0));
                
                return (
                  <motion.div
                    layout
                    key={todo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`glass-card p-4 rounded-2xl flex items-center justify-between border-l-4 transition-all duration-300 group ${
                      todo.priority === "high" 
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
                        className={`h-5.5 w-5.5 rounded-xl border flex items-center justify-center transition-all duration-300 shrink-0 cursor-pointer ${
                          todo.completed
                            ? "bg-gradient-to-tr from-sky-400 to-blue-500 border-sky-500 text-white shadow-sm shadow-blue-500/20 scale-105"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-500 dark:hover:border-sky-400"
                        }`}
                      >
                        {todo.completed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 transition-all duration-300 group-hover:bg-sky-500 group-hover:scale-125" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pr-2">
                        <p className={`font-bold text-sm truncate transition-all duration-300 ${
                          todo.completed ? "line-through text-slate-400 dark:text-slate-500 font-medium" : "text-slate-800 dark:text-slate-200"
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
                            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                              isOverdue
                                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/30 dark:border-rose-900/30 animate-pulse"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                            }`}>
                              <Clock className="h-2.5 w-2.5" />
                              <span>
                                {todo.startDate ? `${todo.startDate} to ` : ""}
                                {todo.dueDate}
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
  );
};

export default TodoPage;
