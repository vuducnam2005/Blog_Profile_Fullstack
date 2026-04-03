using System.ComponentModel.DataAnnotations;

namespace BlogBackend.Models
{
    public class PortfolioConfig
    {
        [Key]
        public int Id { get; set; }

        /// <summary>
        /// Lưu toàn bộ cấu hình portfolio dưới dạng JSON string.
        /// Bền vững trong PostgreSQL, không bị mất khi Render restart container.
        /// </summary>
        [Required]
        public string JsonData { get; set; } = "{}";
    }
}
