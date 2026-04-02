using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace BlogBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConfigController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly string _configFilePath;

        public ConfigController(IWebHostEnvironment env)
        {
            _env = env;
            // Trỏ vào wwwroot/data/portfolio_data.json
            _configFilePath = Path.Combine(_env.WebRootPath, "data", "portfolio_data.json");
        }

        [HttpGet]
        public async Task<IActionResult> GetConfig()
        {
            if (!System.IO.File.Exists(_configFilePath))
            {
                // Nếu không có, tạo một JSON trắng cơ bản để không lỗi Client
                var initialConfig = new { hero = new { }, about = new { }, projects = new object[]{}, experiences = new object[]{} };
                return Ok(initialConfig);
            }

            var jsonContent = await System.IO.File.ReadAllTextAsync(_configFilePath);
            // Parse thành JsonDocument thay vì trả về String thường
            return Content(jsonContent, "application/json");
        }

        [HttpPost]
        public async Task<IActionResult> SaveConfig([FromBody] JsonElement configData)
        {
            if (configData.ValueKind == JsonValueKind.Undefined || configData.ValueKind == JsonValueKind.Null)
            {
                return BadRequest("Data is empty");
            }

            var uploadsFolder = Path.GetDirectoryName(_configFilePath);
            if (uploadsFolder != null && !Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            // Serialize and Save
            var options = new JsonSerializerOptions { WriteIndented = true };
            var jsonString = JsonSerializer.Serialize(configData, options);
            await System.IO.File.WriteAllTextAsync(_configFilePath, jsonString);

            return Ok(new { message = "Portfolio configuration saved successfully!" });
        }
    }
}
