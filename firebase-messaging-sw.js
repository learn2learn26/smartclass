
importScripts(
  "https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBZkA1XNV7kdex8SSvla1_OzJkxmdFskzw",
  authDomain: "classguard-ai.firebaseapp.com",
  databaseURL: "https://classguard-ai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "classguard-ai",
  storageBucket: "classguard-ai.firebasestorage.app",
  messagingSenderId: "1010628513262",
  appId: "1:1010628513262:web:ed6bd874d30a04d126d2ff"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};

  self.registration.showNotification(
    notification.title || "CLASSGUARD AI",
    {
      body: notification.body || "New classroom alert.",
      icon: "./icon.png",
      data: payload.data || {}
    }
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("./index.html")
  );
});




