// firebase-messaging-sw.js
// Service Worker Firebase requis pour les notifications en arrière-plan (background).
// Ce fichier DOIT s'appeler exactement "firebase-messaging-sw.js" et être
// à la racine du domaine (/public/) — convention imposée par Firebase SDK.
//
// Note : les variables d'environnement Next.js ne sont PAS accessibles ici
// (le SW n'est pas traité par le bundler). La config est donc inline.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyCKfgwUADNEcgGuAyGIDfR3pxTIjUNPyKI",
  authDomain:        "taskmanage-9c08f.firebaseapp.com",
  projectId:         "taskmanage-9c08f",
  storageBucket:     "taskmanage-9c08f.firebasestorage.app",
  messagingSenderId: "496218127133",
  appId:             "1:496218127133:web:ece293d33f297b370ffff4",
});

const messaging = firebase.messaging();

// Gestion des notifications reçues quand l'app est en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log("[Firebase SW] Notification reçue en arrière-plan :", payload);

  const { title, body, icon } = payload.notification ?? {};

  self.registration.showNotification(title ?? "Task Manage", {
    body:  body  ?? "Nouvelle alerte SGR",
    icon:  icon  ?? "/android/launchericon-192x192.png",
    badge: "/android/launchericon-96x96.png",
    data:  { url: payload.data?.url ?? "/" },
  });
});

// Ouvre l'application quand l'utilisateur clique sur la notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
