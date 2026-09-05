using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using BlogBackend.Data;
using BlogBackend.Models;
using BlogBackend.Services;
using BlogBackend.Controllers;

namespace BlogBackend.Hubs
{
    public class DirectChatHub : Hub
    {
        private readonly BlogDbContext _context;
        private readonly IEmailService _emailService;
        private const string AdminSecretKey = "DucNamAdmin2005SecretKey";
        private const string AdminsGroup = "Admins";

        public DirectChatHub(BlogDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        public async Task JoinConversation(string sessionId)
        {
            if (!string.IsNullOrWhiteSpace(sessionId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"session_{sessionId.Trim()}");
            }
        }

        public async Task LeaveConversation(string sessionId)
        {
            if (!string.IsNullOrWhiteSpace(sessionId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"session_{sessionId.Trim()}");
            }
        }

        public async Task<bool> JoinAdmin(string adminKey)
        {
            if (adminKey == AdminSecretKey)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, AdminsGroup);
                return true;
            }
            return false;
        }

        public async Task<DirectChatMessage?> SendMessage(
            string sessionId,
            string senderName,
            string content,
            bool isFromAdmin,
            string? adminKey = null,
            int? replyToId = null,
            string? replyToSender = null,
            string? replyToContent = null,
            string? imageUrl = null)
        {
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                return null;
            }

            if (string.IsNullOrWhiteSpace(content) && string.IsNullOrWhiteSpace(imageUrl))
            {
                return null;
            }

            sessionId = sessionId.Trim();
            imageUrl = !string.IsNullOrWhiteSpace(imageUrl) ? imageUrl.Trim() : null;
            content = !string.IsNullOrWhiteSpace(content) ? content.Trim() : (imageUrl != null ? "[Hình ảnh]" : string.Empty);

            if (isFromAdmin)
            {
                if (adminKey != AdminSecretKey)
                {
                    return null;
                }
                senderName = "Đức Nam";
            }
            else
            {
                if (string.IsNullOrWhiteSpace(senderName))
                {
                    senderName = "Khách truy cập";
                }
                else
                {
                    senderName = senderName.Trim();
                }
            }

            var msg = new DirectChatMessage
            {
                SessionId = sessionId,
                SenderName = senderName,
                Content = content,
                ImageUrl = imageUrl,
                IsFromAdmin = isFromAdmin,
                IsReadByAdmin = isFromAdmin,
                IsReadByUser = !isFromAdmin,
                CreatedAt = DateTime.UtcNow,
                ReplyToId = replyToId,
                ReplyToSender = !string.IsNullOrWhiteSpace(replyToSender) ? replyToSender.Trim() : null,
                ReplyToContent = !string.IsNullOrWhiteSpace(replyToContent) ? replyToContent.Trim() : null
            };

            _context.DirectChatMessages.Add(msg);
            await _context.SaveChangesAsync();

            var payload = new
            {
                id = msg.Id,
                sessionId = msg.SessionId,
                senderName = msg.SenderName,
                content = msg.Content,
                imageUrl = msg.ImageUrl,
                isRecalled = msg.IsRecalled,
                isFromAdmin = msg.IsFromAdmin,
                isReadByAdmin = msg.IsReadByAdmin,
                isReadByUser = msg.IsReadByUser,
                createdAt = DateTime.SpecifyKind(msg.CreatedAt, DateTimeKind.Utc),
                replyToId = msg.ReplyToId,
                replyToSender = msg.ReplyToSender,
                replyToContent = msg.ReplyToContent
            };

            // Cập nhật hoặc tạo mới thông tin phiên chat (DirectChatSession)
            try
            {
                var sessionInfo = await _context.DirectChatSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
                if (sessionInfo == null)
                {
                    sessionInfo = new DirectChatSession
                    {
                        SessionId = sessionId,
                        VisitorName = isFromAdmin ? null : senderName,
                        CreatedAt = DateTime.UtcNow,
                        LastActivityAt = DateTime.UtcNow
                    };
                    _context.DirectChatSessions.Add(sessionInfo);
                }
                else
                {
                    if (!isFromAdmin && !string.IsNullOrWhiteSpace(senderName))
                    {
                        var nameChanged = sessionInfo.VisitorName != senderName;
                        sessionInfo.VisitorName = senderName;
                        if (nameChanged)
                        {
                            var oldMsgs = await _context.DirectChatMessages
                                .Where(m => m.SessionId == sessionId && !m.IsFromAdmin)
                                .ToListAsync();
                            foreach (var om in oldMsgs)
                            {
                                om.SenderName = senderName;
                            }
                        }
                    }
                    sessionInfo.LastActivityAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();

                // Gửi thông báo Email bất đồng bộ (chạy nền)
                if (!isFromAdmin)
                {
                    if (DirectChatController.IsAdminEmailNotificationEnabled(_context))
                    {
                        _ = Task.Run(() => _emailService.SendAdminNewMessageNotificationAsync(senderName, content, sessionId, imageUrl));
                    }
                    else
                    {
                        Console.WriteLine("[DirectChatHub] Admin đã tắt nhận thông báo qua email. Bỏ qua gửi email.");
                    }
                }
                else if (sessionInfo != null && sessionInfo.WantsEmailNotification && !string.IsNullOrWhiteSpace(sessionInfo.VisitorEmail))
                {
                    _ = Task.Run(() => _emailService.SendVisitorReplyNotificationAsync(sessionInfo.VisitorEmail, sessionInfo.VisitorName ?? "Bạn", content, sessionId, imageUrl));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DirectChatHub] Lỗi cập nhật session hoặc gửi mail: {ex.Message}");
            }

            // Gửi tới Khách của phiên này
            await Clients.Group($"session_{sessionId}").SendAsync("ReceiveMessage", payload);

            // Gửi tới tất cả Admin
            await Clients.Group(AdminsGroup).SendAsync("ReceiveMessage", payload);
            await Clients.Group(AdminsGroup).SendAsync("ConversationUpdated", new
            {
                sessionId = msg.SessionId,
                senderName = isFromAdmin ? null : senderName,
                lastMessage = msg.Content,
                lastMessageTime = DateTime.SpecifyKind(msg.CreatedAt, DateTimeKind.Utc),
                isFromAdmin = msg.IsFromAdmin
            });

            return msg;
        }

        public async Task MarkAsRead(string sessionId, bool isFromAdmin, string? adminKey = null)
        {
            if (string.IsNullOrWhiteSpace(sessionId)) return;
            sessionId = sessionId.Trim();

            if (isFromAdmin && adminKey != AdminSecretKey) return;

            var query = _context.DirectChatMessages.Where(m => m.SessionId == sessionId);

            if (isFromAdmin)
            {
                var unread = await query.Where(m => !m.IsReadByAdmin && !m.IsFromAdmin).ToListAsync();
                foreach (var m in unread)
                {
                    m.IsReadByAdmin = true;
                }
            }
            else
            {
                var unread = await query.Where(m => !m.IsReadByUser && m.IsFromAdmin).ToListAsync();
                foreach (var m in unread)
                {
                    m.IsReadByUser = true;
                }
            }

            await _context.SaveChangesAsync();

            await Clients.Group($"session_{sessionId}").SendAsync("MessagesRead", new { sessionId, isFromAdmin });
            await Clients.Group(AdminsGroup).SendAsync("MessagesRead", new { sessionId, isFromAdmin });
        }

        public async Task SendTyping(string sessionId, string senderName, bool isTyping, bool isFromAdmin)
        {
            if (string.IsNullOrWhiteSpace(sessionId)) return;
            sessionId = sessionId.Trim();

            var payload = new
            {
                sessionId,
                senderName = isFromAdmin ? "Đức Nam" : senderName,
                isTyping,
                isFromAdmin
            };

            if (isFromAdmin)
            {
                await Clients.Group($"session_{sessionId}").SendAsync("UserTyping", payload);
            }
            else
            {
                await Clients.Group(AdminsGroup).SendAsync("UserTyping", payload);
            }
        }

        public async Task DeleteSession(string sessionId, string adminKey)
        {
            if (adminKey != AdminSecretKey || string.IsNullOrWhiteSpace(sessionId)) return;
            sessionId = sessionId.Trim();

            try
            {
                var messages = await _context.DirectChatMessages
                    .Where(m => m.SessionId == sessionId)
                    .ToListAsync();

                if (messages.Count > 0)
                {
                    _context.DirectChatMessages.RemoveRange(messages);
                }

                try
                {
                    var sessionInfo = await _context.DirectChatSessions
                        .FirstOrDefaultAsync(s => s.SessionId == sessionId);
                    if (sessionInfo != null)
                    {
                        _context.DirectChatSessions.Remove(sessionInfo);
                    }
                }
                catch (Exception sessEx)
                {
                    Console.WriteLine($"[DirectChatHub.DeleteSession] Bỏ qua xóa DirectChatSession: {sessEx.Message}");
                }

                await _context.SaveChangesAsync();

                await Clients.All.SendAsync("SessionDeleted", new { sessionId });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DirectChatHub.DeleteSession] Lỗi: {ex.Message}");
            }
        }

        public async Task<bool> RegisterVisitorEmail(string sessionId, string email, bool wantsNotification, string? visitorName = null)
        {
            if (string.IsNullOrWhiteSpace(sessionId)) return false;
            sessionId = sessionId.Trim();
            email = email?.Trim() ?? string.Empty;

            try
            {
                var session = await _context.DirectChatSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
                if (session == null)
                {
                    session = new DirectChatSession
                    {
                        SessionId = sessionId,
                        VisitorName = visitorName?.Trim(),
                        VisitorEmail = email,
                        WantsEmailNotification = wantsNotification,
                        CreatedAt = DateTime.UtcNow,
                        LastActivityAt = DateTime.UtcNow
                    };
                    _context.DirectChatSessions.Add(session);
                }
                else
                {
                    if (!string.IsNullOrWhiteSpace(email)) session.VisitorEmail = email;
                    if (!string.IsNullOrWhiteSpace(visitorName)) session.VisitorName = visitorName.Trim();
                    session.WantsEmailNotification = wantsNotification;
                    session.LastActivityAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DirectChatHub] Lỗi lưu email khách: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> UpdateVisitorName(string sessionId, string newName)
        {
            if (string.IsNullOrWhiteSpace(sessionId) || string.IsNullOrWhiteSpace(newName)) return false;
            sessionId = sessionId.Trim();
            newName = newName.Trim();

            try
            {
                var session = await _context.DirectChatSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
                if (session == null)
                {
                    session = new DirectChatSession
                    {
                        SessionId = sessionId,
                        VisitorName = newName,
                        CreatedAt = DateTime.UtcNow,
                        LastActivityAt = DateTime.UtcNow
                    };
                    _context.DirectChatSessions.Add(session);
                }
                else
                {
                    session.VisitorName = newName;
                    session.LastActivityAt = DateTime.UtcNow;
                }

                // Cập nhật tên người gửi trên tất cả các tin nhắn trước đây của khách trong phiên này
                var visitorMessages = await _context.DirectChatMessages
                    .Where(m => m.SessionId == sessionId && !m.IsFromAdmin)
                    .ToListAsync();
                foreach (var msg in visitorMessages)
                {
                    msg.SenderName = newName;
                }

                await _context.SaveChangesAsync();

                var payload = new { sessionId, newName };
                await Clients.Group(AdminsGroup).SendAsync("VisitorNameChanged", payload);
                await Clients.Group($"session_{sessionId}").SendAsync("VisitorNameChanged", payload);
                await Clients.Group(AdminsGroup).SendAsync("ConversationUpdated", new
                {
                    sessionId,
                    senderName = newName
                });

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DirectChatHub.UpdateVisitorName] Lỗi: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> UpdateAdminNotificationSetting(bool enabled, string adminKey)
        {
            if (adminKey != AdminSecretKey) return false;
            try
            {
                var setting = await _context.DirectChatSettings.FirstOrDefaultAsync(s => s.Key == "AdminEmailNotificationEnabled");
                if (setting == null)
                {
                    setting = new DirectChatSetting
                    {
                        Key = "AdminEmailNotificationEnabled",
                        Value = enabled.ToString().ToLower(),
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.DirectChatSettings.Add(setting);
                }
                else
                {
                    setting.Value = enabled.ToString().ToLower();
                    setting.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                DirectChatController.SetAdminEmailNotificationEnabled(enabled);

                await Clients.Group(AdminsGroup).SendAsync("AdminEmailNotificationSettingChanged", new
                {
                    emailNotificationEnabled = enabled
                });

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DirectChatHub] Lỗi UpdateAdminNotificationSetting: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> RecallMessage(int messageId, string sessionId, bool isFromAdmin, string? adminKey = null)
        {
            if (messageId <= 0 || string.IsNullOrWhiteSpace(sessionId)) return false;
            sessionId = sessionId.Trim();

            if (isFromAdmin && adminKey != AdminSecretKey) return false;

            var msg = await _context.DirectChatMessages.FirstOrDefaultAsync(m => m.Id == messageId && m.SessionId == sessionId);
            if (msg == null) return false;

            if (msg.IsRecalled) return true;

            // Kiểm tra quyền thu hồi
            if (!isFromAdmin)
            {
                // Khách chỉ được thu hồi tin nhắn của mình
                if (msg.IsFromAdmin) return false;
            }

            msg.IsRecalled = true;
            msg.ImageUrl = null;
            msg.Content = "[Tin nhắn đã được thu hồi]";
            await _context.SaveChangesAsync();

            var recallPayload = new
            {
                id = msg.Id,
                sessionId = msg.SessionId,
                isRecalled = true,
                content = msg.Content,
                imageUrl = (string?)null
            };

            await Clients.Group($"session_{sessionId}").SendAsync("MessageRecalled", recallPayload);
            await Clients.Group(AdminsGroup).SendAsync("MessageRecalled", recallPayload);

            var latestMsg = await _context.DirectChatMessages
                .Where(m => m.SessionId == sessionId)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            if (latestMsg != null && latestMsg.Id == msg.Id)
            {
                await Clients.Group(AdminsGroup).SendAsync("ConversationUpdated", new
                {
                    sessionId = msg.SessionId,
                    lastMessage = msg.Content,
                    lastMessageTime = DateTime.SpecifyKind(msg.CreatedAt, DateTimeKind.Utc),
                    isFromAdmin = msg.IsFromAdmin
                });
            }

            return true;
        }
    }
}
