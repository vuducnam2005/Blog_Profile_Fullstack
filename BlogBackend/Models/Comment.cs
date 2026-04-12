using System.ComponentModel.DataAnnotations;

namespace BlogBackend.Models
{
    public class Comment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int MaBaiViet { get; set; }

        [Required]
        public string TenNguoiDung { get; set; } = "Ẩn danh";

        [Required]
        public string NoiDung { get; set; } = string.Empty;

        public DateTime NgayBinhLuan { get; set; } = DateTime.UtcNow;

        // Trả lời bình luận: null = comment gốc, có giá trị = reply của comment đó
        public int? ParentId { get; set; }

        // Đánh dấu đây là bình luận của admin (Đức Nam)
        public bool IsAdmin { get; set; } = false;
    }
}
