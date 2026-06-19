// src/pages/PomodoroPage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/store";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import { doc, setDoc, addDoc, collection, query, orderBy, limit, onSnapshot, deleteDoc } from "firebase/firestore";
import {
  Timer,
  Play,
  Pause,
  Settings,
  Flame,
  Volume2,
  VolumeX,
  Minimize2,
  CheckSquare
} from "lucide-react";

// Subcomponent Imports
import { FocusSoundscapes, TRACKS } from "../components/pomodoro/FocusSoundscapes";
import { SessionHistory } from "../components/pomodoro/SessionHistory";
import { FocusTimer, getStopwatchBgLight, getStopwatchColor, getStopwatchTextColor } from "../components/pomodoro/FocusTimer";
import { ArenaHub } from "../components/pomodoro/ArenaHub";
import { scheduleTimerEndNotification, cancelNotification } from "../utils/notifications";

const PomodoroPage: React.FC = () => {
  const storeWorkTime = useStore(state => state.workTime);
  const storeShortBreak = useStore(state => state.shortBreak);
  const storeLongBreak = useStore(state => state.longBreak);
  const incrementSession = useStore(state => state.incrementSession);
  const recordStudySession = useStore(state => state.recordStudySession);
  const updateSettings = useStore(state => state.updatePomodoroSettings);
  const sessionCount = useStore(state => state.sessionCount);
  const todayMinutes = useStore(state => state.todayMinutes);
  const totalStudyTime = useStore(state => state.totalStudyTime);
  const user = useStore(state => state.user);
  const friends = useStore(state => state.friends);
  const todos = useStore(state => state.todos);
  const updateTodo = useStore(state => state.updateTodo);
  const userUid = useStore(state => state.userUid);
  const checkDailyReset = useStore(state => state.checkDailyReset);
  const dailyResetHour = useStore(state => state.dailyResetHour) ?? 4;
  const dailyGoalHours = useStore(state => state.dailyGoalHours) ?? 8;

  const [timerType, setTimerType] = useState<"pomodoro" | "stopwatch">("pomodoro");
  const [mode, setMode] = useState<"work" | "short" | "long">("work");
  const [secondsLeft, setSecondsLeft] = useState(storeWorkTime * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Standings settings configuration
  const [showStandingsSettings, setShowStandingsSettings] = useState(false);
  const [customResetHour, setCustomResetHour] = useState(dailyResetHour);
  const [customGoalHours, setCustomGoalHours] = useState<number | string>(dailyGoalHours);

  // Custom configuration inputs
  const [customWork, setCustomWork] = useState(storeWorkTime);
  const [customShort, setCustomShort] = useState(storeShortBreak);
  const [customLong, setCustomLong] = useState(storeLongBreak);

  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [cheeredFriends, setCheeredFriends] = useState<Record<string, boolean>>({});
  const [arenaComment, setArenaComment] = useState("");
  const [rightTab, setRightTab] = useState<"duel" | "quests" | "feed">("duel");
  const [arenaFilter, setArenaFilter] = useState<"worldwide" | "friends">("worldwide");
  const [arenaSort, setArenaSort] = useState<"today" | "allTime">("today");
  const [, setElapsedSeconds] = useState(0);

  // Real-time cheer tracking refs
  const processedCheersRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  // Tracks the wall-clock moment the user pressed Start for the current session
  const sessionStartTimeRef = useRef<number | null>(null);

  // Wall-clock based timer: stores the timestamp when timer was last started/resumed
  // and how many seconds were on the clock at that moment (for pomodoro: seconds remaining;
  // for stopwatch: seconds elapsed so far before this resume).
  const timerResumeWallRef = useRef<number | null>(null);   // Date.now() when resumed
  const timerBaseSecondsRef = useRef<number>(0);             // value of secondsLeft at resume

  const [currentTrackId, setCurrentTrackId] = useState("lofi");
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5); // Range: 0 to 1
  const [autoPlayMusic, setAutoPlayMusic] = useState(true);

  // Focus target task integration
  const activeTaskId = "custom";
  const customFocusGoal = "";
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [completedSessionMinutes, setCompletedSessionMinutes] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setCustomResetHour(dailyResetHour);
  }, [dailyResetHour]);

  useEffect(() => {
    setCustomGoalHours(dailyGoalHours);
  }, [dailyGoalHours]);

  // Initialize audio element
  useEffect(() => {
    const defaultTrack = TRACKS.find(t => t.id === currentTrackId) || TRACKS[0];
    const audio = new Audio(defaultTrack.url);
    audio.loop = true;
    audio.volume = musicVolume;
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sync track change
  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = isMusicPlaying;
      audioRef.current.pause();
      const track = TRACKS.find(t => t.id === currentTrackId) || TRACKS[0];
      audioRef.current.src = track.url;
      audioRef.current.load();
      audioRef.current.volume = musicVolume;
      if (wasPlaying) {
        audioRef.current.play().catch(e => console.log("Audio play blocked by browser", e));
      }
    }
  }, [currentTrackId]);

  // Sync play/pause state
  useEffect(() => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.play().catch(e => {
          console.log("Audio play blocked by browser", e);
          setIsMusicPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMusicPlaying]);

  // Sync volume level
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // Sync audio auto-play with timer state
  useEffect(() => {
    if (autoPlayMusic) {
      if (isRunning) {
        setIsMusicPlaying(true);
      } else {
        setIsMusicPlaying(false);
      }
    }
  }, [isRunning, autoPlayMusic]);

  // Active live event feed state from Firestore
  const [feedEvents, setFeedEvents] = useState<any[]>([]);
  const [dbCompetitors, setDbCompetitors] = useState<any[]>([]);
  const [studySessions, setStudySessions] = useState<any[]>([]);

  // Real-time Firestore User statistics synchronization (Today's Focus & All-Time Focus)
  useEffect(() => {
    if (!userUid) return;
    const unsubscribe = onSnapshot(doc(db, "users", userUid), (snapshot) => {
      if (snapshot.exists()) {
        const uData = snapshot.data();
        useStore.setState({
          sessionCount: uData.sessionCount || 0,
          todayMinutes: uData.todayMinutes || 0,
          totalStudyTime: uData.totalStudyTime || 0,
          studyHistory: uData.studyHistory || {},
          lastStudyDate: uData.lastStudyDate || ""
        });
      }
    }, (err) => {
      console.error("Firestore user doc sync error:", err);
    });
    return () => unsubscribe();
  }, [userUid]);

  // Real-time Firestore Study Sessions Log synchronization
  useEffect(() => {
    if (!userUid) return;
    const q = query(
      collection(db, "users", userUid, "study_sessions"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });
      setStudySessions(sessions);
    }, (err) => {
      console.error("Firestore study_sessions query error:", err);
    });
    return () => unsubscribe();
  }, [userUid]);

  // Real-time Firestore Live Feed synchronization
  useEffect(() => {
    const q = query(collection(db, "arena_feed"), orderBy("timestamp", "desc"), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setFeedEvents([
          { id: 1, text: "Chloe Chen started a 50m session on Chemistry 📐", time: "2m ago" },
          { id: 2, text: "Alex Rivera entered the Focus Arena ⚡", time: "5m ago" },
          { id: 3, text: "Seraphina Vo earned a Double Down badge (+40 XP) 🏆", time: "10m ago" },
        ]);
        return;
      }
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        const elapsedSecs = Math.floor((Date.now() - (data.timestamp || Date.now())) / 1000);
        let timeStr = "Just now";
        if (elapsedSecs >= 3600) {
          const hours = Math.floor(elapsedSecs / 3600);
          timeStr = `${hours}h ago`;
        } else if (elapsedSecs >= 60) {
          const mins = Math.floor(elapsedSecs / 60);
          timeStr = `${mins}m ago`;
        } else if (elapsedSecs > 10) {
          timeStr = `${elapsedSecs}s ago`;
        }
        return {
          id: doc.id,
          text: data.text,
          time: timeStr
        };
      });
      setFeedEvents(events);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Arena Competitors synchronization
  useEffect(() => {
    checkDailyReset();
    const q = query(collection(db, "arena_sessions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          avatar: data.avatar,
          secondsBase: data.secondsBase || 0,
          sessionStartTime: data.sessionStartTime || null,
          timerType: data.timerType || "pomodoro",
          pomodoroDuration: data.pomodoroDuration || 0,
          status: data.status || "online",
          cheers: data.cheers || [],
          lastActive: data.lastActive || 0,
          totalStudyTime: data.totalStudyTime || 0,
          activity: data.activity || "",
          comment: data.comment || ""
        };
      });
      setDbCompetitors(items);
    });

    const interval = setInterval(() => {
      checkDailyReset();
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [checkDailyReset]);

  // Listen for real-time cheers received by the current user
  useEffect(() => {
    if (!userUid) return;
    const mySession = dbCompetitors.find(c => c.id === userUid);
    if (mySession && mySession.cheers && mySession.cheers.length > 0) {
      if (isFirstLoadRef.current) {
        // Skip showing notifications for historic cheers that exist when loading the page
        mySession.cheers.forEach((cheer: any) => {
          processedCheersRef.current.add(cheer.id);
        });
        isFirstLoadRef.current = false;

        // Clean historic cheers from Firestore to keep the DB clean
        setDoc(doc(db, "arena_sessions", userUid), {
          cheers: []
        }, { merge: true }).catch(console.error);
      } else {
        let hasNewCheers = false;
        mySession.cheers.forEach((cheer: any) => {
          if (!processedCheersRef.current.has(cheer.id)) {
            processedCheersRef.current.add(cheer.id);
            hasNewCheers = true;
            // Display toast notification
            showToast(`🎉 ${cheer.senderName} cheered you on! Keep going! ⚡`, "success");

            // Play a gentle notification sound
            try {
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav");
              audio.volume = 0.4;
              audio.play();
            } catch (e) {
              console.log("Audio play blocked by browser:", e);
            }
          }
        });

        if (hasNewCheers) {
          // Clear cheers from Firestore so they don't persist/accumulate
          setDoc(doc(db, "arena_sessions", userUid), {
            cheers: []
          }, { merge: true }).catch(console.error);
        }
      }
    } else if (mySession) {
      isFirstLoadRef.current = false;
    }
  }, [dbCompetitors, userUid]);

  // Initialize user session in the arena on mount, and clean it up when they leave the Pomodoro page
  useEffect(() => {
    if (userUid) {
      setDoc(doc(db, "arena_sessions", userUid), {
        name: user.name,
        avatar: user.avatar,
        status: "online",
        activity: "",
        comment: "",
        secondsBase: todayMinutes * 60,
        totalStudyTime: useStore.getState().totalStudyTime || 0,
        sessionStartTime: null,
        timerType: timerType,
        pomodoroDuration: 0,
        lastActive: Date.now(),
        cheers: []
      }, { merge: true }).catch(console.error);
    }

    return () => {
      if (userUid) {
        setDoc(doc(db, "arena_sessions", userUid), {
          status: "offline",
          sessionStartTime: null,
          lastActive: Date.now(),
          cheers: []
        }, { merge: true }).catch(console.error);
      }
    };
  }, [userUid, user.name, user.avatar]);

  // Sync state changes with Firestore
  const updateArenaSession = async (running: boolean, overrideSecondsLeft?: number) => {
    if (!userUid) return;
    try {
      const activeTask = todos.find(t => t.id === activeTaskId);
      const activityText = activeTaskId === "custom"
        ? (customFocusGoal ? customFocusGoal : "General Study")
        : (activeTask ? activeTask.title : "Linked Task");

      const secLeft = overrideSecondsLeft !== undefined ? overrideSecondsLeft : secondsLeft;

      const currentSessionElapsed = timerType === "pomodoro"
        ? (mode === "work" ? (getDuration(mode) - secLeft) : 0)
        : secLeft;

      if (running) {
        await setDoc(doc(db, "arena_sessions", userUid), {
          name: user.name,
          avatar: user.avatar,
          status: "studying",
          activity: activityText,
          comment: arenaComment.trim(),
          secondsBase: todayMinutes * 60 + currentSessionElapsed,
          totalStudyTime: useStore.getState().totalStudyTime || 0,
          sessionStartTime: Date.now(),
          timerType: timerType,
          pomodoroDuration: timerType === "pomodoro" ? getDuration(mode) : 0,
          lastActive: Date.now()
        }, { merge: true });
      } else {
        await setDoc(doc(db, "arena_sessions", userUid), {
          name: user.name,
          avatar: user.avatar,
          status: "online",
          activity: "",
          comment: "",
          secondsBase: todayMinutes * 60 + currentSessionElapsed,
          totalStudyTime: useStore.getState().totalStudyTime || 0,
          sessionStartTime: null,
          timerType: timerType,
          pomodoroDuration: 0,
          lastActive: Date.now()
        }, { merge: true });
      }
    } catch (e) {
      console.error("Error updating arena session: ", e);
    }
  };

  const intervalRef = useRef<any>(null);

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getDuration = (m: typeof mode) => {
    if (m === "work") return storeWorkTime * 60;
    if (m === "short") return storeShortBreak * 60;
    return storeLongBreak * 60;
  };


  // Ticking effect for simulated real-time friend/partner study progress
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev: number) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset seconds left when settings change or timer mode is toggled
  useEffect(() => {
    if (!isRunning) {
      if (timerType === "pomodoro") {
        setSecondsLeft(getDuration(mode));
      } else {
        setSecondsLeft(0);
      }
    }
  }, [storeWorkTime, storeShortBreak, storeLongBreak, mode, timerType]);

  // Wall-clock based timer — immune to tab/screen minimization
  useEffect(() => {
    if (isRunning) {
      // Record resume point
      timerResumeWallRef.current = Date.now();
      timerBaseSecondsRef.current = secondsLeft;

      intervalRef.current = setInterval(() => {
        const wallElapsed = Math.floor((Date.now() - (timerResumeWallRef.current ?? Date.now())) / 1000);

        if (timerType === "pomodoro") {
          const newSeconds = timerBaseSecondsRef.current - wallElapsed;
          if (newSeconds <= 0) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setSecondsLeft(0);
            handleSessionComplete();
          } else {
            setSecondsLeft(newSeconds);
          }
        } else {
          // Stopwatch: count up
          setSecondsLeft(timerBaseSecondsRef.current + wallElapsed);
        }
      }, 500); // Poll every 500ms for smooth display, but value from wall clock
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      timerResumeWallRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timerType, mode]);

  // Page Visibility API: when the user returns from a minimized/background state,
  // immediately recalculate the correct time from the wall clock so there's no lag.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isRunning && timerResumeWallRef.current !== null) {
        const wallElapsed = Math.floor((Date.now() - timerResumeWallRef.current) / 1000);
        if (timerType === "pomodoro") {
          const newSeconds = timerBaseSecondsRef.current - wallElapsed;
          if (newSeconds <= 0) {
            setSecondsLeft(0);
            setIsRunning(false);
            handleSessionComplete();
          } else {
            setSecondsLeft(newSeconds);
          }
        } else {
          setSecondsLeft(timerBaseSecondsRef.current + wallElapsed);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRunning, timerType]);

  // Schedule/cancel local device notification when timer starts/stops
  useEffect(() => {
    if (isRunning && timerType === "pomodoro") {
      const title = mode === "work" ? "Focus Session Complete! 🧠" : "Break Session Complete! ☕";
      const body = mode === "work"
        ? `Great job! You finished your focus session. Time for a break.`
        : "Break is over! Time to start focusing again.";
      
      scheduleTimerEndNotification(title, body, secondsLeft, 9999);
    } else {
      cancelNotification(9999);
    }
    return () => {
      cancelNotification(9999);
    };
  }, [isRunning, timerType, mode]);

  // Simulate active arena activity updates from partners
  useEffect(() => {
    const alerts = [
      "Alex Rivera is focusing on Solving Kinematics 📐",
      "Chloe Chen started a Short Break ☕",
      "Marcus Vance came online 🟢",
      "Seraphina Vo completed a 25m session on Literature 📖",
      "Dr. Focus completed a 90m focus sprint! 🧠",
      "Nerd Alert earned +25 XP in the Focus Arena ⚡",
      "Chloe Chen unlocked the 'Deep Worker' achievement! 🏆"
    ];

    const interval = setInterval(() => {
      const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
      setFeedEvents(prev => [
        { id: Date.now(), text: randomAlert, time: "Just now" },
        ...prev.slice(0, 4)
      ]);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleSessionComplete = () => {
    setIsRunning(false);
    setIsFullScreen(false); // Return to dashboard view on finish
    if (soundEnabled) {
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav");
        audio.play();
      } catch (e) {
        console.log("Audio play blocked or failed");
      }
    }

    if (mode === "work") {
      const endTime = Date.now();
      const startTime = sessionStartTimeRef.current ?? (endTime - storeWorkTime * 60 * 1000);
      sessionStartTimeRef.current = null;

      const nextSessionCount = sessionCount + 1;
      const nextTotalStudyTime = (totalStudyTime || 0) + storeWorkTime;

      incrementSession(storeWorkTime);
      // Record detailed session in Firestore
      recordStudySession({
        durationMinutes: storeWorkTime,
        sessionType: "pomodoro",
        startTime,
        endTime,
        timestamp: endTime,
        sessionNumber: nextSessionCount,
        totalStudyTime: nextTotalStudyTime
      });

      showToast(`🎉 Session complete! Focused for ${storeWorkTime} mins & earned +${storeWorkTime * 2} XP!`);
      const commentText = arenaComment.trim() ? ` • "${arenaComment.trim()}"` : "";
      const feedText = `${user.name} completed a ${storeWorkTime}m Focus Session!${commentText} 🏆`;

      if (userUid) {
        addDoc(collection(db, "arena_feed"), {
          text: feedText,
          timestamp: Date.now()
        }).catch(console.error);

        setDoc(doc(db, "arena_sessions", userUid), {
          status: "online",
          activity: "",
          comment: "",
          secondsBase: useStore.getState().todayMinutes * 60,
          totalStudyTime: useStore.getState().totalStudyTime || 0,
          sessionStartTime: null,
          lastActive: Date.now(),
          cheers: []
        }, { merge: true }).catch(console.error);
      }

      const activeTask = todos.find(t => t.id === activeTaskId);
      if (activeTask && !activeTask.completed) {
        setCompletedSessionMinutes(storeWorkTime);
        setShowCompletionPrompt(true);
      }

      setMode("short");
    } else {
      sessionStartTimeRef.current = null;
      showToast(`⏱️ Break ended. Time to study!`, "info");
      setMode("work");
      if (userUid) {
        setDoc(doc(db, "arena_sessions", userUid), {
          status: "online",
          sessionStartTime: null,
          lastActive: Date.now(),
          cheers: []
        }, { merge: true }).catch(console.error);
      }
    }
  };

  const handleStopwatchComplete = () => {
    setIsRunning(false);
    setIsFullScreen(false);
    const endTime = Date.now();
    const startTime = sessionStartTimeRef.current ?? (endTime - secondsLeft * 1000);
    sessionStartTimeRef.current = null;
    const mins = Math.floor(secondsLeft / 60);
    const commentText = arenaComment.trim() ? ` • "${arenaComment.trim()}"` : "";
    if (mins > 0) {
      const nextSessionCount = sessionCount + 1;
      const nextTotalStudyTime = (totalStudyTime || 0) + mins;

      incrementSession(mins);
      // Record detailed session in Firestore
      recordStudySession({
        durationMinutes: mins,
        sessionType: "stopwatch",
        startTime,
        endTime,
        timestamp: endTime,
        sessionNumber: nextSessionCount,
        totalStudyTime: nextTotalStudyTime
      });
      showToast(`🎉 Session complete! You focused for ${mins} mins and earned +${mins * 2} XP!`);
      const feedText = `${user.name} focused for ${mins}m in the Arena!${commentText} 🏆`;
      if (userUid) {
        addDoc(collection(db, "arena_feed"), {
          text: feedText,
          timestamp: Date.now()
        }).catch(console.error);
      }
    } else {
      showToast("Focus for at least 1 minute to claim XP!", "info");
    }

    if (userUid) {
      setDoc(doc(db, "arena_sessions", userUid), {
        status: "online",
        activity: "",
        comment: "",
        secondsBase: useStore.getState().todayMinutes * 60,
        totalStudyTime: useStore.getState().totalStudyTime || 0,
        sessionStartTime: null,
        lastActive: Date.now(),
        cheers: []
      }, { merge: true }).catch(console.error);
    }

    const activeTask = todos.find(t => t.id === activeTaskId);
    if (mins > 0 && activeTask && !activeTask.completed) {
      setCompletedSessionMinutes(mins);
      setShowCompletionPrompt(true);
    }
    setSecondsLeft(0);
  };

  const handleStartPause = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    // Record the start timestamp only when first pressing play (not on resume after pause)
    if (nextRunning && sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = Date.now();
    } else if (!nextRunning) {
      // Paused — keep sessionStartTimeRef so resumed time adds correctly
    }
    updateArenaSession(nextRunning);

    if (nextRunning) {
      setIsFullScreen(true);
      showToast("Entering Deep Focus Mode...", "info");

      // Post to Live Arena Feed
      let focusTargetText = "";
      if (activeTaskId === "custom") {
        focusTargetText = customFocusGoal ? `"${customFocusGoal}"` : "General Study";
      } else {
        const activeTask = todos.find(t => t.id === activeTaskId);
        focusTargetText = activeTask ? `"${activeTask.title}"` : "Linked Task";
      }

      const commentText = arenaComment.trim() ? ` • "${arenaComment.trim()}"` : "";
      const text = `${user.name} started focusing on ${focusTargetText}${commentText} ⚡`;

      if (userUid) {
        addDoc(collection(db, "arena_feed"), {
          text,
          timestamp: Date.now()
        }).catch(console.error);
      }
    } else {
      showToast("Focus timer paused.", "info");
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    if (timerType === "pomodoro") {
      setSecondsLeft(getDuration(mode));
      updateArenaSession(false, getDuration(mode));
    } else {
      setSecondsLeft(0);
      updateArenaSession(false, 0);
    }
    showToast("Focus timer reset.", "info");
  };

  const handleDeleteSession = async (session: any) => {
    if (!userUid) return;
    if (window.confirm("Are you sure you want to delete this focus session? This action cannot be undone and your study progress stats will adjust.")) {
      try {
        // 1. Delete session from Firestore sub-collection
        await deleteDoc(doc(db, "users", userUid, "study_sessions", session.id));

        // 2. Fetch current values for stats adjustment
        const currentTotal = totalStudyTime || 0;
        const currentToday = todayMinutes || 0;
        const currentCount = sessionCount || 0;
        const resetHour = dailyResetHour ?? 4;
        const history = useStore.getState().studyHistory || {};
        const lastDate = useStore.getState().lastStudyDate || "";

        // Calculate session's study day
        const getSessionStudyDay = (timestamp: number, rHour: number) => {
          const d = new Date(timestamp);
          if (d.getHours() < rHour) {
            d.setDate(d.getDate() - 1);
          }
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
        };

        const sessionDay = getSessionStudyDay(session.timestamp, resetHour);
        const isSessionFromToday = sessionDay === lastDate;

        // Calculate next values
        const nextTotalStudyTime = Math.max(0, currentTotal - session.durationMinutes);
        const nextTodayMinutes = isSessionFromToday ? Math.max(0, currentToday - session.durationMinutes) : currentToday;
        const nextSessionCount = isSessionFromToday ? Math.max(0, currentCount - 1) : currentCount;

        const nextStudyHistory = { ...history };
        if (nextStudyHistory[sessionDay] !== undefined) {
          nextStudyHistory[sessionDay] = Math.max(0, nextStudyHistory[sessionDay] - session.durationMinutes);
          if (nextStudyHistory[sessionDay] === 0) {
            delete nextStudyHistory[sessionDay];
          }
        }

        // 3. Update users/{userUid} in Firestore
        await setDoc(doc(db, "users", userUid), {
          totalStudyTime: nextTotalStudyTime,
          todayMinutes: nextTodayMinutes,
          sessionCount: nextSessionCount,
          studyHistory: nextStudyHistory
        }, { merge: true });

        // 4. Sync arena session data in Firestore
        await setDoc(doc(db, "arena_sessions", userUid), {
          secondsBase: nextTodayMinutes * 60,
          totalStudyTime: nextTotalStudyTime
        }, { merge: true });

        showToast("Session deleted and study statistics updated!", "info");
      } catch (e) {
        console.error("Error deleting session: ", e);
        showToast("Failed to delete session", "info");
      }
    }
  };

  const handleModeChange = (newMode: typeof mode) => {
    setIsRunning(false);
    setMode(newMode);
  };

  const saveSettings = () => {
    updateSettings({
      workTime: customWork,
      shortBreak: customShort,
      longBreak: customLong
    });
    setShowConfig(false);
    showToast("Timer configurations saved!");
  };

  const format = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, "0");
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const formatStudyTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m.toString().padStart(2, "0")}min`;
  };

  // Progress calculations
  const totalDuration = getDuration(mode);
  const progressPercent = timerType === "pomodoro"
    ? ((totalDuration - secondsLeft) / totalDuration) * 100
    : ((secondsLeft % 60) / 60) * 100; // Loop every minute on stopwatch

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;



  const userCurrentSessionSeconds = timerType === "pomodoro"
    ? (mode === "work" ? (totalDuration - secondsLeft) : 0)
    : secondsLeft;

  const getMostRecentResetTime = () => {
    const now = new Date();
    const todayReset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dailyResetHour, 0, 0, 0);
    if (now.getTime() < todayReset.getTime()) {
      todayReset.setDate(todayReset.getDate() - 1);
    }
    return todayReset.getTime();
  };

  // Combine user, live competitors from Firestore, and simulated partners (Sorted by real-time seconds)
  const competitors = [
    // 1. User fallback if not in dbCompetitors yet
    ...(dbCompetitors.some(c => c.id === userUid) ? [] : [{
      id: "user",
      name: (user.name || "Scholar") + " (You)",
      avatar: user.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar",
      seconds: todayMinutes * 60 + userCurrentSessionSeconds,
      totalStudyTime: (useStore.getState().totalStudyTime || 0) + userCurrentSessionSeconds / 60,
      status: isRunning && (timerType === "stopwatch" || mode === "work") ? ("studying" as const) : ("online" as const),
      isUser: true,
      color: "from-emerald-400 via-teal-500 to-cyan-600",
      activity: activeTaskId === "custom"
        ? (customFocusGoal ? customFocusGoal : "General Study")
        : (todos.find(t => t.id === activeTaskId)?.title || "Linked Task"),
      comment: arenaComment.trim()
    }]),
    // 2. Real-time Database Competitors
    ...dbCompetitors.map(c => {
      const mostRecentReset = getMostRecentResetTime();
      const isStale = (c.lastActive || 0) < mostRecentReset;

      let currentSessionSeconds = 0;
      if (c.status === "studying" && c.sessionStartTime && !isStale) {
        const elapsed = Math.floor((Date.now() - c.sessionStartTime) / 1000);
        currentSessionSeconds = c.timerType === "pomodoro"
          ? Math.min(elapsed, c.pomodoroDuration || 0)
          : elapsed;
      }

      const secondsBase = isStale ? 0 : (c.secondsBase || 0);
      const displayStatus = isStale ? ("offline" as const) : c.status;
      const totalStudyTimeBase = isStale ? 0 : (c.totalStudyTime || 0);

      return {
        id: c.id,
        name: c.id === userUid ? (user.name || "Scholar") + " (You)" : (c.name || "Unknown Scholar"),
        avatar: c.id === userUid ? (user.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar") : (c.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Unknown"),
        seconds: secondsBase + currentSessionSeconds,
        totalStudyTime: totalStudyTimeBase + currentSessionSeconds / 60,
        status: displayStatus,
        isUser: c.id === userUid,
        color: c.id === userUid ? "from-emerald-400 via-teal-500 to-cyan-600" : "from-purple-400 to-indigo-500",
        activity: c.id === userUid
          ? (activeTaskId === "custom"
            ? (customFocusGoal ? customFocusGoal : "General Study")
            : (todos.find(t => t.id === activeTaskId)?.title || "Linked Task"))
          : (c.activity || ""),
        comment: c.id === userUid ? arenaComment.trim() : (c.comment || "")
      };
    })
  ].sort((a, b) => {
    if (arenaSort === "allTime") {
      return b.totalStudyTime - a.totalStudyTime;
    } else {
      return b.seconds - a.seconds;
    }
  });

  // Filter competitors based on "Worldwide" or "Friends Only" view option
  const filteredCompetitors = competitors.filter(c => {
    if (arenaFilter === "worldwide") return true;
    return c.isUser || c.id === userUid || friends.some(f => f.id === c.id);
  });

  // Daily Quests
  const quests = [
    {
      id: "q1",
      title: "Initiate Session",
      desc: "Start a focus timer in the arena",
      xp: "+10 XP",
      completed: isRunning || todayMinutes > 0,
      progress: isRunning || todayMinutes > 0 ? "1/1" : "0/1",
    },
    {
      id: "q2",
      title: "Deep Dive",
      desc: "Focus for 50 minutes total today",
      xp: "+25 XP",
      completed: todayMinutes >= 50,
      progress: `${Math.min(50, todayMinutes)}/50m`,
    },
    {
      id: "q3",
      title: "Triple Crown",
      desc: "Complete 3 full focus sessions",
      xp: "+40 XP",
      completed: sessionCount >= 3,
      progress: `${Math.min(3, sessionCount)}/3 sessions`,
    },
  ];

  const formatSessionDate = (epochMs: number) => {
    if (!epochMs) return "";
    const d = new Date(epochMs);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative px-1 sm:px-2 md:px-0">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-40 md:translate-x-0 md:top-2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 text-white dark:bg-white dark:text-slate-900 shadow-2xl backdrop-blur-md border border-white/10 dark:border-slate-800/10 text-sm font-semibold w-[calc(100%-2rem)] sm:w-auto max-w-xs sm:max-w-md"
          >
            <Flame className="h-4 w-4 text-emerald-400 dark:text-emerald-600 animate-pulse" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 dark:from-emerald-500/5 dark:via-teal-500/5 dark:to-cyan-500/5 border border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] border border-emerald-200/30 dark:border-emerald-800/30">
            <Timer className="h-3 w-3 animate-pulse text-emerald-500" />
            <span>Live Competition</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-900 dark:from-white dark:via-emerald-200 dark:to-teal-200">
              Focus Arena
            </h1>
            <p className="hidden md:inline-block text-slate-500 dark:text-slate-400 text-xs">
              • Compete in real-time study sessions & watch your duel rank rise.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Configure Timer"
          >
            <Settings className="h-4.5 w-4.5 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Focus Timer Card & Productivity Suite */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <FocusTimer
            timerType={timerType}
            setTimerType={setTimerType}
            mode={mode}
            secondsLeft={secondsLeft}
            isRunning={isRunning}
            arenaComment={arenaComment}
            setArenaComment={setArenaComment}
            handleReset={handleReset}
            handleStartPause={handleStartPause}
            handleStopwatchComplete={handleStopwatchComplete}
            handleModeChange={handleModeChange}
            sessionCount={sessionCount}
            todayMinutes={todayMinutes}
            totalStudyTime={totalStudyTime}
            progressPercent={progressPercent}
            strokeDashoffset={strokeDashoffset}
            radius={radius}
            circumference={circumference}
            storeWorkTime={storeWorkTime}
            storeShortBreak={storeShortBreak}
            storeLongBreak={storeLongBreak}
            todos={todos}
            activeTaskId={activeTaskId}
            customFocusGoal={customFocusGoal}
            format={format}
            formatStudyTime={formatStudyTime}
          />

          <SessionHistory
            studySessions={studySessions}
            formatSessionDate={formatSessionDate}
            formatStudyTime={formatStudyTime}
            onDeleteSession={handleDeleteSession}
          />
          <FocusSoundscapes
            currentTrackId={currentTrackId}
            setCurrentTrackId={setCurrentTrackId}
            isMusicPlaying={isMusicPlaying}
            setIsMusicPlaying={setIsMusicPlaying}
            musicVolume={musicVolume}
            setMusicVolume={setMusicVolume}
            autoPlayMusic={autoPlayMusic}
            setAutoPlayMusic={setAutoPlayMusic}
          />


        </div>

        {/* Right Column - Competition & Quests */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          {/* Configuration Box */}
          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-6 rounded-3xl space-y-4 overflow-hidden"
              >
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Arena Timer Settings
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">Focus (min)</label>
                    <input
                      type="number"
                      value={customWork}
                      onChange={e => setCustomWork(parseInt(e.target.value) || 25)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">Short Break</label>
                    <input
                      type="number"
                      value={customShort}
                      onChange={e => setCustomShort(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">Long Break</label>
                    <input
                      type="number"
                      value={customLong}
                      onChange={e => setCustomLong(parseInt(e.target.value) || 15)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={saveSettings}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
                  >
                    Save Configuration
                  </button>
                  <button
                    onClick={() => setShowConfig(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <ArenaHub
            rightTab={rightTab}
            setRightTab={setRightTab}
            arenaFilter={arenaFilter}
            setArenaFilter={setArenaFilter}
            arenaSort={arenaSort}
            setArenaSort={setArenaSort}
            filteredCompetitors={filteredCompetitors}
            dbCompetitors={dbCompetitors}
            userUid={userUid || ""}
            user={user}
            dailyGoalHours={dailyGoalHours}
            dailyResetHour={dailyResetHour}
            arenaComment={arenaComment}
            setArenaComment={setArenaComment}
            showStandingsSettings={showStandingsSettings}
            setShowStandingsSettings={setShowStandingsSettings}
            cheeredFriends={cheeredFriends}
            setCheeredFriends={setCheeredFriends}
            quests={quests}
            isRunning={isRunning}
            todayMinutes={todayMinutes}
            sessionCount={sessionCount}
            feedEvents={feedEvents}
            showToast={showToast}
            updateSettings={updateSettings}
            customResetHour={customResetHour}
            setCustomResetHour={setCustomResetHour}
            customGoalHours={customGoalHours}
            setCustomGoalHours={setCustomGoalHours}
          />
        </div>
      </div>

      {/* Distraction-Free Full Screen Overlay */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/98 backdrop-blur-xl"
          >
            {/* Ambient breathing light */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                animate={{
                  scale: isRunning ? [1, 1.12, 1] : 1,
                  opacity: isRunning ? [0.15, 0.25, 0.15] : 0.15,
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full blur-[100px] ${timerType === "pomodoro"
                  ? (mode === "work" ? "bg-emerald-500/30" : mode === "short" ? "bg-sky-500/30" : "bg-indigo-500/30")
                  : getStopwatchBgLight(Math.floor(secondsLeft / 60))
                  }`}
              />
            </div>

            {/* Main Timer Display */}
            <div className="flex flex-col items-center space-y-6 max-w-lg text-center z-10 relative">
              <div className="space-y-1">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                  {timerType === "pomodoro"
                    ? (mode === "work" ? "🧠 DEEP FOCUS ACTIVE" : "☕ REST BREAK ACTIVE")
                    : "⏱️ STOPWATCH STUDY ACTIVE"}
                </span>
                <h2 className="text-2xl font-extrabold text-white max-w-md line-clamp-2 px-4 leading-tight">
                  {activeTaskId === "custom"
                    ? (customFocusGoal ? `Focusing on: "${customFocusGoal}"` : "Stay focused, you're doing great!")
                    : `Working on: "${todos.find(t => t.id === activeTaskId)?.title}"`}
                </h2>
                {arenaComment.trim() && (
                  <p className="text-slate-400 text-xs mt-1.5 max-w-md italic tracking-wide">
                    "{arenaComment.trim()}"
                  </p>
                )}
              </div>

              {/* Huge circular timer display */}
              <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    className="stroke-slate-900 fill-none"
                    strokeWidth="8"
                  />
                  {/* Previous Lap Circle (Overlap) */}
                  {timerType === "stopwatch" && Math.floor(secondsLeft / 60) > 0 && (
                    <circle
                      cx="120"
                      cy="120"
                      r={radius}
                      className={`fill-none ${getStopwatchColor(Math.floor(secondsLeft / 60) - 1)}`}
                      strokeWidth="8"
                    />
                  )}
                  <motion.circle
                    cx="120"
                    cy="120"
                    r={radius}
                    className={`fill-none ${timerType === "pomodoro"
                      ? (mode === "work"
                        ? "stroke-emerald-500"
                        : mode === "short"
                          ? "stroke-sky-500"
                          : "stroke-indigo-500")
                      : getStopwatchColor(Math.floor(secondsLeft / 60))
                      }`}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{
                      duration: timerType === "stopwatch" && (secondsLeft % 60 === 0) ? 0 : 0.35,
                      ease: "linear"
                    }}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Centered Timer text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
                  <motion.span
                    // animate={{ scale: isRunning && secondsLeft % 2 === 0 ? 1.03 : 1 }}
                    className="text-5xl md:text-5xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  >
                    {format(secondsLeft)}
                  </motion.span>
                  <span className={`font-bold text-xs uppercase tracking-wider ${timerType === "pomodoro"
                    ? (mode === "work" ? "text-emerald-400" : mode === "short" ? "text-sky-400" : "text-indigo-400")
                    : getStopwatchTextColor(Math.floor(secondsLeft / 60))
                    }`}>
                    {isRunning ? "Ticking" : "Paused"}
                  </span>
                </div>
              </div>

              {/* Distraction-Free Control Panel (Only Pause/Sound/Minimize) */}
              <div className="flex items-center justify-center gap-6 pt-4">
                {/* Music/Sound option */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-3.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title={soundEnabled ? "Mute alert" : "Enable alert sound"}
                >
                  {soundEnabled ? <Volume2 className="h-5 w-5 text-sky-400" /> : <VolumeX className="h-5 w-5" />}
                </button>

                {/* Main Play/Pause in Full Screen */}
                <button
                  onClick={handleStartPause}
                  className={`p-5 rounded-full text-white shadow-2xl transition-all transform active:scale-95 cursor-pointer ${timerType === "pomodoro"
                    ? (mode === "work"
                      ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                      : mode === "short"
                        ? "bg-sky-500 hover:bg-sky-600 shadow-sky-500/25"
                        : "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20")
                    : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/20"
                    }`}
                  title={isRunning ? "Pause Timer" : "Start Timer"}
                >
                  {isRunning ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
                </button>

                {/* Exit actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsFullScreen(false);
                      showToast("Returned to Dashboard. Focus session is still active.", "info");
                    }}
                    className="p-3.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Minimize (Return to Dashboard)"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </button>

                  {timerType === "stopwatch" && (
                    <button
                      onClick={handleStopwatchComplete}
                      className="p-3.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
                      title="Complete Focus Session"
                    >
                      <CheckSquare className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Minimal Soundscape Widget in Fullscreen */}
              <div className="bg-slate-900/80 border border-white/10 px-5 py-3.5 rounded-2xl flex items-center justify-between gap-4 w-full max-w-sm mt-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    onClick={() => setIsMusicPlaying(!isMusicPlaying)}
                    className={`p-2 rounded-xl text-white ${isMusicPlaying ? 'bg-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-slate-800 hover:bg-slate-750'} transition-all cursor-pointer shrink-0`}
                  >
                    {isMusicPlaying ? <Volume2 className="h-4 w-4 text-white animate-pulse" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
                  </button>
                  <div className="min-w-0 text-left">
                    <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider leading-none">Focus Soundscape</div>
                    <select
                      value={currentTrackId}
                      onChange={e => setCurrentTrackId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-white border-none focus:ring-0 focus:outline-none p-0 cursor-pointer pr-4 truncate w-full mt-0.5"
                    >
                      {TRACKS.map(t => (
                        <option key={t.id} value={t.id} className="bg-slate-900 text-white text-xs font-semibold">{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Volume Slider in Fullscreen */}
                <div className="flex items-center gap-2 w-24 shrink-0">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(musicVolume * 100)}
                    onChange={e => setMusicVolume(parseFloat(e.target.value) / 100)}
                    className="w-full accent-indigo-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Completion Prompt Modal */}
      <AnimatePresence>
        {showCompletionPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-emerald-500">
                <CheckSquare className="h-6 w-6" />
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Mark Task Completed?</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Excellent focus session of <strong>{completedSessionMinutes} mins</strong>! Would you like to mark your linked task:
                <span className="block mt-2 font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                  "{todos.find(t => t.id === activeTaskId)?.title}"
                </span>
                as completed? You will gain an extra <strong>+20 XP</strong> for finishing it!
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    updateTodo(activeTaskId, { completed: true });
                    setShowCompletionPrompt(false);
                    showToast("Task marked completed! +20 XP earned 🎓");
                  }}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Yes, Mark Completed
                </button>
                <button
                  onClick={() => setShowCompletionPrompt(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Keep Active
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PomodoroPage;
