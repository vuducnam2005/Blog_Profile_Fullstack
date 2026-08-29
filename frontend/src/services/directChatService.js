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
