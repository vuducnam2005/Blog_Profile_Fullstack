using System.Threading.Tasks;

namespace BlogBackend.Services
{
    public interface IEmailService
    {
        Task SendAdminNewMessageNotificationAsync(string visitorName, string content, string sessionId);
        Task SendVisitorReplyNotificationAsync(string visitorEmail, string visitorName, string replyContent, string sessionId);
        Task<(bool Success, string Message)> TestSendEmailAsync();
    }
}
