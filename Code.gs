// ============================================================
//  GeoTask Pro — Google Apps Script Backend
//  Dán toàn bộ file này vào Apps Script, deploy làm Web App
//  Cấu hình: Execute as = Me, Who has access = Anyone
// ============================================================

// ── CẤU HÌNH: thay bằng ID Google Drive folder của bạn ──────
const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID'; // <-- đổi thành ID folder thật
// ────────────────────────────────────────────────────────────

const SS      = SpreadsheetApp.getActiveSpreadsheet();
const CORS    = { 'Access-Control-Allow-Origin': '*' };

// ── Helper: tạo JSON response ─────────────────────────────────
function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Helper: lấy / tạo sheet ──────────────────────────────────
function getSheet(name) {
  return SS.getSheetByName(name) || SS.insertSheet(name);
}

// ============================================================
//  ROUTING
// ============================================================
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getUsers')         return jsonOut(getUsers());
    if (action === 'getProjects')      return jsonOut(getProjects());
    if (action === 'getNotifications') return jsonOut(getNotifications(e.parameter.userId));
    return jsonOut({ error: 'Unknown GET action' });
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

function doPost(e) {
  let params;
  try { params = JSON.parse(e.postData.contents); }
  catch { return jsonOut({ error: 'Invalid JSON body' }); }

  try {
    switch (params.action) {
      case 'login':              return jsonOut(login(params));
      case 'register':           return jsonOut(registerUser(params));
      case 'deleteUser':         return jsonOut(deleteUser(params));

      case 'saveProject':        return jsonOut(saveProject(params));
      case 'updateProjectStage': return jsonOut(updateProjectStage(params));
      case 'deleteProject':      return jsonOut(deleteProject(params));

      case 'saveNotification':   return jsonOut(saveNotification(params));
      case 'markNotifRead':      return jsonOut(markNotifRead(params));
      case 'markAllNotifsRead':  return jsonOut(markAllNotifsRead(params));

      case 'uploadFile':         return jsonOut(uploadFile(params));
      case 'saveFcmToken':       return jsonOut(saveFcmToken(params));
      case 'sendPush':           return jsonOut(sendPushToUser(params));
      case 'broadcastToManagers': return jsonOut(broadcastToManagers(params));

      default: return jsonOut({ error: 'Unknown action: ' + params.action });
    }
  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}

// ============================================================
//  SHEET: Users
//  Cột: id | username | passwordHash | name | role | department | avatar
// ============================================================
function initUsersSheet() {
  const sh = getSheet('Users');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['id','username','password','name','role','department','avatar']);
    sh.getRange(1,1,1,7).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
  }
  return sh;
}

function getUsers() {
  const sh = initUsersSheet();
  const rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1).map(r => ({
    id: r[0], username: r[1],
    // KHÔNG trả password về client
    name: r[3], role: r[4], department: r[5], avatar: r[6]
  }));
}

function login({ username, password }) {
  const sh = initUsersSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const [id, uname, pwd, name, role, department, avatar] = rows[i];
    if (uname?.toString().trim().toLowerCase() === username?.trim().toLowerCase()) {
      // So sánh mật khẩu (plaintext — nâng cấp lên hash nếu cần)
      if (pwd?.toString().trim() === password?.trim()) {
        return { success: true, user: { id, username: uname, name, role, department, avatar } };
      }
      return { success: false, message: 'Sai mật khẩu.' };
    }
  }
  return { success: false, message: 'Không tìm thấy tên đăng nhập.' };
}

function registerUser({ id, username, password, name, role, department, avatar }) {
  const sh = initUsersSheet();
  sh.appendRow([id, username, password, name, role, department, avatar || '']);
  return { success: true };
}

function deleteUser({ id }) {
  const sh = initUsersSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toString() === id?.toString()) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'User không tồn tại' };
}

// ============================================================
//  SHEET: Projects
//  Lưu mỗi project thành 1 hàng dưới dạng JSON (đơn giản, linh hoạt)
//  Cột: id | json
// ============================================================
function initProjectsSheet() {
  const sh = getSheet('Projects');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['id', 'json']);
    sh.getRange(1,1,1,2).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
    sh.setColumnWidth(2, 800);
  }
  return sh;
}

function getProjects() {
  const sh = initProjectsSheet();
  const rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1).map(r => {
    try { return JSON.parse(r[1]); } catch { return null; }
  }).filter(Boolean);
}

function saveProject({ project }) {
  const sh = initProjectsSheet();
  const rows = sh.getDataRange().getValues();
  // Tìm row hiện có để update
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toString() === project.id?.toString()) {
      sh.getRange(i + 1, 1, 1, 2).setValues([[project.id, JSON.stringify(project)]]);
      return { success: true, action: 'updated' };
    }
  }
  // Không có → thêm mới
  sh.appendRow([project.id, JSON.stringify(project)]);
  return { success: true, action: 'created' };
}

function updateProjectStage({ projectId, stageId, status, completedAt, assigneeId, deadline }) {
  const sh = initProjectsSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toString() === projectId?.toString()) {
      const project = JSON.parse(rows[i][1]);
      project.stages = project.stages.map(s => {
        if (s.id !== stageId) return s;
        const updated = { ...s, status };
        if (completedAt) updated.completedAt = completedAt;
        if (assigneeId)  updated.assigneeId  = assigneeId;
        if (deadline)    updated.deadline     = deadline;
        return updated;
      });
      // Kiểm tra nếu tất cả stages hoàn thành
      if (project.stages.every(s => s.status === 'completed')) {
        project.status = 'completed';
      }
      sh.getRange(i + 1, 2).setValue(JSON.stringify(project));
      return { success: true, project };
    }
  }
  return { success: false, message: 'Project không tồn tại' };
}

function deleteProject({ projectId }) {
  const sh = initProjectsSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toString() === projectId?.toString()) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Project không tồn tại' };
}

// ============================================================
//  SHEET: Notifications
//  Cột: id | userId | json
// ============================================================
function initNotifsSheet() {
  const sh = getSheet('Notifications');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['id', 'userId', 'json']);
    sh.getRange(1,1,1,3).setFontWeight('bold').setBackground('#4f46e5').setFontColor('#ffffff');
    sh.setColumnWidth(3, 600);
  }
  return sh;
}

function getNotifications(userId) {
  const sh = initNotifsSheet();
  const rows = sh.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1)
    .filter(r => !userId || r[1]?.toString() === userId?.toString())
    .map(r => { try { return JSON.parse(r[2]); } catch { return null; } })
    .filter(Boolean);
}

function saveNotification({ notification }) {
  const sh = initNotifsSheet();
  const rows = sh.getDataRange().getValues();
  // Kiểm tra trùng id
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toString() === notification.id?.toString()) {
      sh.getRange(i + 1, 3).setValue(JSON.stringify(notification));
      return { success: true };
    }
  }
  sh.appendRow([notification.id, notification.userId, JSON.stringify(notification)]);

  // Gửi push notification đến thiết bị của user
  // Các loại: assignment (chuyển tiếp), progress (hoàn thành), return (trả lại), deadline (sắp hết hạn)
  const PUSH_TYPES = ['assignment', 'progress', 'return', 'deadline'];
  if (PUSH_TYPES.includes(notification.type)) {
    sendPushNotification(
      notification.userId,
      notification.title,
      notification.message,
      { projectId: notification.linkTo?.projectId || '', stageId: notification.linkTo?.stageId || '' }
    );
  }

  return { success: true };
}

function markNotifRead({ id }) {
  const sh = initNotifsSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toString() === id?.toString()) {
      const notif = JSON.parse(rows[i][2]);
      notif.isRead = true;
      sh.getRange(i + 1, 3).setValue(JSON.stringify(notif));
      return { success: true };
    }
  }
  return { success: false };
}

function markAllNotifsRead({ userId }) {
  const sh = initNotifsSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1]?.toString() === userId?.toString()) {
      const notif = JSON.parse(rows[i][2]);
      notif.isRead = true;
      sh.getRange(i + 1, 3).setValue(JSON.stringify(notif));
    }
  }
  return { success: true };
}

// ============================================================
//  Google Drive: Upload file
// ============================================================
function uploadFile({ fileName, mimeType, data }) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const blob   = Utilities.newBlob(Utilities.base64Decode(data), mimeType, fileName);
  const file   = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId  = file.getId();
  const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
  // Nếu là ảnh, trả về link xem trực tiếp
  const previewUrl = mimeType.startsWith('image/')
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`
    : viewUrl;
  return { success: true, url: previewUrl, viewUrl, fileId };
}

// ============================================================
//  SETUP: Tự động tạo tất cả sheets khi chạy lần đầu
// ============================================================
function setupSheets() {
  initUsersSheet();
  initProjectsSheet();
  initNotifsSheet();
  SpreadsheetApp.getUi().alert('✅ Đã tạo xong 3 sheets: Users, Projects, Notifications');
}

// ============================================================
//  FCM Token — lưu token thiết bị của từng user
// ============================================================
function saveFcmToken({ userId, fcmToken }) {
  const sh = initUsersSheet();
  const rows = sh.getDataRange().getValues();
  if (rows[0].length < 8 || rows[0][7] !== 'fcmToken') {
    sh.getRange(1, 8).setValue('fcmToken');
  }
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toString() === userId?.toString()) {
      sh.getRange(i + 1, 8).setValue(fcmToken);
      return { success: true };
    }
  }
  return { success: false, message: 'User not found' };
}

function getFcmToken(userId) {
  const sh = initUsersSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]?.toString() === userId?.toString()) {
      return rows[i][7] || null;
    }
  }
  return null;
}

// ============================================================
//  Gửi Push Notification qua FCM V1 API
//  Dùng Service Account (không cần Legacy Server Key)
//
//  CÁCH LẤY SERVICE ACCOUNT JSON:
//  Firebase Console → Project Settings → Service accounts
//  → Generate new private key → tải file JSON về
//  → Copy nội dung vào SERVICE_ACCOUNT_JSON bên dưới
// ============================================================
const SERVICE_ACCOUNT_JSON = ''; // <-- dán nội dung file JSON service account vào đây (dạng string)

function getAccessToken_() {
  if (!SERVICE_ACCOUNT_JSON) return null;
  try {
    const sa = JSON.parse(SERVICE_ACCOUNT_JSON);
    const now = Math.floor(Date.now() / 1000);
    const header  = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = Utilities.base64EncodeWebSafe(JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    }));
    const toSign    = header + '.' + payload;
    const signature = Utilities.base64EncodeWebSafe(
      Utilities.computeRsaSha256Signature(toSign, sa.private_key)
    );
    const jwt = toSign + '.' + signature;

    const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      payload: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      muteHttpExceptions: true,
    });
    return JSON.parse(resp.getContentText()).access_token || null;
  } catch (err) {
    console.error('getAccessToken error:', err.message);
    return null;
  }
}

// ============================================================
//  Gửi push đến 1 user cụ thể (gọi từ client qua GAS)
// ============================================================
function sendPushToUser({ userId, title, body, data }) {
  sendPushNotification(userId, title, body, data || {});
  return { success: true };
}

// Broadcast đến tất cả manager khi có hồ sơ mới
function broadcastToManagers({ title, body, data }) {
  const sh = initUsersSheet();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][4]?.toString().toLowerCase() === 'manager') {
      const userId = rows[i][0]?.toString();
      if (userId) sendPushNotification(userId, title, body, data || {});
    }
  }
  return { success: true };
}

function sendPushNotification(userId, title, body, data) {
  const token = getFcmToken(userId);
  if (!token || !SERVICE_ACCOUNT_JSON) return;

  const accessToken = getAccessToken_();
  if (!accessToken) return;

  try {
    UrlFetchApp.fetch(
      'https://fcm.googleapis.com/v1/projects/appdodachadong/messages:send',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        payload: JSON.stringify({
          message: {
            token: token,
            notification: { title, body },
            webpush: {
              notification: { title, body, icon: '/icon-192.png', badge: '/icon-192.png' },
              fcm_options: { link: '/' },
            },
            data: Object.fromEntries(
              Object.entries(data || {}).map(([k, v]) => [k, String(v)])
            ),
          },
        }),
        muteHttpExceptions: true,
      }
    );
  } catch (err) {
    console.error('FCM V1 send error:', err.message);
  }
}
