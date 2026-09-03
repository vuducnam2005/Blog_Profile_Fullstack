import * as signalR from '@microsoft/signalr';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ADMIN_API_KEY } from '../context/AuthContext';

const SESSION_KEY = 'direct_chat_session_id';
const USERNAME_KEY = 'direct_chat_user_name';

/**
 * Lấy hoặc tạo mới Session ID định danh thiết bị của khách
 */
export function getDirectChatSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Lấy tên người dùng đã lưu
 */
export function getDirectChatUserName() {
  return localStorage.getItem(USERNAME_KEY) || '';
}

/**
 * Lưu tên người dùng
 */
export function setDirectChatUserName(name) {
  if (name) {
    localStorage.setItem(USERNAME_KEY, name.trim());
  } else {
    localStorage.removeItem(USERNAME_KEY);
  }
}

/**
 * Xóa sạch phiên cũ và tạo mới khi Admin xóa hội thoại
 */
export function resetDirectChatSession() {
  const newSessionId = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  localStorage.setItem(SESSION_KEY, newSessionId);
  localStorage.removeItem(USERNAME_KEY);
  return newSessionId;
}

/**
 * Chuyển đổi chuỗi ngày giờ từ server (UTC) sang Date object theo múi giờ thiết bị chính xác
 */
export function parseServerDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  // Nếu chuỗi ISO chưa có 'Z' hay múi giờ (+/-), thêm 'Z' để ép JS parse theo chuẩn UTC
  if (!str.endsWith('Z') && !/[+-]\d{2}:?(\d{2})?$/.test(str)) {
    return new Date(str + 'Z');
  }
  return new Date(str);
}

/**
 * Kiểm tra xem 2 timestamp có cùng một ngày hay không
 */
export function isSameDay(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return false;
  const d1 = parseServerDate(dateStr1);
  const d2 = parseServerDate(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return d1.toDateString() === d2.toDateString();
}

/**
 * Format nhãn ngày hiển thị divider giữa các ngày nhắn:
 * Ví dụ: "Hôm nay, 03/09/2026", "Hôm qua, 02/09/2026", "29/08/2026"
 */
export function formatDateDivider(dateStr) {
  if (!dateStr) return '';
  const d = parseServerDate(dateStr);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (d.toDateString() === now.toDateString()) {
    return `Hôm nay, ${day}/${month}/${year}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Hôm qua, ${day}/${month}/${year}`;
  }

  return `${day}/${month}/${year}`;
}

/**
 * Format hiển thị giờ & ngày trên từng bong bóng tin nhắn:
 * Ví dụ: "15:03 • 03/09/2026"
 */
export function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const d = parseServerDate(dateStr);
  if (isNaN(d.getTime())) return '';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hours}:${minutes}`;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${timeFormatted} • ${day}/${month}/${year}`;
}

/**
 * Format hiển thị thời gian trong danh sách hội thoại (Sidebar Admin):
 * Ví dụ: "Hôm nay 15:03" hoặc "03/09 15:03" hoặc "03/09/2025 15:03"
 */
export function formatSessionTime(dateStr) {
  if (!dateStr) return '';
  const d = parseServerDate(dateStr);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes}`;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (d.toDateString() === now.toDateString()) {
    return `Hôm nay ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Hôm qua ${time}`;
  }

  if (d.getFullYear() === now.getFullYear()) {
    return `${day}/${month} ${time}`;
  }

  return `${day}/${month}/${year} ${time}`;
}

/**
 * Âm thanh thông báo tin nhắn mới dùng Web Audio API (không cần file bên ngoài, siêu nhẹ & mượt)
 */
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15); // D6

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.debug('Audio chime skipped:', e);
  }
}

/**
 * Tạo kết nối SignalR Hub
 */
export function createChatHubConnection() {
  const hubUrl = `${API_BASE_URL}/hub/chat`;
  
  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.None)
    .build();
}

/**
 * API REST: Lấy lịch sử tin nhắn của một Session
 */
export async function fetchChatHistory(sessionId) {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/directchat/history/${sessionId}`);
    return res.data;
  } catch (err) {
    console.error('Lỗi khi tải lịch sử tin nhắn:', err);
    return [];
  }
}

/**
 * API REST: Gửi tin nhắn
 */
export async function sendChatMessage({ sessionId, senderName, content, isFromAdmin = false }) {
  const headers = isFromAdmin ? { 'X-Admin-Key': ADMIN_API_KEY } : {};
  const res = await axios.post(`${API_BASE_URL}/api/directchat/send`, {
    sessionId,
    senderName,
    content,
    isFromAdmin
  }, { headers });
  return res.data;
}

/**
 * API REST: Đánh dấu đã đọc
 */
export async function markChatAsRead(sessionId, isFromAdmin = false) {
  const headers = isFromAdmin ? { 'X-Admin-Key': ADMIN_API_KEY } : {};
  try {
    const res = await axios.patch(
      `${API_BASE_URL}/api/directchat/read/${sessionId}?isFromAdmin=${isFromAdmin}`,
      {},
      { headers }
    );
    return res.data;
  } catch (err) {
    console.error('Lỗi đánh dấu đã đọc:', err);
    return null;
  }
}

/**
 * API REST Admin: Lấy danh sách tất cả các hội thoại
 */
export async function fetchAdminSessions() {
  const res = await axios.get(`${API_BASE_URL}/api/directchat/sessions`, {
    headers: { 'X-Admin-Key': ADMIN_API_KEY }
  });
  return res.data;
}

/**
 * API REST Admin: Lấy tổng số tin nhắn chưa đọc
 */
export async function fetchAdminUnreadCount() {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/directchat/unread-count`, {
      headers: { 'X-Admin-Key': ADMIN_API_KEY }
    });
    return res.data.unreadCount || 0;
  } catch {
    return 0;
  }
}

/**
 * API REST Admin: Xóa hội thoại
 */
export async function deleteAdminSession(sessionId) {
  const res = await axios.delete(`${API_BASE_URL}/api/directchat/session/${sessionId}`, {
    headers: { 'X-Admin-Key': ADMIN_API_KEY }
  });
  return res.data;
}

/**
 * API REST: Đăng ký email nhận thông báo của khách
 */
export async function registerSessionEmail(sessionId, email, wantsNotification = true, visitorName = '') {
  if (!sessionId) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}/api/directchat/session/${sessionId}/email`, {
      email: email ? String(email).trim() : null,
      visitorName: visitorName ? String(visitorName).trim() : null,
      wantsEmailNotification: Boolean(wantsNotification)
    });
    return res.data;
  } catch (err) {
    console.error('Lỗi khi đăng ký email nhận thông báo:', err);
    return null;
  }
}
