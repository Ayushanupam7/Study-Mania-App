// src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useStore } from "../store/store";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, BookOpen, ArrowRight, Flame, ShieldAlert } from "lucide-react";

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("Computer Science");

  const loginWithEmail = useStore(state => state.loginWithEmail);
  const signUpWithEmail = useStore(state => state.signUpWithEmail);
  const authLoading = useStore(state => state.authLoading);
  const authError = useStore(state => state.authError);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email.trim() || !password.trim()) {
      setValidationError("Please fill out all required fields.");
      return;
    }

    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters long.");
      return;
    }

    try {
      if (isLogin) {
        await loginWithEmail(email.trim(), password);
      } else {
        if (!name.trim()) {
          setValidationError("Please enter your display name.");
          return;
        }
        await signUpWithEmail(email.trim(), password, name.trim(), major);
      }
    } catch (err) {
      // Errors are handled by the store state authError, but we catch to prevent unhandled rejection warnings
      console.log("Auth operation failed:", err);
    }
  };

  const MAJORS = [
    "JEE Preparation",
    "GATE Preparation",
    "College Semester Exam",
    "School Exam",
    "CA (Chartered Accountant)",
    "RRB Exam",
    "SSC Exam",
    "Self-Taught / Other"
  ];

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden px-4">
      {/* Premium Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500/20 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, -50, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/20 blur-[120px]"
        />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-500 to-sky-400 text-white shadow-xl shadow-blue-500/20 items-center justify-center font-black text-3xl animate-pulse"
          >
            S
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              Study Mania
            </h1>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
              Elevate Your Study Sessions
            </p>
          </div>
        </div>

        {/* Card Panel */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden"
        >
          {/* Form Tabs */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/5 mb-6 relative">
            {/* Sliding background highlight */}
            <motion.div
              layout
              className="absolute top-1.5 bottom-1.5 bg-slate-800 rounded-xl shadow-md"
              style={{
                width: "calc(50% - 0.75rem)",
                left: isLogin ? "0.375rem" : "calc(50% + 0.375rem)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => {
                setIsLogin(true);
                setValidationError(null);
              }}
              className={`flex-1 py-2 text-center text-xs font-black relative z-10 transition-colors cursor-pointer ${isLogin ? "text-white" : "text-slate-500 hover:text-slate-350"
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setValidationError(null);
              }}
              className={`flex-1 py-2 text-center text-xs font-black relative z-10 transition-colors cursor-pointer ${!isLogin ? "text-white" : "text-slate-500 hover:text-slate-350"
                }`}
            >
              Create Account
            </button>
          </div>

          {/* Form Container */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error notifications */}
            <AnimatePresence mode="wait">
              {(validationError || authError) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start gap-3 p-3.5 bg-red-950/30 border border-red-500/30 text-red-400 rounded-2xl text-xs font-semibold leading-relaxed"
                >
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{validationError || authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fields Grid */}
            <div className="space-y-3.5">
              {/* Display Name (Register only) */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-1.5"
                  >
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Scholar Forge"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/5 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-600 text-white"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Major (Register only) */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-1.5"
                  >
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Preparing For / Goal
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <select
                        value={major}
                        onChange={e => setMajor(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/5 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-semibold text-white cursor-pointer"
                      >
                        {MAJORS.map(m => (
                          <option key={m} value={m} className="bg-slate-900 text-white">
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="student@studymania.app"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/5 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-600 text-white"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/5 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium placeholder-slate-600 text-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-bold text-sm shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2 transform active:scale-98 transition-all disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? "Sign In to Study Mania" : "Create Study Mania Account"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Gamified Footer Text */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-650 dark:text-slate-500 font-bold uppercase tracking-wider">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          <span>Keep your streak alive. Sync your focus data safely.</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
