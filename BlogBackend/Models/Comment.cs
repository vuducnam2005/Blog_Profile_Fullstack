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
    }
}
