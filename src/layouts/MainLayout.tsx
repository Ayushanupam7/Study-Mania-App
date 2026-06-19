import React, { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../store/store";
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
  MessageSquare,
  UserCircle2
} from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Todos", path: "/todos", icon: CheckSquare },
  { name: "Habits", path: "/habits", icon: Flame },
  { name: "Countdowns", path: "/countdowns", icon: Calendar },
  { name: "Pomodoro", path: "/pomodoro", icon: Timer },
  { name: "Chats", path: "/chats", icon: MessageSquare },
  { name: "Analytics", path: "/analytics", icon: BarChart2 },
  { name: "Notes", path: "/notes", icon: BookOpen },
];

const bottomNavItems = [
  { name: "Home", path: "/", icon: LayoutDashboard },
  { name: "Todos", path: "/todos", icon: CheckSquare },
  { name: "Pomodoro", path: "/pomodoro", icon: Timer },
  { name: "Habits", path: "/habits", icon: Flame },
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
  logout
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
                  `flex items-center rounded-xl transition-all duration-200 group text-sm font-medium ${isExpanded
                    ? "w-full px-3.5 py-3 justify-start"
                    : "w-11 h-11 justify-center mx-auto"
                  } ${isActive
                    ? "gradient-primary text-white shadow-md shadow-blue-500/15"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
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
                  </>
                )}
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
  const setActiveChatFriend = useStore(state => state.setActiveChatFriend);
  const navigate = useNavigate();
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
      navigate("/profile");
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
        return {
          id: `xp-${doc.id}`,
          type: "xp_gain",
          title: `+${data.amount} XP Earned`,
          text: data.reason || "Focus rewards",
          timestamp: data.timestamp || Date.now(),
          icon: "sparkles",
          color: "text-amber-500 bg-amber-500/10"
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

    return () => {
      unsubRequests();
      unsubXp();
      unsubCheers();
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
        return <Sparkles className="h-3.5 w-3.5 text-amber-500" />;
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
                {unreadCount > 0 && (
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
                    />
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Interactive main outlet container */}
            <main className={`flex-1 relative ${
              isChatPage 
                ? "overflow-hidden h-full w-full pb-16 lg:pb-0" 
                : "overflow-y-auto px-4 md:px-8 lg:px-10 pb-24 lg:pb-10"
            }`}>
              {/* Page content animations wrap */}
              <div className={isChatPage ? "h-full w-full" : "max-w-7xl mx-auto w-full pb-10"}>
                <Outlet />
              </div>
            </main>

            {/* Mobile Plus Floating Action Button (FAB) & Quick Menu */}
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

                    {/* Add Note */}
                    {/* <Link
                      to="/notes"
                      onClick={() => setShowQuickAdd(false)}
                      className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xs font-bold">New Study Note</span>
                      <div className="p-2 rounded-xl bg-rose-500 text-white shadow-md">
                        <BookOpen className="h-4 w-4" />
                      </div>
                    </Link> */}

                    {/* Add Habit */}
                    {/* <Link
                      to="/habits"
                      onClick={() => setShowQuickAdd(false)}
                      className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xs font-bold">New Habit Streak</span>
                      <div className="p-2 rounded-xl bg-orange-500 text-white shadow-md">
                        <Flame className="h-4 w-4" />
                      </div>
                    </Link> */}

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

              {/* Floating Chat Button (above Plus button on mobile) */}
              {!showQuickAdd && (
                <Link
                  to="/chats"
                  className="fixed bottom-35 right-4 z-40 h-12 w-12 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                  title="Chats"
                >
                  <MessageSquare className="h-5.5 w-5.5" />
                </Link>
              )}

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
