using BlogBackend.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Cấu hình Database
builder.Services.AddDbContext<BlogDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Cấu hình CORS cho phép React Vite và VS Code Forwarding truy cập API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.AllowAnyOrigin()
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

// Tự động chạy Migration khi khởi động (Hữu ích khi deploy lên Cloud)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BlogDbContext>();
    db.Database.Migrate();
}

app.Run();
