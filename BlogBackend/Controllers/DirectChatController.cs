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
using BlogBackend.Services;

namespace BlogBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DirectChatController : ControllerBase
    {
        private readonly BlogDbContext _context;
        private readonly IHubContext<DirectChatHub> _hubContext;
        private readonly IEmailService _emailService;
        private const string AdminSecretKey = "DucNamAdmin2005SecretKey";
        private const string AdminsGroup = "Admins";

        private static bool _schemaEnsured = false;
        private static readonly SemaphoreSlim _schemaLock = new(1, 1);
        private static bool _adminEmailNotificationEnabled = true;
        private static bool _adminEmailSettingLoaded = false;

        public static bool IsAdminEmailNotificationEnabled(BlogDbContext? context = null)
        {
            if (!_adminEmailSettingLoaded && context != null)
            {
                try
                {
                    var setting = context.DirectChatSettings.FirstOrDefault(s => s.Key == "AdminEmailNotificationEnabled");
                    if (setting != null && bool.TryParse(setting.Value, out var parsedVal))
                    {
                        _adminEmailNotificationEnabled = parsedVal;
                    }
                    _adminEmailSettingLoaded = true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DirectChat] Lỗi nạp AdminEmailNotificationEnabled: {ex.Message}");
                }
            }
            return _adminEmailNotificationEnabled;
        }

        public static void SetAdminEmailNotificationEnabled(bool enabled)
        {
            _adminEmailNotificationEnabled = enabled;
            _adminEmailSettingLoaded = true;
        }

        public DirectChatController(BlogDbContext context, IHubContext<DirectChatHub> hubContext, IEmailService emailService)
        {
            _context = context;
            _hubContext = hubContext;
            _emailService = emailService;
        }

        private bool IsAuthorizedAdmin()
        {
            var key = Request.Headers["X-Admin-Key"].FirstOrDefault();
            return key == AdminSecretKey;
        }

        private async Task EnsureSchemaAsync()
        {
            if (_schemaEnsured) return;
            await _schemaLock.WaitAsync();
            try
            {
                if (_schemaEnsured) return;
                await _context.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS ""DirectChatSessions"" (
                        ""SessionId"" VARCHAR(100) PRIMARY KEY,
                        ""VisitorName"" VARCHAR(100),
                        ""VisitorEmail"" VARCHAR(200),
                        ""WantsEmailNotification"" BOOLEAN NOT NULL DEFAULT FALSE,
                        ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        ""LastActivityAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                    );

                    CREATE TABLE IF NOT EXISTS ""DirectChatSettings"" (
                        ""Key"" VARCHAR(100) PRIMARY KEY,
                        ""Value"" TEXT NOT NULL,
                        ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                    );

                    ALTER TABLE ""DirectChatMessages"" ADD COLUMN IF NOT EXISTS ""ReplyToId"" INTEGER;
                    ALTER TABLE ""DirectChatMessages"" ADD COLUMN IF NOT EXISTS ""ReplyToSender"" VARCHAR(100);
                    ALTER TABLE ""DirectChatMessages"" ADD COLUMN IF NOT EXISTS ""ReplyToContent"" TEXT;
                ");

                try
                {
                    var emailSetting = await _context.DirectChatSettings.FirstOrDefaultAsync(s => s.Key == "AdminEmailNotificationEnabled");
                    if (emailSetting == null)
                    {
                        emailSetting = new DirectChatSetting
                        {
                            Key = "AdminEmailNotificationEnabled",
                            Value = "true",
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.DirectChatSettings.Add(emailSetting);
                        await _context.SaveChangesAsync();
                        _adminEmailNotificationEnabled = true;
                    }
                    else
                    {
                        if (bool.TryParse(emailSetting.Value, out var parsedVal))
                        {
                            _adminEmailNotificationEnabled = parsedVal;
                        }
                    }
                    _adminEmailSettingLoaded = true;
                }
                catch (Exception setEx)
                {
                    Console.WriteLine($"[DirectChatController] EnsureSchemaAsync setting warning: {setEx.Message}");
                }

                _schemaEnsured = true;
                Console.WriteLine("[DirectChatController] EnsureSchemaAsync: schema đồng bộ thành công.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DirectChatController] EnsureSchemaAsync warning: {ex.Message}");
            }
            finally
            {
                _schemaLock.Release();
            }
        }

        // GET: api/directchat/sync-db?key=DucNamAdmin2005SecretKey
        [HttpGet("sync-db")]
        public async Task<IActionResult> SyncDatabaseSchema([FromQuery] string? key)
        {
            if (key != AdminSecretKey && !IsAuthorizedAdmin())
            {
                return Unauthorized(new { message = "Khóa bí mật không hợp lệ." });
            }

            try
            {
                _schemaEnsured = false;
                await EnsureSchemaAsync();

                var totalMessages = await _context.DirectChatMessages.CountAsync();
                var totalSessions = await _context.DirectChatSessions.CountAsync();

                return Ok(new
                {
                    success = true,
                    message = "Đã đồng bộ schema DirectChat thành công!",
                    totalMessages,
                    totalSessions
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message,
                    innerError = ex.InnerException?.Message
                });
            }
        }

        // GET: api/directchat/test-email?key=DucNamAdmin2005SecretKey
        [HttpGet("test-email")]
        public async Task<IActionResult> TestEmail([FromQuery] string? key)
        {
            if (key != AdminSecretKey && !IsAuthorizedAdmin())
            {
                return Unauthorized(new { message = "Khóa bí mật không hợp lệ." });
            }

            var (success, msg) = await _emailService.TestSendEmailAsync();
            return Ok(new
            {
                success,
                message = msg
            });
        }

        public class AdminNotificationSettingDto
        {
            public bool EmailNotificationEnabled { get; set; }
        }

        // GET: api/directchat/admin-notification-setting
        [HttpGet("admin-notification-setting")]
        public async Task<IActionResult> GetAdminNotificationSetting()
        {
            if (!IsAuthorizedAdmin())
            {
                return Unauthorized(new { message = "Khóa bí mật không hợp lệ." });
            }

            await EnsureSchemaAsync();
            return Ok(new
            {
                success = true,
                emailNotificationEnabled = _adminEmailNotificationEnabled
            });
        }

        // POST: api/directchat/admin-notification-setting
        [HttpPost("admin-notification-setting")]
        public async Task<IActionResult> UpdateAdminNotificationSetting([FromBody] AdminNotificationSettingDto dto)
        {
            if (!IsAuthorizedAdmin())
            {
                return Unauthorized(new { message = "Khóa bí mật không hợp lệ." });
            }

            await EnsureSchemaAsync();

            try
            {
                var setting = await _context.DirectChatSettings.FirstOrDefaultAsync(s => s.Key == "AdminEmailNotificationEnabled");
                if (setting == null)
                {
                    setting = new DirectChatSetting
                    {
                        Key = "AdminEmailNotificationEnabled",
                        Value = dto.EmailNotificationEnabled.ToString().ToLower(),
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.DirectChatSettings.Add(setting);
                }
                else
                {
                    setting.Value = dto.EmailNotificationEnabled.ToString().ToLower();
                    setting.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                _adminEmailNotificationEnabled = dto.EmailNotificationEnabled;
                _adminEmailSettingLoaded = true;

                // Broadcast tới tất cả Admin đang kết nối SignalR
                await _hubContext.Clients.Group(AdminsGroup).SendAsync("AdminEmailNotificationSettingChanged", new
                {
                    emailNotificationEnabled = dto.EmailNotificationEnabled
                });

                return Ok(new
                {
                    success = true,
                    emailNotificationEnabled = dto.EmailNotificationEnabled,
                    message = dto.EmailNotificationEnabled
                        ? "Đã bật nhận thông báo tin nhắn mới qua email cho Admin."
                        : "Đã tắt nhận thông báo tin nhắn mới qua email cho Admin."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Lỗi khi lưu cài đặt thông báo email: " + ex.Message
                });
            }
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
            try
            {
                var messages = await QueryHistoryInternalAsync(sessionId, cancellationToken);
                return Ok(messages);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetHistory] Thử lại sau khi tự sửa schema: {ex.Message}");
                await EnsureSchemaAsync();
                var messages = await QueryHistoryInternalAsync(sessionId, cancellationToken);
                return Ok(messages);
            }
        }

        private async Task<object> QueryHistoryInternalAsync(string sessionId, CancellationToken cancellationToken)
        {
            return await _context.DirectChatMessages
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
                    m.CreatedAt,
                    m.ReplyToId,
                    m.ReplyToSender,
                    m.ReplyToContent
                })
                .ToListAsync(cancellationToken);
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
                CreatedAt = DateTime.UtcNow,
                ReplyToId = dto.ReplyToId,
                ReplyToSender = !string.IsNullOrWhiteSpace(dto.ReplyToSender) ? dto.ReplyToSender.Trim() : null,
                ReplyToContent = !string.IsNullOrWhiteSpace(dto.ReplyToContent) ? dto.ReplyToContent.Trim() : null
            };

            try
            {
                _context.DirectChatMessages.Add(msg);
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception)
            {
                await EnsureSchemaAsync();
                await _context.SaveChangesAsync(cancellationToken);
            }

            var payload = new
            {
                id = msg.Id,
                sessionId = msg.SessionId,
                senderName = msg.SenderName,
                content = msg.Content,
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
                var sessionInfo = await _context.DirectChatSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
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
                        sessionInfo.VisitorName = senderName;
                    }
                    sessionInfo.LastActivityAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync(cancellationToken);

                // Gửi thông báo Email bất đồng bộ (chạy nền không block HTTP response)
                if (!isFromAdmin)
                {
                    if (IsAdminEmailNotificationEnabled(_context))
                    {
                        _ = Task.Run(() => _emailService.SendAdminNewMessageNotificationAsync(senderName, content, sessionId));
                    }
                    else
                    {
                        Console.WriteLine("[DirectChatController] Admin đã tắt nhận thông báo qua email. Bỏ qua gửi email.");
                    }
                }
                else if (sessionInfo != null && sessionInfo.WantsEmailNotification && !string.IsNullOrWhiteSpace(sessionInfo.VisitorEmail))
                {
                    _ = Task.Run(() => _emailService.SendVisitorReplyNotificationAsync(sessionInfo.VisitorEmail, sessionInfo.VisitorName ?? "Bạn", content, sessionId));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DirectChat] Lỗi cập nhật session hoặc kích hoạt gửi mail: {ex.Message}");
            }

            // Broadcast qua SignalR
            await _hubContext.Clients.Group($"session_{sessionId}").SendAsync("ReceiveMessage", payload, cancellationToken);
            await _hubContext.Clients.Group(AdminsGroup).SendAsync("ReceiveMessage", payload, cancellationToken);
            await _hubContext.Clients.Group(AdminsGroup).SendAsync("ConversationUpdated", new
            {
                sessionId = msg.SessionId,
                senderName = isFromAdmin ? null : senderName,
                lastMessage = msg.Content,
                lastMessageTime = DateTime.SpecifyKind(msg.CreatedAt, DateTimeKind.Utc),
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

            try
            {
                var grouped = await QuerySessionsInternalAsync(cancellationToken);
                return Ok(grouped);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetSessions] Thử lại sau khi tự sửa schema: {ex.Message}");
                await EnsureSchemaAsync();
                var grouped = await QuerySessionsInternalAsync(cancellationToken);
                return Ok(grouped);
            }
        }

        private async Task<object> QuerySessionsInternalAsync(CancellationToken cancellationToken)
        {
            var allMessages = await _context.DirectChatMessages
                .AsNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync(cancellationToken);

            return allMessages
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

            if (string.IsNullOrWhiteSpace(sessionId)) return BadRequest(new { message = "Session ID không hợp lệ." });
            sessionId = sessionId.Trim();

            try
            {
                var messages = await _context.DirectChatMessages
                    .Where(m => m.SessionId == sessionId)
                    .ToListAsync(cancellationToken);

                if (messages.Count > 0)
                {
                    _context.DirectChatMessages.RemoveRange(messages);
                }

                try
                {
                    var sessionInfo = await _context.DirectChatSessions
                        .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
                    if (sessionInfo != null)
                    {
                        _context.DirectChatSessions.Remove(sessionInfo);
                    }
                }
                catch (Exception sessEx)
                {
                    Console.WriteLine($"[DeleteSession] Bỏ qua xóa DirectChatSession: {sessEx.Message}");
                }

                await _context.SaveChangesAsync(cancellationToken);

                await _hubContext.Clients.All.SendAsync("SessionDeleted", new { sessionId }, cancellationToken);

                return Ok(new { message = "Đã xóa cuộc hội thoại thành công." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DeleteSession] Lỗi: {ex.Message}");
                return StatusCode(500, new { message = "Lỗi khi xóa cuộc hội thoại.", error = ex.Message });
            }
        }

        // POST: api/directchat/session/{sessionId}/email
        [HttpPost("session/{sessionId}/email")]
        public async Task<IActionResult> RegisterSessionEmail(string sessionId, [FromBody] RegisterEmailDto dto, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(sessionId)) return BadRequest(new { message = "Session ID không hợp lệ." });
            sessionId = sessionId.Trim();

            var email = dto?.Email?.Trim();
            var wantsNotification = dto?.WantsEmailNotification ?? true;

            if (wantsNotification && string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "Vui lòng nhập địa chỉ email hợp lệ." });
            }

            var session = await _context.DirectChatSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
            if (session == null)
            {
                session = new DirectChatSession
                {
                    SessionId = sessionId,
                    VisitorName = dto?.VisitorName?.Trim(),
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
                if (!string.IsNullOrWhiteSpace(dto?.VisitorName)) session.VisitorName = dto.VisitorName.Trim();
                session.WantsEmailNotification = wantsNotification;
                session.LastActivityAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                success = true,
                sessionId,
                visitorEmail = session.VisitorEmail,
                wantsEmailNotification = session.WantsEmailNotification
            });
        }
    }

    public class SendDirectMessageDto
    {
        public string SessionId { get; set; } = string.Empty;
        public string? SenderName { get; set; }
        public string Content { get; set; } = string.Empty;
        public bool IsFromAdmin { get; set; } = false;
        public int? ReplyToId { get; set; }
        public string? ReplyToSender { get; set; }
        public string? ReplyToContent { get; set; }
    }

    public class RegisterEmailDto
    {
        public string? Email { get; set; }
        public string? VisitorName { get; set; }
        public bool WantsEmailNotification { get; set; } = true;
    }
}
