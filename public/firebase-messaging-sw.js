// public/firebase-messaging-sw.js
// File này PHẢI đặt trong thư mục public/ — không được đổi tên

importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyDTLehqI6S_C32eWhta_oQSCq43o4arlTo',
  authDomain:        'appdodachadong.firebaseapp.com',
  projectId:         'appdodachadong',
  storageBucket:     'appdodachadong.firebasestorage.app',
  messagingSenderId: '288474070412',
  appId:             '1:288474070412:web:79cafeb6dc1dd0ee006aa9',
});

const messaging = firebase.messaging();

// Nhận push khi app đang ĐÓNG hoặc chạy nền
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'GeoTask Pro';
  const body  = payload.notification?.body  || '';
  const data  = payload.data || {};

  // Tạo tag duy nhất để tránh duplicate notification
  const tag = data.stageId
    ? `geotask-stage-${data.stageId}`
    : data.projectId
      ? `geotask-project-${data.projectId}`
      : `geotask-${Date.now()}`;

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag,
    renotify: true,
    data,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: 'open', title: '📂 Mở hồ sơ' },
      { action: 'dismiss', title: 'Bỏ qua' },
    ],
  });
});

// Khi người dùng nhấn vào notification → mở app đúng trang
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const data = event.notification.data || {};
  // Mở thẳng trang projects nếu có projectId
  const url = data.projectId ? `/?project=${data.projectId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu app đang mở, focus vào
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return client.focus();
        }
      }
      // Nếu app đóng, mở tab mới
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
