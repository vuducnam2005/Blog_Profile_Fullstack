using System;
using System.Net;
using System.Net.Http;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BlogBackend.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        private string GetConfigValue(string envKey, string configKey, string defaultValue = "")
        {
            var envVal = Environment.GetEnvironmentVariable(envKey);
            if (!string.IsNullOrWhiteSpace(envVal)) return envVal.Trim();

            var configVal = _configuration[configKey];
            if (!string.IsNullOrWhiteSpace(configVal)) return configVal.Trim();

            return defaultValue;
        }

        private (string Host, int Port, string User, string Password, string AdminEmail) GetSmtpSettings()
        {
            var host = GetConfigValue("SMTP_HOST", "EmailSettings:Host", "smtp.gmail.com");
            var portStr = GetConfigValue("SMTP_PORT", "EmailSettings:Port", "587");
            int.TryParse(portStr, out var port);
            if (port <= 0) port = 587;

            var user = GetConfigValue("SMTP_USER", "EmailSettings:User", "vuducnam12345678@gmail.com");
            var password = GetConfigValue("SMTP_PASSWORD", "EmailSettings:Password", "");
            if (string.IsNullOrWhiteSpace(password))
            {
                password = GetConfigValue("GMAIL_APP_PASSWORD", "EmailSettings:AppPassword", "");
            }
            if (!string.IsNullOrWhiteSpace(password))
            {
                password = password.Replace(" ", "").Trim();
            }

            var adminEmail = GetConfigValue("ADMIN_NOTIFICATION_EMAIL", "EmailSettings:AdminEmail", "vuducnam12345678@gmail.com");

            return (host, port, user, password, adminEmail);
        }

        private bool IsAnyEmailChannelConfigured()
        {
            var webhook = GetConfigValue("GMAIL_WEBHOOK_URL", "EmailSettings:WebhookUrl", "");
            var resend = GetConfigValue("RESEND_API_KEY", "EmailSettings:ResendApiKey", "");
            var brevo = GetConfigValue("BREVO_API_KEY", "EmailSettings:BrevoApiKey", "");
            var (_, _, _, password, _) = GetSmtpSettings();
            return !string.IsNullOrWhiteSpace(webhook) ||
                   !string.IsNullOrWhiteSpace(resend) ||
                   !string.IsNullOrWhiteSpace(brevo) ||
                   !string.IsNullOrWhiteSpace(password);
        }

        public async Task SendAdminNewMessageNotificationAsync(string visitorName, string content, string sessionId)
        {
            var (host, port, user, password, adminEmail) = GetSmtpSettings();

            if (!IsAnyEmailChannelConfigured())
            {
                Console.WriteLine("[EmailService] Chưa cấu hình kênh gửi email. Bỏ qua thông báo tới Admin.");
                _logger.LogInformation("[EmailService] Chưa cấu hình kênh gửi email. Bỏ qua thông báo tới Admin.");
                return;
            }

            try
            {
                var nowStr = DateTime.UtcNow.AddHours(7).ToString("HH:mm:ss dd/MM/yyyy");
                var safeSender = string.IsNullOrWhiteSpace(visitorName) ? "Khách truy cập" : visitorName.Trim();
                var safeContent = WebUtility.HtmlEncode(content ?? "");

                var subject = $"💬 [Tin nhắn mới từ Blog] {safeSender} vừa nhắn tin cho bạn!";
                var bodyHtml = $@"
<!DOCTYPE html>
<html lang=""vi"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Tin nhắn mới</title>
</head>
<body style=""margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0d14; color: #e5e7eb;"">
    <div style=""max-width: 580px; margin: 0 auto; background: #131622; border-radius: 16px; border: 1px solid rgba(241, 216, 158, 0.3); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);"">
        
        <!-- Header -->
        <div style=""background: linear-gradient(135deg, #1f2438, #131622); padding: 24px; border-bottom: 1px solid rgba(241, 216, 158, 0.2); text-align: center;"">
            <h1 style=""margin: 0 0 6px; font-size: 20px; color: #F1D89E; font-weight: 700;"">💬 Tin Nhắn Trực Tiếp Mới</h1>
            <p style=""margin: 0; font-size: 13px; color: #9ca3af;"">Có người vừa gửi tin nhắn cho bạn trên Blog cá nhân</p>
        </div>

        <!-- Content Box -->
        <div style=""padding: 24px;"">
            <div style=""background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px;"">
                <div style=""margin-bottom: 12px; display: flex; justify-content: space-between;"">
                    <span style=""font-size: 12px; color: #9ca3af;"">Người gửi:</span>
                    <strong style=""font-size: 14px; color: #F1D89E;"">{safeSender}</strong>
                </div>
                <div style=""margin-bottom: 12px;"">
                    <span style=""font-size: 12px; color: #9ca3af;"">Thời gian (GMT+7):</span>
                    <span style=""font-size: 12px; color: #e5e7eb; margin-left: 8px;"">{nowStr}</span>
                </div>
                <div>
                    <span style=""font-size: 12px; color: #9ca3af; display: block; margin-bottom: 6px;"">Nội dung tin nhắn:</span>
                    <div style=""background: #1a1d2e; border-left: 4px solid #F1D89E; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #ffffff; line-height: 1.6; white-space: pre-wrap;"">{safeContent}</div>
                </div>
            </div>

            <!-- Action Button -->
            <div style=""text-align: center; margin-top: 24px; margin-bottom: 12px;"">
                <a href=""https://ducnamdev.site/admin"" style=""display: inline-block; background: linear-gradient(135deg, #F1D89E, #d8b868); color: #000000; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 15px rgba(241, 216, 158, 0.4);"">
                    👉 Vào Quản Lý Tin Nhắn & Trả Lời Ngay
                </a>
            </div>
            <p style=""text-align: center; font-size: 11px; color: #6b7280; margin: 0;"">Mã phiên trò chuyện: <code style=""color: #F1D89E;"">{sessionId}</code></p>
        </div>

        <!-- Footer -->
        <div style=""background: #0d0f17; padding: 14px 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: #6b7280;"">
            Thông báo tự động từ Blog Profile - Vũ Đức Nam (ducnamdev.site)
        </div>
    </div>
</body>
</html>";

                await SendEmailRawAsync(host, port, user, password, adminEmail, subject, bodyHtml);
                Console.WriteLine($"[EmailService] Đã gửi email thông báo tin nhắn mới tới Admin: {adminEmail}");
                _logger.LogInformation("[EmailService] Đã gửi email thông báo tin nhắn mới tới Admin: {Email}", adminEmail);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailService] Lỗi gửi email tới Admin: {ex.GetType().Name}: {ex.Message} -> {ex.InnerException?.Message}");
                _logger.LogError(ex, "[EmailService] Lỗi khi gửi email thông báo tới Admin.");
            }
        }

        public async Task SendVisitorReplyNotificationAsync(string visitorEmail, string visitorName, string replyContent, string sessionId)
        {
            if (string.IsNullOrWhiteSpace(visitorEmail)) return;

            var (host, port, user, password, _) = GetSmtpSettings();

            if (!IsAnyEmailChannelConfigured())
            {
                Console.WriteLine("[EmailService] Chưa cấu hình kênh gửi email. Bỏ qua thông báo tới Khách.");
                _logger.LogInformation("[EmailService] Chưa cấu hình kênh gửi email. Bỏ qua gửi email thông báo tới Khách.");
                return;
            }

            try
            {
                var nowStr = DateTime.UtcNow.AddHours(7).ToString("HH:mm:ss dd/MM/yyyy");
                var safeName = string.IsNullOrWhiteSpace(visitorName) ? "bạn" : visitorName.Trim();
                var safeReply = WebUtility.HtmlEncode(replyContent ?? "");

                var subject = $"💬 Vũ Đức Nam vừa trả lời tin nhắn của bạn!";
                var bodyHtml = $@"
<!DOCTYPE html>
<html lang=""vi"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Phản hồi từ Vũ Đức Nam</title>
</head>
<body style=""margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0d14; color: #e5e7eb;"">
    <div style=""max-width: 580px; margin: 0 auto; background: #131622; border-radius: 16px; border: 1px solid rgba(241, 216, 158, 0.3); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);"">
        
        <!-- Header -->
        <div style=""background: linear-gradient(135deg, #1f2438, #131622); padding: 24px; border-bottom: 1px solid rgba(241, 216, 158, 0.2); text-align: center;"">
            <h1 style=""margin: 0 0 6px; font-size: 20px; color: #F1D89E; font-weight: 700;"">💬 Tin Nhắn Phản Hồi Từ Đức Nam</h1>
            <p style=""margin: 0; font-size: 13px; color: #9ca3af;"">Đức Nam vừa gửi câu trả lời cho bạn trên website Portfolio</p>
        </div>

        <!-- Content Box -->
        <div style=""padding: 24px;"">
            <p style=""font-size: 14px; margin-top: 0; margin-bottom: 16px; color: #e5e7eb;"">
                Xin chào <strong style=""color: #F1D89E;"">{safeName}</strong>,
            </p>
            <p style=""font-size: 13px; color: #9ca3af; margin-bottom: 14px;"">
                Đức Nam đã phản hồi tin nhắn của bạn vào lúc <strong style=""color: #e5e7eb;"">{nowStr}</strong>:
            </p>

            <div style=""background: #1a1d2e; border-left: 4px solid #F1D89E; padding: 14px 18px; border-radius: 8px; font-size: 14px; color: #ffffff; line-height: 1.6; margin-bottom: 24px; white-space: pre-wrap;"">{safeReply}</div>

            <!-- Action Button -->
            <div style=""text-align: center; margin-top: 20px; margin-bottom: 12px;"">
                <a href=""https://ducnamdev.site"" style=""display: inline-block; background: linear-gradient(135deg, #F1D89E, #d8b868); color: #000000; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 15px rgba(241, 216, 158, 0.4);"">
                    👉 Mở Khung Chat & Tiếp Tục Trò Chuyện
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style=""background: #0d0f17; padding: 14px 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: #6b7280;"">
            Bạn nhận được email này vì đã đăng ký nhận thông báo phản hồi trên Portfolio của Vũ Đức Nam.
        </div>
    </div>
</body>
</html>";

                await SendEmailRawAsync(host, port, user, password, visitorEmail, subject, bodyHtml);
                Console.WriteLine($"[EmailService] Đã gửi email phản hồi tới Khách: {visitorEmail}");
                _logger.LogInformation("[EmailService] Đã gửi email phản hồi tới Khách: {Email}", visitorEmail);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailService] Lỗi gửi email tới Khách ({visitorEmail}): {ex.GetType().Name}: {ex.Message} -> {ex.InnerException?.Message}");
                _logger.LogError(ex, "[EmailService] Lỗi khi gửi email thông báo tới Khách: {Email}", visitorEmail);
            }
        }

        public async Task<(bool Success, string Message)> TestSendEmailAsync()
        {
            var (host, port, user, password, adminEmail) = GetSmtpSettings();
            var webhookUrl = GetConfigValue("GMAIL_WEBHOOK_URL", "EmailSettings:WebhookUrl", "");
            var resendApiKey = GetConfigValue("RESEND_API_KEY", "EmailSettings:ResendApiKey", "");

            try
            {
                if (!string.IsNullOrWhiteSpace(webhookUrl))
                {
                    await SendEmailRawAsync(host, port, user, password, adminEmail, "Test Email Webhook", "<h3>Test gửi qua Google Apps Script Webhook thành công!</h3>");
                    return (true, $"Thành công! Đã gửi email kiểm tra qua Google Apps Script Webhook tới {adminEmail}.");
                }

                if (!string.IsNullOrWhiteSpace(resendApiKey))
                {
                    await SendEmailRawAsync(host, port, user, password, adminEmail, "Test Email Resend", "<h3>Test gửi qua Resend API thành công!</h3>");
                    return (true, $"Thành công! Đã gửi email kiểm tra qua Resend API tới {adminEmail}.");
                }

                if (string.IsNullOrWhiteSpace(password))
                {
                    return (false, "Chưa cấu hình biến môi trường nào (GMAIL_WEBHOOK_URL, RESEND_API_KEY, hoặc SMTP_PASSWORD).");
                }

                await SendEmailRawAsync(host, port, user, password, adminEmail, "Test Email SMTP", "<h3>Test gửi qua SMTP thành công!</h3>");
                return (true, $"Thành công! Đã gửi email kiểm tra qua SMTP tới {adminEmail}.");
            }
            catch (Exception ex)
            {
                var fullErr = $"{ex.GetType().Name}: {ex.Message} | Inner: {ex.InnerException?.Message}";
                Console.WriteLine($"[EmailService.Test] LỖI: {fullErr}");
                return (false, fullErr);
            }
        }

        private async Task SendEmailRawAsync(string host, int port, string user, string password, string toEmail, string subject, string bodyHtml)
        {
            var webhookUrl = GetConfigValue("GMAIL_WEBHOOK_URL", "EmailSettings:WebhookUrl", "");
            var resendApiKey = GetConfigValue("RESEND_API_KEY", "EmailSettings:ResendApiKey", "");
            var brevoApiKey = GetConfigValue("BREVO_API_KEY", "EmailSettings:BrevoApiKey", "");

            var httpClient = _httpClientFactory.CreateClient();

            // 1. Google Apps Script Webhook (HTTPS 443 - Miễn phí, chạy tốt 100% trên Render, gửi từ chính Gmail)
            if (!string.IsNullOrWhiteSpace(webhookUrl))
            {
                var payload = new { to = toEmail, subject = subject, html = bodyHtml };
                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var res = await httpClient.PostAsync(webhookUrl, content);
                res.EnsureSuccessStatusCode();
                Console.WriteLine($"[EmailService] Gửi email qua Google Apps Script Webhook thành công tới {toEmail}!");
                return;
            }

            // 2. Resend HTTP API (HTTPS 443)
            if (!string.IsNullOrWhiteSpace(resendApiKey))
            {
                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", resendApiKey);
                var fromEmail = GetConfigValue("RESEND_FROM", "EmailSettings:ResendFrom", "onboarding@resend.dev");
                var payload = new
                {
                    from = fromEmail,
                    to = new[] { toEmail },
                    subject = subject,
                    html = bodyHtml
                };
                request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var res = await httpClient.SendAsync(request);
                res.EnsureSuccessStatusCode();
                Console.WriteLine($"[EmailService] Gửi email qua Resend API thành công tới {toEmail}!");
                return;
            }

            // 3. Brevo HTTP API (HTTPS 443)
            if (!string.IsNullOrWhiteSpace(brevoApiKey))
            {
                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
                request.Headers.Add("api-key", brevoApiKey);
                var payload = new
                {
                    sender = new { name = "Vũ Đức Nam", email = user },
                    to = new[] { new { email = toEmail } },
                    subject = subject,
                    htmlContent = bodyHtml
                };
                request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var res = await httpClient.SendAsync(request);
                res.EnsureSuccessStatusCode();
                Console.WriteLine($"[EmailService] Gửi email qua Brevo API thành công tới {toEmail}!");
                return;
            }

            // 4. SMTP truyền thống (Dùng khi chạy Localhost hoặc máy chủ không chặn cổng 587)
            using var client = new SmtpClient(host, port)
            {
                EnableSsl = true,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(user, password),
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 12000
            };

            using var message = new MailMessage
            {
                From = new MailAddress(user, "Vũ Đức Nam (ducnamdev.site)"),
                Subject = subject,
                Body = bodyHtml,
                IsBodyHtml = true
            };

            message.To.Add(toEmail);
            await client.SendMailAsync(message);
            Console.WriteLine($"[EmailService] Gửi email qua SMTP thành công tới {toEmail}!");
        }
    }
}
