# Hướng dẫn cài đặt GeoTask Pro

## BƯỚC 1 — Lấy ID file "GeoTask Pro Database"

1. Mở file **GeoTask Pro Database** trên Google Drive
2. Nhìn URL trên trình duyệt, ví dụ:
   ```
   https://docs.google.com/spreadsheets/d/1kSMk8sVbw9w0tkqXCk_E87q2_tlOndwU8Nrdhm4ZxJg/edit
   ```
3. Phần ID là: `1kSMk8sVbw9w0tkqXCk_E87q2_tlOndwU8Nrdhm4ZxJg`

---

## BƯỚC 2 — Cập nhật Code.gs

Mở file `Code.gs`, thay dòng đầu:
```js
const SPREADSHEET_ID = 'THAY_ID_FILE_CUA_BAN_VÀO_ĐÂY';
```

---

## BƯỚC 3 — Deploy Google Apps Script

1. Vào **extensions.google.com/appscript** hoặc từ Google Sheets → **Tiện ích mở rộng → Apps Script**
2. Tạo script mới hoặc mở script cũ
3. Dán toàn bộ nội dung `Code.gs` vào
4. Nhấn **Deploy → New deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy **Deployment URL** (dạng `https://script.google.com/macros/s/.../exec`)

---

## BƯỚC 4 — Cập nhật URL trong source code

Thay URL GAS ở **3 chỗ** bằng URL vừa copy:

| File | Dòng | Biến |
|------|------|------|
| `src/context/AppContext.tsx` | dòng 6 | `const GAS_URL = '...'` |
| `src/components/Auth.tsx` | dòng ~53 | `const GAS_URL = '...'` |
| `src/components/ProjectDetail.tsx` | dòng ~107 | `const GAS_URL = '...'` |

---

## BƯỚC 5 — Chạy setupSheets (lần đầu)

Trong Apps Script Editor → **Run → setupSheets**  
→ Tự động tạo 3 sheet: Users, Projects, Notifications với header chuẩn.

---

## BƯỚC 6 — Deploy lên Vercel

```bash
npm install
npm run build
# Kéo thả thư mục dist/ lên Vercel hoặc dùng Vercel CLI
```

---

## Dọn dẹp user trùng (nếu cần)

Trong Apps Script Editor → **Run → deduplicateUsers**

---

## Tài khoản mặc định (dùng khi GAS chưa cấu hình)

| Username | Mật khẩu | Role |
|----------|-----------|------|
| trung91hn | 3041991 | Manager |
| manager | password | Manager |
| khaosat | password | Employee |
