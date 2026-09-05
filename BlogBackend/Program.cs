using BlogBackend.Data;
using BlogBackend.Hubs;
using BlogBackend.Services;
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
builder.Services.AddSignalR();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IEmailService, EmailService>();
builder.Services.AddHttpClient("Gemini", client =>
{
    // Streaming requests control their own timeout so headers can arrive immediately.
    client.Timeout = Timeout.InfiniteTimeSpan;
});
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

static bool IsAllowedFrontendOrigin(string origin)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;

    var host = uri.Host;
    if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || host.Equals("ducnamdev.site", StringComparison.OrdinalIgnoreCase)
        || host.EndsWith(".ducnamdev.site", StringComparison.OrdinalIgnoreCase)
        || host.EndsWith(".devtunnels.ms", StringComparison.OrdinalIgnoreCase)
        || host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
    {
        return true;
    }

    if (!System.Net.IPAddress.TryParse(host, out var address)) return false;
    if (System.Net.IPAddress.IsLoopback(address)) return true;
    if (address.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork) return false;

    var bytes = address.GetAddressBytes();
    return bytes[0] == 10
        || (bytes[0] == 172 && bytes[1] is >= 16 and <= 31)
        || (bytes[0] == 192 && bytes[1] == 168);
}

// Cấu hình CORS bảo mật: Chỉ cho phép các tên miền được chỉ định
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.SetIsOriginAllowed(IsAllowedFrontendOrigin)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials()
                  .WithExposedHeaders("ETag")
                  .SetPreflightMaxAge(TimeSpan.FromHours(24));
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
app.MapHub<DirectChatHub>("/hub/chat");

// Health check endpoint cho UptimeRobot (để không bị sleep trên Render)
app.MapMethods("/", new[] { "GET", "HEAD" }, () => Results.Ok("Backend is awake!"));
app.MapMethods("/api/health", new[] { "GET", "HEAD" }, () => Results.Ok("Backend is alive and kicking!"));

// Tự động đồng bộ Schema và Migration khi khởi động
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BlogDbContext>();

    // 1. Luôn bảo đảm các bảng và cột mới tồn tại trước (không phụ thuộc migration)
    try
    {
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""DirectChatSessions"" (
                ""SessionId"" VARCHAR(100) PRIMARY KEY,
                ""VisitorName"" VARCHAR(100),
                ""VisitorEmail"" VARCHAR(200),
                ""WantsEmailNotification"" BOOLEAN NOT NULL DEFAULT FALSE,
                ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                ""LastActivityAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS ""DirectChatSettings"" (
                ""Key"" VARCHAR(100) PRIMARY KEY,
                ""Value"" TEXT NOT NULL,
                ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );

            ALTER TABLE ""DirectChatMessages"" ADD COLUMN IF NOT EXISTS ""ReplyToId"" INTEGER;
            ALTER TABLE ""DirectChatMessages"" ADD COLUMN IF NOT EXISTS ""ReplyToSender"" VARCHAR(100);
            ALTER TABLE ""DirectChatMessages"" ADD COLUMN IF NOT EXISTS ""ReplyToContent"" TEXT;
            ALTER TABLE ""DirectChatMessages"" ADD COLUMN IF NOT EXISTS ""ImageUrl"" TEXT;
            ALTER TABLE ""DirectChatMessages"" ADD COLUMN IF NOT EXISTS ""IsRecalled"" BOOLEAN NOT NULL DEFAULT FALSE;
        ");
        Console.WriteLine("[DB Startup] Đã đồng bộ schema DirectChat thành công.");
    }
    catch (Exception rawEx)
    {
        Console.WriteLine($"[Cảnh báo DB] Không thể chạy ExecuteSqlRaw DirectChat: {rawEx.Message}");
    }

    // 2. Chạy EF Core Migration độc lập
    try
    {
        db.Database.Migrate();
        Console.WriteLine("[DB Startup] Đã áp dụng EF Core Migrations thành công.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Cảnh báo DB] Bỏ qua Migration do lỗi hoặc chưa kết nối PostgreSQL: {ex.Message}");
    }
}

app.Run();
