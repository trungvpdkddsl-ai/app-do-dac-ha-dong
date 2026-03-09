// ══════════════════════════════════════════════════════════════
//  Firebase Cloud Messaging — Push Notifications
//  Lazy-loaded để tránh lỗi build trên Vercel / môi trường SSR
// ══════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            'AIzaSyDTLehqI6S_C32eWhta_oQSCq43o4arlTo',
  authDomain:        'appdodachadong.firebaseapp.com',
  projectId:         'appdodachadong',
  storageBucket:     'appdodachadong.firebasestorage.app',
  messagingSenderId: '288474070412',
  appId:             '1:288474070412:web:79cafeb6dc1dd0ee006aa9',
  measurementId:     'G-LR9ZG9QESL',
};

const VAPID_KEY = 'BHRQRClQQqfimeBTk56pVYMBd2hlH1qCveIj9lWHqZHa7A9ZT0mVPSL9Ubd_547glvuT1EwPbG-9LurYxx4-BtA';

function isBrowser() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

function isNotificationSupported() {
  return isBrowser() && 'Notification' in window && 'serviceWorker' in navigator;
}

let _messagingPromise: Promise<unknown> | null = null;

async function getMessagingInstance(): Promise<unknown> {
  if (!isBrowser()) return null;
  if (_messagingPromise) return _messagingPromise;

  _messagingPromise = (async () => {
    try {
      const firebaseApp = await import('firebase/app');
      const firebaseMsg = await import('firebase/messaging');

      const supported = await firebaseMsg.isSupported();
      if (!supported) {
        console.warn('FCM not supported in this browser');
        return null;
      }

      const app = firebaseApp.getApps().length === 0
        ? firebaseApp.initializeApp(firebaseConfig)
        : firebaseApp.getApp();
      return firebaseMsg.getMessaging(app);
    } catch (err) {
      console.warn('Firebase init failed:', err);
      return null;
    }
  })();

  return _messagingPromise;
}

// Xin quyền + lấy FCM token
export async function requestNotificationPermission(): Promise<string | null> {
  if (!isNotificationSupported()) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const firebaseMsg = await import('firebase/messaging');
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const token = await firebaseMsg.getToken(messaging as Parameters<typeof firebaseMsg.getToken>[0], { vapidKey: VAPID_KEY });
    return token || null;
  } catch (err) {
    console.warn('FCM token error:', err);
    return null;
  }
}

// Lắng nghe thông báo khi app đang mở
export function onForegroundMessage(
  callback: (payload: { title: string; body: string; data?: Record<string, string> }) => void
): () => void {
  if (!isBrowser()) return () => {};

  let unsubscribe: (() => void) | null = null;

  getMessagingInstance().then(async (messaging) => {
    if (!messaging) return;
    const firebaseMsg = await import('firebase/messaging');
    unsubscribe = firebaseMsg.onMessage(
      messaging as Parameters<typeof firebaseMsg.onMessage>[0],
      (payload) => {
        const title = payload.notification?.title || 'GeoTask Pro';
        const body  = payload.notification?.body  || '';
        const data  = payload.data as Record<string, string> | undefined;
        callback({ title, body, data });
      }
    );
  });

  return () => { unsubscribe?.(); };
}

// Hiển thị notification native khi app đang foreground
export function showLocalNotification(title: string, body: string, tag?: string) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;
  try {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: tag || `geotask-${Date.now()}`,
          vibrate: [200, 100, 200],
        });
      } else {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
    });
  } catch {
    try { new Notification(title, { body }); } catch { /* ignore */ }
  }
}
