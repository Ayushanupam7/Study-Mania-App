// src/App.tsx
import React, { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import TodoPage from "./pages/TodoPage.tsx";
import HabitPage from "./pages/HabitPage.tsx";
import CountdownPage from "./pages/CountdownPage.tsx";
import PomodoroPage from "./pages/PomodoroPage.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";
import NotesPage from "./pages/NotesPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import { useStore } from "./store/store";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { initializeNotifications, setupPushListeners } from "./utils/notifications";

const App: React.FC = () => {
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const authLoading = useStore(state => state.authLoading);
  const setAuthUser = useStore(state => state.setAuthUser);
  const syncFromFirestore = useStore(state => state.syncFromFirestore);

  // Initialize notifications on app mount
  useEffect(() => {
    initializeNotifications();
    setupPushListeners();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setAuthUser(firebaseUser.uid);
        await syncFromFirestore(firebaseUser.uid);
      } else {
        setAuthUser(null);
      }
    });
    return () => unsubscribe();
  }, [setAuthUser, syncFromFirestore]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        {/* Animated loading spinner */}
        <div className="flex flex-col items-center space-y-4 text-center px-4">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <p className="text-sky-500 text-xs font-bold uppercase tracking-widest animate-pulse">
              Study Mania
            </p>
            <p className="text-slate-400 font-bold text-sm tracking-wider uppercase">
              Prepairing your study space
            </p>
            <p className="text-slate-500 text-xs italic tracking-wide">
              Fetching your data. Take a deep breath
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {isAuthenticated ? (
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/todos" element={<TodoPage />} />
            <Route path="/habits" element={<HabitPage />} />
            <Route path="/countdowns" element={<CountdownPage />} />
            <Route path="/pomodoro" element={<PomodoroPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </HashRouter>
  );
};

export default App;
