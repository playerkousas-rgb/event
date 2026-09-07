/* sw.js — 童軍活動管理系統 Service Worker（v15.2 離線可用）
   戶外活動場地冇電腦、訊號亦可能好弱：開過一次之後，成個 APP 外殼＋內置資料
   會暫存喺電話，離線都可以開到 APP、查名單、TICK 點名／派紀念章
   （所有 TICK 本來就係 localStorage 先行，有網時先同步後端，斷網照樣可用）。

   更新策略（配合 vercel.json 嘅 no-cache）：
   - 同域靜態檔（／、index.html、js/、assets/、data/）＝ Network-first：
     有網永遠拎最新版入快取；冇網先攞快取頂住，唔會因為舊快取睇唔到新功能
   - cdnjs（xlsx／mammoth／font-awesome，版本鎖死 URL）＝ Cache-first
   - 後端 API（/api/config、script.google.com）及非 GET：完全唔攔截，直接上網
   升級版本時改下面 CACHE 版本號，舊快取會喺 activate 自動清走。 */
const CACHE = 'scout-ops-v15-2';

/* 安裝時預快取嘅 App 外殼（一次開過之後離線可用） */
const PRECACHE = [
  './index.html',
  './manifest.json',
  './assets/tailwind.css',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/00-config.js', './js/10-app-core.js', './js/11-news.js',
  './js/20-accounts.js', './js/21-activities.js', './js/22-meals.js',
  './js/23-sync.js', './js/24-supplies.js', './js/25-vehicle.js',
  './js/26-monitor-apply.js', './js/27-parking.js', './js/28-oral-quotes.js',
  './js/30-finance.js', './js/31-staff.js', './js/32-meetings.js',
  './js/33-users.js', './js/34-announcements.js', './js/35-ceremony.js',
  './js/36-crisis.js', './js/37-coordinator.js', './js/38-donations.js',
  './js/39-lost-found.js', './js/40-souvenir-stamps.js', './js/41-roster-lists.js',
  './js/90-bootstrap.js',
  './data/events.json', './data/isd_2026.json', './data/meeting_records.json', './data/mock_demo.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))  // 個別失敗唔會拖垮安裝
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k.startsWith('scout-ops-')).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                                   // POST saveRecord 等直接上網
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;                       // /api/config 永遠即時讀
  if (url.origin.includes('script.google') || url.origin.includes('googleusercontent')) return; // 後端 GAS：不攔截

  // cdnjs（URL 已鎖版本）＝ Cache-first，慳流量亦慳電
  if (url.origin === 'https://cdnjs.cloudflare.com') {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // 同域其餘 GET（頁面／js／css／圖／data）＝ Network-first：有網拎最新 → 順手更新快取；冇網用快取
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: url.pathname === '/' || url.pathname.endsWith('/index.html') });
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');  // 離線開頁面 → 用快取外殼
        throw new Error('offline');
      })
    );
  }
});
