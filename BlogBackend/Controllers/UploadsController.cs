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

        private static readonly HashSet<string> BlockedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".exe", ".bat", ".cmd", ".sh", ".ps1", ".vbs", ".msi", ".dll", ".com", ".scr", ".jar", ".reg", ".pif", ".app", ".dmg", ".bin", ".iso"
        };

        private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"
        };

        private static readonly HashSet<string> MediaExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".mp4", ".mov", ".avi", ".webm", ".mkv", ".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"
        };

        [HttpPost]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Không tìm thấy file hợp lệ.");

            if (file.Length > 30 * 1024 * 1024)
                return BadRequest("Dung lượng file tối đa là 30MB.");

            var extension = Path.GetExtension(file.FileName).ToLower();
            if (string.IsNullOrEmpty(extension) || BlockedExtensions.Contains(extension))
            {
                return BadRequest("Định dạng file không được hỗ trợ vì lý do bảo mật.");
            }

            // Nếu ĐÃ cấu hình CLOUDINARY_URL trên Render, upload tự động lên đám mây vĩnh viễn!
            if (_cloudinary != null)
            {
                using var stream = file.OpenReadStream();
                
                if (ImageExtensions.Contains(extension))
                {
                    var uploadParams = new ImageUploadParams()
                    {
                        File = new FileDescription(file.FileName, stream),
                        UseFilename = true,
                        UniqueFilename = true,
                        Overwrite = false
                    };
                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                    return Ok(new 
                    { 
                        url = uploadResult.SecureUrl.ToString(),
                        fileName = file.FileName,
                        fileSize = file.Length,
                        fileType = extension.TrimStart('.')
                    });
                }
                else if (MediaExtensions.Contains(extension))
                {
                    var uploadParams = new VideoUploadParams()
                    {
                        File = new FileDescription(file.FileName, stream),
                        UseFilename = true,
                        UniqueFilename = true,
                        Overwrite = false
                    };
                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                    return Ok(new 
                    { 
                        url = uploadResult.SecureUrl.ToString(),
                        fileName = file.FileName,
                        fileSize = file.Length,
                        fileType = extension.TrimStart('.')
                    });
                }
                else
                {
                    // Các tệp tài liệu (PDF, Word, Excel, ZIP, TXT, ...) lưu dưới dạng Raw
                    var uploadParams = new RawUploadParams()
                    {
                        File = new FileDescription(file.FileName, stream),
                        UseFilename = true,
                        UniqueFilename = true,
                        Overwrite = false
                    };
                    var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                    return Ok(new 
                    { 
                        url = uploadResult.SecureUrl.ToString(),
                        fileName = file.FileName,
                        fileSize = file.Length,
                        fileType = extension.TrimStart('.')
                    });
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

            return Ok(new 
            { 
                url = $"/uploads/{fileName}",
                fileName = file.FileName,
                fileSize = file.Length,
                fileType = extension.TrimStart('.')
            });
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
