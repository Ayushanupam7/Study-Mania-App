import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useStore } from "../store/store";

// Initialize notification system
export const initializeNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Not running on native platform. Notification permissions skipped.");
    return;
  }

  try {
    // Request local notification permissions
    const localPerm = await LocalNotifications.requestPermissions();
    console.log("Local notifications permission status:", localPerm.display);

    // Request push notification permissions
    const pushPerm = await PushNotifications.requestPermissions();
    console.log("Push notifications permission status:", pushPerm.receive);

    if (pushPerm.receive === "granted") {
      await PushNotifications.register();
    }
  } catch (err) {
    console.warn("Failed to request notification permissions:", err);
  }
};

// Handle click action from local or remote notification
const handleNotificationAction = (data: any) => {
  if (!data) return;
  console.log("Handling click action redirect with data:", data);

  try {
    if ((data.type === "chat_message" || data.type === "message") && data.friend) {
      useStore.getState().setActiveChatFriend(data.friend);
      window.location.hash = "#/chats";
    } else if (data.type === "friend_request" || data.type === "cheer") {
      window.location.hash = "#/chats";
    }
  } catch (err) {
    console.error("Error executing notification action redirect:", err);
  }
};

// Set up event listeners for native Push and Local Notifications
export const setupPushListeners = () => {
  if (!Capacitor.isNativePlatform()) return;

  PushNotifications.removeAllListeners();

  PushNotifications.addListener("registration", (token) => {
    console.log("FCM Push Registration Token:", token.value);
  });

  PushNotifications.addListener("registrationError", (error) => {
    console.error("FCM Push Registration Error:", error);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("Push notification received in foreground:", notification);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("Push notification action performed:", action);
    handleNotificationAction(action.notification.data);
  });

  // Local notifications click actions
  try {
    LocalNotifications.removeAllListeners();
    LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      console.log("Local notification action performed:", action);
      handleNotificationAction(action.notification.extra);
    });
  } catch (err) {
    console.error("Error setting up local notifications action listeners:", err);
  }
};

// Trigger an immediate device-level notification if the app is in the background
export const showLocalNotification = async (
  title: string,
  body: string,
  id: number = Math.floor(Math.random() * 100000),
  extraData?: any
) => {
  if (!Capacitor.isNativePlatform()) {
    // Fallback to Web Notification API if supported
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
    return;
  }

  try {
    const state = await App.getState();
    // Only dispatch a device notification banner if user is currently backgrounded
    if (!state.isActive) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: new Date(Date.now() + 100) },
            sound: "default",
            actionTypeId: "",
            extra: extraData || null
          }
        ]
      });
    }
  } catch (err) {
    console.error("Error displaying local notification:", err);
  }
};

// Schedule a future local notification for timer events
export const scheduleTimerEndNotification = async (title: string, body: string, delaySeconds: number, notificationId: number) => {
  if (!Capacitor.isNativePlatform() || delaySeconds <= 0) return;

  try {
    // Cancel any existing notification under this ID first to avoid overlap
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }]
    });

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: notificationId,
          schedule: { at: new Date(Date.now() + delaySeconds * 1000) },
          sound: "default",
          actionTypeId: "",
          extra: null
        }
      ]
    });
    console.log(`Scheduled notification ${notificationId} in ${delaySeconds} seconds.`);
  } catch (err) {
    console.error("Error scheduling timer end notification:", err);
  }
};

// Cancel a scheduled notification
export const cancelNotification = async (notificationId: number) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }]
    });
    console.log(`Cancelled scheduled notification ${notificationId}.`);
  } catch (err) {
    console.error("Error cancelling notification:", err);
  }
};
