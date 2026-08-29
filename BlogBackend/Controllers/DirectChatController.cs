using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using BlogBackend.Data;
using BlogBackend.Hubs;
using BlogBackend.Models;

namespace BlogBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DirectChatController : ControllerBase
    {
        private readonly BlogDbContext _context;
        private readonly IHubContext<DirectChatHub> _hubContext;
        private const string AdminSecretKey = "DucNamAdmin2005SecretKey";
        private const string AdminsGroup = "Admins";

        public DirectChatController(BlogDbContext context, IHubContext<DirectChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        private bool IsAuthorizedAdmin()
        {
            var key = Request.Headers["X-Admin-Key"].FirstOrDefault();
            return key == AdminSecretKey;
        }

        // GET: api/directchat/history/{sessionId}
        [HttpGet("history/{sessionId}")]
        public async Task<IActionResult> GetHistory(string sessionId, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                return BadRequest(new { message = "Session ID không hợp lệ." });
            }

            sessionId = sessionId.Trim();
            var messages = await _context.DirectChatMessages
                .AsNoTracking()
                .Where(m => m.SessionId == sessionId)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new
                {
                    m.Id,
                    m.SessionId,
                    m.SenderName,
                    m.Content,
                    m.IsFromAdmin,
                    m.IsReadByAdmin,
                    m.IsReadByUser,
                    m.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return Ok(messages);
        }

        // POST: api/directchat/send
        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] SendDirectMessageDto dto, CancellationToken cancellationToken)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.SessionId) || string.IsNullOrWhiteSpace(dto.Content))
            {
                return BadRequest(new { message = "Dữ liệu tin nhắn không hợp lệ." });
            }

            var sessionId = dto.SessionId.Trim();
            var content = dto.Content.Trim();
            var isFromAdmin = dto.IsFromAdmin;
            string senderName;

            if (isFromAdmin)
            {
                if (!IsAuthorizedAdmin())
                {
                    return Unauthorized(new { message = "Bạn không có quyền gửi tin nhắn với tư cách Admin." });
                }
                senderName = "Đức Nam";
            }
            else
            {
                senderName = string.IsNullOrWhiteSpace(dto.SenderName) ? "Khách truy cập" : dto.SenderName.Trim();
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
            await _context.SaveChangesAsync(cancellationToken);

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

            // Broadcast qua SignalR
            await _hubContext.Clients.Group($"session_{sessionId}").SendAsync("ReceiveMessage", payload, cancellationToken);
            await _hubContext.Clients.Group(AdminsGroup).SendAsync("ReceiveMessage", payload, cancellationToken);
            await _hubContext.Clients.Group(AdminsGroup).SendAsync("ConversationUpdated", new
            {
                sessionId = msg.SessionId,
                senderName = isFromAdmin ? null : senderName,
                lastMessage = msg.Content,
                lastMessageTime = msg.CreatedAt,
                isFromAdmin = msg.IsFromAdmin
            }, cancellationToken);

            return Ok(payload);
        }

        // GET: api/directchat/sessions (Admin Only)
        [HttpGet("sessions")]
        public async Task<IActionResult> GetSessions(CancellationToken cancellationToken)
        {
            if (!IsAuthorizedAdmin())
            {
                return Unauthorized(new { message = "Bạn không có quyền xem danh sách hội thoại." });
            }

            var allMessages = await _context.DirectChatMessages
                .AsNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync(cancellationToken);

            var grouped = allMessages
                .GroupBy(m => m.SessionId)
                .Select(g =>
                {
                    var latest = g.First();
                    // Lấy tên người dùng gần nhất không phải Admin
                    var visitorName = g.FirstOrDefault(m => !m.IsFromAdmin)?.SenderName ?? latest.SenderName;
                    var unreadCount = g.Count(m => !m.IsReadByAdmin && !m.IsFromAdmin);

                    return new
                    {
                        sessionId = g.Key,
                        senderName = visitorName,
                        lastMessage = latest.Content,
                        lastMessageTime = latest.CreatedAt,
                        isLastFromAdmin = latest.IsFromAdmin,
                        unreadCount,
                        totalMessages = g.Count()
                    };
                })
                .OrderByDescending(s => s.lastMessageTime)
                .ToList();

            return Ok(grouped);
        }

        // GET: api/directchat/unread-count (Admin Only)
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
        {
            if (!IsAuthorizedAdmin())
            {
                return Unauthorized(new { message = "Bạn không có quyền xem thông tin này." });
            }

            var count = await _context.DirectChatMessages
                .AsNoTracking()
                .CountAsync(m => !m.IsReadByAdmin && !m.IsFromAdmin, cancellationToken);

            return Ok(new { unreadCount = count });
        }

        // PATCH: api/directchat/read/{sessionId}
        [HttpPatch("read/{sessionId}")]
        public async Task<IActionResult> MarkAsRead(string sessionId, [FromQuery] bool isFromAdmin, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(sessionId)) return BadRequest();
            sessionId = sessionId.Trim();

            if (isFromAdmin && !IsAuthorizedAdmin())
            {
                return Unauthorized(new { message = "Bạn không có quyền thực hiện thao tác này." });
            }

            var query = _context.DirectChatMessages.Where(m => m.SessionId == sessionId);

            if (isFromAdmin)
            {
                var unread = await query.Where(m => !m.IsReadByAdmin && !m.IsFromAdmin).ToListAsync(cancellationToken);
                foreach (var m in unread)
                {
                    m.IsReadByAdmin = true;
                }
            }
            else
            {
                var unread = await query.Where(m => !m.IsReadByUser && m.IsFromAdmin).ToListAsync(cancellationToken);
                foreach (var m in unread)
                {
                    m.IsReadByUser = true;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _hubContext.Clients.Group($"session_{sessionId}").SendAsync("MessagesRead", new { sessionId, isFromAdmin }, cancellationToken);
            await _hubContext.Clients.Group(AdminsGroup).SendAsync("MessagesRead", new { sessionId, isFromAdmin }, cancellationToken);

            return Ok(new { success = true });
        }

        // DELETE: api/directchat/session/{sessionId} (Admin Only)
        [HttpDelete("session/{sessionId}")]
        public async Task<IActionResult> DeleteSession(string sessionId, CancellationToken cancellationToken)
        {
            if (!IsAuthorizedAdmin())
            {
                return Unauthorized(new { message = "Bạn không có quyền xóa hội thoại này." });
            }

            if (string.IsNullOrWhiteSpace(sessionId)) return BadRequest();
            sessionId = sessionId.Trim();

            var messages = await _context.DirectChatMessages
                .Where(m => m.SessionId == sessionId)
                .ToListAsync(cancellationToken);

            if (messages.Count > 0)
            {
                _context.DirectChatMessages.RemoveRange(messages);
                await _context.SaveChangesAsync(cancellationToken);
            }

            await _hubContext.Clients.Group(AdminsGroup).SendAsync("SessionDeleted", new { sessionId }, cancellationToken);

            return Ok(new { message = "Đã xóa cuộc hội thoại thành công." });
        }
    }

    public class SendDirectMessageDto
    {
        public string SessionId { get; set; } = string.Empty;
        public string? SenderName { get; set; }
        public string Content { get; set; } = string.Empty;
        public bool IsFromAdmin { get; set; } = false;
    }
}
