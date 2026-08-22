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

/*
 * השתלטות מיידית על חלונות פתוחים — בלעדיה חלון ה-PWA שנפתח לפני
 * שה-SW הופעל נשאר "לא נשלט", ו-client.navigate() עליו זורק שגיאה.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/*
 * לחיצה על ההתראה פותחת את המסך הנכון (21/8/2026).
 *
 * הגרסה הקודמת קראה client.navigate(link) ואז focus — אבל navigate
 * על חלון לא נשלט זורק, ההבטחה נפלה, ו-openWindow לא הגיע לעולם:
 * באייפון ההתראה פשוט נסגרה. עכשיו: ניסיון navigate בתוך try, הודעה
 * לחלון שינווט בעצמו (בתוך האפליקציה), focus — ורק אם אין שום חלון,
 * openWindow. כל שלב עצמאי וכשל באחד לא מבטל את הבאים.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of list) {
        try {
          client.postMessage({ type: "justask:open", link });
        } catch (_) {
          /* ignore */
        }
        try {
          if ("navigate" in client) await client.navigate(link);
        } catch (_) {
          /* חלון לא נשלט — ההודעה למעלה תנווט אותו */
        }
        try {
          if ("focus" in client) return await client.focus();
        } catch (_) {
          /* ignore */
        }
      }
      return self.clients.openWindow(link);
    })(),
  );
});
