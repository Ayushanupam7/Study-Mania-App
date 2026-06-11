# Study Mania App

Study Mania is a React + TypeScript + Vite productivity application designed to help students stay focused, organized, and motivated. It combines study planning and time management tools with Firebase authentication, real-time data sync, and Capacitor-enabled notifications for native-like behavior on Android.

## Core Features

- Authentication via Firebase
- Dashboard overview of active study goals and progress
- Todo management for tasks and study priorities
- Habit tracking for daily study routines
- Countdown timers for upcoming deadlines or sessions
- Pomodoro timer with focus sessions and breaks
- Analytics dashboard for productivity insights
- Notes management for quick study notes
- User profile and social-style interactions
- Local notifications and push notification hooks through Capacitor
- Responsive mobile-first layout with sidebar and bottom navigation

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Firebase Auth, Firestore, Messaging
- Capacitor for Android and native notifications
- Zustand for app state management
- Framer Motion animations
- Recharts charts and React Calendar visualizations
- React Router
- lucide-react icons

## Project Structure

- `src/App.tsx` — routing, authentication, and app initialization
- `src/layouts/MainLayout.tsx` — app shell, navigation, notifications, and header UI
- `src/pages/` — Dashboard, Todos, Habits, Countdowns, Pomodoro, Analytics, Notes, Profile, Login
- `src/firebase/` — Firebase initialization and messaging handling
- `src/store/` — shared Zustand state store
- `src/utils/notifications.ts` — Capacitor notification initialization and listeners

## Setup

### Prerequisites

- Node.js 20+ or compatible stable LTS release
- npm or yarn
- Firebase project for Auth and Firestore
- Android SDK if building the native Android app

### Install dependencies

```bash
npm install
```

### Configure Firebase

Update `src/firebase/firebaseConfig.ts` with your Firebase project configuration values.

Example environment variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Android / Capacitor

This app includes Capacitor support for Android and uses Capacitor plugins for local notifications and push notifications.

Sync the native project and open Android Studio:

```bash
npx cap sync android
npx cap open android
```

## Notes

- `HashRouter` is used for compatibility with Capacitor and mobile navigation.
- Firebase auth state is observed in `src/App.tsx`, and authenticated users are redirected into the main app flow.
- Notifications are initialized on app mount, and background alerts are dispatched only when the app is not active.
- Real-time Firestore listeners power incoming friend requests, XP gains, cheers, and chat notifications.

## Contributing

You can extend the app by adding new productivity tools, improving analytics, or adding cross-platform support.

---

Built to make study sessions more organized, rewarding, and focused.
