using Microsoft.EntityFrameworkCore;
using BlogBackend.Models;

namespace BlogBackend.Data
{
    public class BlogDbContext : DbContext
    {
        public BlogDbContext(DbContextOptions<BlogDbContext> options) : base(options)
        {
        }

        public DbSet<BlogPost> BlogPosts { get; set; }
        public DbSet<PortfolioConfig> PortfolioConfigs { get; set; }
        public DbSet<Comment> Comments { get; set; }
        public DbSet<DirectChatMessage> DirectChatMessages { get; set; }
        public DbSet<DirectChatSession> DirectChatSessions { get; set; }
        public DbSet<DirectChatSetting> DirectChatSettings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Comment>()
                .HasIndex(comment => new { comment.MaBaiViet, comment.NgayBinhLuan });

            modelBuilder.Entity<DirectChatMessage>()
                .HasIndex(m => new { m.SessionId, m.CreatedAt });

            modelBuilder.Entity<DirectChatMessage>()
                .HasIndex(m => m.CreatedAt);

            // Seed dữ liệu mặc định cho PortfolioConfig (Id = 1, chỉ dùng 1 dòng duy nhất)
            modelBuilder.Entity<PortfolioConfig>().HasData(new PortfolioConfig
            {
                Id = 1,
                JsonData = "{}"
            });
        }
    }
}
