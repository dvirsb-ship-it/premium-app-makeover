/*
 * Service worker להתראות בלבד.
 * במכוון אינו מיירט fetch ואינו שומר מטמון — כך הוא לא יכול להגיש תוכן ישן
 * או לשבור טעינה של האפליקציה. הקונפיג כאן ציבורי בהגדרה.
 */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD1ipfVOVOJypr8jU04aSg1frV21Cptp-8",
  authDomain: "justask-6bfb9.firebaseapp.com",
  projectId: "justask-6bfb9",
  storageBucket: "justask-6bfb9.firebasestorage.app",
  messagingSenderId: "40146464592",
  appId: "1:40146464592:web:e720bc1e592f8bbd3a4655",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, link } = payload.data || {};
  if (!title) return;
  self.registration.showNotification(title, {
    body: body || "",
    icon: "/app-icon.png",
    badge: "/app-icon.png",
    dir: "rtl",
    lang: "he",
    data: { link: link || "/" },
  });
});

// לחיצה על ההתראה מביאה את הלשונית הפתוחה לחזית במקום לפתוח עוד אחת
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
