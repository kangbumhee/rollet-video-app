import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "./config";

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

function getMessagingInstance() {
  if (typeof window === "undefined") return null;
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch {
      console.warn("FCM not supported in this browser");
      return null;
    }
  }
  return messagingInstance;
}

export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("알림 권한이 거부되었습니다.");
      return null;
    }

    const messaging = getMessagingInstance();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("VAPID key가 설정되지 않았습니다.");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js"),
    });

    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("FCM 토큰 발급 실패:", error);
    return null;
  }
}

export function onForegroundMessage(
  callback: (payload: { notification?: { title?: string; body?: string } }) => void
) {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
