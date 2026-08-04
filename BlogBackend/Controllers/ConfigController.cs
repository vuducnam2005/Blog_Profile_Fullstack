using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BlogBackend.Data;
using BlogBackend.Infrastructure;
using BlogBackend.Models;
using System.Text.Json;

namespace BlogBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConfigController : ControllerBase
    {
        private readonly BlogDbContext _context;

        public ConfigController(BlogDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetConfig(CancellationToken cancellationToken)
        {
            // Lấy dòng cấu hình duy nhất (Id = 1) từ Database
            var config = await _context.PortfolioConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(cancellationToken);

            string jsonData;

            if (config == null || string.IsNullOrWhiteSpace(config.JsonData) || config.JsonData == "{}")
            {
                // Nếu chưa có dữ liệu, trả về JSON mặc định cơ bản
                var initialConfig = new { hero = new { }, about = new { }, projects = new object[] { }, experiences = new object[] { } };
                jsonData = JsonSerializer.Serialize(initialConfig);
            }
            else
            {
                jsonData = config.JsonData;
            }

            var entityTag = EntityTag.Create(jsonData);
            Response.Headers.ETag = entityTag;
            Response.Headers.CacheControl = "public, max-age=0, must-revalidate";

            if (EntityTag.Matches(Request, entityTag))
            {
                return StatusCode(StatusCodes.Status304NotModified);
            }

            return Content(jsonData, "application/json");
        }

        [HttpPost]
        public async Task<IActionResult> SaveConfig([FromBody] JsonElement configData, CancellationToken cancellationToken)
        {
            if (configData.ValueKind == JsonValueKind.Undefined || configData.ValueKind == JsonValueKind.Null)
            {
                return BadRequest("Data is empty");
            }

            // Serialize JSON đẹp
            var options = new JsonSerializerOptions { WriteIndented = true };
            var jsonString = JsonSerializer.Serialize(configData, options);

            // Lấy dòng config duy nhất, hoặc tạo mới nếu chưa có
            var config = await _context.PortfolioConfigs.FirstOrDefaultAsync(cancellationToken);

            if (config == null)
            {
                config = new PortfolioConfig { JsonData = jsonString };
                _context.PortfolioConfigs.Add(config);
            }
            else
            {
                config.JsonData = jsonString;
                _context.PortfolioConfigs.Update(config);
            }

            await _context.SaveChangesAsync(cancellationToken);

            Response.Headers.ETag = EntityTag.Create(jsonString);

            return Ok(new { message = "Portfolio configuration saved successfully!" });
        }
    }
}
