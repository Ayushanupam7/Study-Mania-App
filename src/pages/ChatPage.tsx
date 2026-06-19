import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/store";
import { db, storage } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  limit,
  doc,
  setDoc,
  arrayUnion,
  getDocs,
  writeBatch,
  updateDoc
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
  Quote,
  RefreshCw,
  UserPlus,
  Sparkles,
  Check,
  Lock,
  Paperclip,
  MoreVertical,
  Trash2,
  XCircle,
  HelpCircle,
  Home
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
  { id: "classic", name: "Classic WhatsApp", lightBg: "#efeae2", darkBg: "#0b141a", gridColor: "rgba(0,0,0,0.03)", darkGridColor: "rgba(255,255,255,0.02)", preview: "bg-slate-300 dark:bg-slate-800" },
  { id: "sunset", name: "Warm Sunset", lightBg: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", darkBg: "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #11001c 100%)", gridColor: "rgba(255,255,255,0.1)", darkGridColor: "rgba(255,255,255,0.05)", preview: "bg-gradient-to-r from-pink-300 to-indigo-300 dark:from-purple-900 dark:to-indigo-950" },
  { id: "emerald", name: "Cozy Library", lightBg: "linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)", darkBg: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #022c22 100%)", gridColor: "rgba(14,165,233,0.05)", darkGridColor: "rgba(16,185,129,0.04)", preview: "bg-gradient-to-r from-sky-200 to-emerald-200 dark:from-emerald-950 dark:to-teal-900" },
  { id: "cyberpunk", name: "Midnight Neon", lightBg: "linear-gradient(135deg, #f5f3ff 0%, #fae8ff 100%)", darkBg: "linear-gradient(135deg, #09090b 0%, #1e1b4b 70%, #020617 100%)", gridColor: "rgba(139,92,246,0.08)", darkGridColor: "rgba(236,72,153,0.06)", preview: "bg-gradient-to-r from-violet-200 to-fuchsia-200 dark:from-violet-950 dark:to-slate-950" },
  { id: "minimal", name: "Slate Clean", lightBg: "#f8fafc", darkBg: "#0f172a", gridColor: "none", darkGridColor: "none", preview: "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800" }
];

const QUICK_PROMPTS = [
  "Hey! Want to solve this problem together? 🧠",
  "Let's start a focus session! ⏱️",
  "How is your learning progress going today? 🚀",
  "Found a great resource for our course! 📚",
];

const EMOJIS = [
  "📚", "✍️", "💡", "🚀", "🔥", "🧠", "🎓", "💻", "👏", "🙌", "❤️", "👍",
  "😂", "😮", "🎉", "✨", "🎯", "📝", "⏳", "📅", "💪", "🌟", "❓", "✅",
  "⭐", "💯", "🥺", "😊", "🥳", "🤔", "🤫", "🙏", "☀️", "☕", "🍕", "🎈"
];

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
  const [friendStatuses, setFriendStatuses] = useState<Record<string, { status: string; currentActivity?: string }>>({});

  // Custom states for premium features
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem("study_chat_wallpaper") || "classic");
  const [showWallpaperSelector, setShowWallpaperSelector] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<StudyQuote>(STUDY_QUOTES[0]);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; icon: string; left: number }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const activeUploadTaskRef = useRef<any>(null);

  // Search Global Users and Send Invitation States
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});
  const [localToast, setLocalToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Dropdown options menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const wallpaperSelectorRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  // Set random quote on mount
  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * STUDY_QUOTES.length);
    setCurrentQuote(STUDY_QUOTES[randomIdx]);
  }, [activeChatFriend]);

  // Click outside listener to close wallpaper selector, more menu & emoji picker
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wallpaperSelectorRef.current && !wallpaperSelectorRef.current.contains(e.target as Node)) {
        setShowWallpaperSelector(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Real-time listener for all database users to search
  useEffect(() => {
    let unsubscribe = () => { };
    if (userUid) {
      const q = collection(db, "users");
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const usersList: any[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const uid = docSnap.id;
            if (uid !== userUid) {
              usersList.push({
                id: uid,
                name: data.name || "Scholar",
                avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
                level: data.level !== undefined ? data.level : 1,
                major: data.major || "JEE Preparation",
                status: data.status || "offline",
                email: data.email || ""
              });
            }
          });
          setDbUsers(usersList);
        },
        (error) => {
          console.error("Error fetching db users:", error);
        }
      );
    }
    return () => unsubscribe();
  }, [userUid]);

  // Real-time listener for sent requests
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

  // Real-time listener for friends' live statuses from arena_sessions
  useEffect(() => {
    const q = collection(db, "arena_sessions");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statusesMap: Record<string, { status: string; currentActivity?: string }> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        statusesMap[docSnap.id] = {
          status: data.status || "offline",
          currentActivity: data.activity || ""
        };
      });
      setFriendStatuses(statusesMap);
    }, (error) => {
      console.error("Error loading live statuses:", error);
    });
    return () => unsubscribe();
  }, []);

  const getFriendStatus = (friendId: string) => {
    const live = friendStatuses[friendId];
    if (live) {
      return {
        status: live.status,
        currentActivity: live.currentActivity
      };
    }
    const friend = friends.find(f => f.id === friendId);
    return {
      status: friend?.status === "offline" ? "offline" : "online",
      currentActivity: ""
    };
  };

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
      const msgs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setChatMessages(msgs);

      // Real-time Seen Syncing: Mark received messages that are not seen as seen
      snapshot.docs.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.senderId !== userUid && !data.seen) {
          try {
            await updateDoc(doc(db, "chats", chatRoomId, "messages", docSnap.id), {
              seen: true
            });
          } catch (err) {
            console.error("Error updating seen status:", err);
          }
        }
      });
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
        timestamp: Date.now(),
        seen: false
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSendCheer = async () => {
    if (!userUid || !activeChatFriend) return;

    // Spawn floating sparks/fires with wavy keyframe dynamics!
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

  const handleSendFriendRequest = async (searchedUser: any) => {
    if (!userUid) return;
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

      showLocalToast(`Request sent to ${searchedUser.name}!`);
    } catch (e) {
      console.error("Error sending friend request:", e);
      showLocalToast("Failed to send invite.", "info");
    }
  };

  // Clear Firestore Messages for Active Chat Room
  const handleClearChatHistory = async () => {
    if (!userUid || !activeChatFriend) return;
    setShowMoreMenu(false);

    if (!window.confirm(`Are you sure you want to clear chat history with ${activeChatFriend.name}?`)) {
      return;
    }

    try {
      const chatRoomId = userUid < activeChatFriend.id ? `${userUid}_${activeChatFriend.id}` : `${activeChatFriend.id}_${userUid}`;
      const messagesSnap = await getDocs(collection(db, "chats", chatRoomId, "messages"));
      const batch = writeBatch(db);

      messagesSnap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
      showLocalToast("Chat history cleared!");
    } catch (e) {
      console.error("Error clearing chat:", e);
      showLocalToast("Failed to clear chat.", "info");
    }
  };

  const showLocalToast = (message: string, type: "success" | "info" = "success") => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  const spawnFloatingSparks = (char: string) => {
    const list = Array.from({ length: 10 }).map((_, i) => ({
      id: Date.now() + i,
      icon: char,
      left: Math.random() * 70 + 15 // percentage width
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

  const handleCancelUpload = () => {
    if (activeUploadTaskRef.current) {
      try {
        if (typeof activeUploadTaskRef.current.cancel === "function") {
          activeUploadTaskRef.current.cancel();
        } else if (typeof activeUploadTaskRef.current.abort === "function") {
          activeUploadTaskRef.current.abort();
        }
      } catch (err) {
        console.warn("Could not cancel upload task:", err);
      }
      activeUploadTaskRef.current = null;
    }
    setUploadingFile(false);
    setUploadProgress(0);
    showLocalToast("Upload cancelled.", "info");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userUid || !activeChatFriend) return;

    if (file.size > 10 * 1024 * 1024) {
      showLocalToast("File size should not exceed 10MB.", "info");
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const mediaType = isImage ? "image" : (isPdf ? "pdf" : "file");
    const fileName = file.name;

    try {
      let downloadUrl = "";
      
      try {
        const fileRef = ref(storage, `chats/${userUid}_${activeChatFriend.id}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);
        activeUploadTaskRef.current = uploadTask;

        uploadTask.on("state_changed", (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        });

        await uploadTask;
        downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
      } catch (storageErr) {
        const errCode = (storageErr as any)?.code;
        const errMsg = (storageErr as any)?.message;
        if (errCode === "storage/canceled" || errMsg === "Upload cancelled by user.") {
          throw new Error("Upload cancelled by user.");
        }
        console.warn("Firebase Storage failed. Using database base64 storage...", storageErr);
        if (file.size > 800 * 1024) {
          throw new Error("File is too large for database fallback storage. Please upload a smaller file (< 800KB).");
        }

        downloadUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          activeUploadTaskRef.current = {
            abort: () => {
              reader.abort();
              reject(new Error("Upload cancelled by user."));
            }
          };

          let progressVal = 0;
          const interval = setInterval(() => {
            progressVal = Math.min(progressVal + 20, 95);
            setUploadProgress(progressVal);
          }, 80);

          reader.onload = () => {
            clearInterval(interval);
            setUploadProgress(100);
            resolve(reader.result as string);
          };
          reader.onerror = (err) => {
            clearInterval(interval);
            reject(err);
          };
          reader.readAsDataURL(file);
        });
      }

      const chatRoomId = userUid < activeChatFriend.id ? `${userUid}_${activeChatFriend.id}` : `${activeChatFriend.id}_${userUid}`;
      await addDoc(collection(db, "chats", chatRoomId, "messages"), {
        senderId: userUid,
        senderName: user.name,
        text: `Sent an ${mediaType === "image" ? "image" : "document"}: ${fileName}`,
        timestamp: Date.now(),
        seen: false,
        mediaUrl: downloadUrl,
        mediaType: mediaType,
        mediaName: fileName,
        mediaSize: file.size
      });

      showLocalToast("File sent successfully!");
    } catch (err: any) {
      console.error("File upload failed:", err);
      if (err.message !== "Upload cancelled by user.") {
        showLocalToast(err.message || "Failed to upload file.", "info");
      }
    } finally {
      setUploadingFile(false);
      activeUploadTaskRef.current = null;
      e.target.value = "";
    }
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

  const globalScholarsSearchResults = searchQuery.trim()
    ? dbUsers.filter((u) => {
      if (friends.some((f) => f.id === u.id)) return false;
      const q = searchQuery.toLowerCase();
      const nameMatch = u.name?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const majorMatch = u.major?.toLowerCase().includes(q);
      return nameMatch || emailMatch || majorMatch;
    })
    : [];

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  return (
    <div className="flex h-full w-full bg-[#f0f2f5] dark:bg-[#111b21] overflow-hidden relative font-sans">
      {/* Background Floating Sparks Overlay - Wavy floating animations */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ y: "100vh", opacity: 1, scale: 0.5 }}
              animate={{
                y: "-10vh",
                opacity: [1, 1, 0.8, 0],
                scale: [0.5, 1.4, 1.8, 1.3],
                x: [0, -25, 25, -15, 15, 0],
                rotate: [0, 45, -45, 15, 0]
              }}
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

      {/* 1. Left Sidebar: Friends List & Search (WhatsApp Style) */}
      <div
        className={`w-full md:w-[360px] lg:w-[410px] border-r border-[#e9edef] dark:border-[#222e35] flex flex-col shrink-0 bg-white dark:bg-[#111b21] transition-all duration-300 ${activeChatFriend ? "hidden md:flex" : "flex"
          }`}
      >
        {/* Sidebar Header - WhatsApp Style */}
        <div className="p-3.5 bg-[#f0f2f5] dark:bg-[#202c33] flex justify-between items-center shrink-0 border-b border-[#e9edef] dark:border-[#222e35]">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar}
              alt="My Profile"
              className="w-10 h-10 rounded-full object-cover bg-white cursor-pointer border border-[#e9edef] dark:border-[#222e35]"
            />
            <div className="text-left">
              <h3 className="text-xs font-bold text-[#111b21] dark:text-[#e9edef] truncate max-w-[120px]">
                {user.name}
              </h3>
              <span className="text-[9px] text-[#667781] dark:text-[#8696a0] font-black uppercase">
                Lvl {user.level} Scholar
              </span>
            </div>
          </div>

          {/* Functional Header Icons */}
          <div className="flex items-center gap-2.5 text-[#54656f] dark:text-[#aebac1] relative" ref={moreMenuRef}>
            <button
              onClick={() => setActiveChatFriend(null)}
              className="p-1 hover:bg-slate-200/50 dark:hover:bg-[#374248] rounded-full transition-colors cursor-pointer"
              title="Chat Home"
            >
              <Home className="h-5 w-5 hover:text-[#00a884] dark:hover:text-[#00bfa5] transition-colors" />
            </button>

            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1 hover:bg-slate-200/50 dark:hover:bg-[#374248] rounded-full transition-colors cursor-pointer"
              title="More Options"
            >
              <MoreVertical className="h-5 w-5 hover:text-[#00a884] dark:hover:text-[#00bfa5] transition-colors" />
            </button>

            {/* Dropdown Menu Options */}
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-8 w-48 bg-white dark:bg-[#202c33] rounded-xl shadow-xl border border-[#e9edef] dark:border-[#222e35] py-2 z-50 text-left"
                >
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      searchInputRef.current?.focus();
                    }}
                    className="w-full px-4 py-2 text-xs font-semibold text-[#111b21] dark:text-[#e9edef] hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] flex items-center gap-2.5 cursor-pointer transition-colors duration-150"
                  >
                    <UserPlus className="h-4 w-4 text-[#54656f] dark:text-[#aebac1]" />
                    <span>Invite Study Partner</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowWallpaperSelector(true);
                    }}
                    className="w-full px-4 py-2 text-xs font-semibold text-[#111b21] dark:text-[#e9edef] hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] flex items-center gap-2.5 cursor-pointer transition-colors duration-150"
                  >
                    <Palette className="h-4 w-4 text-[#54656f] dark:text-[#aebac1]" />
                    <span>Change Theme Wallpaper</span>
                  </button>

                  {activeChatFriend && (
                    <>
                      <div className="border-t border-[#e9edef] dark:border-[#222e35] my-1" />
                      {/* <button
                        onClick={handleClearChatHistory}
                        className="w-full px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2.5 cursor-pointer transition-colors duration-150"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span>Clear Chat History</span>
                      </button> */}
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setActiveChatFriend(null);
                        }}
                        className="w-full px-4 py-2 text-xs font-semibold text-[#111b21] dark:text-[#e9edef] hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] flex items-center gap-2.5 cursor-pointer transition-colors duration-150"
                      >
                        <XCircle className="h-4 w-4 text-[#54656f] dark:text-[#aebac1]" />
                        <span>Close Current Chat</span>
                      </button>
                    </>
                  )}

                  <div className="border-t border-[#e9edef] dark:border-[#222e35] my-1" />
                  <div className="px-4 py-1 text-[9px] font-bold text-[#667781] dark:text-[#8696a0] flex items-center gap-1.5 uppercase tracking-wide">
                    <HelpCircle className="h-3 w-3 text-[#54656f] dark:text-[#aebac1]" />
                    <span>Study Mania v1.3</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search Bar - WhatsApp Style */}
        <div className="p-2 bg-white dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#222e35] shrink-0">
          <div className="relative flex items-center bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg px-3 py-1.5 gap-3.5">
            <Search className="h-4.5 w-4.5 text-[#54656f] dark:text-[#aebac1] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search or start a new study chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent border-none outline-none text-[#111b21] dark:text-[#e9edef] placeholder-[#667781] dark:placeholder-[#8696a0] font-semibold"
            />
          </div>
        </div>

        {/* Toast Alert */}
        <AnimatePresence>
          {localToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mt-2 p-2 rounded-lg text-[9px] font-black uppercase tracking-wider text-center border shadow-xs bg-[#d9fdd3] dark:bg-[#005c4b]/30 text-[#111b21] dark:text-[#e9edef] border-transparent"
            >
              <span>{localToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partners & Global Scholars List - WhatsApp Style */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5] dark:divide-[#222e35] custom-scrollbar bg-white dark:bg-[#111b21]">

          {/* Section 1: Existing Partners */}
          {filteredFriends.length > 0 && (
            <div className="flex flex-col">
              {searchQuery && (
                <div className="text-[9px] font-bold text-[#667781] dark:text-[#8696a0] uppercase px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33]/40 tracking-wider">
                  Existing Partners
                </div>
              )}
              {filteredFriends.map(friend => {
                const lastMsg = lastMessages[friend.id];
                const isActive = activeChatFriend?.id === friend.id;

                return (
                  <div
                    key={friend.id}
                    onClick={() => setActiveChatFriend(friend)}
                    className={`px-4 py-3 flex gap-3.5 cursor-pointer transition-colors duration-150 relative border-b border-[#f0f2f5] dark:border-[#222e35]/30 text-left ${isActive
                      ? "bg-[#eaebeb] dark:bg-[#2a3942]"
                      : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/50"
                      }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-12 h-12 rounded-full object-cover bg-white"
                      />
                      {getFriendStatus(friend.id).status === "online" && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#1fa855] rounded-full border-2 border-white dark:border-[#111b21] shadow-sm" />
                      )}
                      {getFriendStatus(friend.id).status === "studying" && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white dark:border-[#111b21] flex items-center justify-center shadow-md animate-pulse">
                          <Flame className="h-2 w-2 text-white shrink-0" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-semibold text-sm text-[#111b21] dark:text-[#e9edef] truncate">
                          {friend.name}
                        </h4>
                        {lastMsg && (
                          <span className="text-[10px] text-[#667781] dark:text-[#8696a0] font-normal shrink-0 ml-2">
                            {formatTime(lastMsg.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-[12px] text-[#667781] dark:text-[#8696a0] truncate flex-1 font-normal">
                          {lastMsg ? lastMsg.text : `${friend.major} • Level ${friend.level}`}
                        </p>
                        {getFriendStatus(friend.id).status === "studying" && (
                          <span className="text-[7px] bg-orange-500/10 text-orange-500 font-black px-1.5 py-0.5 rounded tracking-widest shrink-0 uppercase animate-pulse">
                            STUDYING
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 2: Global Search Results - styled as glass cards */}
          {globalScholarsSearchResults.length > 0 && (
            <div className="flex flex-col p-2 space-y-1.5 bg-[#f0f2f5]/50 dark:bg-[#111b21]/20">
              <div className="text-[9px] font-black text-[#00a884] dark:text-[#00bfa5] uppercase px-2 py-1 tracking-wider flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Find New Study Partners</span>
              </div>
              {globalScholarsSearchResults.map(scholar => {
                const isSent = sentRequests[scholar.id];
                return (
                  <div
                    key={scholar.id}
                    className="p-3 rounded-xl bg-white dark:bg-[#202c33] border border-[#e9edef] dark:border-[#222e35] flex items-center justify-between gap-3.5 hover:shadow-xs transition-all duration-200"
                  >
                    <div className="flex gap-2.5 min-w-0 items-center">
                      <div className="relative shrink-0">
                        <img
                          src={scholar.avatar}
                          alt={scholar.name}
                          className="w-10 h-10 rounded-full object-cover bg-white"
                        />
                        {scholar.status === "online" && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#1fa855] rounded-full border border-white dark:border-[#202c33] shadow-md" />
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <h4 className="font-semibold text-xs text-[#111b21] dark:text-[#e9edef] truncate flex items-center gap-1">
                          {scholar.name}
                          <span className="text-[8px] bg-[#f0f2f5] dark:bg-[#111b21] text-[#667781] dark:text-[#8696a0] px-1.5 py-0.5 rounded font-black">
                            Lvl {scholar.level}
                          </span>
                        </h4>
                        <p className="text-[9px] text-[#667781] dark:text-[#8696a0] truncate mt-0.5 font-semibold text-left">
                          {scholar.major}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => !isSent && handleSendFriendRequest(scholar)}
                      disabled={isSent}
                      className={`p-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95 duration-200 shrink-0 ${isSent
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-[#00a884] text-white hover:bg-[#008f72] shadow-xs"
                        }`}
                    >
                      {isSent ? (
                        <Check className="h-3 w-3.5" />
                      ) : (
                        <UserPlus className="h-3 w-3.5" />
                      )}
                      <span>{isSent ? "Sent" : "Invite"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {filteredFriends.length === 0 && globalScholarsSearchResults.length === 0 && (
            <div className="py-20 px-6 text-center space-y-3 bg-white dark:bg-[#111b21]">
              <User className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto stroke-1.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No study partners found</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-550">
                  {searchQuery
                    ? "Try a different name, major, or email search query."
                    : "Invite partners from your Profile standings to start studying."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Right Pane: Chat Interface (Active or WhatsApp style connection layout) */}
      <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 ${!activeChatFriend ? "hidden md:flex" : "flex"}`}>
        <AnimatePresence mode="wait">
          {activeChatFriend ? (
            <motion.div
              key={activeChatFriend.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex-1 flex flex-col h-full overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]"
            >
              {/* Active Chat Header - WhatsApp Style */}
              <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between shrink-0 border-b border-[#e9edef] dark:border-[#222e35]/30 z-20">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActiveChatFriend(null)}
                    className="md:hidden p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbd9] dark:hover:bg-[#374248] cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  {/* Avatar with Status badge */}
                  <div className="relative shrink-0">
                    <img
                      src={activeChatFriend.avatar}
                      alt={activeChatFriend.name}
                      className="w-10 h-10 rounded-full object-cover bg-white"
                    />
                    {getFriendStatus(activeChatFriend.id).status === "online" && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#1fa855] rounded-full border-2 border-white dark:border-[#202c33] shadow-md" />
                    )}
                    {getFriendStatus(activeChatFriend.id).status === "studying" && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-orange-500 rounded-full border-2 border-white dark:border-[#202c33] flex items-center justify-center shadow-md">
                        <Flame className="h-2 w-2 text-white" />
                      </span>
                    )}
                  </div>

                  {/* Friend Details */}
                  <div className="min-w-0 text-left">
                    <h3 className="font-semibold text-sm text-[#111b21] dark:text-[#e9edef] truncate flex items-center gap-1.5">
                      {activeChatFriend.name}
                      <span className="text-[9px] bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] px-2 py-0.5 rounded-full font-black">
                        Lvl {activeChatFriend.level}
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#667781] dark:text-[#8696a0] truncate font-normal flex items-center gap-1 mt-0.5">
                      {getFriendStatus(activeChatFriend.id).status === "studying" ? (
                        <span className="text-orange-500 flex items-center gap-0.5">
                          <Flame className="h-3 w-3 shrink-0 animate-bounce" />
                          Studying: {getFriendStatus(activeChatFriend.id).currentActivity || "Academics"}
                        </span>
                      ) : getFriendStatus(activeChatFriend.id).status === "online" ? (
                        <span className="text-[#1fa855] font-semibold">online</span>
                      ) : (
                        "offline"
                      )}
                      <span>•</span>
                      <span>{activeChatFriend.major}</span>
                    </p>
                  </div>
                </div>

                {/* Header Action Controls */}
                <div className="flex items-center gap-3 relative text-[#54656f] dark:text-[#aebac1]">
                  {/* Cheer button */}
                  {activeChatFriend.status === "studying" && (
                    <button
                      onClick={handleSendCheer}
                      disabled={!!cheerSent}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 duration-200 ${cheerSent
                        ? "bg-emerald-500 text-white shadow-md"
                        : "bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-500/20"
                        }`}
                    >
                      <Zap className={`h-3.5 w-3.5 ${cheerSent ? "animate-ping" : "animate-pulse"}`} />
                      <span className="hidden sm:inline">{cheerSent ? "Energy Sent!" : "Cheer Partner"}</span>
                    </button>
                  )}

                  {/* Clear Chat History Trigger */}
                  <button
                    onClick={handleClearChatHistory}
                    className="p-2 text-[#54656f] dark:text-[#aebac1] hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                    title="Clear Chat History"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>

                  {/* Wallpaper Switcher Trigger */}
                  <div className="relative" ref={wallpaperSelectorRef}>
                    <button
                      onClick={() => setShowWallpaperSelector(!showWallpaperSelector)}
                      className="p-2 text-[#54656f] dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-[#e9edef] rounded-full hover:bg-[#d9dbd9] dark:hover:bg-[#374248] transition-colors cursor-pointer"
                      title="Chat Wallpapers"
                    >
                      <Palette className="h-5 w-5" />
                    </button>

                    {/* Wallpaper Dropdown panel with horizontal previews */}
                    <AnimatePresence>
                      {showWallpaperSelector && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2.5 w-60 bg-white dark:bg-[#202c33] rounded-2xl shadow-xl border border-[#e9edef] dark:border-[#222e35] p-3.5 z-50"
                        >
                          <div className="text-[10px] font-black text-[#667781] dark:text-[#8696a0] uppercase px-1 py-0.5 tracking-wider mb-2.5 text-left">
                            Choose Theme Wallpaper
                          </div>
                          <div className="flex gap-2 justify-between">
                            {WALLPAPERS.map((wp) => (
                              <button
                                key={wp.id}
                                onClick={() => selectWallpaper(wp.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${wp.preview} ${wallpaper === wp.id
                                  ? "ring-4 ring-sky-500 ring-offset-2 dark:ring-offset-[#111b21] scale-110"
                                  : "hover:scale-105"
                                  }`}
                                title={wp.name}
                              >
                                {wallpaper === wp.id && (
                                  <Check className="h-4 w-4 text-sky-500 bg-white dark:bg-[#111b21] rounded-full p-0.5" />
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="text-[9px] text-center text-[#667781] dark:text-[#8696a0] mt-2 font-bold uppercase tracking-wide">
                            {WALLPAPERS.find(w => w.id === wallpaper)?.name}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Chat Messages Log Panel - WhatsApp Style Background doodle/grid */}
              <div
                className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3 relative custom-scrollbar transition-all duration-300"
                style={getWallpaperStyles()}
              >
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-650 space-y-3 bg-white/60 dark:bg-[#111b21]/40 rounded-3xl p-8 max-w-sm mx-auto my-20 border border-slate-200/20 dark:border-slate-800/30">
                    <div className="p-3 bg-[#d9fdd3] dark:bg-[#005c4b]/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
                      <MessageSquare className="h-8 w-8 stroke-1.5" />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350">No academic discussions yet</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-relaxed">
                        Start the learning chat! Send a question, share progress, or greet your study partner below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-w-4xl mx-auto">
                    {chatMessages.map((msg, index) => {
                      const isMe = msg.senderId === userUid;
                      const nextMsg = chatMessages[index + 1];
                      const isConsecutive = nextMsg && nextMsg.senderId === msg.senderId;

                      return (
                        <motion.div
                          layout
                          key={msg.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                          className={`flex w-full ${isMe ? "justify-end" : "justify-start"} ${isConsecutive ? "mb-0.5" : "mb-2.5"}`}
                        >
                          <div
                            className={`max-w-[75%] sm:max-w-[65%] px-3 py-2 shadow-xs relative text-left rounded-lg ${isMe
                              ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none"
                              : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none"
                              }`}
                          >
                            {!isMe && !isConsecutive && (
                              <p className="text-[10px] font-bold text-sky-600 dark:text-[#00bfa5] mb-0.5">
                                {msg.senderName}
                              </p>
                            )}
                            {msg.mediaUrl ? (
                              msg.mediaType === "image" ? (
                                <div className="my-1 rounded-lg overflow-hidden border border-slate-150/40 dark:border-slate-800 bg-[#f0f2f5] dark:bg-[#111b21]/40 max-w-full">
                                  <img
                                    src={msg.mediaUrl}
                                    alt={msg.mediaName || "Uploaded Image"}
                                    className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => window.open(msg.mediaUrl, "_blank")}
                                  />
                                  {msg.mediaName && (
                                    <div className="p-2 text-[10.5px] text-slate-600 dark:text-slate-455 font-semibold bg-white/70 dark:bg-[#202c33]/60 truncate">
                                      {msg.mediaName}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div 
                                  onClick={() => window.open(msg.mediaUrl, "_blank")}
                                  className="my-1.5 p-3 rounded-xl border border-[#e9edef] dark:border-[#222e35] bg-slate-50 dark:bg-[#111b21]/80 hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] transition-colors cursor-pointer flex items-center justify-between gap-3 text-left"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-2 bg-red-500/10 dark:bg-red-500/20 text-red-500 rounded-lg shrink-0">
                                      <span className="font-black text-[9px] uppercase tracking-wide">PDF</span>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[#111b21] dark:text-[#e9edef] truncate">
                                        {msg.mediaName || "Document.pdf"}
                                      </p>
                                      <p className="text-[9px] text-[#667781] dark:text-[#8696a0] mt-0.5 uppercase tracking-wider font-semibold">
                                        {msg.mediaSize ? `${(msg.mediaSize / (1024 * 1024)).toFixed(2)} MB` : "Document"}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-[#00a884] dark:text-[#00bfa5] font-black uppercase shrink-0">
                                    Open
                                  </span>
                                </div>
                              )
                            ) : (
                              <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap font-normal">{msg.text}</p>
                            )}

                            {/* Message metadata - time stamp bottom right */}
                            <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                              <span
                                className="text-[9px] text-[#667781] dark:text-[#8696a0]"
                              >
                                {formatTime(msg.timestamp)}
                              </span>
                              {isMe && (
                                <CheckCheck 
                                  className={`h-3.5 w-3.5 shrink-0 ${
                                    msg.seen 
                                      ? "text-[#53bdeb]" 
                                      : "text-[#8696a0] dark:text-[#54656f]"
                                  }`} 
                                />
                              )}
                            </div>

                            {/* Bubble Tails - WhatsApp Triangle style */}
                            {!isConsecutive && (
                              <span
                                className={`absolute top-0 w-0 h-0 border-[6px] border-transparent ${isMe
                                  ? "right-[-8px] border-t-[#d9fdd3] border-l-[#d9fdd3] dark:border-t-[#005c4b] dark:border-l-[#005c4b]"
                                  : "left-[-8px] border-t-white border-r-white dark:border-t-[#202c33] dark:border-r-[#202c33]"
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

              {/* Quick Prompts Chips */}
              <div className="px-4 py-2 bg-[#f0f2f5]/80 dark:bg-[#111b21]/80 border-t border-[#e9edef] dark:border-[#222e35]/30 flex flex-row flex-nowrap gap-1.5 shrink-0 z-10 select-none overflow-x-auto scrollbar-none whitespace-nowrap">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(undefined, prompt)}
                    className="inline-flex px-3 py-1 rounded-full text-[10px] font-semibold bg-white dark:bg-[#202c33] hover:bg-[#d9fdd3] dark:hover:bg-[#005c4b] text-[#54656f] dark:text-[#aebac1] border border-[#e9edef] dark:border-[#222e35]/40 shadow-3xs transition-all active:scale-95 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Message Input Panel - WhatsApp Style */}
              <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222e35]/30 shrink-0 z-10">
                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-4 items-center relative max-w-5xl mx-auto text-[#54656f] dark:text-[#aebac1]"
                >
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Emoji picker launcher */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-1 hover:bg-[#d9dbd9] dark:hover:bg-[#374248] rounded-full transition-all shrink-0 cursor-pointer ${showEmojiPicker ? "text-[#00bfa5]" : ""
                          }`}
                      >
                        <Smile className="h-6 w-6" />
                      </button>

                      {/* Emoji Quick Picker Panel */}
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <>
                            {/* Backdrop overlay for mobile */}
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.4 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setShowEmojiPicker(false)}
                              className="fixed inset-0 bg-black/60 z-40 md:hidden pointer-events-auto"
                            />

                            {/* Panel: fixed bottom sheet on mobile, absolute popover on desktop */}
                            <motion.div
                              ref={emojiPickerRef}
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 30 }}
                              className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-12 md:left-0 md:right-auto md:w-64 bg-white dark:bg-[#202c33] rounded-t-3xl md:rounded-2xl shadow-2xl border-t border-[#e9edef] dark:border-[#222e35] md:border p-4 z-50 overflow-y-auto"
                            >
                              {/* Header for mobile layout */}
                              <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-[#e9edef] dark:border-[#222e35] md:hidden">
                                <span className="text-xs font-bold text-[#111b21] dark:text-[#e9edef] uppercase tracking-wider">
                                  Quick Emojis
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowEmojiPicker(false)}
                                  className="text-xs font-black uppercase text-[#00a884] dark:text-[#00bfa5]"
                                >
                                  Done
                                </button>
                              </div>

                              <div className="grid grid-cols-6 gap-2 justify-items-center">
                                {EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleEmojiClick(emoji)}
                                    className="text-2xl hover:scale-125 transition-all duration-150 p-1.5 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#111b21]/60 cursor-pointer flex items-center justify-center"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Paperclip file uploader */}
                    <input
                      type="file"
                      id="media-file-input"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      disabled={uploadingFile}
                    />
                    <label
                      htmlFor="media-file-input"
                      className="p-1 hover:bg-[#d9dbd9] dark:hover:bg-[#374248] rounded-full transition-colors cursor-pointer flex items-center justify-center text-[#54656f] dark:text-[#aebac1]"
                      title="Attach Image or PDF"
                    >
                      <Paperclip className="h-5 w-5" />
                    </label>
                  </div>

                  {/* WhatsApp style text input / Upload progress loader */}
                  {uploadingFile ? (
                    <div className="flex-1 px-4 py-2 bg-white/95 dark:bg-[#2a3942]/95 rounded-lg flex items-center justify-between gap-3 text-xs border border-slate-150/40 dark:border-slate-805">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <svg className="animate-spin h-4 w-4 shrink-0 text-[#00a884] dark:text-[#00bfa5]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1 text-left">
                            <span className="font-semibold text-slate-700 dark:text-slate-350 truncate">
                              Uploading file...
                            </span>
                            <span className="font-black text-[10px] text-[#00a884] dark:text-[#00bfa5] shrink-0">
                              {uploadProgress}%
                            </span>
                          </div>
                          {/* Progress bar line */}
                          <div className="w-full bg-[#f0f2f5] dark:bg-[#111b21] rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-[#00a884] dark:bg-[#00bfa5] h-1 rounded-full transition-all duration-150" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelUpload}
                        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer shrink-0 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Type a study message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-[13px] bg-white dark:bg-[#2a3942] border border-transparent dark:border-transparent rounded-lg focus:outline-none text-[#111b21] dark:text-[#e9edef] placeholder-[#667781] dark:placeholder-[#8696a0] font-normal transition-all"
                    />
                  )}

                  {/* Send circular green button */}
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="h-10 w-10 bg-[#00a884] text-white hover:bg-[#008f72] disabled:opacity-40 rounded-full flex items-center justify-center cursor-pointer shrink-0 transition-colors shadow-xs active:scale-95"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            /* Empty Chat Area State - WhatsApp Web Connection Style */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f8fafc] dark:bg-[#222e35]/30 border-b-6 border-[#00a884] dark:border-[#00bfa5]"
            >
              <div className="max-w-md w-full space-y-6 flex flex-col items-center">

                {/* Connecting computer/phone illustration */}
                <div className="w-64 h-36 bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/20 dark:to-teal-900/5 border border-emerald-500/10 rounded-3xl flex items-center justify-center shadow-3xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                  <div className="w-16 h-16 rounded-full bg-[#00a884]/15 flex items-center justify-center text-[#00a884] shadow-md shadow-[#00a884]/10 animate-pulse">
                    <MessageSquare className="h-8 w-8 stroke-1.5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-light text-2xl text-[#111b21] dark:text-[#e9edef] tracking-tight">
                    Study Mania Web
                  </h3>
                  <p className="text-[12.5px] text-[#667781] dark:text-[#8696a0] leading-relaxed font-normal max-w-sm">
                    Discuss courses, solve problems, and share progress. Select any study partner from the left, or use search to find global scholars to connect.
                  </p>
                </div>

                {/* Encrypted / Secure subtext */}
                <div className="text-[#667781] dark:text-[#8696a0] flex items-center gap-1.5 text-xs font-semibold pt-4">
                  <Lock className="h-3 w-3" />
                  <span>Study Partner Connections • Secure real-time syncing</span>
                </div>

                {/* Daily Motivation Quote box */}
                <div className="w-full p-4 bg-white dark:bg-[#202c33] rounded-2xl border border-[#e9edef] dark:border-[#222e35]/60 text-left mt-2 shadow-3xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-[#00a884] dark:text-[#00bfa5] tracking-wider uppercase flex items-center gap-1">
                      <Quote className="h-3 w-3" />
                      Academic Quote
                    </span>
                    <button
                      onClick={rotateQuote}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#00a884] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Next Quote"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[11.5px] text-[#111b21] dark:text-[#e9edef] italic font-semibold leading-normal">
                    "{currentQuote.text}"
                  </p>
                  <p className="text-[9px] text-[#667781] dark:text-[#8696a0] font-bold mt-1 text-right">
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
