/** HALOSUN - Nhận báo giá và lượt truy cập từ trang web, ghi vào Google Sheet.
 *  Cách dùng:
 *  1) Tạo Google Sheet mới -> Tiện ích mở rộng -> Apps Script -> dán toàn bộ file này vào Code.gs.
 *  2) Triển khai -> Tùy chọn triển khai mới -> Ứng dụng web:
 *       Thực thi bằng: Tôi | Ai có quyền truy cập: Bất kỳ ai -> Triển khai (cấp quyền khi được hỏi).
 *  3) Copy link kết thúc bằng /exec, dán vào ô "⚙ Cài đặt lưu báo giá" trên trang web (mật khẩu: Halosun),
 *     và điền link đó vào execUrl:'' ở dòng const CFG= trong index.html để MỌI người truy cập đều được ghi nhận.
 *  Sheet gồm 3 tab: BaoGia (mỗi báo giá một dòng), ChiTiet (từng dòng vật tư), TruyCap (địa chỉ IP người truy cập).
 *  Lưu lại cùng một mã báo giá sẽ CẬP NHẬT dòng cũ, không tạo dòng trùng. */
const TOKEN = '';              // (tuỳ chọn) mã bảo vệ khi lưu báo giá; nếu đặt thì nhập cùng mã trong cửa sổ cài đặt
const ADMIN_PASS = 'Halosun';  // mật khẩu để XEM danh sách IP truy cập (kiểm tra ở máy chủ, không lộ ra trang web)
const SHEET_Q = 'BaoGia', SHEET_I = 'ChiTiet', SHEET_V = 'TruyCap';
const HEAD_Q = ['Thời gian','Mã báo giá','Tên khách hàng','SĐT khách','Địa danh công trình','Nhân viên KD','SĐT nhân viên','Loại hình điện','Cấp điện áp','Nhu cầu (kWh/tháng)','Tiền điện EVN (đ/tháng)','Kịch bản','PPA','Vĩ độ','Kinh độ','PVout (kWh/kWp/năm)','Công suất (kWp)','Tấm pin','Số tấm','Inverter','Số INV','Pin lưu trữ','Số bộ pin','Tổng đầu tư (đ)','Chiết khấu (%)','Tổng thanh toán (đ)','Tiết kiệm (đ/tháng)','Hoàn vốn (năm)','Sản lượng (kWh/tháng)','Nhân công','Khung/giá đỡ','Hệ thống tiếp địa'];
const HEAD_I = ['Mã báo giá','STT','Hạng mục','Hãng / Mã','Số lượng','Đơn giá (đ)','Thành tiền (đ)'];
const HEAD_V = ['Thời gian','Địa chỉ IP','Thiết bị / trình duyệt','Ngôn ngữ','Màn hình','Múi giờ','Trang','Nguồn giới thiệu'];

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
// chống "công thức độc hại": ô bắt đầu bằng = + - @ sẽ được thêm dấu ' phía trước
function safe_(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }
function now_() { return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'); }
function sheet_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name) || ss.insertSheet(name);
  // tạo tiêu đề nếu sheet trống, hoặc bổ sung cột mới vào sheet cũ (không đụng tới dữ liệu)
  if (sh.getLastRow() === 0 || String(sh.getRange(1, head.length, 1, 1).getValues()[0][0]) === '') {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}
function doGet() { return out_({ ok: true, msg: 'HALOSUN báo giá: sẵn sàng nhận dữ liệu' }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse(e.postData.contents);
    if (d.action === 'visit') return visit_(d.visit || {});
    if (d.action === 'visits') return visits_(d);
    if (TOKEN && d.token !== TOKEN) return out_({ ok: false, error: 'Sai mã bảo vệ' });
    if (d.action !== 'saveQuote' || !d.quote) return out_({ ok: false, error: 'Dữ liệu không hợp lệ' });
    return quote_(d.quote);
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function quote_(q) {
  const sq = sheet_(SHEET_Q, HEAD_Q), si = sheet_(SHEET_I, HEAD_I);
  const row = [q.time, q.code, q.name, q.phone, q.place, q.sale, q.salePhone, q.usage, q.volt, q.kwh, q.bill, q.scenario, q.ppa,
    q.lat, q.lng, q.pvout, q.kwp, q.pv, q.pvq, q.inv, q.invq, q.bat, q.batq, q.sum, q.disc, q.net, q.save, q.payback, q.prod, q.labor, q.frame, q.ground].map(safe_);
  const n = sq.getLastRow();
  const codes = n > 1 ? sq.getRange(2, 2, n - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  const idx = codes.indexOf(String(q.code));
  const target = idx >= 0 ? idx + 2 : n + 1;
  sq.getRange(target, 4, 1, 1).setNumberFormat('@');   // giữ số 0 đầu của số điện thoại
  sq.getRange(target, 7, 1, 1).setNumberFormat('@');
  sq.getRange(target, 1, 1, row.length).setValues([row]);
  for (let r = si.getLastRow(); r >= 2; r--) { if (String(si.getRange(r, 1, 1, 1).getValues()[0][0]) === String(q.code)) si.deleteRow(r); }
  const items = (q.items || []).map(function (i) { return [q.code, i.stt, i.name, i.brand, i.qty, i.unit, i.amount].map(safe_); });
  if (items.length) si.getRange(si.getLastRow() + 1, 1, items.length, HEAD_I.length).setValues(items);
  return out_({ ok: true, code: q.code, updated: idx >= 0 });
}

// Ghi 1 lượt truy cập: trang web tự lấy IP rồi gửi lên (Apps Script không tự đọc được IP khách)
function visit_(v) {
  const ip = String(v.ip || '').slice(0, 60);
  if (!/^[0-9a-fA-F:.]{3,45}$/.test(ip) && ip !== '(không lấy được)') return out_({ ok: false, error: 'IP không hợp lệ' });
  const sv = sheet_(SHEET_V, HEAD_V), ua = String(v.ua || '').slice(0, 200);
  const n = sv.getLastRow();
  if (n > 1) {   // bỏ qua nếu cùng IP + thiết bị vừa ghi trong 30 dòng gần nhất (tránh trùng khi tải lại)
    const from = Math.max(2, n - 29), rows = sv.getRange(from, 1, n - from + 1, 3).getValues();
    for (let i = rows.length - 1; i >= 0; i--) { if (String(rows[i][1]) === ip && String(rows[i][2]) === ua) return out_({ ok: true, skipped: true }); }
  }
  const row = [now_(), ip, ua, v.lang, v.scr, v.tz, v.page, v.ref].map(function (x) { return safe_(String(x == null ? '' : x).slice(0, 200)); });
  sv.getRange(n + 1, 1, 1, row.length).setValues([row]);
  return out_({ ok: true });
}

// Admin xem danh sách IP (cần ADMIN_PASS)
function visits_(d) {
  if (String(d.pass) !== ADMIN_PASS) return out_({ ok: false, error: 'Sai mật khẩu quản trị' });
  const sv = sheet_(SHEET_V, HEAD_V), n = sv.getLastRow();
  if (n < 2) return out_({ ok: true, total: 0, unique: 0, rows: [] });
  const all = sv.getRange(2, 1, n - 1, 8).getValues(), seen = {};
  all.forEach(function (r) { seen[String(r[1])] = 1; });
  const rows = all.slice(-200).reverse().map(function (r) { return { t: String(r[0]), ip: String(r[1]), ua: String(r[2]), page: String(r[6]) }; });
  return out_({ ok: true, total: all.length, unique: Object.keys(seen).length, rows: rows });
}

// (Tuỳ chọn) Gửi email tổng hợp lượt truy cập hôm qua cho admin: Triển khai bộ hẹn giờ cho hàm này (Triggers -> Add trigger -> Day timer)
function dailyDigest() {
  const sv = sheet_(SHEET_V, HEAD_V), n = sv.getLastRow();
  if (n < 2) return;
  const y = Utilities.formatDate(new Date(Date.now() - 86400000), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  const rows = sv.getRange(2, 1, n - 1, 3).getValues().filter(function (r) { return String(r[0]).indexOf(y) === 0; });
  if (!rows.length) return;
  const body = rows.map(function (r) { return r[0] + '  ' + r[1] + '  ' + r[2]; }).join('\n');
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'HALOSUN: ' + rows.length + ' lượt truy cập ngày ' + y, body);
}
