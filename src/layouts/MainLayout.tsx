import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { useStore } from "../store/store";
import type { StickyNote } from "../store/store";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import { doc, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { showLocalNotification } from "../utils/notifications";
import {
  LayoutDashboard,
  CheckSquare,
  Flame,
  Calendar,
  Timer,
  BarChart2,
  BookOpen,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  LogOut,
  Plus,
  Bell,
  UserPlus,
  Users,
  MessageSquare,
  UserCircle2,
  Pin,
  Trash2,
  Check,
  ExternalLink,
  Minimize2
} from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Todos", path: "/todos", icon: CheckSquare },
  { name: "Habits", path: "/habits", icon: Flame },
  { name: "Countdowns", path: "/countdowns", icon: Calendar },
  { name: "Pomodoro", path: "/pomodoro", icon: Timer },
  { name: "Chats", path: "/chats", icon: MessageSquare },
  { name: "Study Rooms", path: "/rooms", icon: Users },
  { name: "Analytics", path: "/analytics", icon: BarChart2 },
  { name: "Notes", path: "/notes", icon: BookOpen },
];

const bottomNavItems = [
  { name: "Home", path: "/", icon: LayoutDashboard },
  { name: "Todos", path: "/todos", icon: CheckSquare },
  { name: "Rooms", path: "/rooms", icon: Users },
  { name: "Pomodoro", path: "/pomodoro", icon: Timer },
  { name: "Profile", path: "/profile", icon: UserCircle2 },
];

interface SidebarContentProps {
  forceExpanded?: boolean;
  desktopExpanded: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  user: any;
  xpNeeded: number;
  xpPercent: number;
  toggleTheme: () => void;
  darkMode: boolean;
  logout: () => void;
  showDot: boolean;
  lastChecked: number;
  notifications: any[];
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  forceExpanded = false,
  desktopExpanded,
  setMobileMenuOpen,
  user,
  xpNeeded,
  xpPercent,
  toggleTheme,
  darkMode,
  logout,
  showDot,
  lastChecked,
  notifications
}) => {
  const isExpanded = forceExpanded || desktopExpanded;
  return (
    <div className="flex flex-col h-full">
      {/* Mobile Drawer Sidebar Brand Header */}
      {forceExpanded && (
        <Link
          to="/profile"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center py-4 mb-6 w-full justify-start ml-0.5 animate-fade-in hover:opacity-85 transition-opacity cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl gradient-primary text-white shadow-lg shadow-blue-500/30 shrink-0 flex items-center justify-center font-black text-xl">
            S
          </div>
          <motion.div
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
              marginLeft: isExpanded ? 12 : 0
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden whitespace-nowrap flex flex-col justify-center"
          >
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300">
              Study Mania
            </h1>
            <span className="text-xs font-semibold text-sky-500 uppercase tracking-widest block mt-0.5">
              v1.1 Premium
            </span>
          </motion.div>
        </Link>
      )}

      {/* Gamified User Card */}
      <motion.div
        layout
        className={`mb-6 transition-all duration-300 flex flex-col ${isExpanded
          ? "p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 w-full"
          : "p-0 bg-transparent border-transparent w-full items-center justify-center"
          }`}
      >
        <Link
          to="/profile"
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center w-full hover:opacity-85 transition-opacity cursor-pointer ${isExpanded ? "justify-start" : "justify-center"}`}
        >
          <motion.img
            layout
            src={user.avatar}
            alt="Avatar"
            className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 p-1 object-cover border border-sky-200 dark:border-sky-800 shrink-0"
          />
          <motion.div
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
              marginLeft: isExpanded ? 12 : 0
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden whitespace-nowrap flex flex-col justify-center flex-1"
          >
            <h3 className="font-semibold text-sm truncate">{user.name}</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Level {user.level} Scholar</span>
          </motion.div>
        </Link>
        {/* XP Bar */}
        <motion.div
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
            marginTop: isExpanded ? 12 : 0
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="w-full overflow-hidden"
        >
          <div className="flex justify-between text-xs font-bold mb-1 text-gray-500">
            <span>XP: {user.xp}/{xpNeeded}</span>
            <span>{xpPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full gradient-primary rounded-full"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Navigation */}
      <ul className={`flex-1 space-y-1.5 ${isExpanded ? "pr-1 overflow-y-auto" : "overflow-y-hidden"}`}>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center rounded-xl transition-all duration-200 group text-sm font-medium ${isExpanded
                    ? "w-full px-3.5 py-3 justify-start"
                    : "w-11 h-11 justify-center mx-auto"
                  } ${isActive
                    ? "gradient-primary text-white shadow-md shadow-blue-500/15"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                {({ isActive }) => {
                  const isChatsTab = item.path === "/chats";
                  const showChatDot = isChatsTab && showDot && notifications.some(n => n.type === "chat_message" && n.timestamp > lastChecked);
                  return (
                    <>
                      <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-sky-500"}`} />
                      <motion.span
                        animate={{
                          opacity: isExpanded ? 1 : 0,
                          width: isExpanded ? "auto" : 0,
                          marginLeft: isExpanded ? 12 : 0
                        }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.name}
                      </motion.span>
                      {showChatDot && (
                        <span className={`absolute rounded-full bg-rose-500 border-2 border-white dark:border-slate-900 ${
                          isExpanded 
                            ? "right-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 flex items-center justify-center text-[8px] font-black text-white" 
                            : "right-1.5 top-1.5 h-2.5 w-2.5"
                        }`}>
                          {isExpanded && notifications.filter(n => n.type === "chat_message" && n.timestamp > lastChecked).length}
                        </span>
                      )}
                    </>
                  );
                }}
              </NavLink>
            </li>
          );
        })}
      </ul>

      {/* Footer Controls */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        {isExpanded && (
          <button
            onClick={toggleTheme}
            className="flex items-center rounded-xl transition-all duration-200 text-m font-medium justify-between w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 text-gray-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-500 shrink-0" /> : <Moon className="h-5 w-5 text-indigo-500 shrink-0" />}
            <motion.span
              animate={{
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
                marginLeft: isExpanded ? 8 : 0
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden whitespace-nowrap"
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </motion.span>
          </button>
        )}

        <button
          onClick={logout}
          className={`flex items-center rounded-xl transition-all duration-200 text-m font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 ${isExpanded
            ? "w-full px-3.5 py-3 justify-start gap-3"
            : "w-11 h-11 justify-center mx-auto"
            }`}
          title="Sign Out"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <motion.span
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden whitespace-nowrap"
          >
            Sign Out
          </motion.span>
        </button>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const darkMode = useStore(state => state.darkMode);
  const toggleTheme = useStore(state => state.toggleTheme);
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const location = useLocation();
  const isChatPage = location.pathname === "/chats";

  const userUid = useStore(state => state.userUid);
  const friends = useStore(state => state.friends);
  const activeChatFriend = useStore(state => state.activeChatFriend);
  const setActiveChatFriend = useStore(state => state.setActiveChatFriend);
  const stickyNotes = useStore(state => state.stickyNotes) || [];
  const updateStickyNote = useStore(state => state.updateStickyNote);
  const deleteStickyNote = useStore(state => state.deleteStickyNote);
  const navigate = useNavigate();

  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const isPipSupported = typeof window !== "undefined" && "documentPictureInPicture" in (window as any);

  // Close PIP window when component unmounts
  useEffect(() => {
    return () => {
      if (pipWindow) {
        pipWindow.close();
      }
    };
  }, [pipWindow]);

  // Synchronize dark/light mode classes to PIP window
  useEffect(() => {
    if (pipWindow) {
      if (darkMode) {
        pipWindow.document.documentElement.classList.add("dark");
      } else {
        pipWindow.document.documentElement.classList.remove("dark");
      }
    }
  }, [darkMode, pipWindow]);

  const togglePip = async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    try {
      const w = await (window as any).documentPictureInPicture.requestWindow({
        width: 310,
        height: 380,
      });

      w.document.title = "Study Mania - Pinned Notes";
      
      // Copy all style tags & links
      document.querySelectorAll("style, link[rel='stylesheet']").forEach((styleEl) => {
        w.document.head.appendChild(styleEl.cloneNode(true));
      });

      // Sync dark mode class
      if (document.documentElement.classList.contains("dark")) {
        w.document.documentElement.classList.add("dark");
      }
      
      w.document.body.className = "p-4 overflow-y-auto h-full w-full select-text bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 custom-scrollbar";

      // Listen for window close
      w.addEventListener("pagehide", () => {
        setPipWindow(null);
      });

      setPipWindow(w);
    } catch (err) {
      console.error("Document Picture-in-Picture error:", err);
    }
  };
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(() => {
    return parseInt(localStorage.getItem("notifications_last_checked") || "0") || Date.now();
  });

  const handleNotificationClick = (notif: any) => {
    setShowNotifications(false);

    if (notif.type === "chat_message" && notif.senderId) {
      const friend = friends.find(f => f.id === notif.senderId);
      if (friend) {
        setActiveChatFriend(friend);
      } else {
        // Fallback profile if friend not resolved
        setActiveChatFriend({
          id: notif.senderId,
          name: notif.title.replace("Chat from ", ""),
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${notif.senderId}`,
          level: 1,
          xp: 0,
          major: "Academics",
          status: "online",
        });
      }
      navigate("/chats");
    } else if (notif.type === "friend_request" || notif.type === "cheer") {
      navigate("/profile");
    }
  };

  useEffect(() => {
    if (!userUid) {
      setNotifications([]);
      return;
    }

    // 1. Listen for incoming friend requests
    const qRequests = collection(db, "users", userUid, "incoming_requests");
    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
      // Background notifications trigger
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const ageMs = Date.now() - (data.timestamp || Date.now());
          if (ageMs < 10000) {
            showLocalNotification("Friend Request Received! 👥", `${data.name || "A scholar"} sent you a study partner invite.`, undefined, { type: "friend_request" });
          }
        }
      });

      const reqs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: `req-${doc.id}`,
          type: "friend_request",
          title: "Friend Request",
          text: `${data.name || "A scholar"} sent you a study partner invite.`,
          timestamp: data.timestamp || Date.now(),
          icon: "user_plus",
          color: "text-indigo-500 bg-indigo-500/10"
        };
      });

      setNotifications(prev => {
        const otherNotifications = prev.filter(n => n.type !== "friend_request");
        const combined = [...reqs, ...otherNotifications].sort((a, b) => b.timestamp - a.timestamp);
        return combined;
      });
    }, (err) => console.error("Error syncing notifications requests:", err));

    // 2. Listen for XP gains
    const qXp = query(
      collection(db, "users", userUid, "xp_history"),
      orderBy("timestamp", "desc"),
      limit(10)
    );
    const unsubXp = onSnapshot(qXp, (snapshot) => {
      const xps = snapshot.docs.map(doc => {
        const data = doc.data();
        const amount = data.amount || 0;
        const isNegative = amount < 0;
        return {
          id: `xp-${doc.id}`,
          type: "xp_gain",
          title: isNegative ? `${amount} XP Deducted` : `+${amount} XP Earned`,
          text: data.reason || "Focus rewards",
          timestamp: data.timestamp || Date.now(),
          icon: "sparkles",
          color: isNegative ? "text-red-500 bg-red-500/10" : "text-amber-500 bg-amber-500/10"
        };
      });

      setNotifications(prev => {
        const otherNotifications = prev.filter(n => n.type !== "xp_gain");
        const combined = [...xps, ...otherNotifications].sort((a, b) => b.timestamp - a.timestamp);
        return combined;
      });
    }, (err) => console.error("Error syncing notifications XP:", err));

    // 3. Listen for real-time cheers in arena_sessions
    const unsubCheers = onSnapshot(doc(db, "arena_sessions", userUid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.cheers && data.cheers.length > 0) {
          // Detect newly added cheers in the last 10s
          const recentCheers = data.cheers.filter((c: any) => {
            const ageMs = Date.now() - (c.timestamp || Date.now());
            return ageMs < 10000;
          });
          recentCheers.forEach((c: any) => {
            showLocalNotification("Cheer Received! ⚡", `${c.senderName} sent you focus energy in the arena.`, undefined, { type: "cheer" });
          });

          const newCheers = data.cheers.map((c: any) => ({
            id: `cheer-${c.id}-${c.timestamp}`,
            type: "cheer",
            title: "Cheer Received! ⚡",
            text: `${c.senderName} sent you focus energy in the arena.`,
            timestamp: c.timestamp || Date.now(),
            icon: "flame",
            color: "text-orange-500 bg-orange-500/10"
          }));

          setNotifications(prev => {
            const otherNotifications = prev.filter(n => n.type !== "cheer");
            const combined = [...newCheers, ...otherNotifications].sort((a, b) => b.timestamp - a.timestamp);
            return combined;
          });
        }
      }
    });

    // 5. Listen for user document (real-time XP, level, study stats sync)
    const unsubUser = onSnapshot(doc(db, "users", userUid), (snapshot) => {
      if (snapshot.exists()) {
        const uData = snapshot.data();
        const d = new Date();
        const resetHour = uData.dailyResetHour ?? 4;
        if (d.getHours() < resetHour) {
          d.setDate(d.getDate() - 1);
        }
        const currentStudyDay = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;

        const dbLastStudyDate = uData.lastStudyDate || "";
        const isNewDay = dbLastStudyDate !== currentStudyDay;

        const nextSessionCount = isNewDay ? 0 : (uData.sessionCount || 0);
        const nextTodayMinutes = isNewDay ? 0 : (uData.todayMinutes || 0);

        const cleanUser = {
          name: uData.name || "Scholar",
          email: uData.email || "",
          avatar: uData.avatar || "",
          xp: uData.xp !== undefined ? uData.xp : 0,
          level: uData.level !== undefined ? uData.level : 1,
          title: uData.title || "Focus Rookie",
          major: uData.major || "Computer Science",
          bio: uData.bio || "Leveling up my study game one Pomodoro at a time.",
        };

        useStore.setState({
          user: cleanUser,
          sessionCount: nextSessionCount,
          todayMinutes: nextTodayMinutes,
          totalStudyTime: uData.totalStudyTime || 0,
          studyHistory: uData.studyHistory || {},
          lastStudyDate: currentStudyDay,
          dailyResetHour: uData.dailyResetHour ?? 4,
          dailyGoalHours: uData.dailyGoalHours ?? 8,
        });
      }
    }, (err) => console.error("Error syncing user document:", err));

    return () => {
      unsubRequests();
      unsubXp();
      unsubCheers();
      unsubUser();
    };
  }, [userUid]);

  // 4. Listen for real-time chat messages from friends
  useEffect(() => {
    if (!userUid || friends.length === 0) {
      setNotifications(prev => prev.filter(n => n.type !== "chat_message"));
      return;
    }

    const unsubscribes: (() => void)[] = [];

    friends.forEach(friend => {
      const chatRoomId = userUid < friend.id ? `${userUid}_${friend.id}` : `${friend.id}_${userUid}`;
      const qMsgs = query(
        collection(db, "chats", chatRoomId, "messages"),
        orderBy("timestamp", "desc"),
        limit(5)
      );

      const unsub = onSnapshot(qMsgs, (snapshot) => {
        // Background message notification trigger
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.senderId !== userUid) {
              const ageMs = Date.now() - (data.timestamp || Date.now());
              if (ageMs < 10000) {
                showLocalNotification(`Chat from ${friend.name} 💬`, data.text, undefined, { type: "chat_message", friend });
              }
            }
          }
        });

        const friendMsgs = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: `msg-${doc.id}`,
              type: "chat_message",
              title: `Chat from ${friend.name}`,
              text: data.text,
              timestamp: data.timestamp || Date.now(),
              icon: "message",
              color: "text-emerald-500 bg-emerald-500/10",
              senderId: data.senderId
            };
          })
          .filter(msg => msg.senderId !== userUid); // Only notify on messages from the friend

        setNotifications(prev => {
          // Remove previous messages from this specific friend to avoid duplicates
          const otherNotifications = prev.filter(n => !(n.type === "chat_message" && n.title === `Chat from ${friend.name}`));
          const combined = [...friendMsgs, ...otherNotifications].sort((a, b) => b.timestamp - a.timestamp);
          return combined;
        });
      }, () => {
        // Chat room might not exist yet, ignore errors
      });

      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [userUid, friends]);

  // Compute unread count based on lastChecked timestamp
  const unreadCount = notifications.filter(n => n.timestamp > lastChecked).length;

  const [showDot, setShowDot] = useState(false);
  const dotTimerRef = useRef<any>(null);

  const startDotTimer = () => {
    if (dotTimerRef.current) {
      clearTimeout(dotTimerRef.current);
    }
    dotTimerRef.current = setTimeout(() => {
      setShowDot(false);
    }, 2 * 60 * 1000); // 2 minutes
  };

  useEffect(() => {
    if (unreadCount > 0) {
      setShowDot(true);
      startDotTimer();
    } else {
      setShowDot(false);
      if (dotTimerRef.current) {
        clearTimeout(dotTimerRef.current);
      }
    }
    return () => {
      if (dotTimerRef.current) {
        clearTimeout(dotTimerRef.current);
      }
    };
  }, [unreadCount]);

  useEffect(() => {
    const handleFocus = () => {
      if (unreadCount > 0) {
        setShowDot(true);
        startDotTimer();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [unreadCount]);

  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      const now = Date.now();
      setLastChecked(now);
      localStorage.setItem("notifications_last_checked", String(now));
    }
  };

  const renderNotificationIcon = (iconType: string) => {
    switch (iconType) {
      case "user_plus":
        return <UserPlus className="h-3.5 w-3.5 text-indigo-500" />;
      case "sparkles":
        return <Sparkles className="h-3.5 w-3.5 text-current" />;
      case "flame":
        return <Flame className="h-3.5 w-3.5 text-orange-500" />;
      case "message":
        return <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  const xpNeeded = user.level * 200;
  const xpPercent = Math.min(100, Math.floor((user.xp / xpNeeded) * 100));


  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden animate-fade-in">
        {/* Top Bar (Header) - Full Width across the top */}
        <header className="h-16 flex items-center justify-between px-3 sm:px-6 border-b border-slate-200/60 dark:border-slate-900/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Mobile menu toggle (visible on mobile only) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Menu className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>

            {/* Desktop toggle button (visible on desktop only) */}
            <button
              onClick={() => setDesktopExpanded(!desktopExpanded)}
              className="hidden lg:flex items-center justify-center w-11 h-11 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800/50 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
              title={desktopExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo / Brand */}
            <Link to="/profile" className="flex items-center gap-1.5 sm:gap-2.5 ml-0.5 sm:ml-1 hover:opacity-85 transition-opacity cursor-pointer">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl gradient-primary text-white shadow-md shadow-blue-500/20 shrink-0 flex items-center justify-center font-black text-base sm:text-lg">
                S
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-base sm:text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300">
                  Study Mania
                </h1>
                <span className="hidden sm:inline-block text-[9px] font-semibold text-sky-500 uppercase tracking-widest mt-0.5">
                  v1.3 Premium
                </span>
              </div>
            </Link>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 relative">
            {/* Quick XP Indicator */}
            <div className="flex items-center gap-1 sm:gap-2 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 font-semibold text-[10px] sm:text-xs border border-sky-200/50 dark:border-sky-900/30 shrink-0">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Lvl {user.level}</span>
            </div>
            {/* Theme Toggle Button (Dark/Light mode selector) */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-gray-105 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <Sun className="h-4.5 w-4.5 text-amber-500 animate-spin-slow" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-indigo-650" />
              )}
            </button>

            {/* Notification Icon */}
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-gray-105 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer relative flex items-center justify-center"
                title="Notification History"
              >
                <Bell className="h-4.5 w-4.5" />
                {showDot && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white dark:border-slate-900 text-[8px] font-black text-white items-center justify-center">
                      {unreadCount}
                    </span>
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              <AnimatePresence>
                {showNotifications && (
                  <>
                    {/* Click outside backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="fixed top-16 right-4 left-auto z-50 w-[calc(100vw-2rem)] sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-80 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-md text-left"
                    >
                      {/* Header */}
                      <div className="p-3 bg-slate-50/90 dark:bg-slate-950/90 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Bell className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Notifications</span>
                        </h4>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => {
                              const now = Date.now();
                              setLastChecked(now);
                              localStorage.setItem("notifications_last_checked", String(now));
                              setShowNotifications(false);
                            }}
                            className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:opacity-85 cursor-pointer"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>

                      {/* Notification list */}
                      <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="py-8 px-4 text-center text-slate-400 dark:text-slate-500 space-y-1.5">
                            <Bell className="h-6 w-6 mx-auto stroke-1 text-slate-300 dark:text-slate-700" />
                            <p className="text-xs font-semibold">No notifications yet</p>
                            <p className="text-[10px] opacity-75 leading-relaxed">Your study activity, cheers, and partner updates will show here.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const isUnread = notif.timestamp > lastChecked;
                            const timeStr = new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const dateStr = new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3 flex gap-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer ${isUnread ? "bg-indigo-50/10 dark:bg-indigo-950/5 border-l-2 border-l-indigo-500" : ""
                                  }`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${notif.color}`}>
                                  {renderNotificationIcon(notif.icon)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between items-baseline gap-1.5">
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                      {notif.title}
                                    </span>
                                    <span className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold shrink-0">
                                      {dateStr} {timeStr}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-normal mt-0.5">
                                    {notif.text}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Lower layout region (Sidebar & Main content container) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar (Glassmorphic & Collapsible) */}
          <motion.aside
            animate={{ width: desktopExpanded ? 288 : 80 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="hidden lg:block h-full p-4 border-r border-slate-200/60 dark:border-slate-900/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl z-20 shrink-0 relative"
          >
            <SidebarContent
              desktopExpanded={desktopExpanded}
              setMobileMenuOpen={setMobileMenuOpen}
              user={user}
              xpNeeded={xpNeeded}
              xpPercent={xpPercent}
              toggleTheme={toggleTheme}
              darkMode={darkMode}
              logout={logout}
              showDot={showDot}
              lastChecked={lastChecked}
              notifications={notifications}
            />
          </motion.aside>

          {/* Mobile Sidebar Navigation Drawer */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 lg:hidden"
                />
                {/* Drawer */}
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed top-0 bottom-16 left-0 w-64 max-w-[75vw] p-4 bg-white dark:bg-slate-900 shadow-2xl z-50 border-r border-slate-200 dark:border-slate-800 flex flex-col lg:hidden"
                >
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                  <div className="flex-1 overflow-hidden mt-4">
                    <SidebarContent
                      forceExpanded={true}
                      desktopExpanded={desktopExpanded}
                      setMobileMenuOpen={setMobileMenuOpen}
                      user={user}
                      xpNeeded={xpNeeded}
                      xpPercent={xpPercent}
                      toggleTheme={toggleTheme}
                      darkMode={darkMode}
                      logout={logout}
                      showDot={showDot}
                      lastChecked={lastChecked}
                      notifications={notifications}
                    />
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Interactive main outlet container */}
            <main className={`flex-1 relative flex flex-col ${
              isChatPage 
                ? "overflow-hidden h-full w-full pb-16 lg:pb-0" 
                : "overflow-y-auto px-4 md:px-8 lg:px-10 pb-16 lg:pb-0"
            }`}>
              {/* Page content animations wrap */}
              <div className={(isChatPage || location.pathname === "/rooms") ? "w-full flex-grow flex flex-col" : "max-w-7xl mx-auto w-full flex-grow flex flex-col"}>
                {isChatPage ? (
                  <Outlet />
                ) : (
                  <>
                    <div className="flex-grow pb-10">
                      <Outlet />
                    </div>
                    <footer className="pt-6 pb-6 border-t border-slate-200/30 dark:border-slate-800/40 mt-auto text-center sm:text-left w-full shrink-0">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                          <div className="w-5.5 h-5.5 rounded-lg gradient-primary flex items-center justify-center text-white text-[9px] font-black shrink-0 shadow-sm shadow-blue-500/15">
                            S
                          </div>
                          <span className="text-slate-700 dark:text-slate-300 font-extrabold">Study Mania</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-sky-500 font-bold border border-slate-200/20 dark:border-slate-800/30">
                            Version 1.3.0
                          </span>
                        </div>

                        <div className="flex items-center justify-center gap-1 select-none">
                          <span>Developed by</span>
                          <span className="text-slate-700 dark:text-slate-300 font-extrabold hover:text-sky-500 transition-colors">
                            Ayush Anupam
                          </span>
                        </div>

                        <div className="opacity-80 leading-none">
                          &copy; {new Date().getFullYear()} Study Mania. All rights reserved.
                        </div>
                      </div>
                    </footer>
                  </>
                )}
              </div>
            </main>

            {/* Mobile Plus Floating Action Button (FAB) & Quick Menu */}
            {!(isChatPage && activeChatFriend) && (
              <div className="lg:hidden">
                {/* Backdrop when menu is open */}
                <AnimatePresence>
                  {showQuickAdd && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowQuickAdd(false)}
                      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-35"
                    />
                  )}
                </AnimatePresence>

                {/* Quick Add Menu */}
                <AnimatePresence>
                  {showQuickAdd && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ type: "spring", damping: 20, stiffness: 250 }}
                      className="fixed bottom-34 right-4 z-40 flex flex-col items-end gap-3"
                    >
                      {/* Add Countdown */}
                      <Link
                        to="/countdowns"
                        onClick={() => setShowQuickAdd(false)}
                        className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-bold">New Exam / Countdown</span>
                        <div className="p-2 rounded-xl bg-purple-500 text-white shadow-md">
                          <Calendar className="h-4 w-4" />
                        </div>
                      </Link>

                      {/* Add Pomodoro */}
                      <Link
                        to="/pomodoro"
                        onClick={() => setShowQuickAdd(false)}
                        className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-bold">New Pomodoro Timer</span>
                        <div className="p-2 rounded-xl bg-orange-500 text-white shadow-md">
                          <Flame className="h-4 w-4" />
                        </div>
                      </Link>

                      {/* Partner Chat Room */}
                      <Link
                        to="/chats"
                        onClick={() => setShowQuickAdd(false)}
                        className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-bold">Partner Chat Room</span>
                        <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-md">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                      </Link>
                      
                      {/* Add Task */}
                      <Link
                        to="/todos"
                        onClick={() => setShowQuickAdd(false)}
                        className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-bold">Add To-Do Task</span>
                        <div className="p-2 rounded-xl bg-sky-500 text-white shadow-md">
                          <CheckSquare className="h-4 w-4" />
                        </div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toggle FAB Button */}
                <motion.button
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  animate={{ rotate: showQuickAdd ? 135 : 0 }}
                  transition={{ type: "spring", damping: 18, stiffness: 200 }}
                  className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full gradient-primary text-white shadow-lg shadow-blue-500/25 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                  title="Quick Add Menu"
                >
                  <Plus className="h-6 w-6" />
                </motion.button>
              </div>
            )}

            {/* Mobile Bottom Navigation (Glassmorphic) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200/60 dark:border-slate-800/60 z-30 flex items-center justify-around px-4 shadow-lg shadow-black/5">
              {bottomNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-semibold transition-all duration-200 ${isActive
                        ? "text-sky-500"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 mb-0.5" />
                    <span className="text-[10px]">{item.name}</span>
                  </NavLink>
                );
              })}

              {/* Sidebar toggle option in Bottom Nav */}
              {/* <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Menu className="h-5 w-5 mb-0.5" />
                <span className="text-[10px]">Menu</span>
              </button> */}
            </nav>

            {/* Pinned Sticky Notes Container */}
            <div className="fixed inset-0 z-[9999] pointer-events-none select-none overflow-hidden my-4">
              {/* Pop out to desktop action (Document PiP) */}
              {isPipSupported && stickyNotes.some(note => note.pinned) && (
                <button
                  onClick={togglePip}
                  className="fixed top-20 right-6 p-2 rounded-xl text-slate-505 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 hover:scale-105 transition-all cursor-pointer shadow-md pointer-events-auto flex items-center gap-1.5 text-xs font-bold border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md z-[10000]"
                  title={pipWindow ? "Dock Notes back to App" : "Pop Out to Desktop (Always on Top)"}
                >
                  {pipWindow ? <Minimize2 className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  <span>{pipWindow ? "Dock Notes" : "Pop Out"}</span>
                </button>
              )}

              <AnimatePresence>
                {!pipWindow && stickyNotes.filter(note => note.pinned).map((note, index) => (
                  <PinnedCard
                    key={note.id}
                    note={note}
                    index={index}
                    updateStickyNote={updateStickyNote}
                    deleteStickyNote={deleteStickyNote}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Document Picture-in-Picture Rendering (Portal) */}
            {pipWindow && createPortal(
              <div className="flex flex-col gap-4 w-full h-full select-text p-2">
                {stickyNotes.filter(note => note.pinned).length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-8">
                    No pinned notes.
                  </div>
                ) : (
                  stickyNotes.filter(note => note.pinned).map(note => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-2xl flex flex-col justify-between shadow-md border w-full h-[150px] transition-all duration-300 ${getStickyColorClasses(
                        note.color,
                        note.completed
                      )}`}
                    >
                      {/* Header: checkbox, unpin, delete */}
                      <div className="flex items-start justify-between gap-3 mb-2 shrink-0">
                        <button
                          onClick={() => updateStickyNote(note.id, { completed: !note.completed })}
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            note.completed
                              ? "bg-slate-500 border-slate-500 text-white"
                              : "border-slate-300 dark:border-slate-700 bg-white/40 hover:border-slate-450"
                          }`}
                        >
                          {note.completed && <Check className="h-3.5 w-3.5 text-white" />}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateStickyNote(note.id, { pinned: false })}
                            className="p-1 rounded-lg text-sky-500 bg-sky-500/10 hover:bg-sky-500/20 transition-colors cursor-pointer"
                            title="Unpin note"
                          >
                            <Pin className="h-3.5 w-3.5 fill-sky-500" />
                          </button>
                          <button
                            onClick={() => deleteStickyNote(note.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-450 hover:bg-white/40 transition-colors cursor-pointer"
                            title="Delete sticky note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content area */}
                      <div className="flex-1 w-full my-1 overflow-hidden">
                        <textarea
                          value={note.content}
                          onChange={e => updateStickyNote(note.id, { content: e.target.value })}
                          placeholder="Pinned note..."
                          className={`w-full h-full bg-transparent resize-none border-none outline-none focus:ring-0 p-0 text-xs font-semibold leading-normal custom-scrollbar ${
                            note.completed
                              ? "line-through text-slate-455 dark:text-slate-500 font-medium"
                              : "text-slate-800 dark:text-slate-100"
                          }`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>,
              pipWindow.document.body
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PinnedCardProps {
  note: StickyNote;
  index: number;
  updateStickyNote: (id: string, data: Partial<StickyNote>) => void;
  deleteStickyNote: (id: string) => void;
}

const PinnedCard: React.FC<PinnedCardProps> = ({ note, index, updateStickyNote, deleteStickyNote }) => {
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Default dimensions
  const defaultWidth = note.pinnedWidth ?? 280;
  const defaultHeight = note.pinnedHeight ?? 160;

  // Stagger down the right side of the screen by default
  const defaultLeft = note.pinnedX ?? (typeof window !== "undefined" ? window.innerWidth - defaultWidth - 24 : 0);
  const defaultTop = note.pinnedY ?? (80 + index * 180);

  const [position, setPosition] = useState({ left: defaultLeft, top: defaultTop });
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });

  // Update local states if props update from db sync
  useEffect(() => {
    if (note.pinnedX !== undefined && note.pinnedY !== undefined) {
      setPosition({ left: note.pinnedX, top: note.pinnedY });
    }
    if (note.pinnedWidth !== undefined && note.pinnedHeight !== undefined) {
      setSize({ width: note.pinnedWidth, height: note.pinnedHeight });
    }
  }, [note.pinnedX, note.pinnedY, note.pinnedWidth, note.pinnedHeight]);

  // Handle offscreen correction when screen resizes
  useEffect(() => {
    const handleResize = () => {
      const maxLeft = window.innerWidth - size.width - 10;
      const maxTop = window.innerHeight - size.height - 10;
      const newLeft = Math.max(10, Math.min(maxLeft, position.left));
      const newTop = Math.max(10, Math.min(maxTop, position.top));
      if (newLeft !== position.left || newTop !== position.top) {
        setPosition({ left: newLeft, top: newTop });
        updateStickyNote(note.id, { pinnedX: newLeft, pinnedY: newTop });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position, size, note.id]);

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left mouse button only
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("textarea")) return;

    const card = cardRef.current;
    if (!card) return;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = position.left;
    const startTop = position.top;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      // Keep inside screen viewport
      const maxLeft = window.innerWidth - size.width - 10;
      const maxTop = window.innerHeight - size.height - 10;
      
      const newLeft = Math.max(10, Math.min(maxLeft, startLeft + dx));
      const newTop = Math.max(10, Math.min(maxTop, startTop + dy));

      card.style.left = `${newLeft}px`;
      card.style.top = `${newTop}px`;
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const finalLeft = parseInt(card.style.left) || startLeft;
      const finalTop = parseInt(card.style.top) || startTop;

      setPosition({ left: finalLeft, top: finalTop });
      updateStickyNote(note.id, { pinnedX: finalLeft, pinnedY: finalTop });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const card = cardRef.current;
    if (!card) return;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const newWidth = Math.max(200, Math.min(800, startWidth + dx));
      const newHeight = Math.max(120, Math.min(600, startHeight + dy));

      card.style.width = `${newWidth}px`;
      card.style.height = `${newHeight}px`;
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const finalWidth = parseInt(card.style.width) || startWidth;
      const finalHeight = parseInt(card.style.height) || startHeight;

      setSize({ width: finalWidth, height: finalHeight });
      updateStickyNote(note.id, { pinnedWidth: finalWidth, pinnedHeight: finalHeight });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
        width: size.width,
        height: size.height,
      }}
      className={`p-4 rounded-2xl flex flex-col justify-between shadow-2xl border pointer-events-auto select-text relative transition-colors duration-300 ${getStickyColorClasses(
        note.color,
        note.completed
      )}`}
    >
      {/* Top Handle (Drag Area) */}
      <div
        onPointerDown={handleDragStart}
        className="flex items-start justify-between gap-3 mb-2 shrink-0 cursor-move select-none active:cursor-grabbing pb-1.5 border-b border-black/5 dark:border-white/5"
      >
        <button
          onClick={() => updateStickyNote(note.id, { completed: !note.completed })}
          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
            note.completed
              ? "bg-slate-500 border-slate-500 text-white"
              : "border-slate-300 dark:border-slate-700 bg-white/40 hover:border-slate-455"
          }`}
        >
          {note.completed && <Check className="h-3.5 w-3.5 text-white" />}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => updateStickyNote(note.id, { pinned: false })}
            className="p-1 rounded-lg text-sky-500 bg-sky-500/10 hover:bg-sky-500/20 transition-colors cursor-pointer"
            title="Unpin note"
          >
            <Pin className="h-3.5 w-3.5 fill-sky-500" />
          </button>
          <button
            onClick={() => deleteStickyNote(note.id)}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-450 hover:bg-white/40 transition-colors cursor-pointer"
            title="Delete sticky note"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full my-1 overflow-hidden">
        <textarea
          value={note.content}
          onChange={e => updateStickyNote(note.id, { content: e.target.value })}
          placeholder="Pinned note..."
          className={`w-full h-full bg-transparent resize-none border-none outline-none focus:ring-0 p-0 text-xs font-semibold leading-normal custom-scrollbar ${
            note.completed
              ? "line-through text-slate-455 dark:text-slate-500 font-medium"
              : "text-slate-800 dark:text-slate-100"
          }`}
        />
      </div>

      {/* Resize Handle (Bottom-Right) */}
      <div
        onPointerDown={handleResizeStart}
        className="absolute bottom-1.5 right-1.5 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 select-none"
        title="Drag to resize note"
      >
        <svg
          className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-100 transition-opacity"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <line x1="20" y1="4" x2="4" y2="20" />
          <line x1="20" y1="12" x2="12" y2="20" />
        </svg>
      </div>
    </motion.div>
  );
};

const getStickyColorClasses = (color: string, completed: boolean) => {
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

export default MainLayout;
