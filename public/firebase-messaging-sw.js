importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyABkYg4ihOtUG9vMGNUWvhcFXpAP83xEaQ",
  authDomain: "rollet-video-app.firebaseapp.com",
  projectId: "rollet-video-app",
  storageBucket: "rollet-video-app.firebasestorage.app",
  messagingSenderId: "695377435096",
  appId: "1:695377435096:web:d1b5b2d0c839f6c3b27aad",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "PrizeLive", {
    body: body || "새로운 경품이 시작됩니다!",
    icon: icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    data: payload.data,
    actions: [{ action: "open", title: "입장하기" }],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const roomId = event.notification.data?.roomId || "main";
  event.waitUntil(clients.openWindow(`/room/${roomId}`));
});
