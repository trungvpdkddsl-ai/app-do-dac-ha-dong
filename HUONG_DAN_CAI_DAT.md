# 📋 Hướng dẫn kết nối GeoTask Pro với Google Sheets & Drive

---

## Tổng quan kiến trúc

```
Trình duyệt (React App)
      │  fetch / POST
      ▼
Google Apps Script (Web App)   ←── xác thực, logic
      │
      ├── Google Sheets         ←── lưu Users, Projects, Notifications
      └── Google Drive          ←── lưu file đính kèm (ảnh, PDF)
```

Dữ liệu luôn được lưu trên Google Drive của bạn — không dùng server bên ngoài.

---

## BƯỚC 1: Tạo Google Spreadsheet

1. Vào [sheets.google.com](https://sheets.google.com) → Tạo bảng tính mới
2. Đặt tên: **GeoTask Pro Database**
3. Lưu lại **ID** của spreadsheet (chuỗi dài trong URL):  
   `https://docs.google.com/spreadsheets/d/`**`<SPREADSHEET_ID>`**`/edit`

---

## BƯỚC 2: Tạo Google Apps Script

1. Trong Spreadsheet → menu **Extensions → Apps Script**
2. Xóa toàn bộ nội dung file `Code.gs` hiện có
3. **Copy toàn bộ nội dung file `Code.gs`** (kèm theo trong zip này) và dán vào
4. Ở đầu file, tìm dòng:
   ```javascript
   const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID';
   ```
   Thay bằng ID folder Drive nơi bạn muốn lưu file đính kèm (xem Bước 3)

---

## BƯỚC 3: Lấy Google Drive Folder ID

1. Vào [drive.google.com](https://drive.google.com)
2. Tạo thư mục mới tên **GeoTask Attachments**
3. Mở thư mục → copy ID từ URL:  
   `https://drive.google.com/drive/folders/`**`<FOLDER_ID>`**

---

## BƯỚC 4: Khởi tạo Sheets tự động

1. Trong Apps Script → chọn function **`setupSheets`** từ dropdown
2. Nhấn **▶ Run**
3. Cấp quyền khi được hỏi (chọn tài khoản Google → Allow)
4. Kết quả: 3 sheets được tạo tự động: **Users**, **Projects**, **Notifications**

---

## BƯỚC 5: Deploy làm Web App

1. Trong Apps Script → nhấn **Deploy → New deployment**
2. Cấu hình:
   - **Type**: Web app
   - **Execute as**: **Me** (tài khoản của bạn)
   - **Who has access**: **Anyone** *(bắt buộc để app React gọi được)*
3. Nhấn **Deploy** → Copy **Web App URL**

URL có dạng:  
`https://script.google.com/macros/s/AKfycb.../exec`

---

## BƯỚC 6: Cập nhật URL vào App React

Mở file `src/context/AppContext.tsx`, tìm dòng:

```typescript
const GAS_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Thay bằng **Web App URL** bạn vừa copy ở Bước 5.

---

## BƯỚC 7: Thêm tài khoản người dùng vào Sheets

Mở sheet **Users** trong Spreadsheet, thêm hàng theo cấu trúc:

| id | username | password | name | role | department | avatar |
|----|----------|----------|------|------|------------|--------|
| admin | trung91hn | 3041991 | Nguyễn Văn A | manager | Ban Giám Đốc | |
| u1 | nhanvien1 | pass123 | Trần Văn B | employee | Đội Đo Đạc 1 | |

- **role**: chỉ nhận `manager` hoặc `employee`
- **avatar**: để trống hoặc dán URL ảnh
- Password hiện tại lưu plaintext — bảo mật đủ dùng cho nhóm nội bộ

---

## BƯỚC 8: Chạy app

```bash
npm install
npm run dev
```

---

## Cách hoạt động sau khi cài xong

| Hành động | Xảy ra gì |
|-----------|-----------|
| Đăng nhập | App gọi GAS → so sánh username/password **phía server** → trả về user (không có password) |
| Tạo dự án | Lưu vào React state ngay (optimistic) → đồng bộ lên Sheets trong nền |
| Cập nhật giai đoạn | Tương tự — UI nhanh, sync sau |
| Upload file | File gửi lên Google Drive → trả về link xem |
| Refresh trang | Load lại data từ Sheets → không mất dữ liệu |
| Mất mạng | Dùng cache localStorage, sync lại khi có mạng |

---

## Lưu ý khi deploy lại

Mỗi lần sửa code `Code.gs`, bạn phải **tạo deployment mới**:
- Deploy → **Manage deployments** → chọn deployment cũ → **Edit** → chọn **New version** → Deploy

Nếu chỉ chọn lại version cũ, code mới sẽ **không được áp dụng**.

---

## Giới hạn của Google Apps Script

| Giới hạn | Giá trị miễn phí |
|----------|-----------------|
| Requests/ngày | 20,000 |
| Thời gian chạy/lần | 6 giây |
| Dung lượng Drive | 15 GB |
| Rows trong Sheets | ~10 triệu |

Đủ dùng cho văn phòng 5–50 người với hàng trăm dự án.
