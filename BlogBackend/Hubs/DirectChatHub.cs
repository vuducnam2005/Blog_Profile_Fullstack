using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using BlogBackend.Data;
using BlogBackend.Models;

namespace BlogBackend.Hubs
{
    public class DirectChatHub : Hub
    {
        private readonly BlogDbContext _context;
        private const string AdminSecretKey = "DucNamAdmin2005SecretKey";
        private const string AdminsGroup = "Admins";

        public DirectChatHub(BlogDbContext context)
        {
            _context = context;
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

        public async Task<DirectChatMessage?> SendMessage(string sessionId, string senderName, string content, bool isFromAdmin, string? adminKey = null)
        {
            if (string.IsNullOrWhiteSpace(sessionId) || string.IsNullOrWhiteSpace(content))
            {
                return null;
            }

            sessionId = sessionId.Trim();
            content = content.Trim();

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
                IsFromAdmin = isFromAdmin,
                IsReadByAdmin = isFromAdmin,
                IsReadByUser = !isFromAdmin,
                CreatedAt = DateTime.UtcNow
            };

            _context.DirectChatMessages.Add(msg);
            await _context.SaveChangesAsync();

            var payload = new
            {
                id = msg.Id,
                sessionId = msg.SessionId,
                senderName = msg.SenderName,
                content = msg.Content,
                isFromAdmin = msg.IsFromAdmin,
                isReadByAdmin = msg.IsReadByAdmin,
                isReadByUser = msg.IsReadByUser,
                createdAt = msg.CreatedAt
            };

            // Gửi tới Khách của phiên này
            await Clients.Group($"session_{sessionId}").SendAsync("ReceiveMessage", payload);

            // Gửi tới tất cả Admin
            await Clients.Group(AdminsGroup).SendAsync("ReceiveMessage", payload);
            await Clients.Group(AdminsGroup).SendAsync("ConversationUpdated", new
            {
                sessionId = msg.SessionId,
                senderName = isFromAdmin ? null : senderName,
                lastMessage = msg.Content,
                lastMessageTime = msg.CreatedAt,
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
    }
}
