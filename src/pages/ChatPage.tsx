import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/store";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  limit,
  doc,
  setDoc,
  arrayUnion
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  Send,
  ArrowLeft,
  Flame,
  User,
  Zap,
  CheckCheck,
  Smile,
  Palette,
  GraduationCap,
  Quote,
  RefreshCw
} from "lucide-react";

interface StudyQuote {
  text: string;
  author: string;
}

const STUDY_QUOTES: StudyQuote[] = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Procrastination is the thief of time.", author: "Edward Young" },
  { text: "Focused, hard work is the real key to success.", author: "John Carmack" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert" }
];

const WALLPAPERS = [
  { id: "classic", name: "Classic", lightBg: "#efeae2", darkBg: "#0b141a", gridColor: "rgba(0,0,0,0.03)", darkGridColor: "rgba(255,255,255,0.02)" },
  { id: "sunset", name: "Warm Sunset", lightBg: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", darkBg: "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #11001c 100%)", gridColor: "rgba(255,255,255,0.1)", darkGridColor: "rgba(255,255,255,0.05)" },
  { id: "emerald", name: "Cozy Library", lightBg: "linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)", darkBg: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%)", gridColor: "rgba(14,165,233,0.05)", darkGridColor: "rgba(16,185,129,0.04)" },
  { id: "cyberpunk", name: "Midnight Neon", lightBg: "linear-gradient(135deg, #f5f3ff 0%, #fae8ff 100%)", darkBg: "linear-gradient(135deg, #09090b 0%, #1e1b4b 70%, #020617 100%)", gridColor: "rgba(139,92,246,0.08)", darkGridColor: "rgba(236,72,153,0.06)" },
  { id: "minimal", name: "Slate Clean", lightBg: "#f8fafc", darkBg: "#0f172a", gridColor: "none", darkGridColor: "none" }
];

const QUICK_PROMPTS = [
  "Hey! Want to solve this problem together? 🧠",
  "Let's start a focus session! ⏱️",
  "How is your learning progress going today? 🚀",
  "Found a great resource for our course! 📚",
];

const EMOJIS = ["📚", "✍️", "💡", "🚀", "🔥", "🧠", "🎓", "💻", "👏", "🙌"];

export const ChatPage: React.FC = () => {
  const userUid = useStore(state => state.userUid);
  const user = useStore(state => state.user);
  const friends = useStore(state => state.friends);
  const activeChatFriend = useStore(state => state.activeChatFriend);
  const setActiveChatFriend = useStore(state => state.setActiveChatFriend);
  const darkMode = useStore(state => state.darkMode);

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastMessages, setLastMessages] = useState<Record<string, { text: string; timestamp: number }>>({});
  const [cheerSent, setCheerSent] = useState<string | null>(null);
  
  // Custom states for premium features
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem("study_chat_wallpaper") || "classic");
  const [showWallpaperSelector, setShowWallpaperSelector] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<StudyQuote>(STUDY_QUOTES[0]);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; icon: string; left: number }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const wallpaperSelectorRef = useRef<HTMLDivElement | null>(null);

  // Set random quote on mount
  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * STUDY_QUOTES.length);
    setCurrentQuote(STUDY_QUOTES[randomIdx]);
  }, [activeChatFriend]);

  // Click outside listener to close wallpaper selector
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wallpaperSelectorRef.current && !wallpaperSelectorRef.current.contains(e.target as Node)) {
        setShowWallpaperSelector(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // 1. Fetch last message for each friend room
  useEffect(() => {
    if (!userUid || friends.length === 0) return;

    const unsubscribes = friends.map(friend => {
      const chatRoomId = userUid < friend.id ? `${userUid}_${friend.id}` : `${friend.id}_${userUid}`;
      const q = query(
        collection(db, "chats", chatRoomId, "messages"),
        orderBy("timestamp", "desc"),
        limit(1)
      );

      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setLastMessages(prev => ({
            ...prev,
            [friend.id]: {
              text: data.text || "",
              timestamp: data.timestamp || 0
            }
          }));
        }
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [userUid, friends]);

  // 2. Real-time chat messages listener for active chat friend
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

  // 3. Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const textToSend = textOverride || chatInput.trim();
    if (!textToSend || !userUid || !activeChatFriend) return;

    if (!textOverride) setChatInput("");

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
    }
  };

  const handleSendCheer = async () => {
    if (!userUid || !activeChatFriend) return;
    
    // Spawn floating sparks/fires!
    spawnFloatingSparks("🔥");

    try {
      const arenaRef = doc(db, "arena_sessions", activeChatFriend.id);
      await setDoc(
        arenaRef,
        {
          cheers: arrayUnion({
            id: `cheer-${Date.now()}`,
            senderId: userUid,
            senderName: user.name,
            timestamp: Date.now(),
          }),
        },
        { merge: true }
      );
      setCheerSent(activeChatFriend.id);
      setTimeout(() => setCheerSent(null), 3000);
    } catch (error) {
      console.error("Error sending cheer:", error);
    }
  };

  const spawnFloatingSparks = (char: string) => {
    const list = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      icon: char,
      left: Math.random() * 80 + 10 // percentage width
    }));
    setFloatingHearts(prev => [...prev, ...list]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(item => !list.find(l => l.id === item.id)));
    }, 2000);
  };

  const handleEmojiClick = (emoji: string) => {
    setChatInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const selectWallpaper = (wpId: string) => {
    setWallpaper(wpId);
    localStorage.setItem("study_chat_wallpaper", wpId);
    setShowWallpaperSelector(false);
  };

  const getWallpaperStyles = () => {
    const selected = WALLPAPERS.find(w => w.id === wallpaper) || WALLPAPERS[0];
    const isDark = darkMode;
    const bg = isDark ? selected.darkBg : selected.lightBg;
    const grid = isDark ? selected.darkGridColor : selected.gridColor;

    return {
      background: bg,
      backgroundImage: grid !== "none" ? `${bg}, radial-gradient(${grid} 1.5px, transparent 1.5px)` : bg,
      backgroundSize: grid !== "none" ? "20px 20px" : "auto",
      backgroundBlendMode: "overlay"
    };
  };

  const rotateQuote = () => {
    const currentIdx = STUDY_QUOTES.findIndex(q => q.text === currentQuote.text);
    const nextIdx = (currentIdx + 1) % STUDY_QUOTES.length;
    setCurrentQuote(STUDY_QUOTES[nextIdx]);
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.major.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative font-sans">
      {/* Background Floating Sparks Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ y: "100vh", opacity: 1, scale: 0.5, rotate: 0 }}
              animate={{ y: "-10vh", opacity: 0, scale: 1.8, rotate: Math.random() * 90 - 45 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute text-3xl select-none"
              style={{ left: `${heart.left}%`, bottom: 0 }}
            >
              {heart.icon}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 1. Left Sidebar: Friends List (Hidden on mobile if a chat is active) */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200/60 dark:border-slate-800/40 flex flex-col shrink-0 bg-white dark:bg-slate-900/90 backdrop-blur-md transition-all duration-300 ${
          activeChatFriend ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 space-y-3.5">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-sky-500" />
              <span>Study Partners</span>
            </h2>
            <div className="flex items-center gap-1">
              <span className="text-[10px] bg-sky-500/10 text-sky-650 dark:text-sky-400 font-bold px-2 py-0.5 rounded-full">
                {friends.length} Active
              </span>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
            <input
              type="text"
              placeholder="Search study partners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-100 dark:bg-slate-800/80 border border-transparent dark:border-slate-800 focus:border-sky-500/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium transition-all"
            />
          </div>
        </div>

        {/* Partners List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40 custom-scrollbar">
          {filteredFriends.length === 0 ? (
            <div className="py-20 px-6 text-center space-y-3">
              <User className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto stroke-1.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No study partners found</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Invite partners from your Profile standings to start studying.</p>
              </div>
            </div>
          ) : (
            filteredFriends.map(friend => {
              const lastMsg = lastMessages[friend.id];
              const isActive = activeChatFriend?.id === friend.id;

              return (
                <div
                  key={friend.id}
                  onClick={() => setActiveChatFriend(friend)}
                  className={`p-4 flex gap-3.5 cursor-pointer transition-all duration-200 border-l-4 relative ${
                    isActive
                      ? "bg-sky-500/5 dark:bg-sky-500/5 border-sky-500 shadow-sm"
                      : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30 border-transparent"
                  }`}
                >
                  {/* Avatar Container with status dot */}
                  <div className="relative shrink-0">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-12 h-12 rounded-2xl bg-sky-100/30 dark:bg-sky-950/20 p-0.5 object-cover border border-slate-200/50 dark:border-slate-800"
                    />
                    {friend.status === "online" && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-md after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-emerald-500 after:animate-ping after:opacity-75" />
                    )}
                    {friend.status === "studying" && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md animate-pulse">
                        <Flame className="h-2 w-2 text-white shrink-0" />
                      </span>
                    )}
                  </div>

                  {/* Info details */}
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {friend.name}
                      </h4>
                      {lastMsg && (
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold shrink-0 ml-2">
                          {formatTime(lastMsg.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1 font-medium">
                        {lastMsg ? lastMsg.text : `${friend.major} • Level ${friend.level}`}
                      </p>
                      {friend.status === "studying" && (
                        <span className="text-[7px] bg-orange-500/10 text-orange-500 font-black px-1.5 py-0.5 rounded tracking-widest shrink-0 uppercase animate-pulse">
                          STUDYING
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right Pane: Chat Interface (Active or empty state) */}
      <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 ${!activeChatFriend ? "hidden md:flex" : "flex"}`}>
        <AnimatePresence mode="wait">
          {activeChatFriend ? (
            <motion.div
              key={activeChatFriend.id}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {/* Active Chat Header */}
              <div className="px-4 py-3 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shrink-0 shadow-sm z-20">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActiveChatFriend(null)}
                    className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer transition-all active:scale-95"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  {/* Avatar with Status badge */}
                  <div className="relative shrink-0">
                    <img
                      src={activeChatFriend.avatar}
                      alt={activeChatFriend.name}
                      className="w-11 h-11 rounded-2xl bg-sky-100/30 dark:bg-sky-950/20 p-0.5 object-cover border border-slate-200 dark:border-slate-800"
                    />
                    {activeChatFriend.status === "online" && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-md" />
                    )}
                    {activeChatFriend.status === "studying" && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md">
                        <Flame className="h-2 w-2 text-white" />
                      </span>
                    )}
                  </div>

                  {/* Friend Details */}
                  <div className="min-w-0 text-left">
                    <h3 className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                      {activeChatFriend.name}
                      <span className="text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-650 dark:text-sky-400 px-2 py-0.5 rounded-full font-black">
                        Lvl {activeChatFriend.level}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-bold flex items-center gap-1 mt-0.5">
                      {activeChatFriend.status === "studying" ? (
                        <span className="text-orange-500 flex items-center gap-0.5">
                          <Flame className="h-3 w-3 shrink-0 animate-bounce" />
                          Studying: {activeChatFriend.currentActivity || "Academics"}
                        </span>
                      ) : activeChatFriend.status === "online" ? (
                        <span className="text-emerald-500">Online now</span>
                      ) : (
                        "Offline"
                      )}
                      <span>•</span>
                      <span>{activeChatFriend.major}</span>
                    </p>
                  </div>
                </div>

                {/* Header Action Controls */}
                <div className="flex items-center gap-1.5 relative">
                  {/* Cheer button */}
                  {activeChatFriend.status === "studying" && (
                    <button
                      onClick={handleSendCheer}
                      disabled={!!cheerSent}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 duration-200 ${
                        cheerSent
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
                          : "bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-500/20"
                      }`}
                    >
                      <Zap className={`h-3.5 w-3.5 ${cheerSent ? "animate-ping" : "animate-pulse"}`} />
                      <span>{cheerSent ? "Energy Sent!" : "Cheer Partner"}</span>
                    </button>
                  )}

                  {/* Wallpaper Switcher Trigger */}
                  <div className="relative" ref={wallpaperSelectorRef}>
                    <button
                      onClick={() => setShowWallpaperSelector(!showWallpaperSelector)}
                      className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Chat Wallpapers"
                    >
                      <Palette className="h-4 w-4" />
                    </button>

                    {/* Wallpaper Dropdown panel */}
                    <AnimatePresence>
                      {showWallpaperSelector && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/60 p-2 z-50"
                        >
                          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase px-2.5 py-1.5 tracking-wider">
                            Choose Theme
                          </div>
                          <div className="space-y-1">
                            {WALLPAPERS.map((wp) => (
                              <button
                                key={wp.id}
                                onClick={() => selectWallpaper(wp.id)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                                  wallpaper === wp.id
                                    ? "bg-sky-500/10 text-sky-500"
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                }`}
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-slate-200/50 dark:border-slate-600/50 shrink-0"
                                  style={{
                                    background: darkMode ? wp.darkBg : wp.lightBg
                                  }}
                                />
                                {wp.name}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Chat Messages Log Panel */}
              <div
                className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative custom-scrollbar transition-all duration-300"
                style={getWallpaperStyles()}
              >
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 space-y-3 bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm rounded-3xl p-8 max-w-sm mx-auto my-20 border border-slate-200/20 dark:border-slate-800/30">
                    <div className="p-3 bg-sky-500/10 dark:bg-sky-500/5 rounded-2xl text-sky-500">
                      <MessageSquare className="h-8 w-8 stroke-1.5" />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-xs font-bold text-slate-650 dark:text-slate-350">No academic discussions yet</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-relaxed">
                        Start the learning chat! Send a question, share progress, or greet your study partner below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-4.5xl mx-auto">
                    {chatMessages.map((msg, index) => {
                      const isMe = msg.senderId === userUid;
                      const nextMsg = chatMessages[index + 1];
                      const isConsecutive = nextMsg && nextMsg.senderId === msg.senderId;

                      return (
                        <motion.div
                          layout
                          key={msg.id}
                          initial={{ opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                          className={`flex w-full ${isMe ? "justify-end" : "justify-start"} ${isConsecutive ? "mb-1" : "mb-3"}`}
                        >
                          <div
                            className={`max-w-[75%] sm:max-w-[62%] p-3.5 shadow-sm relative group text-left ${
                              isMe
                                ? "bg-gradient-to-tr from-sky-500 via-sky-550 to-blue-600 text-white rounded-2xl rounded-tr-none"
                                : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none border border-slate-100/50 dark:border-slate-750/30"
                            }`}
                          >
                            {!isMe && !isConsecutive && (
                              <p className="text-[9px] font-black text-sky-500 dark:text-sky-400 mb-1 uppercase tracking-wider">
                                {msg.senderName}
                              </p>
                            )}
                            <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                            
                            {/* Message metadata (time and status checks) */}
                            <div className="flex items-center justify-end gap-1 mt-1.5 opacity-80 select-none">
                              <span
                                className={`text-[8.5px] font-semibold ${
                                  isMe ? "text-sky-100/80" : "text-slate-400 dark:text-slate-500"
                                }`}
                              >
                                {formatTime(msg.timestamp)}
                              </span>
                              {isMe && (
                                <CheckCheck className="h-3 w-3 text-sky-100/90 shrink-0" />
                              )}
                            </div>

                            {/* Bubble Tails (only for first message in series) */}
                            {!isConsecutive && (
                              <span
                                className={`absolute top-0 w-3 h-3 ${
                                  isMe
                                    ? "right-[-6px] bg-blue-600 [clip-path:polygon(0_0,0_100%,100%_0)]"
                                    : "left-[-6px] bg-white dark:bg-slate-800 [clip-path:polygon(100%_0,0_0,100%_100%)]"
                                }`}
                              />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts Chips & Interactive Area */}
              <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200/40 dark:border-slate-800/40 flex flex-wrap gap-1.5 shrink-0 z-10 select-none overflow-x-auto scrollbar-none whitespace-nowrap">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(undefined, prompt)}
                    className="inline-flex px-3 py-1 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700/60 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Message Input Form Panel */}
              <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800/60 shrink-0 z-10">
                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-2 items-center relative"
                >
                  {/* Emoji drawer popup launcher */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                        showEmojiPicker
                          ? "bg-sky-500/10 text-sky-500"
                          : "text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Smile className="h-5.5 w-5.5" />
                    </button>

                    {/* Emoji Quick Picker Panel */}
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -15, scale: 0.95 }}
                          animate={{ opacity: 1, y: -5, scale: 1 }}
                          exit={{ opacity: 0, y: -15, scale: 0.95 }}
                          className="absolute bottom-12 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-150 dark:border-slate-700 p-2.5 z-50 flex gap-1.5"
                        >
                          {EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleEmojiClick(emoji)}
                              className="text-lg hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <input
                    type="text"
                    placeholder="Type a study message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-4 py-3 text-xs bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-800 focus:border-sky-500/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-semibold transition-all"
                  />
                  
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="h-10 w-10 bg-gradient-to-tr from-sky-450 via-sky-500 to-blue-600 hover:opacity-95 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center cursor-pointer shrink-0 transition-all shadow-md shadow-sky-550/15 active:scale-95"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            /* Empty Chat Area State with Quotes and Illustrations */
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950/20"
            >
              <div className="max-w-md w-full space-y-6">
                {/* Illustration Card */}
                <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-150/60 dark:border-slate-800/40 shadow-sm space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
                  
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 mx-auto">
                    <MessageSquare className="h-8 w-8 stroke-1.5" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-slate-100 tracking-tight">
                      Academic Chatroom
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Connect with study partners in real-time. Discuss questions, coordinate study goals, and keep each other accountable.
                    </p>
                  </div>

                  {/* Feature highlights */}
                  <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex gap-2 items-start p-2 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                      <GraduationCap className="h-4.5 w-4.5 text-sky-500 shrink-0" />
                      <div className="space-y-0.5">
                        <h5 className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Co-learning</h5>
                        <p className="text-[8.5px] text-slate-400 dark:text-slate-500 leading-normal">Solve complex topics together</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-start p-2 rounded-xl bg-slate-50 dark:bg-slate-800/20">
                      <Zap className="h-4.5 w-4.5 text-orange-500 shrink-0" />
                      <div className="space-y-0.5">
                        <h5 className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Live Cheers</h5>
                        <p className="text-[8.5px] text-slate-400 dark:text-slate-500 leading-normal">Boost energy when studying</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Motivation Quote box */}
                <div className="p-4 bg-gradient-to-r from-sky-500/5 to-indigo-500/5 rounded-2xl border border-sky-100/30 dark:border-sky-950/20 relative group text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-sky-500 dark:text-sky-400 tracking-wider uppercase flex items-center gap-1">
                      <Quote className="h-3 w-3" />
                      Study Quote
                    </span>
                    <button
                      onClick={rotateQuote}
                      className="p-1 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Next Quote"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-650 dark:text-slate-300 italic font-semibold leading-normal">
                    "{currentQuote.text}"
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-555 font-bold mt-1 text-right">
                    — {currentQuote.author}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatPage;
