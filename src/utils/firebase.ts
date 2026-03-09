// ══════════════════════════════════════════════════════════════
//  Firebase Cloud Messaging — Push Notifications
//  Hướng dẫn cài đặt ở cuối file
// ══════════════════════════════════════════════════════════════
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// ── THAY bằng config Firebase của bạn (xem hướng dẫn bên dưới) ──
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
// ─────────────────────────────────────────────────────────────

let messaging: Messaging | null = null;

function getFirebaseMessaging(): Messaging | null {
  if (messaging) return messaging;
  try {
    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.warn('Firebase init failed:', err);
    return null;
  }
}

// Xin quyền và lấy FCM token của thiết bị này
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }
    const msg = getFirebaseMessaging();
    if (!msg) return null;

    const token = await getToken(msg, { vapidKey: VAPID_KEY });
    console.log('FCM Token:', token);
    return token;
  } catch (err) {
    console.warn('FCM token error:', err);
    return null;
  }
}

// Lắng nghe thông báo khi app đang mở (foreground)
export function onForegroundMessage(callback: (payload: { title: string; body: string }) => void) {
  const msg = getFirebaseMessaging();
  if (!msg) return () => {};

  return onMessage(msg, (payload) => {
    const title = payload.notification?.title || 'GeoTask Pro';
    const body  = payload.notification?.body  || '';
    callback({ title, body });
  });
}

// ══════════════════════════════════════════════════════════════
//  HƯỚNG DẪN CÀI ĐẶT FIREBASE
// ══════════════════════════════════════════════════════════════
//
//  BƯỚC 1: Tạo project Firebase
//  - Vào https://console.firebase.google.com
//  - Nhấn "Add project" → đặt tên "GeoTask Pro" → tạo
//
//  BƯỚC 2: Thêm Web App
//  - Trong project → nhấn icon </> (Web)
//  - Đặt tên app → copy firebaseConfig → thay vào object trên
//
//  BƯỚC 3: Lấy VAPID Key
//  - Project Settings → Cloud Messaging → Web Push certificates
//  - Nhấn "Generate key pair" → copy → thay vào VAPID_KEY trên
//
//  BƯỚC 4: Tạo file public/firebase-messaging-sw.js
//  (File này đã có sẵn trong project, chỉ cần thay config)
//
//  BƯỚC 5: Cài firebase SDK
//  npm install firebase
//
// ══════════════════════════════════════════════════════════════
