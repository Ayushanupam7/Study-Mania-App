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
import {
  MessageSquare,
  Search,
  Send,
  ArrowLeft,
  Flame,
  User,
  Zap
} from "lucide-react";

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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !userUid || !activeChatFriend) return;

    const textToSend = chatInput.trim();
    setChatInput("");

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

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.major.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-900 overflow-hidden">
      {/* 1. Left Sidebar: Friends List (Hidden on mobile if a chat is active) */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col shrink-0 ${activeChatFriend ? "hidden md:flex" : "flex"
          }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
          <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            {/* <MessageSquare className="h-5 w-5 text-sky-500" /> */}
            <span>Study Partners Chat</span>
          </h2>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search study partners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Partners List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
          {filteredFriends.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <User className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">No study partners found</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500/70">Invite friends from your Scholar Profile Hub</p>
            </div>
          ) : (
            filteredFriends.map(friend => {
              const lastMsg = lastMessages[friend.id];
              const isActive = activeChatFriend?.id === friend.id;

              return (
                <div
                  key={friend.id}
                  onClick={() => setActiveChatFriend(friend)}
                  className={`p-3.5 flex gap-3 cursor-pointer transition-all ${isActive
                      ? "bg-sky-50/40 dark:bg-slate-800/40 border-l-4 border-sky-500"
                      : "hover:bg-slate-50/50 dark:hover:bg-slate-800/10 border-l-4 border-transparent"
                    }`}
                >
                  {/* Avatar Container with status dot */}
                  <div className="relative shrink-0">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-950/30 p-1 object-cover border border-sky-200/40 dark:border-sky-800/40"
                    />
                    {friend.status === "online" && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                    )}
                    {friend.status === "studying" && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-orange-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                        <Flame className="h-2 w-2 text-white shrink-0" />
                      </span>
                    )}
                  </div>

                  {/* Info details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {friend.name}
                      </h4>
                      {lastMsg && (
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0">
                          {formatTime(lastMsg.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {lastMsg ? lastMsg.text : `${friend.major} • Level ${friend.level}`}
                      </p>
                      {friend.status === "studying" && (
                        <span className="text-[8px] bg-orange-500/10 text-orange-500 font-bold px-1 py-0.2 rounded shrink-0">
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
      <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/30 ${!activeChatFriend ? "hidden md:flex" : "flex"}`}>
        {activeChatFriend ? (
          <>
            {/* Active Chat Header */}
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setActiveChatFriend(null)}
                  className="md:hidden p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                {/* Avatar with Status badge */}
                <div className="relative shrink-0">
                  <img
                    src={activeChatFriend.avatar}
                    alt={activeChatFriend.name}
                    className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/30 p-1 object-cover border border-sky-200/40 dark:border-sky-800/40"
                  />
                  {activeChatFriend.status === "online" && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                  )}
                  {activeChatFriend.status === "studying" && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-slate-900" />
                  )}
                </div>

                {/* Friend Details */}
                <div className="min-w-0 text-left">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                    {activeChatFriend.name}
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-black">
                      Lvl {activeChatFriend.level}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-semibold">
                    {activeChatFriend.status === "studying" ? (
                      <span className="text-orange-500 flex items-center gap-0.5">
                        <Flame className="h-3 w-3 shrink-0" />
                        Studying: {activeChatFriend.currentActivity || "Academics"}
                      </span>
                    ) : activeChatFriend.status === "online" ? (
                      <span className="text-emerald-500">Active Online</span>
                    ) : (
                      "Offline"
                    )}
                    {" • "}{activeChatFriend.major}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {activeChatFriend.status === "studying" && (
                  <button
                    onClick={handleSendCheer}
                    disabled={!!cheerSent}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${cheerSent
                        ? "bg-emerald-500 text-white"
                        : "bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-500/25"
                      }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>{cheerSent ? "Energy Sent!" : "Cheer Energy"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chat Messages Log Panel */}
            <div
              className="flex-1 overflow-y-auto px-4 py-5 space-y-4 relative custom-scrollbar bg-slate-100/50 dark:bg-slate-950/20"
              style={{
                backgroundImage: darkMode
                  ? "radial-gradient(#1e293b 1px, transparent 1px)"
                  : "radial-gradient(#e2e8f0 1px, transparent 1px)",
                backgroundSize: "16px 16px"
              }}
            >
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-450 dark:text-slate-600 space-y-2">
                  <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-800" />
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">No messages yet</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500/80">Send a greeting to start your study discussion!</p>
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.senderId === userUid;

                  return (
                    <div
                      key={msg.id}
                      className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] sm:max-w-[60%] p-3 shadow-sm text-left ${isMe
                            ? "bg-sky-500 text-white rounded-2xl rounded-tr-none"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none border border-slate-200/30 dark:border-slate-700/30"
                          }`}
                      >
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span
                          className={`text-[8px] font-bold text-right block mt-1 ${isMe ? "text-sky-100" : "text-slate-400 dark:text-slate-500"
                            }`}
                        >
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800/60 flex gap-2 items-center shrink-0 z-10"
            >
              <input
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="h-9 w-9 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl flex items-center justify-center cursor-pointer shrink-0 transition-colors shadow-md shadow-sky-500/10"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          /* Empty Chat Area State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/20 text-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/5">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                Your Academic Chatroom
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Connect with your study partners in real-time. Share notes, discuss assignments, and send focus energy cheers when they are studying.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
