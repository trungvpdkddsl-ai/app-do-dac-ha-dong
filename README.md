# GeoTask Pro 🗺️

Ứng dụng quản lý dự án đo đạc địa chính, được xây dựng bằng **React + TypeScript + Vite**, sử dụng **Google Apps Script** làm backend và **Google Sheets** làm cơ sở dữ liệu.

---

## ✨ Tính năng chính

- **Quản lý Dự án** — Tạo, theo dõi, phân công các hồ sơ đất đai theo từng giai đoạn
- **Quy trình tự động** — Tự động sinh giai đoạn theo loại thủ tục (Cấp lần đầu, Tặng cho, Chuyển mục đích SDĐ…)
- **Thông tin chủ sử dụng đất** — Lưu đầy đủ CCCD, ngày sinh, địa chỉ để xuất hồ sơ pháp lý
- **Báo cáo SLA** — Đánh giá đúng hạn / quá hạn từng giai đoạn, xuất Excel (CSV)
- **Phân quyền** — Manager / Nhân viên, bảo mật thông tin nhạy cảm
- **Push Notification** — Thông báo qua Firebase khi được giao việc hoặc sắp hết hạn
- **Upload file** — Đính kèm ảnh/tài liệu lên Google Drive theo từng giai đoạn
- **Tính phí** — Công cụ tính phí đo đạc tích hợp
- **Offline-first** — Cache localStorage, tự đồng bộ khi có mạng

---

## 🗂️ Cấu trúc thư mục

```
src/
├── components/
│   ├── Auth.tsx              # Màn hình đăng nhập
│   ├── Dashboard.tsx         # Trang tổng quan
│   ├── ProjectList.tsx       # Danh sách & tạo dự án
│   ├── ProjectDetail.tsx     # Chi tiết dự án & quản lý giai đoạn
│   ├── TaskBoard.tsx         # Bảng công việc cá nhân
│   ├── Reports.tsx           # Báo cáo & thống kê SLA
│   ├── UserManagement.tsx    # Quản lý nhân sự
│   ├── FeeCalculator.tsx     # Tính phí đo đạc
│   ├── GasSettings.tsx       # Cài đặt Google Apps Script URL
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── NotificationDropdown.tsx
├── context/
│   └── AppContext.tsx         # Global state & GAS API calls
├── data/
│   └── mock.ts               # Dữ liệu mẫu / fallback khi offline
├── utils/
│   ├── helpers.ts            # formatDate, getStatusColor…
│   └── firebase.ts           # Push notification (FCM)
├── config.ts                 # GAS URL configuration
├── types.ts                  # TypeScript types
├── App.tsx
├── main.tsx
└── index.css
Code.gs                       # Google Apps Script backend
```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu
- Node.js >= 18
- npm >= 9

### Cài đặt

```bash
git clone https://github.com/your-username/geotask-pro.git
cd geotask-pro
npm install
npm run dev
```

### Build production

```bash
npm run build
```

---

## ⚙️ Cấu hình Backend (Google Apps Script)

1. Tạo một **Google Spreadsheet** mới — đây sẽ là database
2. Vào **Extensions → Apps Script**, dán toàn bộ nội dung `Code.gs` vào
3. Cập nhật 2 hằng số ở đầu file:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
   const ROOT_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID';
   ```
4. **Deploy → New deployment** → Web App
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy URL deployment, dán vào **Cài đặt GAS URL** trong app

---

## 🔔 Cấu hình Push Notification (tuỳ chọn)

1. Tạo project trên [Firebase Console](https://console.firebase.google.com)
2. Lấy **Firebase config** → điền vào `src/utils/firebase.ts`
3. Tạo Service Account JSON → dán vào `SERVICE_ACCOUNT_JSON` trong `Code.gs`

---

## 📋 Các loại thủ tục hỗ trợ

| Thủ tục | Mã viết tắt | Deadline tự động | Số giai đoạn |
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

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Icons**: Lucide React
- **Charts**: Recharts
- **Backend**: Google Apps Script (serverless)
- **Database**: Google Sheets (JSON per row)
- **Storage**: Google Drive
- **Push**: Firebase Cloud Messaging (FCM v1)

---

## 📄 Licence

MIT
