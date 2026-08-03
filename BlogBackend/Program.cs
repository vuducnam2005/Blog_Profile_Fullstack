using BlogBackend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.Features;

// Bật cờ tương thích cho PostgreSQL nếu CSDL đã lỡ lưu dạng Local Time trước đó, hoặc để không báo lỗi
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Fix lỗi sập Render (inotify instances limit) bằng cách tắt giám sát thay đổi file cấu hình
Environment.SetEnvironmentVariable("DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE", "false");

var builder = WebApplication.CreateBuilder(args);

// Cấu hình Kestrel để tăng giới hạn kích thước Request lên 100MB
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 104857600; // 100 MB = 100 * 1024 * 1024 bytes
});

// Cấu hình FormOptions để tăng giới hạn kích thước Multipart Body lên 100MB
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104857600; // 100 MB
});

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var envDbUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var connectionString = !string.IsNullOrEmpty(envDbUrl) ? envDbUrl : builder.Configuration.GetConnectionString("DefaultConnection") ?? "";

// Xử lý tự động chuyển đổi định dạng URI của Render sang chuẩn của Npgsql (sửa lỗi Port = -1)
if (connectionString.StartsWith("postgres"))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    var port = uri.Port > 0 ? uri.Port : 5432;
    connectionString = $"Host={uri.Host};Port={port};Database={uri.LocalPath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};Ssl Mode=Require;Trust Server Certificate=true;";
}

// Cấu hình Database
builder.Services.AddDbContext<BlogDbContext>(options =>
    options.UseNpgsql(connectionString));

// Cấu hình CORS bảo mật: Chỉ cho phép các tên miền được chỉ định
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.SetIsOriginAllowed(origin => 
                    origin.Contains("localhost") || 
                    origin.Contains("192.168.") || // Cho phép mạng LAN khi test Mobile
                    origin.Contains("devtunnels.ms") || // Cho phép VS Code Tunnels
                    origin.Contains("ducnamdev.site") || // CHÍNH THỨC: Cho phép tên miền của bạn
                    origin.Contains("vercel.app") // Cho phép link dự phòng của Vercel
                  )
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// app.UseHttpsRedirection(); // Tạm tắt để mobile truy cập qua LAN HTTP không bị redirect lỗi

app.UseStaticFiles(); // Hỗ trợ trả về tệp ảnh từ wwwroot

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

// Health check endpoint cho UptimeRobot (để không bị sleep trên Render)
app.MapMethods("/", new[] { "GET", "HEAD" }, () => Results.Ok("Backend is awake!"));
app.MapMethods("/api/health", new[] { "GET", "HEAD" }, () => Results.Ok("Backend is alive and kicking!"));

// Tự động chạy Migration khi khởi động (nếu có kết nối CSDL PostgreSQL)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<BlogDbContext>();
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Cảnh báo DB] Bỏ qua Migration do chưa kết nối PostgreSQL: {ex.Message}");
    }
}

app.Run();
