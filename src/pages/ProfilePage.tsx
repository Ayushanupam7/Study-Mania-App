// src/pages/ProfilePage.tsx
import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/store";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { db } from "../firebase";
import { collection, doc, addDoc, setDoc, deleteDoc, query, orderBy, onSnapshot, getDoc } from "firebase/firestore";
import {
  Settings,
  Sparkles,
  Sun,
  Moon,
  Award,
  BookOpen,
  CheckSquare,
  Trophy,
  Users,
  UserPlus,
  Send,
  GraduationCap,
  Clock,
  Flame,
  Plus,
  Trash2,
  Search,
  MessageSquare,
  X,
  GripVertical,
  Lock,
  Unlock,
  Code,
  Info,
  Download,
  ArrowUpCircle,
  ArrowRight
} from "lucide-react";


const ProfilePage: React.FC = () => {
  const user = useStore(state => state.user);
  const updateUser = useStore(state => state.updateUser);
  const todos = useStore(state => state.todos);
  const habits = useStore(state => state.habits);
  const notes = useStore(state => state.notes);
  const darkMode = useStore(state => state.darkMode);
  const toggleTheme = useStore(state => state.toggleTheme);
  const friends = useStore(state => state.friends);
  const addFriend = useStore(state => state.addFriend);
  const deleteFriend = useStore(state => state.deleteFriend);
  const todayMinutes = useStore(state => state.todayMinutes);
  const totalStudyTime = useStore(state => state.totalStudyTime);
  const lastStudyDate = useStore(state => state.lastStudyDate);
  const userUid = useStore(state => state.userUid);
  const deactivateAccount = useStore(state => state.deactivateAccount);
  const studyHistory = useStore(state => state.studyHistory || {});

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [title, setTitle] = useState(user.title || "Focus Rookie");
  const [major, setMajor] = useState(user.major || "Computer Science");
  const [bio, setBio] = useState(user.bio || "Leveling up my study game one Pomodoro at a time.");
  const [avatarSeed, setAvatarSeed] = useState((user.name || "Scholar").split(" ")[0] || "StudyMania");
  const [level, setLevel] = useState(user.level);
  const [xp, setXp] = useState(user.xp);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [xpHistory, setXpHistory] = useState<any[]>([]);

  // Deactivate account modal states
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateConfirmText, setDeactivateConfirmText] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ latestVersion: string; downloadUrl: string; releaseNotes: string } | null>(null);

  // Friend request states
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});
  const [showStudyHistory, setShowStudyHistory] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<"calendar" | "list">("calendar");
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const mergedHistory = (() => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    const merged = { ...studyHistory };
    if (todayMinutes > 0) {
      merged[todayStr] = Math.max(merged[todayStr] || 0, todayMinutes);
    }
    return merged;
  })();

  // Direct chat states from global store
  const activeChatFriend = useStore(state => state.activeChatFriend);
  const setActiveChatFriend = useStore(state => state.setActiveChatFriend);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const dragControls = useDragControls();

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const CURRENT_VERSION = "1.3";

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const docRef = doc(db, "app_settings", "version");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const latest = data.latestVersion || CURRENT_VERSION;
        const downloadUrl = data.downloadUrl || "";
        const releaseNotes = data.releaseNotes || "Bug fixes and performance improvements.";
        const cleanLatest = latest.replace(/[^0-9.]/g, "");
        const cleanCurrent = CURRENT_VERSION.replace(/[^0-9.]/g, "");
        if (parseFloat(cleanLatest) > parseFloat(cleanCurrent)) {
          setUpdateInfo({ latestVersion: latest, downloadUrl, releaseNotes });
          setShowUpdateModal(true);
        } else {
          showToast(`Study Mania is up to date! (v${CURRENT_VERSION} Premium)`, "success");
        }
      } else {
        showToast(`Study Mania is up to date! (v${CURRENT_VERSION} Premium)`, "success");
      }
    } catch (e) {
      console.warn("Firestore check failed:", e);
      showToast("Could not check for updates. Please try again later.", "info");
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleDownloadUpdate = () => {
    if (updateInfo?.downloadUrl) {
      window.open(updateInfo.downloadUrl, "_blank");
      showToast("Download started! Install the APK when ready.", "info");
      setShowUpdateModal(false);
    }
  };

  const handleSave = () => {
    updateUser({
      name,
      email,
      title,
      major,
      bio,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`
    });
    showToast("Profile settings saved successfully!");
  };

  const handleDeactivate = async () => {
    if (deactivateConfirmText !== "DEACTIVATE") return;
    setDeactivating(true);
    try {
      await deactivateAccount();
      setShowDeactivateModal(false);
      setDeactivateConfirmText("");
      showToast("Your account has been permanently deactivated.", "success");
    } catch (error: any) {
      console.error("Error deactivating account:", error);
      if (error.code === "auth/requires-recent-login") {
        showToast("Security notice: please log out, log back in, and try again.", "info");
      } else {
        showToast("Error deactivating account: " + (error.message || error), "info");
      }
    } finally {
      setDeactivating(false);
    }
  };

  const handleSendRequest = async (searchedUser: any) => {
    if (!userUid) {
      // Guest mode fallback
      const statuses: Array<"online" | "offline" | "studying"> = ["online", "offline", "studying"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const activities = ["Solving Calculus", "Reading Chemistry", "Coding Web Apps", "Reviewing History Notes", "Drafting Essay"];
      const randomActivity = randomStatus === "studying" ? activities[Math.floor(Math.random() * activities.length)] : undefined;

      const newFriend = {
        id: searchedUser.id,
        name: searchedUser.name,
        avatar: searchedUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(searchedUser.name)}`,
        level: searchedUser.level || 1,
        xp: searchedUser.xp || 0,
        major: searchedUser.major || "Unspecified",
        status: randomStatus,
        currentActivity: randomActivity,
      };

      addFriend(newFriend);
      showToast(`Added ${searchedUser.name} as a study partner!`);
      setSearchResults((prev) => prev.filter((u) => u.id !== searchedUser.id));
      return;
    }

    try {
      // 1. Write to recipient's incoming_requests
      const incomingRef = doc(db, "users", searchedUser.id, "incoming_requests", userUid);
      await setDoc(incomingRef, {
        fromUid: userUid,
        name: user.name,
        avatar: user.avatar,
        level: user.level,
        major: user.major || "JEE Preparation",
        timestamp: Date.now()
      });

      // 2. Write to sender's sent_requests
      const sentRef = doc(db, "users", userUid, "sent_requests", searchedUser.id);
      await setDoc(sentRef, {
        toUid: searchedUser.id,
        timestamp: Date.now()
      });

      showToast(`Friend request sent to ${searchedUser.name}!`);
    } catch (e) {
      console.error("Error sending friend request:", e);
      showToast("Failed to send friend request.", "info");
    }
  };

  const handleAcceptRequest = async (request: any) => {
    if (!userUid) return;

    try {
      const statuses: Array<"online" | "offline" | "studying"> = ["online", "offline", "studying"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const activities = ["Solving Calculus", "Reading Chemistry", "Coding Web Apps", "Reviewing History Notes", "Drafting Essay"];
      const randomActivity = randomStatus === "studying" ? activities[Math.floor(Math.random() * activities.length)] : undefined;

      // 1. Add friend (store handles mutual write to friends collections)
      const friendForMe = {
        id: request.id,
        name: request.name,
        avatar: request.avatar,
        level: request.level || 1,
        xp: request.xp || 0,
        major: request.major || "Unspecified",
        status: randomStatus,
        currentActivity: randomActivity,
      };

      addFriend(friendForMe);

      // 2. Clean up incoming_requests and sent_requests on both sides
      await deleteDoc(doc(db, "users", userUid, "incoming_requests", request.id));
      await deleteDoc(doc(db, "users", request.id, "sent_requests", userUid));

      showToast(`You are now study partners with ${request.name}!`);
    } catch (e) {
      console.error("Error accepting friend request:", e);
      showToast("Failed to accept friend request.", "info");
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!userUid) return;

    try {
      await deleteDoc(doc(db, "users", userUid, "incoming_requests", requestId));
      await deleteDoc(doc(db, "users", requestId, "sent_requests", userUid));
      showToast("Invitation declined.");
    } catch (e) {
      console.error("Error declining friend request:", e);
      showToast("Failed to decline request.", "info");
    }
  };

  // Achievements list based on real-time app stats
  const achievements = [
    {
      id: "a1",
      title: "First Steps",
      description: "Initialize your study profile",
      icon: Sparkles,
      unlocked: true,
      color: "from-sky-400 to-blue-500",
    },
    {
      id: "a2",
      title: "Deep Worker",
      description: "Complete a Pomodoro study session",
      icon: Clock,
      unlocked: todayMinutes > 0,
      color: "from-purple-400 to-indigo-500",
    },
    {
      id: "a3",
      title: "Habit Builder",
      description: "Add a consistent habit to track",
      icon: Flame,
      unlocked: habits.length > 0,
      color: "from-amber-400 to-orange-500",
    },
    {
      id: "a4",
      title: "Task Conqueror",
      description: "Have at least 3 active or completed tasks",
      icon: CheckSquare,
      unlocked: todos.length >= 3,
      color: "from-emerald-400 to-teal-500",
    },
    {
      id: "a5",
      title: "Archivist",
      description: "Create notes for your studies",
      icon: BookOpen,
      unlocked: notes.length > 0,
      color: "from-rose-400 to-pink-500",
    },
    {
      id: "a6",
      title: "Elite Scholar",
      description: "Reach level 5 or above",
      icon: Award,
      unlocked: user.level >= 5,
      color: "from-yellow-400 via-orange-500 to-red-500",
    },
  ];

  // Pre-loaded global bots to populate the global leaderboard
  const globalBots = [
    {
      id: "b1",
      name: "Dr. Focus 🧠",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=DrFocus",
      level: 12,
      xp: 900,
      major: "Neuroscience",
      status: "studying" as const,
      currentActivity: "Analyzing Brain Waves",
      todayMinutes: 145,
      totalStudyTime: 2450,
      lastStudyDate: (() => {
        const d = new Date(Date.now() - 4 * 60 * 60 * 1000);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      })(),
    },
    {
      id: "b2",
      name: "Nerd Alert ⚡",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=NerdAlert",
      level: 8,
      xp: 540,
      major: "Computer Science",
      status: "studying" as const,
      currentActivity: "Coding React",
      todayMinutes: 85,
      totalStudyTime: 1350,
      lastStudyDate: (() => {
        const d = new Date(Date.now() - 4 * 60 * 60 * 1000);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      })(),
    },
    {
      id: "b3",
      name: "Study Buddy 📚",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=StudyBuddy",
      level: 5,
      xp: 320,
      major: "Mathematics",
      status: "online" as const,
      todayMinutes: 45,
      totalStudyTime: 820,
      lastStudyDate: (() => {
        const d = new Date(Date.now() - 4 * 60 * 60 * 1000);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      })(),
    }
  ];

  // Helper to calculate total cumulative XP (Level 1 needs 200, Level 2 needs 400, etc.)
  const getCumulativeXp = (lvl: number, xp: number) => {
    let total = xp;
    for (let i = 1; i < lvl; i++) {
      total += i * 200;
    }
    return total;
  };

  // User object structure for sorting
  const currentUserObj = {
    id: "user",
    name: user.name + " (You)",
    avatar: user.avatar,
    level: user.level,
    xp: user.xp,
    major: user.major || "Computer Science",
    status: "online" as const,
    isCurrentUser: true,
    todayMinutes: todayMinutes,
    totalStudyTime: totalStudyTime || 0,
    lastStudyDate: lastStudyDate || "",
  };

  // State for active tabs
  const [activeTab, setActiveTab] = useState<"leaderboard" | "friends" | "customize">("leaderboard");
  const [leaderboardFilter, setLeaderboardFilter] = useState<"global" | "friends">("global");
  const [leaderboardSort, setLeaderboardSort] = useState<"xp" | "today" | "allTime">("xp");

  // Custom Friends & Live Search logic
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [sentInvites, setSentInvites] = useState<Record<string, boolean>>({});

  // Database users state for the global leaderboard and local search
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loadingDbUsers, setLoadingDbUsers] = useState(false);

  // Real-time listener for all users in the database to populate global leaderboard
  useEffect(() => {
    let unsubscribe = () => { };
    if (userUid) {
      setLoadingDbUsers(true);
      const q = collection(db, "users");
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const usersList: any[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const uid = docSnap.id;
            const isSelf = uid === userUid;

            usersList.push({
              id: uid,
              name: isSelf ? `${data.name || "Scholar"} (You)` : (data.name || "Scholar"),
              avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.name || uid)}`,
              level: data.level !== undefined ? data.level : 1,
              xp: data.xp !== undefined ? data.xp : 0,
              major: data.major || "JEE Preparation",
              status: isSelf ? "online" : (data.status || "offline"),
              currentActivity: data.currentActivity || "",
              todayMinutes: data.todayMinutes || 0,
              totalStudyTime: data.totalStudyTime || 0,
              lastStudyDate: data.lastStudyDate || "",
              isCurrentUser: isSelf,
              email: data.email || "",
            });
          });
          setDbUsers(usersList);
          setLoadingDbUsers(false);
        },
        (error) => {
          console.error("Error fetching db users:", error);
          setLoadingDbUsers(false);
        }
      );
    }
    return () => unsubscribe();
  }, [userUid]);

  // Real-time listener for incoming friend requests
  useEffect(() => {
    let unsubscribe = () => { };
    if (userUid) {
      const q = collection(db, "users", userUid, "incoming_requests");
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const requestsList: any[] = [];
          snapshot.forEach((docSnap) => {
            requestsList.push({
              id: docSnap.id,
              ...docSnap.data()
            });
          });
          setIncomingRequests(requestsList);
        },
        (error) => {
          console.error("Error fetching incoming requests:", error);
        }
      );
    }
    return () => unsubscribe();
  }, [userUid]);

  // Real-time listener for sent friend requests
  useEffect(() => {
    let unsubscribe = () => { };
    if (userUid) {
      const q = collection(db, "users", userUid, "sent_requests");
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const sentMap: Record<string, boolean> = {};
          snapshot.forEach((docSnap) => {
            sentMap[docSnap.id] = true;
          });
          setSentRequests(sentMap);
        },
        (error) => {
          console.error("Error fetching sent requests:", error);
        }
      );
    }
    return () => unsubscribe();
  }, [userUid]);

  // Real-time listener for user's XP history
  useEffect(() => {
    let unsubscribe = () => { };
    if (userUid) {
      const q = query(
        collection(db, "users", userUid, "xp_history"),
        orderBy("timestamp", "desc")
      );
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const historyList: any[] = [];
          snapshot.forEach((docSnap) => {
            historyList.push({
              id: docSnap.id,
              ...docSnap.data()
            });
          });
          setXpHistory(historyList);
        },
        (error) => {
          console.error("Error fetching XP history:", error);
        }
      );
    } else {
      setXpHistory([]);
    }
    return () => unsubscribe();
  }, [userUid]);

  // Refresh latest user data from Firestore on tab switch or mount
  useEffect(() => {
    if (userUid) {
      useStore.getState().syncFromFirestore(userUid, true);
    }
  }, [activeTab, userUid]);

  // Sync local inputs when store user updates
  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setTitle(user.title || "Focus Rookie");
    setMajor(user.major || "Computer Science");
    setBio(user.bio || "Leveling up my study game one Pomodoro at a time.");
    setLevel(user.level);
    setXp(user.xp);
    setAvatarSeed((user.name || "Scholar").split(" ")[0] || "StudyMania");
  }, [user]);

  // Real-time chat synchronization effect
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userUid || !activeChatFriend) {
      setChatMessages([]);
      return;
    }
    const chatRoomId = userUid < activeChatFriend.id ? `${userUid}_${activeChatFriend.id}` : `${activeChatFriend.id}_${userUid}`;
    const q = query(
      collection(db, "chats", chatRoomId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChatMessages(msgs);
    }, (error) => {
      console.error("Error loading chat messages:", error);
    });

    return () => unsubscribe();
  }, [userUid, activeChatFriend]);

  // Auto scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !userUid || !activeChatFriend) return;

    const textToSend = chatInput.trim();
    setChatInput(""); // Clear immediately for instant feedback

    try {
      const chatRoomId = userUid < activeChatFriend.id ? `${userUid}_${activeChatFriend.id}` : `${activeChatFriend.id}_${userUid}`;
      await addDoc(collection(db, "chats", chatRoomId, "messages"), {
        senderId: userUid,
        senderName: user.name,
        text: textToSend,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("Failed to send message.", "info");
    }
  };

  // Compute Leaderboard based on filter
  const rawLeaderboardList = leaderboardFilter === "global"
    ? (userUid && dbUsers.length > 0 ? dbUsers : [currentUserObj, ...friends, ...globalBots])
    : [currentUserObj, ...friends];

  const formatStudyTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${h}h${m.toString().padStart(2, "0")}min`;
  };

  const sortedLeaderboard = [...rawLeaderboardList].sort((a, b) => {
    if (leaderboardSort === "today") {
      const d = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      const aToday = a.lastStudyDate === todayStr ? (a.todayMinutes || 0) : 0;
      const bToday = b.lastStudyDate === todayStr ? (b.todayMinutes || 0) : 0;
      return bToday - aToday;
    } else if (leaderboardSort === "allTime") {
      return (b.totalStudyTime || 0) - (a.totalStudyTime || 0);
    } else {
      return getCumulativeXp(b.level, b.xp) - getCumulativeXp(a.level, a.xp);
    }
  });

  const handleSearchUsers = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchPerformed(true);

    // Filter from locally loaded dbUsers state (or globalBots fallback in guest mode)
    const sourceUsers = userUid && dbUsers.length > 0 ? dbUsers : globalBots;

    const filtered = sourceUsers.filter((u) => {
      if (u.id === userUid) return false;
      if (friends.some((f) => f.id === u.id)) return false;

      const q = searchQuery.toLowerCase();
      const nameMatch = u.name?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const majorMatch = u.major?.toLowerCase().includes(q);

      return nameMatch || emailMatch || majorMatch;
    });

    setSearchResults(filtered);
    setSearchLoading(false);
  };



  return (
    <div className="space-y-6 max-w-6xl mx-auto relative px-2 sm:px-4 md:px-0 w-full pb-32 lg:pb-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2  md:left-auto md:right-40 md:translate-x-0 md:top-2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 text-white dark:bg-white dark:text-slate-900 shadow-2xl backdrop-blur-md border border-white/10 dark:border-slate-800/10 text-sm font-semibold w-[calc(100%-2rem)] sm:w-auto max-w-xs sm:max-w-md"
          >
            <Sparkles className="h-4 w-4 text-sky-400 dark:text-indigo-600 animate-pulse" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      {/* <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 dark:from-sky-500/5 dark:via-blue-500/5 dark:to-indigo-500/5 border border-slate-200/50 dark:border-slate-800/50 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-indigo-200/30 dark:border-indigo-800/30">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Scholar Identity</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-sky-200 dark:to-indigo-200">
            Scholar Profile Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl">
            Forge your custom academic profile, track your consistency, view global standings, and invite friends to study.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("customize")}
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm transition-all duration-200 cursor-pointer w-full sm:w-auto text-center justify-center flex"
          >
            Customize Card
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
          >
            <Trophy className="h-3.5 w-3.5" />
            View Standings
          </button>
        </div>
      </div> */}

      <div className="relative rounded-3xl mt-8">
        {/* Left Column - Scholar Card & Stats & Achievements */}
        <div className="col-span-12 lg:col-span-4 space-y-5 sm:space-y-6 min-w-0">
          {/* Main Scholar Card */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl flex flex-col items-center text-center space-y-4 sm:space-y-5 relative overflow-hidden pt-5 sm:pt-6">
            {/* Desktop Level Badge */}
            <div className="hidden sm:block absolute top-4 right-4 bg-sky-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md">
              LVL {user.level}
            </div>

            {/* Desktop Title Badge inside card */}
            <div className="hidden sm:block absolute top-4 left-4 bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
              {user.title || "Focus Rookie"}
            </div>

            {/* Mobile Header Badges */}
            <div className="flex sm:hidden items-center justify-between w-full border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-1">
              <div className="bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                {user.title || "Focus Rookie"}
              </div>
              <div className="bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 text-[10px] font-black px-2.5 py-1 rounded-xl shadow-sm">
                LVL {user.level}
              </div>
            </div>

            {/* Avatar block */}
            <div className="relative mt-2 sm:mt-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-indigo-500/20 p-2 object-cover relative overflow-hidden flex items-center justify-center">
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 sm:p-1.5 rounded-xl bg-indigo-500 text-white shadow-md">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin-slow" />
              </div>
            </div>

            {/* Name, Title, and Major */}
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-1">
                {user.name}
              </h2>
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-950 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-800/50 w-fit mx-auto mt-2">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                <span>{user.major || "Computer Science"}</span>
              </div>
            </div>

            {/* Bio section */}
            {user.bio && (
              <p className="text-[11px] sm:text-xs italic text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2.5 sm:p-3 rounded-2xl border border-slate-100 dark:border-slate-900/50 w-full">
                "{user.bio}"
              </p>
            )}

            {/* XP progress bar */}
            <div className="w-full space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-4 text-left">
              <div className="flex justify-between text-[10px] sm:text-xs font-extrabold text-slate-500">
                <span>XP Progress</span>
                <span>{user.xp} / {user.level * 200} XP</span>
              </div>
              <div className="h-1.5 sm:h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full gradient-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.floor((user.xp / (user.level * 200)) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="glass-card p-3 sm:p-4 rounded-2xl text-center flex flex-col justify-center">
              <CheckSquare className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-sky-500 mx-auto mb-1" />
              <div className="text-base sm:text-lg font-black">{todos.length}</div>
              <div className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold tracking-wider">Tasks</div>
            </div>

            <div className="glass-card p-3 sm:p-4 rounded-2xl text-center flex flex-col justify-center">
              <Flame className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-orange-500 mx-auto mb-1 animate-pulse" />
              <div className="text-base sm:text-lg font-black">{habits.length}</div>
              <div className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold tracking-wider">Habits</div>
            </div>

            <div className="glass-card p-3 sm:p-4 rounded-2xl text-center flex flex-col justify-center">
              <BookOpen className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-indigo-500 mx-auto mb-1" />
              <div className="text-base sm:text-lg font-black">{notes.length}</div>
              <div className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold tracking-wider">Notes</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <button
              onClick={() => setShowStudyHistory(prev => !prev)}
              className={`glass-card p-3 sm:p-4 rounded-2xl text-center flex flex-col justify-center " : ""
                }`}
            >
              <Clock className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-rose-500 mx-auto mb-1 animate-pulse" />

              <div className="flex flex-row justify-around items-center my-1.5 text-left w-full px-1 gap-2">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today's Focus</span>
                  <span className="text-sm sm:text-base font-black text-rose-500">{formatStudyTime(todayMinutes)}</span>
                </div>
                <div className="h-8 border-l border-slate-200 dark:border-slate-800/80 mx-1" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">All-Time Focus</span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-350">{formatStudyTime(totalStudyTime || 0)}</span>
                </div>
              </div>

              <div className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-bold tracking-wider flex items-center justify-center gap-1 mt-0.5 border-t border-slate-100 dark:border-slate-800/40 pt-1.5 w-full">
                <span>Focus History</span>
                <span className="text-[7px] font-black text-rose-500 bg-rose-500/10 px-1 py-0.2 rounded tracking-normal">VIEW</span>
              </div>
            </button>
          </div>

          {/* Expanded Study History Panel */}
          <AnimatePresence>
            {showStudyHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden w-full text-left"
              >
                <div className="glass-card p-2.5 sm:p-5 rounded-3xl space-y-4 border border-rose-500/20 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 sm:h-4.5 w-4 sm:w-4.5 text-rose-500" />
                      <h3 className="font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Study History
                      </h3>
                    </div>

                    {/* View mode toggle */}
                    <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 shrink-0">
                      <button
                        onClick={() => setHistoryViewMode("calendar")}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold cursor-pointer transition-all ${historyViewMode === "calendar"
                          ? "bg-white dark:bg-slate-800 text-rose-500 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-300"
                          }`}
                      >
                        Calendar
                      </button>
                      <button
                        onClick={() => setHistoryViewMode("list")}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold cursor-pointer transition-all ${historyViewMode === "list"
                          ? "bg-white dark:bg-slate-800 text-rose-500 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-300"
                          }`}
                      >
                        List
                      </button>
                    </div>
                  </div>

                  {historyViewMode === "calendar" ? (
                    <div className="space-y-3">
                      {/* Month Navigation */}
                      <div className="flex items-center justify-between bg-slate-100/30 dark:bg-slate-900/20 px-3 py-1.5 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                        <button
                          onClick={() => setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                          className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-xs font-bold cursor-pointer transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          ←
                        </button>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                          {currentMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </span>
                        <button
                          onClick={() => setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                          className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-xs font-bold cursor-pointer transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          →
                        </button>
                      </div>

                      {/* Weekdays */}
                      <div className="grid grid-cols-7 gap-1 text-center font-black text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                          <div key={day} className="py-0.5">{day}</div>
                        ))}
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                        {(() => {
                          const year = currentMonthDate.getFullYear();
                          const month = currentMonthDate.getMonth();

                          const firstDay = new Date(year, month, 1);
                          const startDayOfWeek = firstDay.getDay();
                          const totalDays = new Date(year, month + 1, 0).getDate();

                          const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

                          const prevMonthTotalDays = new Date(year, month, 0).getDate();
                          for (let i = startDayOfWeek - 1; i >= 0; i--) {
                            const dVal = prevMonthTotalDays - i;
                            const mVal = month === 0 ? 11 : month - 1;
                            const yVal = month === 0 ? year - 1 : year;
                            const dateStr = `${yVal}-${(mVal + 1).toString().padStart(2, "0")}-${dVal.toString().padStart(2, "0")}`;
                            days.push({ dateStr, dayNum: dVal, isCurrentMonth: false });
                          }

                          for (let dVal = 1; dVal <= totalDays; dVal++) {
                            const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${dVal.toString().padStart(2, "0")}`;
                            days.push({ dateStr, dayNum: dVal, isCurrentMonth: true });
                          }

                          const remaining = 42 - days.length;
                          for (let dVal = 1; dVal <= remaining; dVal++) {
                            const mVal = month === 11 ? 0 : month + 1;
                            const yVal = month === 11 ? year + 1 : year;
                            const dateStr = `${yVal}-${(mVal + 1).toString().padStart(2, "0")}-${dVal.toString().padStart(2, "0")}`;
                            days.push({ dateStr, dayNum: dVal, isCurrentMonth: false });
                          }

                          const today = new Date();
                          const todayFormat = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

                          return days.map(({ dateStr, dayNum, isCurrentMonth }) => {
                            const mins = mergedHistory[dateStr] || 0;
                            const hasData = mins > 0;

                            let bgClass = "bg-slate-50/20 dark:bg-slate-900/5 border-slate-100/50 dark:border-slate-800/10";
                            if (hasData) {
                              if (mins <= 30) {
                                bgClass = "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400";
                              } else if (mins <= 90) {
                                bgClass = "bg-rose-500/20 border-rose-500/30 text-rose-700 dark:text-rose-400";
                              } else {
                                bgClass = "bg-rose-500/40 border-rose-500/50 text-rose-900 dark:text-rose-300 font-extrabold";
                              }
                            }

                            return (
                              <div
                                key={dateStr}
                                className={`p-0.5 sm:p-1.5 min-h-[36px] sm:min-h-[44px] rounded-lg sm:rounded-xl border flex flex-col justify-between transition-all duration-200 text-left relative ${bgClass} ${!isCurrentMonth ? "opacity-25" : ""
                                  } ${hasData ? "hover:scale-[1.03] shadow-sm" : ""}`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400">{dayNum}</span>
                                  {dateStr === todayFormat && (
                                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 block shrink-0" />
                                  )}
                                </div>
                                {hasData && (
                                  <span className="text-[7px] sm:text-[8.5px] font-black self-end tracking-tighter mt-1 block truncate max-w-full">
                                    {(() => {
                                      const hrs = mins / 60;
                                      if (hrs >= 1) {
                                        return `${parseFloat(hrs.toFixed(1))}h`;
                                      }
                                      return `${mins}m`;
                                    })()}
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : (
                    // List View
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {Object.keys(mergedHistory).length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500">
                          No focus sessions recorded yet. Start a focus timer to see your records!
                        </div>
                      ) : (
                        Object.entries(mergedHistory)
                          .sort((a, b) => b[0].localeCompare(a[0])) // latest first
                          .map(([dateStr, mins]) => {
                            const d = new Date();
                            const todayFormat = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;

                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            const yesterdayFormat = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, "0")}-${yesterday.getDate().toString().padStart(2, "0")}`;

                            let displayDate = "";
                            try {
                              const [year, month, day] = dateStr.split("-").map(Number);
                              const dateObj = new Date(year, month - 1, day);
                              const monthName = dateObj.toLocaleDateString("en-US", { month: "long" });
                              displayDate = `${day} ${monthName}`;
                            } catch (e) {
                              displayDate = dateStr;
                            }

                            if (dateStr === todayFormat) {
                              displayDate += " (Today)";
                            } else if (dateStr === yesterdayFormat) {
                              displayDate += " (Yesterday)";
                            }

                            const hours = mins / 60;
                            let durationStr = "";
                            if (hours >= 1) {
                              const roundedHours = parseFloat(hours.toFixed(1));
                              durationStr = `${roundedHours} hr${roundedHours !== 1 ? "s" : ""}`;
                            } else {
                              durationStr = `${mins} min${mins !== 1 ? "s" : ""}`;
                            }

                            const maxHistoryMinutes = Math.max(...Object.values(mergedHistory), 60);
                            const barWidth = Math.min(100, Math.floor((mins / maxHistoryMinutes) * 100));

                            return (
                              <div key={dateStr} className="p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-900/60 transition-all duration-200 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-extrabold text-slate-700 dark:text-slate-350">{displayDate}</span>
                                  <span className="font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg text-[10px] shadow-sm">
                                    {durationStr}
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200/60 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200/10 dark:border-slate-800/30">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-500 shadow-sm shadow-rose-500/10"
                                    style={{ width: `${barWidth}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Achievements / Badges */}
          <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
              <Award className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-amber-500" />
              <h3 className="font-extrabold text-[10px] sm:text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Scholar Badges
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {achievements.map((ach, idx) => {
                const Icon = ach.icon;
                const isLeft = idx % 3 === 0;
                const isRight = idx % 3 === 2;

                let tooltipAlignClass = "left-1/2 -translate-x-1/2 origin-bottom";
                let arrowAlignClass = "left-1/2 -translate-x-1/2";
                if (isLeft) {
                  tooltipAlignClass = "left-0 origin-bottom-left";
                  arrowAlignClass = "left-[40px] sm:left-[48px]";
                } else if (isRight) {
                  tooltipAlignClass = "right-0 origin-bottom-right";
                  arrowAlignClass = "right-[40px] sm:right-[48px]";
                }

                return (
                  <div
                    key={ach.id}
                    className="relative group cursor-help"
                  >
                    {/* Badge Card Container */}
                    <div
                      className={`flex flex-col items-center justify-center p-1.5 sm:p-3 rounded-2xl border transition-all duration-300 ${ach.unlocked
                        ? "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-[0_4px_20px_rgba(99,102,241,0.1)] hover:scale-105"
                        : "bg-slate-100/10 dark:bg-slate-950/5 border-slate-100/50 dark:border-slate-900/50 opacity-40 grayscale hover:opacity-60"
                        }`}
                    >
                      {/* Icon Circle */}
                      <div
                        className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white relative bg-gradient-to-tr ${ach.unlocked
                          ? ach.color + " shadow-md shadow-indigo-500/10"
                          : "from-slate-300 to-slate-400 dark:from-slate-800 dark:to-slate-700 shadow-none"
                          }`}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />

                        {/* Lock Indicator on Icon itself */}
                        {!ach.unlocked && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-500 text-white border border-white dark:border-slate-900 shadow-sm">
                            <Lock className="h-2 w-2" />
                          </div>
                        )}
                      </div>

                      {/* Compact Title */}
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-700 dark:text-slate-300 mt-2 sm:mt-2.5 truncate w-full text-center">
                        {ach.title}
                      </span>
                    </div>

                    {/* Premium Hover Tooltip */}
                    <div
                      className={`absolute bottom-full mb-3 w-48 sm:w-56 p-2.5 sm:p-3 rounded-2xl bg-slate-950/95 dark:bg-slate-900/95 text-white shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform scale-95 group-hover:scale-100 z-50 border border-slate-800/80 dark:border-slate-700/80 flex flex-col gap-1 text-left ${tooltipAlignClass}`}
                    >
                      {/* Tooltip Header */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {ach.unlocked ? (
                          <span className="text-[8px] sm:text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                            <Unlock className="h-2.5 w-2.5" /> Unlocked
                          </span>
                        ) : (
                          <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/20 flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Locked
                          </span>
                        )}
                        <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium">
                          {ach.unlocked ? "Completed" : "In Progress"}
                        </span>
                      </div>

                      {/* Tooltip Title */}
                      <h4 className="text-[11px] sm:text-xs font-black text-white">
                        {ach.title}
                      </h4>

                      {/* Tooltip Description */}
                      <p className="text-[9px] sm:text-[10px] text-slate-300 leading-normal mt-0.5">
                        Rule: {ach.description}
                      </p>

                      {/* Tooltip Arrow */}
                      <div
                        className={`absolute top-full w-2.5 h-2.5 bg-slate-950/95 dark:bg-slate-900/95 border-r border-b border-slate-800/80 dark:border-slate-700/80 rotate-45 -mt-1.5 ${arrowAlignClass}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>



        </div>

        {/* Right Column - Tabs Container */}
        <div className="col-span-12 lg:col-span-8 space-y-6 min-w-0 mt-6 sm:mt-6">
          {/* Tab Switcher */}
          <div className="p-1 rounded-2xl bg-slate-200/50 dark:bg-slate-900/60 border border-slate-200/30 dark:border-slate-800/30 flex gap-1">
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer ${activeTab === "leaderboard"
                ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-sm border border-slate-200/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-slate-800/20"
                }`}
            >
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Leaderboard</span>
              <span className="sm:hidden">Rank</span>
            </button>

            <button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer ${activeTab === "friends"
                ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-sm border border-slate-200/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-slate-800/20"
                }`}
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Friends ({friends.length})</span>
              <span className="sm:hidden">Partners ({friends.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("customize")}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 rounded-xl text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer ${activeTab === "customize"
                ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-sm border border-slate-200/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/30 dark:hover:bg-slate-800/20"
                }`}
            >
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Customize</span>
              <span className="sm:hidden">Edit</span>
            </button>
          </div>

          {/* Tab Panes */}
          <AnimatePresence mode="wait">
            {activeTab === "leaderboard" && (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="glass-card p-3.5 sm:p-6 rounded-3xl">
                  {/* Leaderboard Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-indigo-500 animate-pulse" />
                      <span className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Scholar Leaderboard
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2.5 shrink-0 self-start sm:self-center items-center">
                      {/* Standings Filter */}
                      <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50">
                        <button
                          onClick={() => setLeaderboardFilter("global")}
                          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${leaderboardFilter === "global"
                            ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-sm border border-slate-250/20 dark:border-slate-700/30"
                            : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-300"
                            }`}
                        >
                          Global Standings
                        </button>
                        <button
                          onClick={() => setLeaderboardFilter("friends")}
                          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${leaderboardFilter === "friends"
                            ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-sm border border-slate-250/20 dark:border-slate-700/30"
                            : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-300"
                            }`}
                        >
                          Friends Only
                        </button>
                      </div>

                      {/* Metric Sort Selector */}
                      <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50">
                        <button
                          onClick={() => setLeaderboardSort("xp")}
                          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${leaderboardSort === "xp"
                            ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-sm border border-slate-250/20 dark:border-slate-700/30"
                            : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-300"
                            }`}
                        >
                          XP Rank
                        </button>
                        <button
                          onClick={() => setLeaderboardSort("today")}
                          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${leaderboardSort === "today"
                            ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-sm border border-slate-250/20 dark:border-slate-700/30"
                            : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-300"
                            }`}
                        >
                          Today's Focus
                        </button>
                        <button
                          onClick={() => setLeaderboardSort("allTime")}
                          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${leaderboardSort === "allTime"
                            ? "bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-sm border border-slate-250/20 dark:border-slate-700/30"
                            : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-300"
                            }`}
                        >
                          All-Time Focus
                        </button>
                      </div>
                    </div>
                  </div>


                  {/* Leaderboard List */}
                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                    {loadingDbUsers && dbUsers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500 text-sm gap-3">
                        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-semibold">Loading standings...</span>
                      </div>
                    ) : sortedLeaderboard.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
                        No scholars on the leaderboard yet.
                      </div>
                    ) : (
                      sortedLeaderboard.map((scholar, index) => {
                        const rank = index + 1;
                        const isSelf = scholar.isCurrentUser || scholar.id === "user" || (userUid && scholar.id === userUid);

                        // Highlight top 3 ranks
                        let rankBadge = (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs sm:text-sm text-slate-500 shrink-0">
                            {rank}
                          </div>
                        );
                        if (rank === 1) {
                          rankBadge = (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs sm:text-sm border border-amber-400/40 relative shadow-sm shrink-0">
                              1st
                            </div>
                          );
                        } else if (rank === 2) {
                          rankBadge = (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-300/20 text-slate-600 dark:text-slate-300 flex items-center justify-center font-black text-xs sm:text-sm border border-slate-300/40 relative shadow-sm shrink-0">
                              2nd
                            </div>
                          );
                        } else if (rank === 3) {
                          rankBadge = (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-605/20 text-amber-700 dark:text-amber-500 flex items-center justify-center font-black text-xs sm:text-sm border border-amber-600/30 relative shadow-sm shrink-0">
                              3rd
                            </div>
                          );
                        }

                        return (
                          <motion.div
                            layout
                            key={scholar.id}
                            className={`flex items-center justify-between p-2.5 sm:p-3.5 rounded-2xl border transition-all duration-300 gap-2.5 ${isSelf
                              ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/80 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/20"
                              : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-white/10"
                              }`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
                              {/* Rank Indicator */}
                              <div className="shrink-0">{rankBadge}</div>

                              {/* Avatar */}
                              <div className="relative shrink-0">
                                <img
                                  src={scholar.avatar}
                                  alt={scholar.name}
                                  className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-800 object-cover"
                                />
                                {scholar.status === "studying" && (
                                  <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-purple-500 border border-white dark:border-slate-900"></span>
                                  </span>
                                )}
                                {scholar.status === "online" && (
                                  <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500 border border-white dark:border-slate-900"></span>
                                  </span>
                                )}
                              </div>

                              {/* Name and Major */}
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate flex items-center gap-1 sm:gap-1.5">
                                  <span className="truncate">{scholar.name}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-indigo-500 text-white shrink-0">
                                      You
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <GraduationCap className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{scholar.major}</span>
                                  {scholar.status === "studying" && scholar.currentActivity && (
                                    <span className="text-purple-500 dark:text-purple-400 font-semibold truncate">
                                      • studying "{scholar.currentActivity}"
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Level & XP / Study Time */}
                            <div className="text-right shrink-0 pl-1.5">
                              {leaderboardSort === "today" ? (
                                <>
                                  <div className="text-[10px] sm:text-xs font-black text-rose-500">
                                    {(() => {
                                      const d = new Date(Date.now() - 4 * 60 * 60 * 1000);
                                      const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
                                      const minutes = scholar.lastStudyDate === todayStr ? (scholar.todayMinutes || 0) : 0;
                                      return formatStudyTime(minutes);
                                    })()}
                                  </div>
                                  <div className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                    LVL {scholar.level}
                                  </div>
                                </>
                              ) : leaderboardSort === "allTime" ? (
                                <>
                                  <div className="text-[10px] sm:text-xs font-black text-indigo-500">
                                    {formatStudyTime(scholar.totalStudyTime || 0)}
                                  </div>
                                  <div className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                    LVL {scholar.level}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-200">
                                    LVL {scholar.level}
                                  </div>
                                  <div className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                    {scholar.xp} XP
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* XP History Panel */}
                <div className="glass-card p-3.5 sm:p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
                    <Sparkles className="text-amber-500 h-5 w-5 animate-pulse" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Scholar XP Log History
                    </h3>
                  </div>

                  {!userUid ? (
                    <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs italic">
                      Create an account or log in to sync and track your XP earning history.
                    </div>
                  ) : xpHistory.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs text-left">
                      No XP earned yet. Start studying, updating habits, or completing tasks to earn XP!
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                      {xpHistory.map((log) => {
                        const dateStr = new Date(log.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                        return (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/45 border border-slate-200/40 dark:border-slate-800/50 text-xs"
                          >
                            <div className="min-w-0 pr-2 text-left">
                              <span className="font-bold text-slate-800 dark:text-slate-250 block truncate">
                                {log.reason}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5">
                                {dateStr}
                              </span>
                            </div>
                            <span className="font-black text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/10 px-2 py-0.5 rounded-lg shrink-0">
                              +{log.amount} XP
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Developer Card */}
                <div className="glass-card p-3.5 sm:p-5 rounded-3xl space-y-4 border border-indigo-500/20 shadow-sm text-left">
                  <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                    <Code className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-indigo-500" />
                    <h3 className="font-extrabold text-[10px] sm:text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Developer Information
                    </h3>
                  </div>

                  {/* Download APK Widget */}
                  <a
                    href="/StudyManiaApp.apk"
                    download="StudyManiaApp.apk"
                    className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/30 dark:border-indigo-850/30 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                        <Download className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                          Download Latest APK
                        </h4>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                          Click to download. If a warning appears during installation, you may ignore it and continue with the installation process.

                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                  </a>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                      <span className="font-black text-indigo-650 dark:text-indigo-400 text-sm">AA</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        Ayush Anupam
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Lead Developer & Architect
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">App Version</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">v1.3 Premium</span>
                    </div>

                    <button
                      onClick={handleCheckUpdates}
                      disabled={checkingUpdates}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 font-bold text-[10px] sm:text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {checkingUpdates ? (
                        <>
                          <div className="h-3 w-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span>Check for Updates</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {/* Deactivate Account Widget */}
                {userUid && (
                  <div className="glass-card p-4 rounded-3xl border border-rose-500/20 dark:border-rose-500/10 bg-rose-500/[0.02] flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(244,63,94,0.05)] hover:shadow-[0_4px_20px_rgba(244,63,94,0.1)] transition-all duration-300">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-[10px] sm:text-xs text-rose-600 dark:text-rose-500 uppercase tracking-wider">
                        Danger Zone
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        Permanently delete account.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeactivateModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] sm:text-xs shadow-md transition-all cursor-pointer shrink-0"
                    >
                      Deactivate
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "friends" && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Add Friend Form */}
                <div className="glass-card p-3.5 sm:p-6 rounded-3xl space-y-4">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <UserPlus className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Search Study Partners</span>
                  </h3>
                  <form onSubmit={handleSearchUsers} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Search scholars by name, email, or exam goal..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm text-slate-850 dark:text-slate-350"
                      />
                      <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <button
                      type="submit"
                      disabled={searchLoading}
                      className="px-6 py-3 rounded-xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 w-full sm:w-auto shrink-0"
                    >
                      {searchLoading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span>Search</span>
                    </button>
                  </form>

                  {/* Search Results */}
                  {searchPerformed && (
                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Search Results ({searchResults.length})
                      </h4>
                      {searchLoading ? (
                        <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                          <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Searching Study Mania database...</span>
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
                          No scholars found matching your search.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                          {searchResults.map((searchedUser) => (
                            <div
                              key={searchedUser.id}
                              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={searchedUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(searchedUser.name)}`}
                                  alt={searchedUser.name}
                                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-800 object-cover"
                                />
                                <div className="min-w-0">
                                  <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                    {searchedUser.name}
                                  </h5>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                    <GraduationCap className="h-3 w-3" />
                                    <span>{searchedUser.major || "Computer Science"}</span>
                                    <span className="font-bold text-indigo-500 dark:text-indigo-400">
                                      • LVL {searchedUser.level || 1}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              {!!sentRequests[searchedUser.id] ? (
                                <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs border border-slate-200/50 dark:border-slate-700/50">
                                  Sent
                                </span>
                              ) : incomingRequests.some(r => r.id === searchedUser.id) ? (
                                <button
                                  onClick={() => handleAcceptRequest(incomingRequests.find(r => r.id === searchedUser.id))}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
                                >
                                  Accept
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSendRequest(searchedUser)}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Add</span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Friends List Container */}
                <div className="glass-card p-3.5 sm:p-6 rounded-3xl space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Users className="text-indigo-500 h-5 w-5" />
                        <span>Study Partners</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Invite partners to focus rooms and check their real-time study status.
                      </p>
                    </div>
                  </div>

                  {/* Incoming Invites Grid */}
                  {incomingRequests.length > 0 && (
                    <div className="space-y-3.5 border-b border-slate-200/50 dark:border-slate-800/50 pb-5">
                      <h4 className="font-extrabold text-[11px] sm:text-xs text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                        Pending Partner Invites ({incomingRequests.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {incomingRequests.map((req) => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-200/40 dark:border-indigo-850/40"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.name)}`}
                                alt={req.name}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-850 p-1 border border-slate-250 dark:border-slate-800 object-cover shrink-0"
                              />
                              <div className="min-w-0 text-left">
                                <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                  {req.name}
                                </h5>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  LVL {req.level || 1} • {req.major}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleDeclineRequest(req.id)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/35 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                title="Decline Invite"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleAcceptRequest(req)}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {friends.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/50 text-slate-400 w-fit mx-auto">
                        <Users className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">No study partners added yet</h4>
                        <p className="text-xs text-slate-400 mt-1">Add friends above to start tracking study progress together!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {friends.map(friend => {
                        const isSent = !!sentInvites[friend.id];
                        return (
                          <div
                            key={friend.id}
                            className="flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-md transition-all duration-300 space-y-4"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Friend Avatar */}
                                <div className="relative shrink-0">
                                  <img
                                    src={friend.avatar}
                                    alt={friend.name}
                                    className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 object-cover"
                                  />
                                  {friend.status === "studying" && (
                                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500 border border-white dark:border-slate-900"></span>
                                    </span>
                                  )}
                                  {friend.status === "online" && (
                                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white dark:border-slate-900"></span>
                                    </span>
                                  )}
                                  {friend.status === "offline" && (
                                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400 border border-white dark:border-slate-900"></span>
                                    </span>
                                  )}
                                </div>

                                {/* Details */}
                                <div className="min-w-0">
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                    {friend.name}
                                  </h4>
                                  <span className="inline-block text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md mt-0.5">
                                    LVL {friend.level} • {friend.major}
                                  </span>
                                </div>
                              </div>

                              {/* Status Badge & Trash Action */}
                              <div className="shrink-0 flex items-center gap-1.5">
                                <div>
                                  {friend.status === "studying" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/30 dark:border-purple-800/30">
                                      Studying
                                    </span>
                                  ) : friend.status === "online" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-800/30">
                                      Online
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200/20 dark:border-slate-700/20">
                                      Offline
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    deleteFriend(friend.id);
                                    showToast(`Removed ${friend.name} from partners.`);
                                  }}
                                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                                  title="Remove partner"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Current Activity Message */}
                            {friend.status === "studying" && friend.currentActivity && (
                              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/20">
                                Studying: "{friend.currentActivity}"
                              </div>
                            )}

                            {/* Actions button group (Invite & Chat) */}
                            <div className="flex gap-2 w-full">
                              <button
                                onClick={() => {
                                  setSentInvites(prev => ({ ...prev, [friend.id]: true }));
                                  showToast(`Focus invite sent to ${friend.name}!`);
                                  setTimeout(() => {
                                    setSentInvites(prev => ({ ...prev, [friend.id]: false }));
                                  }, 5000);
                                }}
                                disabled={isSent || friend.status === "offline"}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${isSent
                                  ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30"
                                  : friend.status === "offline"
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-750"
                                  }`}
                              >
                                <Send className="h-3 w-3" />
                                <span>{isSent ? "Sent ✉️" : "Invite"}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveChatFriend(friend);
                                }}
                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/30 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Chat</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "customize" && (
              <motion.div
                key="customize"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Profile Form */}
                <div className="glass-card p-3.5 sm:p-6 rounded-3xl space-y-6">
                  <h3 className="text-xl font-bold border-b border-slate-200/50 dark:border-slate-800/50 pb-3 flex items-center gap-2">
                    <Settings className="text-indigo-500 h-5 w-5" />
                    <span>Edit Scholar Details</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Profile Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">Display Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm text-slate-850 dark:text-slate-300"
                      />
                    </div>

                    {/* Scholar Title */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">Scholar Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Calculus Conqueror, Deep Worker..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm text-slate-850 dark:text-slate-300"
                      />
                    </div>

                    {/* Major Subject */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">Preparing For (Goal)</label>
                      <input
                        type="text"
                        value={major}
                        onChange={e => setMajor(e.target.value)}
                        placeholder="e.g. JEE, GATE, College Semester, School Exam, CA, RRB, SSC..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm text-slate-850 dark:text-slate-350"
                      />
                    </div>

                    {/* Profile Email */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm text-slate-850 dark:text-slate-300"
                      />
                    </div>

                    {/* Scholar Level */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">Scholar Level (Read Only)</label>
                      <input
                        type="number"
                        readOnly
                        value={level}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 cursor-not-allowed focus:outline-none font-bold text-sm text-slate-400 dark:text-slate-500"
                        title="Level is calculated automatically based on study XP"
                      />
                    </div>

                    {/* Current XP */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">Current XP (Read Only)</label>
                      <input
                        type="number"
                        readOnly
                        value={xp}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 cursor-not-allowed focus:outline-none font-bold text-sm text-slate-400 dark:text-slate-500"
                        title="XP is accumulated by focusing, doing tasks, and tracking habits"
                      />
                    </div>
                  </div>

                  {/* Scholar Bio */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">Scholar Motto / Bio</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Write a custom motto or short bio..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm text-slate-850 dark:text-slate-300 resize-none"
                    />
                  </div>

                  {/* Avatar Seed */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">Avatar Generation Seed</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={avatarSeed}
                        onChange={e => setAvatarSeed(e.target.value)}
                        placeholder="Enter any text to generate botavatar"
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 focus:outline-none text-sm font-medium text-slate-800 dark:text-white"
                      />
                      <button
                        onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                        className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Random
                      </button>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-2 flex justify-end items-center gap-4">
                    <button
                      onClick={handleSave}
                      className="px-6 py-3 rounded-xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-md cursor-pointer w-full sm:w-auto text-center"
                    >
                      Save Scholar Details
                    </button>
                  </div>
                </div>

                {/* Theme Preferences */}
                <div className="glass-card p-6 rounded-3xl space-y-4">
                  <h3 className="font-bold text-lg">App Preferences</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Dark Mode</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Toggle dark theme for night study sessions.</p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      {darkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-indigo-500" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Direct Chat Overlay Window */}
      <AnimatePresence>
        {activeChatFriend && (
          <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragConstraints={{
              left: -window.innerWidth + 400,
              right: 20,
              top: -window.innerHeight + 500,
              bottom: 20
            }}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] sm:max-w-md h-[480px] z-50 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden backdrop-blur-md"
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onPointerDown={(e) => dragControls.start(e)}
                  className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 cursor-move shrink-0 touch-none"
                  title="Drag to move"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <div className="relative shrink-0">
                  <img
                    src={activeChatFriend.avatar}
                    alt={activeChatFriend.name}
                    className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 object-cover bg-white"
                  />
                  {activeChatFriend.status === "studying" && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500 border border-white dark:border-slate-900"></span>
                    </span>
                  )}
                  {activeChatFriend.status === "online" && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-slate-900"></span>
                    </span>
                  )}
                  {activeChatFriend.status === "offline" && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400 border border-white dark:border-slate-900"></span>
                    </span>
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {activeChatFriend.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {activeChatFriend.status === "studying" ? "Studying" : activeChatFriend.status === "online" ? "Online" : "Offline"} • {activeChatFriend.major}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveChatFriend(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-slate-50/30 dark:bg-slate-900/10">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-center p-6 space-y-2">
                  <MessageSquare className="h-8 w-8 stroke-1" />
                  <p className="text-xs font-medium">No messages yet. Send a spark of motivation to start the conversation!</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMyMsg = msg.senderId === userUid;
                  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMyMsg ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm flex flex-col gap-1 ${isMyMsg
                          ? 'bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 rounded-bl-none'
                          }`}
                      >
                        <p className="leading-relaxed break-words text-left">{msg.text}</p>
                        <span className={`text-[8px] font-bold self-end ${isMyMsg ? 'text-blue-105' : 'text-slate-400'}`}>
                          {time}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-250/20 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium text-xs text-slate-850 dark:text-slate-200"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 text-white shadow-md hover:opacity-95 flex items-center justify-center cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deactivate Account Confirmation Modal */}
      <AnimatePresence>
        {/* Update Available Modal */}
        {showUpdateModal && updateInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-md w-full space-y-5 text-center"
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <ArrowUpCircle className="h-7 w-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-950 dark:text-white">
                  Update Available!
                </h3>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 dark:text-slate-400">
                    v{CURRENT_VERSION}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-black text-indigo-600 dark:text-indigo-400">
                    v{updateInfo.latestVersion}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/50 text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  What's New
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {updateInfo.releaseNotes}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Later
                </button>
                <button
                  onClick={handleDownloadUpdate}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download & Update</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeactivateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-md w-full space-y-6 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-500 border border-rose-200/30">
                <Trash2 className="h-6 w-6 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-950 dark:text-white">
                  Deactivate Scholar Account?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  This will permanently delete your identity, credentials, notes, stats, and all progress records. This action is **irreversible**.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-left text-[11px] font-bold text-slate-500 block mb-1">
                  Type <span className="text-rose-600 dark:text-rose-500 select-all">DEACTIVATE</span> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="DEACTIVATE"
                  value={deactivateConfirmText}
                  onChange={(e) => setDeactivateConfirmText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500/30 font-bold text-center tracking-wider text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeactivateModal(false);
                    setDeactivateConfirmText("");
                  }}
                  disabled={deactivating}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-600 dark:text-slate-400 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={deactivateConfirmText !== "DEACTIVATE" || deactivating}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {deactivating ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deactivating...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
