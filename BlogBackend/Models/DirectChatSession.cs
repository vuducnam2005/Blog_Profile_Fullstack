using System;
using System.ComponentModel.DataAnnotations;

namespace BlogBackend.Models
{
    public class DirectChatSession
    {
        [Key]
        [MaxLength(100)]
        public string SessionId { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? VisitorName { get; set; }

        [MaxLength(200)]
        public string? VisitorEmail { get; set; }

        public bool WantsEmailNotification { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    }
}
