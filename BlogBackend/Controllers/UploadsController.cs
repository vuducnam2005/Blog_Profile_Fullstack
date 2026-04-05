using Microsoft.AspNetCore.Mvc;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace BlogBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UploadsController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly Cloudinary? _cloudinary;

        public UploadsController(IWebHostEnvironment env)
        {
            _env = env;
            
            var cloudinaryUrl = Environment.GetEnvironmentVariable("CLOUDINARY_URL");
            if (!string.IsNullOrEmpty(cloudinaryUrl))
            {
                _cloudinary = new Cloudinary(cloudinaryUrl);
                _cloudinary.Api.Secure = true;
            }
        }

        [HttpPost]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Không tìm thấy file hợp lệ.");

            var extension = Path.GetExtension(file.FileName).ToLower();
            if (extension != ".jpg" && extension != ".jpeg" && extension != ".png" && extension != ".gif" && extension != ".webp" && extension != ".pdf" &&
                extension != ".mp4" && extension != ".mov" && extension != ".avi" && extension != ".webm")
            {
                return BadRequest("Định dạng file không được hỗ trợ.");
            }

            // Nếu ĐÃ cấu hình CLOUDINARY_URL trên Render, upload tự động lên đám mây vĩnh viễn!
            if (_cloudinary != null)
            {
                using var stream = file.OpenReadStream();
                
                if (extension == ".pdf")
                {
                    var uploadParams = new RawUploadParams()
                    {
                        File = new FileDescription(file.FileName, stream)
                    };
                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                    return Ok(new { url = uploadResult.SecureUrl.ToString() });
                }
                else if (extension == ".mp4" || extension == ".mov" || extension == ".avi" || extension == ".webm")
                {
                    var uploadParams = new VideoUploadParams()
                    {
                        File = new FileDescription(file.FileName, stream),
                        UseFilename = true,
                        UniqueFilename = true,
                        Overwrite = false
                    };
                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                    return Ok(new { url = uploadResult.SecureUrl.ToString() });
                }
                else
                {
                    var uploadParams = new ImageUploadParams()
                    {
                        File = new FileDescription(file.FileName, stream),
                        UseFilename = true,
                        UniqueFilename = true,
                        Overwrite = false
                    };
                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                    return Ok(new { url = uploadResult.SecureUrl.ToString() });
                }
            }

            // Nếu CHƯA cấu hình (Chạy ở máy Local), fallback lưu vào ổ cứng tạm thời
            var fileName = $"{Guid.NewGuid()}{extension}";
            var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
            
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            return Ok(new { url = $"/uploads/{fileName}" });
        }

        [HttpGet("signature")]
        public IActionResult GetSignature()
        {
            if (_cloudinary == null)
            {
                return Ok(new { useLocal = true });
            }

            var timestamp = ((DateTimeOffset)DateTime.UtcNow).ToUnixTimeSeconds().ToString();
            var parameters = new SortedDictionary<string, object>
            {
                { "timestamp", timestamp }
            };

            var signature = _cloudinary.Api.SignParameters(parameters);
            
            return Ok(new 
            { 
                useLocal = false,
                signature = signature, 
                timestamp = timestamp, 
                cloudName = _cloudinary.Api.Account.Cloud, 
                apiKey = _cloudinary.Api.Account.ApiKey 
            });
        }
    }
}
