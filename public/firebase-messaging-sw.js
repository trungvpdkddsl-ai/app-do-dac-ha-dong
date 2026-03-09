// public/firebase-messaging-sw.js
// File này PHẢI đặt trong thư mục public/ — không được đổi tên

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ── THAY bằng config Firebase của bạn (giống file firebase.ts) ──
firebase.initializeApp({
  apiKey:            'AIzaSyDTLehqI6S_C32eWhta_oQSCq43o4arlTo',
  authDomain:        'appdodachadong.firebaseapp.com',
  projectId:         'appdodachadong',
  storageBucket:     'appdodachadong.firebasestorage.app',
  messagingSenderId: '288474070412',
  appId:             '1:288474070412:web:79cafeb6dc1dd0ee006aa9',
});
// ─────────────────────────────────────────────────────────────

const messaging = firebase.messaging();

// Nhận push notification khi app đang ĐÓNG hoặc chạy nền
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'GeoTask Pro';
  const body  = payload.notification?.body  || '';
  const icon  = '/icon-192.png'; // icon app của bạn

  self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    data: payload.data,
    vibrate: [200, 100, 200],
  });
});

// Khi người dùng nhấn vào notification → mở app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
