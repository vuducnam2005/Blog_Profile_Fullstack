using System.ComponentModel.DataAnnotations;

namespace BlogBackend.Models
{
    public class BlogPost
    {
        [Key]
        public int MaBaiViet { get; set; }
        
        [Required]
        public string TieuDe { get; set; }
        
        [Required]
        public string NoiDung { get; set; }

        public string HinhAnhBia { get; set; } = string.Empty;

        public string TomTat { get; set; } = string.Empty;

        public string TheLoai { get; set; } = string.Empty;
        
        public DateTime NgayDang { get; set; } = DateTime.UtcNow;

        public int LuotTim { get; set; } = 0;
    }
}
