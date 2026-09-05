using System.Threading.Tasks;

namespace BlogBackend.Services
{
    public interface IEmailService
    {
        Task SendAdminNewMessageNotificationAsync(string visitorName, string content, string sessionId, string? imageUrl = null);
        Task SendVisitorReplyNotificationAsync(string visitorEmail, string visitorName, string replyContent, string sessionId, string? imageUrl = null);
        Task<(bool Success, string Message)> TestSendEmailAsync();
    }
}
