using System;
using System.ComponentModel.DataAnnotations;

namespace BlogBackend.Models
{
    public class DirectChatMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string SessionId { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string SenderName { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty;

        public bool IsFromAdmin { get; set; } = false;

        public bool IsReadByAdmin { get; set; } = false;

        public bool IsReadByUser { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Trả lời tin nhắn (Quote / Reply)
        public int? ReplyToId { get; set; }

        [MaxLength(100)]
        public string? ReplyToSender { get; set; }

        public string? ReplyToContent { get; set; }
    }
}
