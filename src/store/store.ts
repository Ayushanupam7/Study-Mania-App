// src/store/store.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { db, auth } from "../firebase";
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc, addDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  xp: number;
  level: number;
  title: string;
  major: string;
  bio: string;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  major: string;
  status: "online" | "offline" | "studying";
  currentActivity?: string;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  category: string;
  startDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface Habit {
  id: string;
  title: string;
  category: string;
  frequency: "daily" | "weekly";
  streak: number;
  completions: Record<string, boolean>; // e.g. "2026-05-28": true
  createdAt: string;
}

export interface Countdown {
  id: string;
  title: string;
  date: string;
  category: string;
  color: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  color: string;
  updatedAt: string;
  drawingData?: string;
}

export interface PomodoroSettings {
  workTime: number; // in minutes
  shortBreak: number;
  longBreak: number;
  dailyResetHour?: number;
  dailyGoalHours?: number;
}

export interface StudySession {
  userId: string;
  durationMinutes: number;
  sessionType: "pomodoro" | "stopwatch";
  startTime: number; // epoch ms
  endTime: number;   // epoch ms
  timestamp: number; // epoch ms (same as endTime, for querying)
  sessionNumber?: number;
  totalStudyTime?: number;
}

interface UIState {
  darkMode: boolean;
  toggleTheme: () => void;
}

interface AuthState {
  user: UserProfile;
  updateUser: (data: Partial<UserProfile>) => void;
  gainXp: (amount: number, reason?: string) => void;
  friends: Friend[];
  addFriend: (friend: Friend) => void;
  deleteFriend: (id: string) => void;

  // Firebase Auth & Sync
  authLoading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  userUid: string | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, major: string) => Promise<void>;
  logout: () => Promise<void>;
  deactivateAccount: () => Promise<void>;
  setAuthUser: (uid: string | null) => void;
  syncFromFirestore: (uid: string, isBackground?: boolean) => Promise<void>;
  activeChatFriend: Friend | null;
  setActiveChatFriend: (friend: Friend | null) => void;
}

interface TodoState {
  todos: Todo[];
  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, data: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
}

interface HabitState {
  habits: Habit[];
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, data: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitDay: (id: string, date: string) => void;
}

interface CountdownState {
  countdowns: Countdown[];
  addCountdown: (cd: Countdown) => void;
  deleteCountdown: (id: string) => void;
}

interface NoteState {
  notes: Note[];
  addNote: (note: Note) => void;
  updateNote: (id: string, data: Partial<Note>) => void;
  deleteNote: (id: string) => void;
}

interface PomodoroState {
  workTime: number;
  shortBreak: number;
  longBreak: number;
  dailyResetHour?: number;
  dailyGoalHours?: number;
  sessionCount: number;
  todayMinutes: number;
  totalStudyTime: number;
  studyHistory: Record<string, number>;
  lastStudyDate: string;
  incrementSession: (minutes: number) => void;
  recordStudySession: (session: Omit<StudySession, "userId">) => Promise<void>;
  updatePomodoroSettings: (settings: Partial<PomodoroSettings & { dailyResetHour?: number; dailyGoalHours?: number }>) => void;
  checkDailyReset: () => void;
}

export type StoreState = UIState &
  AuthState &
  TodoState &
  HabitState &
  CountdownState &
  NoteState &
  PomodoroState;

const defaultUser: UserProfile = {
  name: "Scholar Mania",
  email: "student@studymania.app",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=StudyMania",
  xp: 0,
  level: 1,
  title: "Focus Rookie",
  major: "JEE Preparation",
  bio: "Leveling up my study game one Pomodoro at a time.",
};

const defaultTodos: Todo[] = [
  { id: "1", title: "Complete Calculus Assignment", completed: false, priority: "high", category: "Academics", startDate: new Date().toISOString().split("T")[0], dueDate: new Date().toISOString().split("T")[0] }
];

const defaultHabits: Habit[] = [
  { id: "1", title: "Drink 3L Water", category: "Health", frequency: "daily", streak: 4, completions: {}, createdAt: new Date().toISOString() },
];

const defaultCountdowns: Countdown[] = [
  { id: "1", title: "Physics Midterm Exam", date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], category: "Academics", color: "indigo" }
];

const defaultNotes: Note[] = [
  { id: "1", title: "Study Mania Design Philosophy", content: "# Notion + TickTick + Habitica\n\nWelcome to your dynamic student productivity dashboard. Work hard, gain XP, level up, and build consistency.", category: "Ideas", color: "sky", updatedAt: new Date().toISOString() },
];

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // UI Slice
        darkMode: false,
        toggleTheme: () => set(state => ({ darkMode: !state.darkMode })),

        // User / Auth Slice
        user: defaultUser,
        authLoading: true,
        authError: null,
        isAuthenticated: false,
        userUid: null,
        activeChatFriend: null,
        setActiveChatFriend: (friend) => set({ activeChatFriend: friend }),

        updateUser: data =>
          set(state => {
            const updatedUser = { ...state.user, ...data };
            const uid = state.userUid;
            if (uid) {
              setDoc(doc(db, "users", uid), updatedUser, { merge: true }).catch(e => console.error("Firestore user update error:", e));
            }
            return { user: updatedUser };
          }),

        gainXp: (amount, reason) =>
          set(state => {
            const nextXp = state.user.xp + amount;
            const xpNeeded = state.user.level * 200;
            let updatedUser = { ...state.user };
            if (nextXp >= xpNeeded) {
              updatedUser = {
                ...state.user,
                xp: nextXp - xpNeeded,
                level: state.user.level + 1,
              };
            } else {
              updatedUser = {
                ...state.user,
                xp: nextXp,
              };
            }
            const uid = state.userUid;
            if (uid) {
              setDoc(doc(db, "users", uid), updatedUser, { merge: true }).catch(e => console.error("Firestore XP update error:", e));
              addDoc(collection(db, "users", uid, "xp_history"), {
                amount,
                reason: reason || "Activity Reward",
                timestamp: Date.now()
              }).catch(e => console.error("Firestore XP history log error:", e));
            }
            return { user: updatedUser };
          }),

        friends: [],

        addFriend: friend =>
          set(state => {
            const updatedFriends = [...state.friends, friend];
            const uid = state.userUid;
            if (uid) {
              // Add friend to current user's list
              setDoc(doc(db, "users", uid, "friends", friend.id), friend).catch(e => console.error("Firestore addFriend error:", e));

              // Also add current user to friend's list (mutual friendship)
              const currentUserAsFriend: Friend = {
                id: uid,
                name: state.user.name,
                avatar: state.user.avatar,
                level: state.user.level,
                xp: state.user.xp,
                major: state.user.major || "JEE Preparation",
                status: "online",
              };
              setDoc(doc(db, "users", friend.id, "friends", uid), currentUserAsFriend).catch(e => console.error("Firestore mutual addFriend error:", e));
            }
            return { friends: updatedFriends };
          }),

        deleteFriend: id =>
          set(state => {
            const updatedFriends = state.friends.filter(f => f.id !== id);
            const uid = state.userUid;
            if (uid) {
              deleteDoc(doc(db, "users", uid, "friends", id)).catch(e => console.error("Firestore deleteFriend error:", e));
            }
            return { friends: updatedFriends };
          }),

        loginWithEmail: async (email, password) => {
          set({ authLoading: true, authError: null });
          try {
            await signInWithEmailAndPassword(auth, email, password);
          } catch (error: any) {
            set({ authError: error.message || "Failed to sign in." });
            throw error;
          } finally {
            set({ authLoading: false });
          }
        },

        signUpWithEmail: async (email, password, name, major) => {
          set({ authLoading: true, authError: null });
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            const initialUser: UserProfile = {
              name,
              email,
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
              xp: 0,
              level: 1,
              title: "Focus Rookie",
              major: major || "Unspecified",
              bio: "Leveling up my study game one Pomodoro at a time.",
            };

            await setDoc(doc(db, "users", uid), {
              ...initialUser,
              totalStudyTime: 0,
              todayMinutes: 0,
              sessionCount: 0,
              lastStudyDate: "",
              studyHistory: {},
              dailyResetHour: 4,
              dailyGoalHours: 8,
            });

            // Migrating guest data to database if available
            const localTodos = get().todos;
            for (const todo of localTodos) {
              await setDoc(doc(db, "users", uid, "todos", todo.id), todo);
            }
            const localHabits = get().habits;
            for (const habit of localHabits) {
              await setDoc(doc(db, "users", uid, "habits", habit.id), habit);
            }
            const localNotes = get().notes;
            for (const note of localNotes) {
              await setDoc(doc(db, "users", uid, "notes", note.id), note);
            }
            const localCountdowns = get().countdowns;
            for (const cd of localCountdowns) {
              await setDoc(doc(db, "users", uid, "countdowns", cd.id), cd);
            }
          } catch (error: any) {
            set({ authError: error.message || "Failed to sign up." });
            throw error;
          } finally {
            set({ authLoading: false });
          }
        },

        logout: async () => {
          set({ authLoading: true });
          try {
            await signOut(auth);
            set({
              userUid: null,
              isAuthenticated: false,
              user: defaultUser,
              todos: defaultTodos,
              habits: defaultHabits,
              countdowns: defaultCountdowns,
              notes: defaultNotes,
              friends: [],
              sessionCount: 0,
              todayMinutes: 0,
              totalStudyTime: 0,
              studyHistory: {},
              lastStudyDate: ""
            });
          } catch (error: any) {
            console.error("Sign out error:", error);
          } finally {
            set({ authLoading: false });
          }
        },

        deactivateAccount: async () => {
          set({ authLoading: true });
          const uid = get().userUid;
          const friendsList = get().friends;

          try {
            if (uid) {
              // 1. Delete mutual friend connections and chat rooms
              for (const friend of friendsList) {
                // Delete current user from friend's friend collection
                await deleteDoc(doc(db, "users", friend.id, "friends", uid)).catch(e => console.error("Error deleting mutual friend:", e));

                // Determine chat room ID and delete chat messages/rooms
                const chatRoomId = uid < friend.id ? `${uid}_${friend.id}` : `${friend.id}_${uid}`;
                const messagesSnap = await getDocs(collection(db, "chats", chatRoomId, "messages")).catch(() => null);
                if (messagesSnap) {
                  for (const mDoc of messagesSnap.docs) {
                    await deleteDoc(doc(db, "chats", chatRoomId, "messages", mDoc.id)).catch(() => { });
                  }
                }
                await deleteDoc(doc(db, "chats", chatRoomId)).catch(() => { });
              }

              // 2. Delete subcollections of the current user
              const collectionsToDelete = ["todos", "habits", "notes", "countdowns", "friends"];
              for (const colName of collectionsToDelete) {
                const colSnap = await getDocs(collection(db, "users", uid, colName)).catch(() => null);
                if (colSnap) {
                  for (const docSnap of colSnap.docs) {
                    await deleteDoc(doc(db, "users", uid, colName, docSnap.id)).catch(() => { });
                  }
                }
              }

              // 3. Delete user's active pomodoro arena session if exists
              await deleteDoc(doc(db, "arena_sessions", uid)).catch(() => { });

              // 4. Delete root user document
              await deleteDoc(doc(db, "users", uid));

              // 5. Delete Firebase Auth user
              const currentUser = auth.currentUser;
              if (currentUser) {
                await currentUser.delete();
              }
            }
          } catch (error: any) {
            console.error("Deactivate account error:", error);
            // Re-throw authentication errors like requires-recent-login to handle in the UI
            throw error;
          } finally {
            // 6. Reset client state to default
            set({
              userUid: null,
              isAuthenticated: false,
              user: defaultUser,
              todos: defaultTodos,
              habits: defaultHabits,
              countdowns: defaultCountdowns,
              notes: defaultNotes,
              friends: [],
              sessionCount: 0,
              todayMinutes: 0,
              totalStudyTime: 0,
              studyHistory: {},
              lastStudyDate: "",
              authLoading: false
            });
          }
        },

        setAuthUser: (uid) => {
          set({
            userUid: uid,
            isAuthenticated: !!uid,
            authLoading: false
          });
        },

        syncFromFirestore: async (uid, isBackground = false) => {
          if (!isBackground) {
            set({ authLoading: true });
          }
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              const uData = userDoc.data();
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

              if (isNewDay) {
                setDoc(doc(db, "users", uid), {
                  sessionCount: 0,
                  todayMinutes: 0,
                  lastStudyDate: currentStudyDay
                }, { merge: true }).catch(e => console.error("Firestore sync day-reset error:", e));

                setDoc(doc(db, "arena_sessions", uid), {
                  secondsBase: 0
                }, { merge: true }).catch(e => console.error("Firestore arena sync day-reset error:", e));
              }

              const cleanUser: UserProfile = {
                name: uData.name || "Scholar",
                email: uData.email || "",
                avatar: uData.avatar || "",
                xp: uData.xp !== undefined ? uData.xp : 0,
                level: uData.level !== undefined ? uData.level : 1,
                title: uData.title || "Focus Rookie",
                major: uData.major || "Computer Science",
                bio: uData.bio || "Leveling up my study game one Pomodoro at a time.",
              };

              set({
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

            const todosSnap = await getDocs(collection(db, "users", uid, "todos"));
            const todos = todosSnap.docs.map(doc => doc.data() as Todo);
            if (todos.length > 0) set({ todos });

            const habitsSnap = await getDocs(collection(db, "users", uid, "habits"));
            const habits = habitsSnap.docs.map(doc => doc.data() as Habit);
            if (habits.length > 0) set({ habits });

            const notesSnap = await getDocs(collection(db, "users", uid, "notes"));
            const notes = notesSnap.docs.map(doc => doc.data() as Note);
            if (notes.length > 0) set({ notes });

            const cdsSnap = await getDocs(collection(db, "users", uid, "countdowns"));
            const countdowns = cdsSnap.docs.map(doc => doc.data() as Countdown);
            if (countdowns.length > 0) set({ countdowns });

            const friendsSnap = await getDocs(collection(db, "users", uid, "friends"));
            const friendsList = friendsSnap.docs.map(doc => doc.data() as any as Friend);
            let dbFriends: Friend[] = [];

            if (friendsList.length > 0) {
              for (const f of friendsList) {
                // Fetch live profile details for this friend to keep name, level, XP, and avatar synchronized
                const friendDoc = await getDoc(doc(db, "users", f.id));
                if (friendDoc.exists()) {
                  const live = friendDoc.data();
                  dbFriends.push({
                    ...f,
                    name: live.name || f.name,
                    avatar: live.avatar || f.avatar,
                    level: live.level !== undefined ? live.level : f.level,
                    xp: live.xp !== undefined ? live.xp : f.xp,
                    major: live.major || f.major,
                  });
                } else {
                  dbFriends.push(f);
                }
              }
              set({ friends: dbFriends });
            } else {
              set({ friends: [] });
            }
          } catch (error) {
            console.error("Firestore sync error:", error);
          } finally {
            if (!isBackground) {
              set({ authLoading: false });
            }
          }
        },

        // Todo Slice
        todos: defaultTodos,
        addTodo: todo => {
          set(state => ({ todos: [todo, ...state.todos] }));
          const uid = get().userUid;
          if (uid) {
            setDoc(doc(db, "users", uid, "todos", todo.id), todo).catch(e => console.error("Firestore addTodo error:", e));
          }
          get().gainXp(15, `Created Task: "${todo.title}"`);
        },
        updateTodo: (id, data) =>
          set(state => {
            const oldTodo = state.todos.find(t => t.id === id);
            const isJustCompleted = data.completed === true && oldTodo && !oldTodo.completed;
            if (isJustCompleted) {
              setTimeout(() => get().gainXp(20, `Completed Task: "${oldTodo?.title}"`), 0);
            }
            const updatedTodos = state.todos.map(t => (t.id === id ? { ...t, ...data } : t));
            const updatedTodo = updatedTodos.find(t => t.id === id);
            const uid = state.userUid;
            if (uid && updatedTodo) {
              setDoc(doc(db, "users", uid, "todos", id), updatedTodo, { merge: true }).catch(e => console.error("Firestore updateTodo error:", e));
            }
            return { todos: updatedTodos };
          }),
        deleteTodo: id =>
          set(state => {
            const uid = state.userUid;
            if (uid) {
              deleteDoc(doc(db, "users", uid, "todos", id)).catch(e => console.error("Firestore deleteTodo error:", e));
            }
            return { todos: state.todos.filter(t => t.id !== id) };
          }),

        // Habit Slice
        habits: defaultHabits,
        addHabit: habit => {
          set(state => ({ habits: [habit, ...state.habits] }));
          const uid = get().userUid;
          if (uid) {
            setDoc(doc(db, "users", uid, "habits", habit.id), habit).catch(e => console.error("Firestore addHabit error:", e));
          }
          get().gainXp(25, `Created Habit: "${habit.title}"`);
        },
        updateHabit: (id, data) =>
          set(state => {
            const updatedHabits = state.habits.map(h => (h.id === id ? { ...h, ...data } : h));
            const updatedHabit = updatedHabits.find(h => h.id === id);
            const uid = state.userUid;
            if (uid && updatedHabit) {
              setDoc(doc(db, "users", uid, "habits", id), updatedHabit, { merge: true }).catch(e => console.error("Firestore updateHabit error:", e));
            }
            return { habits: updatedHabits };
          }),
        deleteHabit: id =>
          set(state => {
            const uid = state.userUid;
            if (uid) {
              deleteDoc(doc(db, "users", uid, "habits", id)).catch(e => console.error("Firestore deleteHabit error:", e));
            }
            return { habits: state.habits.filter(h => h.id !== id) };
          }),
        toggleHabitDay: (id, date) =>
          set(state => {
            const updated = state.habits.map(h => {
              if (h.id === id) {
                const wasCompleted = !!h.completions[date];
                const completions = { ...h.completions, [date]: !wasCompleted };
                let streak = h.streak;
                if (!wasCompleted) {
                  streak += 1;
                  setTimeout(() => get().gainXp(10, `Completed Habit: "${h.title}"`), 0);
                } else {
                  streak = Math.max(0, streak - 1);
                }
                const updatedH = { ...h, completions, streak };
                const uid = state.userUid;
                if (uid) {
                  setDoc(doc(db, "users", uid, "habits", id), updatedH, { merge: true }).catch(e => console.error("Firestore toggleHabitDay error:", e));
                }
                return updatedH;
              }
              return h;
            });
            return { habits: updated };
          }),

        // Countdown Slice
        countdowns: defaultCountdowns,
        addCountdown: cd => {
          set(state => ({ countdowns: [...state.countdowns, cd] }));
          const uid = get().userUid;
          if (uid) {
            setDoc(doc(db, "users", uid, "countdowns", cd.id), cd).catch(e => console.error("Firestore addCountdown error:", e));
          }
          get().gainXp(10, `Created Countdown: "${cd.title}"`);
        },
        deleteCountdown: id =>
          set(state => {
            const uid = state.userUid;
            if (uid) {
              deleteDoc(doc(db, "users", uid, "countdowns", id)).catch(e => console.error("Firestore deleteCountdown error:", e));
            }
            return { countdowns: state.countdowns.filter(cd => cd.id !== id) };
          }),

        // Note Slice
        notes: defaultNotes,
        addNote: note => {
          set(state => ({ notes: [note, ...state.notes] }));
          const uid = get().userUid;
          if (uid) {
            setDoc(doc(db, "users", uid, "notes", note.id), note).catch(e => console.error("Firestore addNote error:", e));
          }
          get().gainXp(10, `Created Note: "${note.title}"`);
        },
        updateNote: (id, data) =>
          set(state => {
            const updatedNotes = state.notes.map(n => (n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n));
            const updatedNote = updatedNotes.find(n => n.id === id);
            const uid = state.userUid;
            if (uid && updatedNote) {
              setDoc(doc(db, "users", uid, "notes", id), updatedNote, { merge: true }).catch(e => console.error("Firestore updateNote error:", e));
            }
            return { notes: updatedNotes };
          }),
        deleteNote: id =>
          set(state => {
            const uid = state.userUid;
            if (uid) {
              deleteDoc(doc(db, "users", uid, "notes", id)).catch(e => console.error("Firestore deleteNote error:", e));
            }
            return { notes: state.notes.filter(n => n.id !== id) };
          }),

        // Pomodoro Slice
        workTime: 25,
        shortBreak: 5,
        longBreak: 15,
        dailyResetHour: 4,
        dailyGoalHours: 8,
        sessionCount: 0,
        todayMinutes: 0,
        totalStudyTime: 0,
        studyHistory: {},
        lastStudyDate: "",
        incrementSession: minutes =>
          set(state => {
            const d = new Date();
            const resetHour = state.dailyResetHour ?? 4;
            if (d.getHours() < resetHour) {
              d.setDate(d.getDate() - 1);
            }
            const currentStudyDay = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;

            const isNewDay = state.lastStudyDate !== currentStudyDay;
            const nextSessionCount = isNewDay ? 1 : state.sessionCount + 1;
            const nextTodayMinutes = isNewDay ? minutes : state.todayMinutes + minutes;
            const nextTotalStudyTime = (state.totalStudyTime || 0) + minutes;
            const nextStudyHistory = {
              ...(state.studyHistory || {}),
              [currentStudyDay]: ((state.studyHistory && state.studyHistory[currentStudyDay]) || 0) + minutes
            };

            // Calculate XP and level gain directly (consolidated atomic update)
            const xpEarned = minutes * 2;
            const nextXp = state.user.xp + xpEarned;
            const xpNeeded = state.user.level * 200;
            let updatedUser = { ...state.user };
            if (nextXp >= xpNeeded) {
              updatedUser = {
                ...state.user,
                xp: nextXp - xpNeeded,
                level: state.user.level + 1,
              };
            } else {
              updatedUser = {
                ...state.user,
                xp: nextXp,
              };
            }

            const uid = state.userUid;
            if (uid) {
              // Consolidated single write to user document
              setDoc(doc(db, "users", uid), {
                ...updatedUser,
                sessionCount: nextSessionCount,
                todayMinutes: nextTodayMinutes,
                totalStudyTime: nextTotalStudyTime,
                studyHistory: nextStudyHistory,
                lastStudyDate: currentStudyDay
              }, { merge: true }).catch(e => console.error("Firestore incrementSession error:", e));

              // Sync arena session data
              setDoc(doc(db, "arena_sessions", uid), {
                secondsBase: nextTodayMinutes * 60,
                totalStudyTime: nextTotalStudyTime,
                lastActive: Date.now()
              }, { merge: true }).catch(e => console.error("Firestore arena sync error:", e));

              // Add XP history log
              addDoc(collection(db, "users", uid, "xp_history"), {
                amount: xpEarned,
                reason: `Completed Focus Session (${minutes}m)`,
                timestamp: Date.now()
              }).catch(e => console.error("Firestore XP history log error:", e));
            }

            return {
              user: updatedUser,
              sessionCount: nextSessionCount,
              todayMinutes: nextTodayMinutes,
              totalStudyTime: nextTotalStudyTime,
              studyHistory: nextStudyHistory,
              lastStudyDate: currentStudyDay
            };
          }),
        recordStudySession: async (session) => {
          const uid = get().userUid;
          if (!uid) return;
          try {
            const fullSession: StudySession = {
              ...session,
              userId: uid
            };
            // Save to per-user sub-collection so it's private and queryable
            await addDoc(collection(db, "users", uid, "study_sessions"), fullSession);
          } catch (e) {
            console.error("Firestore recordStudySession error:", e);
          }
        },
        updatePomodoroSettings: settings =>
          set(state => {
            const newState = {
              ...state,
              ...settings,
            };
            const uid = state.userUid;
            if (uid) {
              setDoc(doc(db, "users", uid), {
                workTime: newState.workTime,
                shortBreak: newState.shortBreak,
                longBreak: newState.longBreak,
                dailyResetHour: newState.dailyResetHour ?? 4,
                dailyGoalHours: newState.dailyGoalHours ?? 8,
              }, { merge: true }).catch(e => console.error("Firestore update settings error:", e));
            }
            return newState;
          }),
        checkDailyReset: () =>
          set(state => {
            if (!state.userUid) return {};
            const d = new Date();
            const resetHour = state.dailyResetHour ?? 4;
            if (d.getHours() < resetHour) {
              d.setDate(d.getDate() - 1);
            }
            const currentStudyDay = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
            
            if (state.lastStudyDate && state.lastStudyDate !== currentStudyDay) {
              // Reset daily stats in Firestore
              setDoc(doc(db, "users", state.userUid), {
                sessionCount: 0,
                todayMinutes: 0,
                lastStudyDate: currentStudyDay
              }, { merge: true }).catch(e => console.error("Firestore checkDailyReset error:", e));

              setDoc(doc(db, "arena_sessions", state.userUid), {
                secondsBase: 0
              }, { merge: true }).catch(e => console.error("Firestore arena checkDailyReset error:", e));

              return {
                sessionCount: 0,
                todayMinutes: 0,
                lastStudyDate: currentStudyDay
              };
            }
            return {};
          }),
      }),
      { name: "studymania-storage" }
    ),
    { name: "StudyManiaStore" }
  )
);
