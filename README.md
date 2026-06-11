# Mutafidz PRO — Deployment Guide

## Struktur File

```
mutafidz-pro/
├── index.html           ← Aplikasi utama (PWA)
├── manifest.json        ← Web App Manifest
├── service-worker.js    ← Service Worker (offline + caching)
├── icons/
│   ├── icon-192.png     ← Icon PWA 192x192
│   └── icon-512.png     ← Icon PWA 512x512
└── README.md
```

---

## Cara Deploy

### 1. Upload ke Hosting Statis (Vercel / Netlify / GitHub Pages)

Upload semua file di atas ke root hosting. Pastikan folder `icons/` ikut terupload.

**Vercel:**
1. Push ke GitHub repo
2. Connect di vercel.com → pilih repo → deploy
3. Tidak perlu konfigurasi tambahan (single-page app statis)

**GitHub Pages:**
1. Push ke branch `main` atau `gh-pages`
2. Settings → Pages → pilih branch
3. URL: `https://username.github.io/repo-name/`

---

### 2. Setup Google Apps Script sebagai Backend

Di file `code.gs` Google Apps Script kamu, pastikan ada fungsi `doGet` yang bertindak sebagai router:

```javascript
function doGet(e) {
  const action  = e.parameter.action;
  const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
  const sheetId = e.parameter.sheetId || '';

  // CORS headers
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    let result;
    if (action === 'ping')              result = { pong: true };
    else if (action === 'getStudents')  result = getStudents(sheetId);
    else if (action === 'addStudent')   result = addStudent(payload, sheetId);
    // ... dst
    else throw new Error(`Unknown action: ${action}`);

    output.setContent(JSON.stringify({ success: true, data: result }));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.message }));
  }

  return output;
}
```

**Deploy GAS sebagai Web App:**
1. Extensions → Apps Script
2. Deploy → New Deployment → Web App
3. Execute as: **Me**
4. Who has access: **Anyone** (agar bisa diakses dari luar)
5. Salin URL deployment → masukkan ke Pengaturan di app

---

### 3. Konfigurasi di Aplikasi

1. Buka Mutafidz PRO di browser
2. Buka menu **Pengaturan** (ikon ⚙️)
3. Isi **URL Web App GAS** — contoh: `https://script.google.com/macros/s/ABC.../exec`
4. Isi **ID Spreadsheet** — ada di URL spreadsheet: `docs.google.com/spreadsheets/d/**ID_INI**/edit`
5. Klik **Simpan Konfigurasi**
6. Klik ikon 🔌 untuk test koneksi

---

## Install sebagai PWA

### Android (Chrome)
1. Buka URL app di Chrome
2. Tap ikon menu (⋮) → "Add to Home Screen"
3. App muncul di layar utama seperti app native

### iOS (Safari)
1. Buka URL app di Safari
2. Tap ikon Share (□↑) → "Add to Home Screen"
3. Tap "Add"

### Desktop (Chrome/Edge)
1. Buka URL app
2. Klik ikon install di address bar (⊕)
3. Klik "Install"

---

## Service Worker & Offline

App menggunakan Strategy B (Decoupled):
- **Static assets** (HTML, CSS, JS, icons) → Cache First → bekerja offline
- **CDN** (Bootstrap, FontAwesome, dll) → Cache First setelah pertama kali dimuat
- **GAS API calls** → Network First, fallback ke cache terakhir
- **Al-Quran API** → Network First, fallback ke cache

Untuk hapus cache: Pengaturan → Hapus Cache API.
