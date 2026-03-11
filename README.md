# GeoTask Pro 🗺️

Ứng dụng quản lý dự án đo đạc địa chính, xây dựng bằng **React + TypeScript + Vite**, backend là **Google Apps Script**, database là **Google Sheets**.

---

## ✨ Tính năng

- **Quản lý dự án** — Tạo, theo dõi, phân công hồ sơ đất đai theo từng giai đoạn
- **9 loại thủ tục** — Tự động sinh giai đoạn & SLA: Cấp lần đầu, Cấp đổi, Tách thửa, Thừa kế, Tặng cho, Chuyển nhượng, Chỉ đo đạc, Đính chính, Chuyển mục đích SDĐ
- **Thông tin pháp lý** — Lưu CCCD, ngày sinh, địa chỉ chủ sử dụng đất
- **Multi-file upload** — Tải nhiều file cùng lúc (tuần tự, tránh GAS timeout), hiển thị tiến độ từng file
- **Báo cáo SLA** — Đánh giá đúng hạn/quá hạn, xuất CSV
- **Phân quyền** — Manager / Nhân viên, bảo mật thông tin nhạy cảm
- **Push Notification** — Firebase FCM khi được giao việc hoặc sắp hết hạn
- **Offline-first** — localStorage cache, tự sync khi có mạng
- **Cài đặt kết nối** — Hỗ trợ `VITE_GAS_URL` env (Vercel), fallback localStorage

---

## 🚀 Cài đặt

```bash
git clone https://github.com/your-username/geotask-pro.git
cd geotask-pro
npm install
cp .env.example .env.local   # điền VITE_GAS_URL
npm run dev
```

### Build production
```bash
npm run build
```

---

## ⚙️ Cấu hình Vercel (một lần, không bao giờ mất kết nối)

```
Vercel Dashboard → Project → Settings → Environment Variables
→ VITE_GAS_URL = https://script.google.com/macros/s/.../exec
→ Redeploy
```

---

## 🗄️ Backend — Google Apps Script

1. Tạo **Google Spreadsheet** mới (3 sheets: `Users`, `Projects`, `Notifications`)
2. **Extensions → Apps Script** → dán nội dung `Code.gs`
3. Cập nhật 2 hằng số đầu file:
   ```js
   const SPREADSHEET_ID = 'YOUR_SHEET_ID';
   const ROOT_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID';
   ```
4. **Deploy → New deployment** → Web App (Execute as: Me, Access: Anyone)
5. Copy URL → dán vào `VITE_GAS_URL`

---

## 📋 Loại thủ tục & SLA

| Thủ tục | Mã | Deadline | Giai đoạn |
|---|---|---|---|
| Cấp lần đầu | CLD | 20 ngày | 5 |
| Cấp đổi | CD | 20 ngày | 5 |
| Tách thửa | TT | 20 ngày | 5 |
| Thừa kế | TK | 10 ngày | 3 |
| Tặng cho | TC | 10 ngày | 3 |
| Chuyển nhượng | CN | 10 ngày | 3 |
| Chỉ đo đạc | CDD | 2 ngày | 3 |
| Đính chính | DC | 7 ngày | 3 |
| Chuyển mục đích SDĐ | CMD | 15 ngày | 3 |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4
- **Icons**: Lucide React
- **Charts**: Recharts
- **Backend**: Google Apps Script (serverless)
- **Database**: Google Sheets
- **Storage**: Google Drive
- **Push**: Firebase Cloud Messaging (FCM)

---

## 📄 Licence

MIT
