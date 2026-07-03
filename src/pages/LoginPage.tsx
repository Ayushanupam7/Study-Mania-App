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
  const loginWithGoogle = useStore(state => state.loginWithGoogle);
  const signUpWithEmail = useStore(state => state.signUpWithEmail);
  const sendResetPasswordEmail = useStore(state => state.sendResetPasswordEmail);
  const authLoading = useStore(state => state.authLoading);
  const authError = useStore(state => state.authError);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleToggleForgotPassword = (val: boolean) => {
    setIsForgotPassword(val);
    setValidationError(null);
    setResetSent(false);
    useStore.setState({ authError: null });
  };

  const handleGoogleSignIn = async () => {
    setValidationError(null);
    useStore.setState({ authError: null });
    try {
      await loginWithGoogle();
    } catch (err) {
      console.log("Google Sign-In failed:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    useStore.setState({ authError: null });

    if (isForgotPassword) {
      if (!email.trim()) {
        setValidationError("Please enter your email address.");
        return;
      }
      try {
        await sendResetPasswordEmail(email.trim());
        setResetSent(true);
      } catch (err) {
        console.log("Password reset failed:", err);
      }
      return;
    }

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
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 text-slate-100 overflow-y-auto py-10 px-4">
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
      <div className="w-full max-w-md z-10 space-y-6 my-auto">
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
          className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden"
        >
          {isForgotPassword ? (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-black text-white">Reset Password</h2>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {resetSent
                    ? "Check your email for the reset instructions."
                    : "Enter your registered email below, and we'll send you a link to reset your password."}
                </p>
              </div>

              {resetSent ? (
                <div className="space-y-5 text-center">
                  <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Mail className="h-6 w-6 animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">Reset link sent successfully!</p>
                    <p className="text-xs text-slate-400 px-4 leading-normal font-medium">
                      A recovery link has been sent to <span className="text-slate-200 font-bold">{email}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleForgotPassword(false)}
                    className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transform active:scale-98 transition-all cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
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

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-bold text-sm shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2 transform active:scale-98 transition-all disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {authLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send Recovery Link</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleForgotPassword(false)}
                    className="w-full py-3 rounded-2xl bg-transparent border border-white/10 hover:bg-white/5 text-slate-350 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transform active:scale-98 transition-all cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
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
                  type="button"
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
                  type="button"
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
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Password
                      </label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => handleToggleForgotPassword(true)}
                          className="text-[10px] font-bold text-blue-400 hover:text-blue-350 transition-colors cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
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

                {/* Divider */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    Or continue with
                  </span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="w-full py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm shadow-xl flex items-center justify-center gap-3 transform active:scale-98 transition-all disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.96 21.56,11.5 21.35,11.1z" fill="#4285F4" />
                    <path d="M12,21c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.58c-0.9,0.6 -2.07,0.98 -3.3,0.98 -2.34,0 -4.33,-1.58 -5.03,-3.7H2.88v2.7C4.38,19.2 8.01,21 12,21z" fill="#34A853" />
                    <path d="M6.97,13.52C6.83,13.1 6.75,12.57 6.75,12c0,-0.57 0.08,-1.1 0.22,-1.52V7.78H2.88C2.3,8.96 2,10.43 2,12z" fill="#FBBC05" />
                    <path d="M12,5.78c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.09 14.43,2.25 12,2.25c-3.99,0 -7.62,1.8 -9.12,4.78l4.09,3.7C7.67,7.36 9.66,5.78 12,5.78z" fill="#EA4335" />
                  </svg>
                  <span>Sign In with Google</span>
                </button>
              </form>
            </>
          )}
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
