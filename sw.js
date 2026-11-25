// Service worker: بيحفظ شكل البرنامج عشان يفتح بسرعة، وبيستقبل إشعارات السيرفر (Push) حتى والتطبيق مقفول.
// البيانات نفسها دايمًا من Firebase مباشرة.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
try { importScripts('./config.js'); } catch (e) {}   // إعدادات العيادة (لو موجودة) — بتخلّي نفس الملفات تشتغل لأي عيادة
firebase.initializeApp((self.CLINIC_CONFIG && self.CLINIC_CONFIG.firebase) || {
  apiKey: "AIzaSyAXoB_WHtLStu0mr4dnZKG8YeXOn_R1dg4",
  authDomain: "abanoub-clinic.firebaseapp.com",
  projectId: "abanoub-clinic",
  storageBucket: "abanoub-clinic.firebasestorage.app",
  messagingSenderId: "904420382642",
  appId: "1:904420382642:web:2c048976c4d04e2d8436ab"
});
try { firebase.messaging(); } catch (e) {}

// ===== أوفلاين =====
// 1) شكل البرنامج (admin.html) + مكتبات Firebase + الخطوط بتتحفظ، فالسيستم يفتح من غير نت.
// 2) البيانات نفسها بتتحفظ جوه Firestore (كاش محلي) وأي تعديل بيتزامن لما النت يرجع.
const CACHE = 'clinic-shell-v9';
const SDK = ['app', 'firestore', 'auth', 'messaging', 'storage'].map(n => 'https://www.gstatic.com/firebasejs/10.12.2/firebase-' + n + '-compat.js');
const SHELL = ['./admin.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));                                  // ملف ناقص ما يوقّفش التثبيت
    await Promise.all(SDK.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

const isStatic = u => u.hostname === 'www.gstatic.com' && u.pathname.indexOf('/firebasejs/') === 0 || u.hostname === 'cdn.sheetjs.com' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // مكتبات Firebase والخطوط: من الكاش فورًا، وبتتحدّث في الخلفية
  if (isStatic(u)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    }));
    return;
  }
  if (u.origin !== location.origin) return;                                                          // Firestore/Auth/Storage: مباشرة (الكاش بتاعها جوه المكتبة)
  // ملفات البرنامج: النت الأول (عشان التحديثات توصل)، ولو بطيء/مقطوع نفتح من الكاش
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await Promise.race([fetch(r), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
      if (res && res.ok) c.put(r, res.clone());
      return res;
    } catch (err) {
      return (await c.match(r, { ignoreSearch: true })) || (await c.match('./admin.html')) || Response.error();
    }
  })());
});
// الضغط على الإشعار بيفتح السيستم (أو يرجّعه لو مفتوح)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL('./admin.html', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if (w.url.indexOf('admin.html') !== -1 && 'focus' in w) return w.focus(); }
    return clients.openWindow(url);
  }));
});
