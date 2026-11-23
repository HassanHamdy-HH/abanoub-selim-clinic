// Service worker بسيط: بيحفظ شكل البرنامج عشان يفتح بسرعة. البيانات دايمًا من Firebase مباشرة.
const CACHE='clinic-shell-v1';
const SHELL=['./admin.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; const u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin) return; // Firebase/Google Fonts بره الكاش
  e.respondWith(fetch(r).then(res=>{const cp=res.clone(); caches.open(CACHE).then(c=>c.put(r,cp)); return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('./admin.html'))));
});
