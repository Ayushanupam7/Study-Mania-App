import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/store";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  orderBy,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import {
  Users,
  Key,
  Copy,
  Check,
  LogOut,
  Zap,
  Coffee,
  Trophy,
  Rocket,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  Send,
  MessageSquare,
  PlusCircle,
  Edit3,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { CheerOverlays } from "../components/pomodoro/CheerOverlays";
import type { CheerEvent } from "../components/pomodoro/CheerOverlays";

export const GroupRoomPage: React.FC = () => {
  const userUid = useStore((state) => state.userUid);
  const user = useStore((state) => state.user);
  const todos = useStore((state) => state.todos);
  const updateTodo = useStore((state) => state.updateTodo);
  const addTodo = useStore((state) => state.addTodo);
  const incrementSession = useStore((state) => state.incrementSession);
  const recordStudySession = useStore((state) => state.recordStudySession);

  const activeRoomId = useStore((state) => state.activeRoomId);
  const activeRoomName = useStore((state) => state.activeRoomName);
  const createRoom = useStore((state) => state.createRoom);
  const joinRoom = useStore((state) => state.joinRoom);
  const leaveRoom = useStore((state) => state.leaveRoom);
  const updateRoomTimerStatus = useStore((state) => state.updateRoomTimerStatus);
  const renameRoom = useStore((state) => state.renameRoom);

  // Lobby Inputs
  const [roomNameInput, setRoomNameInput] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [lobbyError, setLobbyError] = useState("");
  const [lobbyLoading, setLobbyLoading] = useState(false);

  // Always show lobby first on page load; set false to enter room view
  const [showLobby, setShowLobby] = useState(true);

  // Card Expansion States
  const [scholarsExpanded, setScholarsExpanded] = useState(false);
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const [inspectorExpanded, setInspectorExpanded] = useState(false);

  // Active Room State
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedMemberTasks, setSelectedMemberTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"today" | "yesterday" | "all">("today");
  const [copySuccess, setCopySuccess] = useState(false);

  // Local Timer State
  const [timerType, setTimerType] = useState<"pomodoro" | "stopwatch">("pomodoro");
  const [timerMode, setTimerMode] = useState<"work" | "short" | "long">("work");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("general");
  const [customGoal, setCustomGoal] = useState("");

  // New Todo State
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"high" | "medium" | "low">("medium");

  // Cheer Overlay State
  const [activeCheer, setActiveCheer] = useState<CheerEvent | null>(null);

  // Room Rename State
  const [roomDetails, setRoomDetails] = useState<any>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState("");

  // Available Rooms List State
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Spectator / Preview Mode (user is viewing a room without joining)
  const [isSpectating, setIsSpectating] = useState(false);
  const [spectatingLoading, setSpectatingLoading] = useState(false);

  const [joinRequestStatus, setJoinRequestStatus] = useState<null | "pending" | "rejected">(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [requestToast, setRequestToast] = useState<any | null>(null);



  // Refs for tracking wall clock time and syncing intervals
  const timerIntervalRef = useRef<any>(null);
  const dbSyncCounterRef = useRef<number>(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sessionStartTimeRef = useRef<number | null>(null);

  // ----------------------------------------------------
  // Lobby Handlers
  // ----------------------------------------------------
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNameInput.trim()) return;
    setLobbyLoading(true);
    setLobbyError("");
    try {
      const code = await createRoom(roomNameInput.trim());
      // Join system messages in room
      await addDoc(collection(db, "rooms", code, "messages"), {
        type: "system",
        text: `🎉 Room "${roomNameInput.trim()}" created! Welcome scholars.`,
        timestamp: Date.now()
      });
      setShowLobby(false);
    } catch (err: any) {
      setLobbyError(err.message || "Failed to create study room.");
    } finally {
      setLobbyLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    setLobbyLoading(true);
    setLobbyError("");
    try {
      const code = roomCodeInput.trim().toUpperCase();

      // Peek at the room doc to check if current user is the creator
      const roomSnap = await getDoc(doc(db, "rooms", code));
      if (!roomSnap.exists()) throw new Error("Room not found. Please check the code.");
      const roomData = roomSnap.data();
      const isCreator = roomData.createdBy === userUid;

      await joinRoom(code);

      if (isCreator) {
        // Admin rejoining their own room — direct entry, no request needed
        await addDoc(collection(db, "rooms", code, "messages"), {
          type: "system",
          text: `👑 ${user.name} (host) rejoined the room.`,
          timestamp: Date.now()
        });
        setIsSpectating(false);
        setJoinRequestStatus(null);
        setShowLobby(false);
      } else {
        // Regular user — send a join request; admin must approve
        await setDoc(doc(db, "rooms", code, "joinRequests", userUid!), {
          userId: userUid,
          name: user.name,
          avatar: user.avatar || "",
          requestedAt: Date.now(),
          status: "pending"
        });
        setJoinRequestStatus("pending");
        setIsSpectating(true);
        setShowLobby(false);
      }
    } catch (err: any) {
      setLobbyError(err.message || "Failed to join study room. Please check the code.");
    } finally {
      setLobbyLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!activeRoomId) return;
    navigator.clipboard.writeText(activeRoomId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    if (confirm("Are you sure you want to leave the study room?")) {
      try {
        await addDoc(collection(db, "rooms", activeRoomId, "messages"), {
          type: "system",
          text: `🚪 ${user.name} left the room.`,
          timestamp: Date.now()
        });
        await leaveRoom();
        setMembers([]);
        setMessages([]);
        setSelectedMember(null);
        setShowLobby(true);
      } catch (err) {
        console.error("Error leaving room:", err);
      }
    }
  };

  const handleBackToLobby = () => {
    if (isSpectating) {
      leaveRoom();
      setMembers([]);
      setMessages([]);
      setSelectedMember(null);
      setIsSpectating(false);
      setJoinRequestStatus(null);
      setShowLobby(true);
    } else {
      setShowLobby(true);
    }
  };

  const handleDeleteRoom = async () => {
    if (!activeRoomId) return;
    if (confirm("Are you sure you want to permanently delete this study room? All members will be disconnected.")) {
      try {
        // 1. Delete members subcollection docs
        const membersSnap = await getDocs(collection(db, "rooms", activeRoomId, "members"));
        for (const memberDoc of membersSnap.docs) {
          await deleteDoc(doc(db, "rooms", activeRoomId, "members", memberDoc.id));
        }

        // 2. Delete messages subcollection docs
        const messagesSnap = await getDocs(collection(db, "rooms", activeRoomId, "messages"));
        for (const msgDoc of messagesSnap.docs) {
          await deleteDoc(doc(db, "rooms", activeRoomId, "messages", msgDoc.id));
        }

        // 3. Delete cheers subcollection docs
        const cheersSnap = await getDocs(collection(db, "rooms", activeRoomId, "cheers"));
        for (const cheerDoc of cheersSnap.docs) {
          await deleteDoc(doc(db, "rooms", activeRoomId, "cheers", cheerDoc.id));
        }

        // 4. Delete the root room document
        await deleteDoc(doc(db, "rooms", activeRoomId));

        // 5. Leave the room locally in store
        await leaveRoom();
        setMembers([]);
        setMessages([]);
        setSelectedMember(null);
        setShowLobby(true);
      } catch (err) {
        console.error("Error deleting room:", err);
      }
    }
  };

  // ----------------------------------------------------
  // Room Subscriptions (Real-time Firestore)
  // ----------------------------------------------------
  // Scroll to top on mount and whenever the active room changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeRoomId]);

  // Listen for all available study rooms (Lobby Screen)
  useEffect(() => {
    if (activeRoomId) return;
    setLoadingRooms(true);
    const roomsRef = collection(db, "rooms");
    const unsub = onSnapshot(roomsRef, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data());
      const sorted = list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setAvailableRooms(sorted);
      setLoadingRooms(false);
    }, (err) => {
      console.error("Error loading rooms list:", err);
      setLoadingRooms(false);
    });
    return unsub;
  }, [activeRoomId]);

  // Room Subscriptions (Real-time Firestore)
  useEffect(() => {
    if (!activeRoomId) return;

    // 0. Listen for room document (metadata)
    const roomRef = doc(db, "rooms", activeRoomId);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomDetails({
          roomId: data.roomId,
          name: data.name,
          createdBy: data.createdBy,
          createdAt: data.createdAt
        });
        // Sync active room name with Zustand
        useStore.setState({ activeRoomName: data.name });
      } else {
        // Room was deleted by the creator/admin!
        leaveRoom();
        setMembers([]);
        setMessages([]);
        setSelectedMember(null);
        alert("This study room has been deleted by the host.");
      }
    });

    // 1. Listen for room members
    const membersRef = collection(db, "rooms", activeRoomId, "members");
    const unsubMembers = onSnapshot(membersRef, (snapshot) => {
      const list = snapshot.docs.map((doc) => doc.data());
      setMembers(list);
    });

    // 2. Listen for messages / activity feed
    const messagesQuery = query(
      collection(db, "rooms", activeRoomId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(list);
    });

    // 3. Listen for cheers sent to the current user
    const cheersQuery = query(
      collection(db, "rooms", activeRoomId, "cheers"),
      orderBy("timestamp", "desc"),
      limit(5)
    );
    const unsubCheers = onSnapshot(cheersQuery, (snapshot) => {
      // Look for any new cheer targeting this user
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const cheer = change.doc.data();
          if (cheer.receiverId === userUid && Date.now() - cheer.timestamp < 10000) {
            setActiveCheer({
              id: change.doc.id,
              type: cheer.type,
              senderName: cheer.senderName,
            });
            // Delete the cheer from database to avoid duplicating
            deleteDoc(doc(db, "rooms", activeRoomId, "cheers", change.doc.id)).catch(console.error);
          }
        }
      });
    });

    // Clean up local presence when leaving page or unmounting
    return () => {
      unsubRoom();
      unsubMembers();
      unsubMessages();
      unsubCheers();
    };
  }, [activeRoomId, userUid]);

  // Admin: Listen for pending join requests in real time
  // Dep uses roomDetails?.createdBy (a string) so the listener is only
  // recreated when the creator field actually changes, not on every room-doc update.
  useEffect(() => {
    const createdBy = roomDetails?.createdBy;
    if (!activeRoomId || !userUid || !createdBy || createdBy !== userUid) return;

    const q = query(
      collection(db, "rooms", activeRoomId, "joinRequests"),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingRequests(list);
      // Auto-open panel when new requests arrive
      if (list.length > 0) setShowRequestsPanel(true);

      // Check for newly added requests to show toast notification
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const reqData = { id: change.doc.id, ...change.doc.data() } as any;
          // Only show toast if the request was created in the last 20 seconds
          const isRecent = reqData.requestedAt && (Date.now() - reqData.requestedAt < 20000);
          if (isRecent) {
            setRequestToast(reqData);
            // Auto dismiss toast after 8 seconds
            setTimeout(() => {
              setRequestToast((current: any) => (current?.id === reqData.id ? null : current));
            }, 8000);
          }
        }
      });
    });
    return unsub;
  }, [activeRoomId, userUid, roomDetails?.createdBy]);

  // Requester: Watch own join-request doc for admin decision
  useEffect(() => {
    if (!activeRoomId || !userUid || joinRequestStatus !== "pending") return;

    const reqRef = doc(db, "rooms", activeRoomId, "joinRequests", userUid);
    const unsub = onSnapshot(reqRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status === "accepted") {
        setIsSpectating(false);
        setJoinRequestStatus(null);
        // Clean up the request doc
        deleteDoc(reqRef).catch(console.error);
      } else if (data.status === "rejected") {
        setJoinRequestStatus("rejected");
      }
    });
    return unsub;
  }, [activeRoomId, userUid, joinRequestStatus]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync member document to database when state variables change (only when not spectating)
  useEffect(() => {
    if (!activeRoomId || !userUid || isSpectating) return;

    const activeTask = todos.find((t) => t.id === selectedTaskId);
    const taskTitle = selectedTaskId === "general"
      ? (customGoal ? customGoal : "General Study")
      : (activeTask ? activeTask.title : "Linked Task");

    updateRoomTimerStatus(
      timerRunning,
      secondsLeft,
      timerType,
      timerMode,
      taskTitle
    );
  }, [timerRunning, timerType, timerMode, selectedTaskId, customGoal, activeRoomId, userUid, isSpectating, user.xp, user.level]);

  // Fetch selected member's tasks
  useEffect(() => {
    if (!selectedMember) {
      setSelectedMemberTasks([]);
      return;
    }
    setTasksLoading(true);
    const q = collection(db, "users", selectedMember.userId, "todos");
    getDocs(q)
      .then((snap) => {
        const list = snap.docs.map((doc) => doc.data());
        setSelectedMemberTasks(list);
      })
      .catch((err) => {
        console.error("Error fetching partner todos: ", err);
      })
      .finally(() => {
        setTasksLoading(false);
      });
  }, [selectedMember]);

  // ----------------------------------------------------
  // Local Focus Timer Logic
  // ----------------------------------------------------
  const handleToggleTimer = () => {
    if (timerRunning) {
      // Pause
      clearInterval(timerIntervalRef.current);
      setTimerRunning(false);
    } else {
      // Play
      if (!sessionStartTimeRef.current) {
        sessionStartTimeRef.current = Date.now();
      }
      setTimerRunning(true);
      timerIntervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (timerType === "pomodoro") {
            if (prev <= 1) {
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          } else {
            // Stopwatch
            return prev + 1;
          }
        });

        // Throttle Firestore updates to every 5 ticks to avoid high writes
        dbSyncCounterRef.current += 1;
        if (dbSyncCounterRef.current >= 5) {
          dbSyncCounterRef.current = 0;
          const activeTask = todos.find((t) => t.id === selectedTaskId);
          const taskTitle = selectedTaskId === "general"
            ? (customGoal ? customGoal : "General Study")
            : (activeTask ? activeTask.title : "Linked Task");

          setSecondsLeft((currSeconds) => {
            updateRoomTimerStatus(
              true,
              currSeconds,
              timerType,
              timerMode,
              taskTitle
            );
            return currSeconds;
          });
        }
      }, 1000);
    }
  };

  const handleResetTimer = () => {
    clearInterval(timerIntervalRef.current);
    setTimerRunning(false);
    sessionStartTimeRef.current = null;
    if (timerType === "pomodoro") {
      const baseTime = timerMode === "work" ? 25 : timerMode === "short" ? 5 : 15;
      setSecondsLeft(baseTime * 60);
    } else {
      setSecondsLeft(0);
    }
  };

  const handleSaveSession = async () => {
    clearInterval(timerIntervalRef.current);
    setTimerRunning(false);

    let elapsedSecs = 0;
    if (timerType === "pomodoro") {
      const baseTime = timerMode === "work" ? 25 : timerMode === "short" ? 5 : 15;
      elapsedSecs = baseTime * 60 - secondsLeft;
    } else {
      elapsedSecs = secondsLeft;
    }

    const mins = Math.floor(elapsedSecs / 60);
    const endTime = Date.now();
    const startTime = sessionStartTimeRef.current ?? (endTime - elapsedSecs * 1000);
    sessionStartTimeRef.current = null;

    if (mins > 0) {
      incrementSession(mins);
      await recordStudySession({
        durationMinutes: mins,
        sessionType: timerType,
        startTime,
        endTime,
        timestamp: endTime,
      });

      // Broadcast to Room chat
      if (activeRoomId) {
        await addDoc(collection(db, "rooms", activeRoomId, "messages"), {
          type: "system",
          text: `🎉 ${user.name} completed and saved a ${mins}m focus session! (+${mins * 2} XP)`,
          timestamp: Date.now(),
        });
      }
      alert(`Great job! You saved a ${mins}-minute focus session and earned ${mins * 2} XP! ⚡`);
    } else {
      alert("Focus for at least 1 minute to save your study session!");
    }

    // Reset the clock
    if (timerType === "pomodoro") {
      const baseTime = timerMode === "work" ? 25 : timerMode === "short" ? 5 : 15;
      setSecondsLeft(baseTime * 60);
    } else {
      setSecondsLeft(0);
    }
  };

  const handleTimerComplete = async () => {
    clearInterval(timerIntervalRef.current);
    setTimerRunning(false);
    const endTime = Date.now();
    const startTime = sessionStartTimeRef.current ?? (endTime - secondsLeft * 1000);
    sessionStartTimeRef.current = null;

    if (timerType === "pomodoro") {
      if (timerMode === "work") {
        const mins = 25;
        // Award XP and sync daily stats
        incrementSession(mins);
        await recordStudySession({
          durationMinutes: mins,
          sessionType: "pomodoro",
          startTime,
          endTime,
          timestamp: endTime,
        });

        // Broadcast to Room chat
        await addDoc(collection(db, "rooms", activeRoomId!, "messages"), {
          type: "system",
          text: `🏆 ${user.name} completed a 25-minute Pomodoro focus block! (+50 XP)`,
          timestamp: Date.now(),
        });

        setTimerMode("short");
        setSecondsLeft(5 * 60);
      } else {
        setTimerMode("work");
        setSecondsLeft(25 * 60);
      }
    } else {
      // Stopwatch stopped
      const mins = Math.floor(secondsLeft / 60);
      if (mins > 0) {
        incrementSession(mins);
        await recordStudySession({
          durationMinutes: mins,
          sessionType: "stopwatch",
          startTime,
          endTime,
          timestamp: endTime,
        });

        await addDoc(collection(db, "rooms", activeRoomId!, "messages"), {
          type: "system",
          text: `⚡ ${user.name} completed a ${mins}m stopwatch focus session!`,
          timestamp: Date.now(),
        });
      }
      setSecondsLeft(0);
    }
  };

  // Switch Modes
  const handleSwitchType = (type: "pomodoro" | "stopwatch") => {
    clearInterval(timerIntervalRef.current);
    setTimerRunning(false);
    setTimerType(type);
    if (type === "pomodoro") {
      setTimerMode("work");
      setSecondsLeft(25 * 60);
    } else {
      setSecondsLeft(0);
    }
  };

  const handleSwitchMode = (mode: "work" | "short" | "long") => {
    clearInterval(timerIntervalRef.current);
    setTimerRunning(false);
    setTimerMode(mode);
    const baseTime = mode === "work" ? 25 : mode === "short" ? 5 : 15;
    setSecondsLeft(baseTime * 60);
  };

  // ----------------------------------------------------
  // Room Actions (Messaging, Cheers)
  // ----------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRoomId) return;
    try {
      await addDoc(collection(db, "rooms", activeRoomId, "messages"), {
        type: "chat",
        senderId: userUid,
        senderName: user.name,
        text: chatInput.trim(),
        timestamp: Date.now(),
      });
      setChatInput("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleSendCheer = async (receiverId: string, receiverName: string, cheerType: "spark" | "coffee" | "applause" | "rocket") => {
    if (!activeRoomId) return;
    try {
      await addDoc(collection(db, "rooms", activeRoomId, "cheers"), {
        senderId: userUid,
        senderName: user.name,
        receiverId,
        type: cheerType,
        timestamp: Date.now(),
      });

      // Also log it in the room activity feed
      const emojis = { spark: "⚡", coffee: "☕", applause: "🏆", rocket: "🚀" };
      await addDoc(collection(db, "rooms", activeRoomId, "messages"), {
        type: "system",
        text: `${user.name} sent a cheer ${emojis[cheerType]} to ${receiverName}!`,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Error sending cheer:", err);
    }
  };

  const handleCheckOffTask = async (todoId: string, title: string) => {
    updateTodo(todoId, { completed: true });
    if (activeRoomId) {
      await addDoc(collection(db, "rooms", activeRoomId, "messages"), {
        type: "system",
        text: `✅ ${user.name} completed task: "${title}" (+20 XP)`,
        timestamp: Date.now(),
      });
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    const newTodo = {
      id: Math.random().toString(36).substring(2, 9),
      title: newTodoTitle.trim(),
      completed: false,
      priority: newTodoPriority,
      category: "Focus Room",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: new Date().toISOString().split("T")[0]
    };

    addTodo(newTodo);
    setNewTodoTitle("");

    // Broadcast to room feed
    if (activeRoomId) {
      try {
        await addDoc(collection(db, "rooms", activeRoomId, "messages"), {
          type: "system",
          text: `📝 ${user.name} added a new task for today: "${newTodo.title}"`,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("Error sending system todo message:", err);
      }
    }
  };

  const handleRenameRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameInput.trim() || !activeRoomId) return;
    try {
      await renameRoom(activeRoomId, renameInput.trim());
      // Broadcast to chat feed
      await addDoc(collection(db, "rooms", activeRoomId, "messages"), {
        type: "system",
        text: `✏️ Room renamed to: "${renameInput.trim()}"`,
        timestamp: Date.now()
      });
      setIsRenaming(false);
    } catch (err: any) {
      console.error("Failed to rename room:", err);
      alert(err.message || "Failed to rename room.");
    }
  };

  // ----------------------------------------------------
  // Join Request Handlers (Admin)
  // ----------------------------------------------------
  const handleAcceptRequest = async (request: any) => {
    if (!activeRoomId) return;
    try {
      await setDoc(doc(db, "rooms", activeRoomId, "joinRequests", request.userId),
        { status: "accepted" }, { merge: true });
      await addDoc(collection(db, "rooms", activeRoomId, "messages"), {
        type: "system",
        text: `✅ ${request.name} was accepted into the room!`,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Error accepting request:", err);
    }
  };

  const handleRejectRequest = async (request: any) => {
    if (!activeRoomId) return;
    try {
      await setDoc(doc(db, "rooms", activeRoomId, "joinRequests", request.userId),
        { status: "rejected" }, { merge: true });
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  // ----------------------------------------------------
  // Timer Display Helpers
  // ----------------------------------------------------
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => clearInterval(timerIntervalRef.current);
  }, []);

  return (
    <div className="w-full flex-grow flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-200 py-6">
      {/* Cheer Overlay animation */}
      <CheerOverlays
        activeCheer={activeCheer}
        onAnimationComplete={() => setActiveCheer(null)}
      />

      <AnimatePresence mode="wait">
        {!activeRoomId || showLobby ? (
          // ================= LOBBY SCREEN =================
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col justify-start py-6"
          >
            {/* Header */}
            <div className="glass-card bg-gradient-to-br from-white/95 to-slate-50/90 dark:from-slate-900/80 dark:to-slate-950/60 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] p-6 md:p-8 text-center space-y-3 mb-10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-emerald-500/5 via-sky-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />

              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-655 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 transform hover:rotate-6 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 dark:from-indigo-400 via-sky-500 dark:via-sky-400 to-emerald-600 dark:to-emerald-400 tracking-tight">
                Study Mania Rooms
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto font-medium leading-relaxed">
                Set up a private study arena, invite your friends, view each other's countdown timers, share real-time checklists, and exchange sparks of motivation!
              </p>
            </div>

            {lobbyError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 text-xs font-semibold text-center">
                {lobbyError}
              </div>
            )}

            {/* Resume Session Banner – shown when user is already in a room */}
            {activeRoomId && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600/10 via-purple-600/5 to-indigo-600/10 dark:from-indigo-500/15 dark:via-purple-500/10 dark:to-indigo-500/15 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-indigo-500/5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 animate-pulse pointer-events-none" />
                <div className="flex items-center gap-3 z-10">
                  <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl shrink-0">
                    <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-indigo-500 dark:text-indigo-400 mb-0.5">Active Session</div>
                    <div className="text-sm font-black text-slate-800 dark:text-white">{activeRoomName}</div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">Room: {activeRoomId}</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowLobby(false)}
                  className="z-10 shrink-0 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all active:scale-95 cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  Resume Session
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left & Middle Column: Actions */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Room Card */}
                <div className="glass-card bg-gradient-to-br from-white to-slate-50/40 dark:from-slate-900/60 dark:to-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-indigo-500/30 dark:hover:border-indigo-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/5 text-slate-800 dark:text-slate-100 min-h-[300px] group">
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 w-fit rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <PlusCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black tracking-tight">Create Room</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                      Start a fresh study room, set custom pomodoros, and share the session.
                    </p>
                  </div>
                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <input
                      type="text"
                      required
                      placeholder="Room Name (e.g. Exam Prep)"
                      value={roomNameInput}
                      onChange={(e) => setRoomNameInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={lobbyLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-600 hover:to-indigo-500 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-600/15 hover:shadow-indigo-600/25 active:scale-98 transition-all duration-200 cursor-pointer disabled:opacity-50"
                    >
                      {lobbyLoading ? "Creating..." : "Create Study Room"}
                    </button>
                  </form>
                </div>

                {/* Join Room Card */}
                <div className="glass-card bg-gradient-to-br from-white to-slate-50/40 dark:from-slate-900/60 dark:to-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-emerald-500/30 dark:hover:border-emerald-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/5 text-slate-800 dark:text-slate-100 min-h-[300px] group">
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 w-fit rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <Key className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black tracking-tight">Join Room</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                      Enter a 6-character room code to study alongside your teammates.
                    </p>
                  </div>
                  <form onSubmit={handleJoinRoom} className="space-y-4">
                    <input
                      type="text"
                      required
                      placeholder="6-Character Code"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-widest text-center shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={lobbyLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-600/15 hover:shadow-emerald-600/25 active:scale-98 transition-all duration-200 cursor-pointer disabled:opacity-50"
                    >
                      {lobbyLoading ? "Joining..." : "Join Study Room"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Active Study Rooms Explorer List */}
              <div className="glass-card bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-900/60 dark:to-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-[410px] w-full text-slate-800 dark:text-slate-100">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 shrink-0">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Rooms Explorer
                  </h3>
                </div>

                {loadingRooms ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-500 animate-pulse">
                    Loading available rooms...
                  </div>
                ) : availableRooms.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 space-y-1.5 py-6">
                    <Users className="w-8 h-8 stroke-1 text-slate-400" />
                    <span className="text-xs font-bold">No active study rooms</span>
                    <p className="text-[10px] opacity-75 leading-relaxed max-w-[180px]">
                      Create the first room and let your peers join!
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
                    {availableRooms.map((room) => (
                      <div
                        key={room.roomId}
                        className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/70 hover:border-indigo-400/50 dark:hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block truncate">
                            {room.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[8px] font-mono font-black text-slate-500 uppercase">
                              CODE: {room.roomId}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase">
                              <Users className="w-2.5 h-2.5 mr-0.5" />
                              {room.activeMemberCount || 1} Active
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Preview button — visible only for non-creator */}
                          {room.createdBy !== userUid && (
                          <button
                            type="button"
                            disabled={lobbyLoading}
                            onClick={async () => {
                              if (lobbyLoading) return;
                              setLobbyLoading(true);
                              setLobbyError("");
                              try {
                                // Preview only — do NOT write member doc or post system message
                                await joinRoom(room.roomId);
                                setIsSpectating(true);
                                setJoinRequestStatus(null);
                                setShowLobby(false);
                              } catch (err: any) {
                                setLobbyError(err.message || "Failed to load room.");
                              } finally {
                                setLobbyLoading(false);
                              }
                            }}
                            className="px-2.5 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black shadow-sm transition-all duration-200"
                          >
                            Preview
                          </button>
                          )}

                          {/* Main action button: Rejoin (creator) or Request (others) */}
                          <button
                            type="button"
                            disabled={lobbyLoading}
                            onClick={async () => {
                              if (lobbyLoading) return;
                              setLobbyLoading(true);
                              setLobbyError("");
                              const isCreator = room.createdBy === userUid;
                              try {
                                await joinRoom(room.roomId);
                                if (isCreator) {
                                  // Admin rejoining their own room — direct, no request
                                  await addDoc(collection(db, "rooms", room.roomId, "messages"), {
                                    type: "system",
                                    text: `👑 ${user.name} (host) rejoined the room.`,
                                    timestamp: Date.now()
                                  });
                                  setIsSpectating(false);
                                  setJoinRequestStatus(null);
                                  setShowLobby(false);
                                } else {
                                  // Regular user — send join request; admin must approve
                                  await setDoc(doc(db, "rooms", room.roomId, "joinRequests", userUid!), {
                                    userId: userUid,
                                    name: user.name,
                                    avatar: user.avatar || "",
                                    requestedAt: Date.now(),
                                    status: "pending"
                                  });
                                  setJoinRequestStatus("pending");
                                  setIsSpectating(true);
                                  setShowLobby(false);
                                }
                              } catch (err: any) {
                                setLobbyError(err.message || "Failed to join room.");
                              } finally {
                                setLobbyLoading(false);
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black shadow-sm transition-all duration-200 ${
                              room.createdBy === userUid
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white"
                            }`}
                          >
                            {room.createdBy === userUid ? "👑 Rejoin" : "Request"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          // ================= ROOM VIEW =================
          <motion.div
            key="room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            {/* ---- Spectator / Request Banner ---- */}
            {isSpectating && (
              <motion.div
                key={joinRequestStatus ?? "preview"}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl ${
                  joinRequestStatus === "pending"
                    ? "border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-indigo-500/10 dark:from-indigo-500/15 dark:via-purple-500/10 dark:to-indigo-500/15 shadow-indigo-500/5"
                    : joinRequestStatus === "rejected"
                    ? "border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-red-500/5 to-rose-500/10 dark:from-rose-500/15 dark:via-red-500/10 dark:to-rose-500/15 shadow-rose-500/5"
                    : "border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-500/15 dark:via-orange-500/10 dark:to-amber-500/15 shadow-amber-500/5"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />

                {/* ---- PENDING STATE ---- */}
                {joinRequestStatus === "pending" && (
                  <>
                    <div className="flex items-center gap-3 z-10">
                      <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl shrink-0">
                        <span className="text-lg select-none animate-spin" style={{ display: "inline-block" }}>⏳</span>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-black tracking-widest text-indigo-500 dark:text-indigo-400 mb-0.5">Join Request Sent</div>
                        <div className="text-sm font-black text-slate-800 dark:text-white">Waiting for admin approval to join <span className="text-indigo-500 dark:text-indigo-400">{activeRoomName}</span></div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          You can preview the room while waiting…
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 z-10 shrink-0">
                      <button
                        onClick={async () => {
                          if (!activeRoomId || !userUid) return;
                          try {
                            await deleteDoc(doc(db, "rooms", activeRoomId, "joinRequests", userUid));
                          } catch { /* ignore */ }
                          leaveRoom();
                          setMembers([]);
                          setMessages([]);
                          setSelectedMember(null);
                          setIsSpectating(false);
                          setJoinRequestStatus(null);
                          setShowLobby(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold cursor-pointer transition-all hover:bg-white dark:hover:bg-slate-900"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Cancel Request
                      </button>
                    </div>
                  </>
                )}

                {/* ---- REJECTED STATE ---- */}
                {joinRequestStatus === "rejected" && (
                  <>
                    <div className="flex items-center gap-3 z-10">
                      <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-2xl shrink-0">
                        <span className="text-lg select-none">❌</span>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-black tracking-widest text-rose-500 dark:text-rose-400 mb-0.5">Request Declined</div>
                        <div className="text-sm font-black text-slate-800 dark:text-white">Your request to join <span className="text-rose-500 dark:text-rose-400">{activeRoomName}</span> was declined by the admin.</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 z-10 shrink-0">
                      <button
                        onClick={async () => {
                          if (activeRoomId && userUid) {
                            await deleteDoc(doc(db, "rooms", activeRoomId, "joinRequests", userUid)).catch(console.error);
                          }
                          leaveRoom();
                          setMembers([]);
                          setMessages([]);
                          setSelectedMember(null);
                          setIsSpectating(false);
                          setJoinRequestStatus(null);
                          setShowLobby(true);
                        }}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-black cursor-pointer transition-all shadow-lg shadow-rose-500/20"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Back to Lobby
                      </button>
                    </div>
                  </>
                )}

                {/* ---- PREVIEW STATE (null) ---- */}
                {joinRequestStatus === null && (
                  <>
                    <div className="flex items-center gap-3 z-10">
                      <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-2xl shrink-0">
                        <span className="text-lg select-none">👁️</span>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-black tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">Spectator Mode</div>
                        <div className="text-sm font-black text-slate-800 dark:text-white">You're previewing <span className="text-amber-600 dark:text-amber-400">{activeRoomName}</span></div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Send a join request — the admin will let you in.</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 z-10 shrink-0">
                      <button
                        onClick={() => {
                          leaveRoom();
                          setMembers([]);
                          setMessages([]);
                          setSelectedMember(null);
                          setIsSpectating(false);
                          setJoinRequestStatus(null);
                          setShowLobby(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold cursor-pointer transition-all hover:bg-white dark:hover:bg-slate-900"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Back
                      </button>
                      <button
                        disabled={spectatingLoading}
                        onClick={async () => {
                          if (!activeRoomId || !userUid) return;
                          setSpectatingLoading(true);
                          try {
                            await setDoc(doc(db, "rooms", activeRoomId, "joinRequests", userUid), {
                              userId: userUid,
                              name: user.name,
                              avatar: user.avatar || "",
                              requestedAt: Date.now(),
                              status: "pending"
                            });
                            setJoinRequestStatus("pending");
                          } catch (err) {
                            console.error("Error sending join request:", err);
                          } finally {
                            setSpectatingLoading(false);
                          }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl text-xs font-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                      >
                        <Users className="w-4 h-4" />
                        {spectatingLoading ? "Sending..." : "Request to Join"}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ---- Admin: Join Requests Panel ---- */}
            {!isSpectating && roomDetails?.createdBy === userUid && pendingRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-violet-500/10 dark:from-violet-500/15 dark:via-purple-500/10 dark:to-violet-500/15 overflow-hidden shadow-xl shadow-violet-500/5"
              >
                {/* Header row */}
                <button
                  onClick={() => setShowRequestsPanel(!showRequestsPanel)}
                  className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="p-2 bg-violet-500/20 border border-violet-500/30 rounded-xl">
                        <Users className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] px-1 bg-violet-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                        {pendingRequests.length}
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-violet-600 dark:text-violet-400">Admin Action Required</div>
                      <div className="text-sm font-black text-slate-800 dark:text-white">
                        {pendingRequests.length} scholar{pendingRequests.length > 1 ? "s are" : " is"} requesting to join
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400 group-hover:text-violet-500 transition-colors">
                    {showRequestsPanel
                      ? <span className="text-[10px] font-bold">▲ Hide</span>
                      : <span className="text-[10px] font-bold">▼ Review</span>}
                  </div>
                </button>

                {/* Requests list */}
                {showRequestsPanel && (
                  <div className="border-t border-violet-500/20 px-5 py-3 space-y-2.5">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.userId}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.userId}`}
                            alt={req.name}
                            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 block truncate">{req.name}</span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                              Requested {new Date(req.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRejectRequest(req)}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptRequest(req)}
                            className="px-4 py-1.5 rounded-xl text-[10px] font-black bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/20 transition-all cursor-pointer active:scale-95"
                          >
                            ✓ Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Header / Room Topbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/85 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl gap-4 shadow-lg backdrop-blur-md text-slate-800 dark:text-slate-100">
              <div className="flex items-center gap-3">
                {/* Back Button */}
                <button
                  onClick={handleBackToLobby}
                  className="p-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-2xl transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
                  title="Back to Lobby"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
                  <Users className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  {isRenaming ? (
                    <form onSubmit={handleRenameRoomSubmit} className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        required
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200"
                        placeholder="New Room Name"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black cursor-pointer shadow-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRenaming(false)}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 rounded-lg text-[9px] font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black">{activeRoomName}</h2>
                      {!isSpectating && roomDetails?.createdBy === userUid && (
                        <button
                          onClick={() => {
                            setRenameInput(roomDetails?.name || activeRoomName || "");
                            setIsRenaming(true);
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-950 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                          title="Rename Room"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Room Code:
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {activeRoomId}
                      {copySuccess ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-center">
                {!isSpectating && roomDetails?.createdBy === userUid && (
                  <button
                    onClick={handleDeleteRoom}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-black cursor-pointer transition-all active:scale-95 shadow-md shadow-red-600/10 hover:shadow-red-600/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Room</span>
                  </button>
                )}
                {!isSpectating && (
                  <button
                    onClick={handleLeaveRoom}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-2xl text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Room</span>
                  </button>
                )}
              </div>
            </div>

            {/* Row 1: Scholars Online, Room Leaderboard, and Task Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              
              {/* 1. Scholars Online Collapsible Card */}
              <div className={`glass-card bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-5 shadow-xl flex flex-col transition-all duration-300 ${scholarsExpanded ? "h-[400px]" : "h-[64px] overflow-hidden"}`}>
                <div 
                  onClick={() => setScholarsExpanded(!scholarsExpanded)}
                  className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-3 shrink-0 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Scholars Online</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase">
                      {members.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {!scholarsExpanded && (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {members.filter(m => m.status === "studying").length} studying
                      </span>
                    )}
                    {scholarsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {scholarsExpanded && (
                  <div className="flex flex-col flex-grow min-h-0">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 py-2 shrink-0">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Scholar / Timer</span>
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Focus Progress</span>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto space-y-3 mt-3 min-h-0 custom-scrollbar pr-1 py-1">
                      {members.map((member) => {
                        const isMe = member.userId === userUid;
                        const isStudying = member.status === "studying";
                        const isBreak = member.status === "break";

                        return (
                          <div
                            key={member.userId}
                            className={`p-3.5 rounded-2xl border flex flex-col gap-3 transition-all duration-300 hover:scale-[1.01] relative ${
                              isMe
                                ? "bg-gradient-to-br from-indigo-50/50 to-indigo-100/10 dark:from-indigo-950/20 dark:to-indigo-900/5 border-indigo-200/80 dark:border-indigo-500/30 shadow-sm"
                                : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            {/* Top part: profile & timer */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                {/* Avatar with Status Ring */}
                                <div className="relative">
                                  <img
                                    src={member.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                                    alt={member.name}
                                    className="w-8.5 h-8.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 object-cover"
                                  />
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-white dark:border-slate-900 flex items-center justify-center ${
                                      isStudying
                                        ? "bg-purple-500 animate-pulse"
                                        : isBreak
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[85px]">
                                      {member.name}
                                    </span>
                                    {isMe && (
                                      <span className="px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[7px] font-black uppercase shrink-0">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold block mt-0.5 capitalize">
                                    {isStudying
                                      ? `Studying 🎯`
                                      : isBreak
                                      ? `On Break ☕`
                                      : "Idle 💤"}
                                  </span>
                                </div>
                              </div>

                              {/* Live Timer Countdown Badge */}
                              <div className="text-right shrink-0">
                                <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-100">
                                  {formatTime(member.secondsLeft || 0)}
                                </span>
                                <span className="block text-[7px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mt-0.5">
                                  {member.timerType === "pomodoro" ? (member.timerMode || "work") : "elapsed"}
                                </span>
                              </div>
                            </div>

                            {/* Middle part: active task indicator */}
                            <div className="bg-slate-100/50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/60 flex items-center gap-1.5 min-w-0">
                              <span className="text-xs shrink-0" title="Active Focus Task">🎯</span>
                              <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 truncate">
                                {member.activeTaskTitle || "No task selected"}
                              </span>
                            </div>

                            {/* Bottom part: cheers action */}
                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2.5 gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                                  {member.todayMinutes || 0}m studied
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMember(member);
                                  }}
                                  className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-0.5 cursor-pointer transition-colors ml-1"
                                  title={`Inspect ${member.name}'s task progress`}
                                >
                                  <CheckSquare className="w-3 h-3 shrink-0" />
                                  <span>Inspect</span>
                                </button>
                              </div>
                              {!isMe && !isSpectating && (
                                <div className="flex items-center gap-1">
                                  {([
                                    { type: "spark", icon: Zap, color: "text-amber-500 hover:bg-amber-500/10 border-amber-500/10" },
                                    { type: "coffee", icon: Coffee, color: "text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/10" },
                                    { type: "applause", icon: Trophy, color: "text-yellow-500 hover:bg-yellow-500/10 border-yellow-500/10" },
                                    { type: "rocket", icon: Rocket, color: "text-rose-500 hover:bg-rose-500/10 border-rose-500/10" }
                                  ] as const).map((cheer) => {
                                    const Icon = cheer.icon;
                                    return (
                                      <button
                                        key={cheer.type}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSendCheer(
                                            member.userId,
                                            member.name,
                                            cheer.type
                                          );
                                        }}
                                        className={`p-1 rounded-md border bg-slate-100 dark:bg-slate-950 transition-all active:scale-90 cursor-pointer ${cheer.color}`}
                                        title={`Send ${cheer.type}`}
                                      >
                                        <Icon className="w-3 h-3" />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {!isMe && isSpectating && (
                                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 italic">Join to cheer</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Room Leaderboard Collapsible Card */}
              <div className={`glass-card bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-5 shadow-xl flex flex-col transition-all duration-300 ${leaderboardExpanded ? "h-[400px]" : "h-[64px] overflow-hidden"}`}>
                <div 
                  onClick={() => setLeaderboardExpanded(!leaderboardExpanded)}
                  className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-3 shrink-0 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Room Leaderboard</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-amber-500 transition-colors">
                    {!leaderboardExpanded && members.length > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        👑 {[...members].sort((a, b) => (b.todayMinutes || 0) - (a.todayMinutes || 0))[0]?.name || "None"}
                      </span>
                    )}
                    {leaderboardExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {leaderboardExpanded && (
                  <div className="flex flex-col flex-grow min-h-0">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 py-2 shrink-0">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Scholar Rank</span>
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Today's Focus</span>
                    </div>
                    <div className="flex-grow overflow-y-auto space-y-3 mt-3 min-h-0 custom-scrollbar pr-1 py-1">
                      {[...members]
                        .sort((a, b) => (b.todayMinutes || 0) - (a.todayMinutes || 0))
                        .map((member, idx) => {
                          const rank = idx + 1;
                          const isMe = member.userId === userUid;
                          const maxMinutes = Math.max(...members.map((m) => m.todayMinutes || 0), 1);
                          const pct = Math.min(100, Math.round(((member.todayMinutes || 0) / maxMinutes) * 100));

                          return (
                            <div
                              key={member.userId}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${isMe
                                ? "bg-gradient-to-r from-indigo-50/50 to-indigo-100/10 dark:from-indigo-950/20 dark:to-indigo-900/5 border-indigo-200/80 dark:border-indigo-500/30 shadow-sm"
                                : rank === 1
                                  ? "bg-amber-500/[0.03] dark:bg-amber-500/[0.02] border-amber-500/20 shadow-sm"
                                  : rank === 2
                                    ? "bg-slate-400/[0.03] dark:bg-slate-400/[0.02] border-slate-300/25"
                                    : rank === 3
                                      ? "bg-orange-500/[0.03] dark:bg-orange-500/[0.02] border-orange-500/20"
                                      : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60"
                                }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Rank Badge */}
                                <div className="w-8 h-8 shrink-0 flex items-center justify-center font-black text-sm">
                                  {rank === 1 ? (
                                    <span className="text-xl" title="First Place">🥇</span>
                                  ) : rank === 2 ? (
                                    <span className="text-xl" title="Second Place">🥈</span>
                                  ) : rank === 3 ? (
                                    <span className="text-xl" title="Third Place">🥉</span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">#{rank}</span>
                                  )}
                                </div>

                                {/* Avatar */}
                                <img
                                  src={member.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                                  alt={member.name}
                                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 object-cover shrink-0"
                                />

                                {/* Name & Progress bar */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate max-w-[80px]">
                                      {member.name}
                                    </span>
                                    {isMe && (
                                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase shrink-0">
                                        You
                                      </span>
                                    )}
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                                      {pct}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="text-right pl-2 shrink-0">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">
                                  {member.todayMinutes || 0}m
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mt-0.5">
                                  {member.xp || 0} XP
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

                {/* 3. Member Task Board Collapsible Card */}
              <div className={`glass-card bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col md:col-span-2 lg:col-span-1 transition-all duration-300 shadow-xl ${inspectorExpanded ? "h-[400px]" : "h-[64px] overflow-hidden"}`}>
                <div 
                  onClick={() => setInspectorExpanded(!inspectorExpanded)}
                  className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-3 shrink-0 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">Member Task Board</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                    {!inspectorExpanded && (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        📋 {selectedMember ? selectedMember.name : "None"}
                      </span>
                    )}
                    {inspectorExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {inspectorExpanded && (
                  <div className="flex flex-col flex-grow min-h-0">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 py-2 shrink-0">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        {selectedMember ? "Scholar Details" : "All Members"}
                      </span>
                      {selectedMember && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(null);
                          }}
                          className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 border border-slate-200/50 dark:border-slate-800/50 px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-900/60 hover:bg-indigo-500/10 cursor-pointer"
                        >
                          ← Back
                        </button>
                      )}
                    </div>

                    {/* Inspected Content */}
                    {!selectedMember ? (
                      <div className="flex-1 overflow-y-auto space-y-2 mt-3 min-h-0 custom-scrollbar pr-1 py-1">
                        {members.map((member) => {
                          const isMe = member.userId === userUid;
                          const isStudying = member.status === "studying";
                          const isBreak = member.status === "break";

                          return (
                            <button
                              key={member.userId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMember(member);
                              }}
                              className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/80 transition-all hover:scale-[1.01] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative shrink-0">
                                  <img
                                    src={member.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                                    alt={member.name}
                                    className="w-7.5 h-7.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 object-cover"
                                  />
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white dark:border-slate-900 ${
                                      isStudying
                                        ? "bg-purple-500"
                                        : isBreak
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block truncate max-w-[100px]">
                                    {member.name} {isMe && <span className="text-[7px] text-indigo-500 font-bold ml-1 uppercase bg-indigo-500/10 px-1 py-0.2 rounded shrink-0">You</span>}
                                  </span>
                                  <span className="text-[9px] text-slate-505 dark:text-slate-400 font-bold block mt-0.5 capitalize">
                                    {isStudying ? "Studying 🎯" : isBreak ? "On Break ☕" : "Idle 💤"}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                  {member.todayMinutes || 0}m studied
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col mt-3 min-h-0 gap-3">
                        {/* Scholar Info banner */}
                        <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-slate-950/50 p-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shrink-0">
                          <img
                            src={selectedMember.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Scholar"}
                            alt={selectedMember.name}
                            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 object-cover shrink-0"
                          />
                          <div>
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 block">
                              {selectedMember.name}
                            </span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold capitalize">
                              {selectedMember.status === "studying"
                                ? "Currently Studying 🎯"
                                : selectedMember.status === "break"
                                  ? "On Break ☕"
                                  : "Idle 💤"}
                            </span>
                          </div>
                        </div>

                        {/* Segmented Time Filter Tabs */}
                        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800 shrink-0">
                          {(["today", "yesterday", "all"] as const).map((tab) => {
                            const label = tab === "today" ? "Today" : tab === "yesterday" ? "Yesterday" : "All Days";
                            
                            const todayStr = new Date().toISOString().split("T")[0];
                            const yesterdayDate = new Date();
                            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                            const yesterdayStr = yesterdayDate.toISOString().split("T")[0];
                            
                            const count = selectedMemberTasks.filter((t) => {
                              if (tab === "today") return t.startDate === todayStr;
                              if (tab === "yesterday") return t.startDate === yesterdayStr;
                              return true;
                            }).length;

                            return (
                              <button
                                key={tab}
                                onClick={() => setInspectorTab(tab)}
                                className={`flex-1 py-1 px-1 rounded-lg text-[9px] font-black capitalize transition-all cursor-pointer text-center ${
                                  inspectorTab === tab
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/20 dark:border-slate-800"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                              >
                                {label} ({count})
                              </button>
                            );
                          })}
                        </div>

                        {/* Member's Tasks List */}
                        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 py-1">
                          {tasksLoading ? (
                            <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                              Loading tasks...
                            </div>
                          ) : (
                            (() => {
                              const todayStr = new Date().toISOString().split("T")[0];
                              const yesterdayDate = new Date();
                              yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                              const yesterdayStr = yesterdayDate.toISOString().split("T")[0];
                              
                              const filteredTasks = selectedMemberTasks.filter((t) => {
                                if (inspectorTab === "today") return t.startDate === todayStr;
                                if (inspectorTab === "yesterday") return t.startDate === yesterdayStr;
                                return true;
                              });

                              if (filteredTasks.length === 0) {
                                return (
                                  <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400 font-bold italic">
                                    No tasks registered for {inspectorTab === "today" ? "today" : inspectorTab === "yesterday" ? "yesterday" : "all days"}.
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-2">
                                  {filteredTasks.map((task: any) => (
                                    <div
                                      key={task.id || Math.random().toString()}
                                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold ${
                                        task.completed
                                          ? "bg-slate-100/30 dark:bg-slate-950/30 border-slate-150/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500"
                                          : "bg-slate-100/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <span
                                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                            task.completed
                                              ? "bg-emerald-500"
                                              : task.priority === "high"
                                              ? "bg-rose-500"
                                              : task.priority === "medium"
                                              ? "bg-amber-500"
                                              : "bg-blue-500"
                                          }`}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <span className={`block truncate ${task.completed ? "line-through font-normal text-slate-400 dark:text-slate-655" : "text-slate-700 dark:text-slate-200"}`}>
                                            {task.title}
                                          </span>
                                          {inspectorTab === "all" && task.startDate && (
                                            <span className="text-[8px] text-slate-500 dark:text-slate-400 font-black block mt-0.5">
                                              📅 {task.startDate}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                                          task.completed
                                            ? "bg-slate-200 dark:bg-slate-900 text-slate-500 dark:text-slate-500"
                                            : task.priority === "high"
                                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-450"
                                            : task.priority === "medium"
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-450"
                                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450"
                                        }`}
                                      >
                                        {task.completed ? "done" : task.priority}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Integrated Timer Hub */}
            <div className={`glass-card bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-slate-800 dark:text-slate-100 ${isSpectating ? "opacity-60 pointer-events-none select-none" : ""}`}>
              {isSpectating && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] rounded-3xl">
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <span className="text-2xl select-none">🔒</span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">Join to use the Focus Timer</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Members can track their study sessions here.</span>
                  </div>
                </div>
              )}
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSwitchType("pomodoro")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${timerType === "pomodoro"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                      : "bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-855 dark:hover:text-white"
                      }`}
                  >
                    Pomodoro
                  </button>
                  <button
                    onClick={() => handleSwitchType("stopwatch")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${timerType === "stopwatch"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                      : "bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-855 dark:hover:text-white"
                      }`}
                  >
                    Stopwatch
                  </button>
                </div>

                {timerType === "pomodoro" && (
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    {(["work", "short", "long"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => handleSwitchMode(m)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black capitalize transition-colors cursor-pointer ${timerMode === m
                          ? "bg-indigo-600/20 text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Timer circle / countdown */}
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-slate-100 dark:stroke-slate-800"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    {timerType === "pomodoro" && (
                      <motion.circle
                        cx="72"
                        cy="72"
                        r="64"
                        className="stroke-indigo-600 dark:stroke-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.4)]"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 64}
                        animate={{
                          strokeDashoffset:
                            2 *
                            Math.PI *
                            64 *
                            (1 -
                              secondsLeft /
                              ((timerMode === "work"
                                ? 25
                                : timerMode === "short"
                                  ? 5
                                  : 15) *
                                60)),
                        }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    )}
                  </svg>
                  <div className="absolute text-center">
                    <span className="font-mono text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                      {formatTime(secondsLeft)}
                    </span>
                    <span className="block text-[8px] font-black uppercase text-slate-500 tracking-widest mt-1">
                      {timerType === "pomodoro" ? timerMode : "elapsed"}
                    </span>
                  </div>
                </div>

                {/* Timer Config & Task integration */}
                <div className="flex-1 space-y-4 w-full">
                  {/* Active Task Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Link Focus to a Task
                    </label>
                    <select
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-inner"
                    >
                      <option value="general">General Study Goal</option>
                      {todos
                        .filter((t) => !t.completed)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            🎯 {t.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Custom Goal Input */}
                  {selectedTaskId === "general" && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="What are you focusing on?"
                        value={customGoal}
                        onChange={(e) => setCustomGoal(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-55/60 dark:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-xs text-slate-800 dark:text-slate-300 font-semibold shadow-inner"
                      />
                    </div>
                  )}

                  {/* Check off active task */}
                  {selectedTaskId !== "general" && (
                    <div className="flex items-center gap-2.5 p-3 bg-slate-100/60 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          const task = todos.find(t => t.id === selectedTaskId);
                          if (task) {
                            handleCheckOffTask(task.id, task.title);
                            setSelectedTaskId("general");
                          }
                        }}
                        className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer"
                        title="Complete Task"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                        Mark active task completed
                      </span>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleTimer}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-600/15 hover:shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
                      >
                        {timerRunning ? (
                          <>
                            <Pause className="w-4 h-4" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" /> Start Focus
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleResetTimer}
                        className="p-3 bg-slate-100 dark:bg-slate-950 hover:bg-slate-205 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-2xl transition-all cursor-pointer"
                        title="Reset"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                    {((timerType === "pomodoro" && secondsLeft < (timerMode === "work" ? 25 : timerMode === "short" ? 5 : 15) * 60) ||
                      (timerType === "stopwatch" && secondsLeft > 0)) && (
                        <button
                          onClick={handleSaveSession}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Trophy className="w-4 h-4" />
                          <span>Complete & Save Session</span>
                        </button>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Room Feed & Chat, My Tasks Today */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* 1. Live Activity Feed & Chat */}
              <div className="glass-card bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col h-[400px] shadow-xl">
                <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Room Feed & Chat</span>
                </h3>

                {/* Messages Content */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 custom-scrollbar min-h-0">
                  {messages.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs italic">
                      No activity in the room yet. Say hello!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSystem = msg.type === "system";

                      if (isSystem) {
                        return (
                          <div
                            key={msg.id}
                            className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold leading-relaxed"
                          >
                            🚀 {msg.text}
                          </div>
                        );
                      }

                      const isOwnMessage = msg.senderId === userUid;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"
                            }`}
                        >
                          <span className="text-[9px] text-slate-500 font-bold mb-0.5 px-1">
                            {msg.senderName}
                          </span>
                          <div
                            className={`p-2.5 rounded-2xl max-w-[85%] text-xs font-semibold leading-normal ${isOwnMessage
                              ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                              : "bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                              }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Form */}
                {isSpectating ? (
                  <div className="flex items-center justify-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-3 shrink-0 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">🔒 Join the room to send messages</span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSendMessage}
                    className="flex gap-2 border-t border-slate-200 dark:border-slate-800 pt-3 shrink-0"
                  >
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="submit"
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl cursor-pointer transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>

              {/* 2. My Tasks Today */}
              <div className="glass-card bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col h-[400px] shadow-xl">
                <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
                  <span className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>My Tasks Today</span>
                  </span>
                  <span className="text-[10px] font-black text-slate-500">
                    {todos.filter(t => t.completed).length} of {todos.length} Done
                  </span>
                </h3>

                {/* Todo List Content */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 custom-scrollbar min-h-0">
                  {todos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-1.5 py-6">
                      <CheckSquare className="w-6 h-6 stroke-1 text-slate-400" />
                      <span className="text-xs font-bold">No tasks for today</span>
                      <p className="text-[9px] opacity-75">
                        Add a task below to stay focused and show your friends!
                      </p>
                    </div>
                  ) : (
                    todos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${todo.completed
                          ? "bg-slate-100/30 dark:bg-slate-950/30 border-slate-150/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500"
                          : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-800"
                          }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={async () => {
                              updateTodo(todo.id, { completed: !todo.completed });
                              // Broadcast check off/uncheck
                              if (activeRoomId) {
                                await addDoc(collection(db, "rooms", activeRoomId, "messages"), {
                                  type: "system",
                                  text: todo.completed
                                    ? `🔄 ${user.name} reopened task: "${todo.title}" (-20 XP)`
                                    : `✅ ${user.name} completed task: "${todo.title}" (+20 XP)`,
                                  timestamp: Date.now(),
                                });
                              }
                            }}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${todo.completed
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <span className={`truncate ${todo.completed ? "line-through font-normal text-slate-400 dark:text-slate-500" : ""}`}>
                            {todo.title}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${todo.completed
                            ? "bg-slate-200 dark:bg-slate-900 text-slate-500"
                            : todo.priority === "high"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-455"
                              : todo.priority === "medium"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-455"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }`}
                        >
                          {todo.completed ? "done" : todo.priority}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Todo Form */}
                {isSpectating ? (
                  <div className="flex items-center justify-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-3 shrink-0 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">🔒 Join the room to add tasks</span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleCreateTodo}
                    className="border-t border-slate-200 dark:border-slate-800 pt-3 flex flex-col gap-2 shrink-0"
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add task for today..."
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs font-semibold text-slate-800 dark:text-slate-200"
                      />
                      <select
                        value={newTodoPriority}
                        onChange={(e) => setNewTodoPriority(e.target.value as any)}
                        className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-650 dark:text-slate-300 cursor-pointer focus:outline-none"
                      >
                        <option value="high">🔴 High</option>
                        <option value="medium">🟡 Med</option>
                        <option value="low">🟢 Low</option>
                      </select>
                      <button
                        type="submit"
                        className="p-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl cursor-pointer transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Join Request Toast for Admin */}
      <AnimatePresence>
        {requestToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 left-6 md:left-auto z-[9999] max-w-sm w-[calc(100%-3rem)] md:w-96 glass-card bg-slate-900/95 dark:bg-slate-950/95 border border-violet-500/40 text-white rounded-3xl p-4 shadow-2xl shadow-violet-500/20 backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <img
                src={requestToast.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${requestToast.userId}`}
                alt={requestToast.name}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase font-black tracking-widest text-violet-400 mb-0.5">
                  New Join Request
                </div>
                <p className="text-sm font-bold text-slate-100 truncate">
                  {requestToast.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  wants to join your study room
                </p>
              </div>
              <button
                onClick={() => setRequestToast(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={async () => {
                  const req = requestToast;
                  setRequestToast(null);
                  await handleRejectRequest(req);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-black bg-slate-800 border border-slate-700 text-slate-350 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-455 transition-all cursor-pointer text-center"
              >
                Decline
              </button>
              <button
                onClick={async () => {
                  const req = requestToast;
                  setRequestToast(null);
                  await handleAcceptRequest(req);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-655 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/25 cursor-pointer text-center"
              >
                ✓ Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupRoomPage;
