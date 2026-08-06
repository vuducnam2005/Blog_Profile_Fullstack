using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BlogBackend.Data;
using System.Text;
using System.Text.Json;

namespace BlogBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly BlogDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public ChatController(BlogDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
            _httpClient = new HttpClient();
        }

        [HttpPost]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(new { error = "Tin nhắn không được để trống." });
            }

            // Lấy API Key từ biến môi trường hoặc appsettings.json
            var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY") 
                         ?? _configuration["GeminiSettings:ApiKey"];

            if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_GEMINI_API_KEY")
            {
                // Trả về câu trả lời mặc định nếu chưa cấu hình Gemini API Key
                return Ok(new { 
                    reply = "Xin chào! Trợ lý AI đang chờ cấu hình Gemini API Key từ phía Server. Bạn có thể liên hệ trực tiếp với Vũ Đức Nam qua Email: vuducnam12345678@gmail.com hoặc SĐT: 0362 183 511 nhé!" 
                });
            }

            try
            {
                // Lấy thông tin hồ sơ mới nhất từ Database
                var config = await _context.PortfolioConfigs.FirstOrDefaultAsync();
                string profileJson = config?.JsonData ?? "";

                // Xây dựng System Instruction (Dữ liệu tri thức chuẩn xác 100% từ CV của Vũ Đức Nam)
                string systemInstructionText = $@"
Bạn là Trợ lý AI thông minh đại diện chính thức cho Vũ Đức Nam trên website Blog Profile cá nhân.
Nhiệm vụ của bạn là trả lời mọi câu hỏi của người xem (nhà tuyển dụng, đối tác, bạn bè) một cách tự nhiên, chuẩn xác 100% và lịch sự dựa trên dữ liệu CV cá nhân dưới đây.

HỒ SƠ CÁ NHÂN VŨ ĐỨC NAM:
1. THÔNG TIN CƠ BẢN:
   - Họ và tên: Vũ Đức Nam
   - Ngày sinh: 23/06/2005 (Sinh ngày 23 tháng 6 năm 2005)
   - Vị trí định hướng: Backend Developer (Intern / Fresher)
   - Số điện thoại / Zalo: 0362 183 511
   - Email: vuducnam12345678@gmail.com
   - Địa chỉ hiện tại: 43 Thanh Lương, Bình Minh, Hà Nội
   - Website cá nhân: ducnamdev.site
   - GitHub: https://github.com/vuducnam2005
   - Facebook: https://www.facebook.com/ucnam.382441 | Instagram: https://www.instagram.com/duc_nam205/

2. TRÌNH ĐỘ HỌC VẤN & THÀNH TÍCH:
   - Trường học: Đại học Đại Nam (Chuyên ngành Công nghệ Thông tin, Thời gian: 2023 - 2027)
   - GPA tích lũy: 3.2 / 4.0 (Đạt loại Giỏi)
   - Môn học tiêu biểu: Lập trình C#, C++, Python, JavaScript, Cơ sở dữ liệu...
   - Thành tích tiêu biểu:
     + Đạt giải Nhì cuộc thi Tài năng Lập trình cơ bản của Khoa CNTT
     + Sở hữu chứng chỉ 'Gemini University Student'
     + Đạt học bổng khuyến khích học tập trong nhiều kỳ liên tiếp
     + Đạt danh hiệu sinh viên loại Giỏi

3. KINH NGHIỆM LÀM VIỆC:
   - 03/2024 - 06/2025: Tư vấn viên (Giao tiếp tốt, xử lý tình huống linh hoạt)
   - 09/2024 - 11/2025: Trợ giảng CNTT tại trường Đại học (Hỗ trợ giảng viên đánh giá sinh viên, rèn luyện kỹ năng truyền đạt và chuyên môn)

4. KỸ NĂNG & CÔNG NGHỆ CHUYÊN MÔN:
   - Ngôn ngữ lập trình: Python, C#, JavaScript, TypeScript, PHP, Node.js, C++
   - Framework & Công nghệ: .NET, Vue 3, ReactJS, Node.js, Flutter, REST API, HTML/CSS
   - Cơ sở dữ liệu & Hệ thống: SQL Server, PostgreSQL, RabbitMQ (Event-driven Microservices), Docker, Git/GitHub, SQLite
   - Kỹ năng mềm: Tin học văn phòng (Word, Excel, PowerPoint), Làm việc nhóm, Tư duy logic hệ thống, Tiếng Anh đọc hiểu tài liệu chuyên ngành tốt

5. DỰ ÁN ĐÃ THỰC HIỆN:
   - Dự án 1: Hệ thống Quản lý phòng khám đa khoa Medicare (FullStack Developer)
     + Công nghệ: C#, Vue 3, TypeScript, RabbitMQ, PostgreSQL, Docker (Kiến trúc Microservices)
     + Link live demo: https://medicarednu.shop/
     + Đặc điểm: Phân quyền 4 vai trò, tích hợp AI Chatbot (Gemini) tư vấn sức khỏe & đặt lịch, quản lý bệnh án điện tử (EMR), quản lý kho dược duyệt chéo (Maker-Checker), tự động tính viện phí & thanh toán.
   - Dự án 2: Dự án web Quản lý và bán khóa học online (FullStack Developer)
     + Công nghệ: PHP, HTML/CSS, Node.js, SQL Server
     + Link GitHub: https://github.com/vuducnam2005/QLKH_online.git
     + Đặc điểm: Phân quyền Admin - Giảng viên - Học viên, thanh toán online, thống kê doanh thu, diễn đàn bình luận.
   - Dự án 3: Ứng dụng Quản lý Chi tiêu AI (One More Coin) - Flutter, Dart, SQLite, AI phân tích xu hướng chi tiêu.
   - Dự án 4: Nền tảng Xác thực Chữ ký số An toàn - Python Flask, RSA-2048, SHA-256.
   - Dự án 5: Hệ thống Voice Chat Âm thanh Bảo mật E2EE - Python, DES-CBC, RSA.

QUY TẮC PHẢN HỒI QUAN TRỌNG:
1. Xưng 'Mình' (hoặc 'Trợ lý của Nam') và gọi người hỏi là 'bạn'. Trả lời bằng tiếng Việt thân thiện, rõ ràng, ngắn gọn và có icon sinh động.
2. Nam sinh ngày 23/06/2005. NĂM NAY LÀ NĂM 2026 -> Nam hiện tại 21 tuổi (hoặc 20 tuổi nếu tính đến trước ngày 23/06). Tuyệt đối KHÔNG ĐƯỢC tính nhầm Nam 19 tuổi (đó là năm 2024 cũ).
3. Nếu người dùng hỏi các câu như 'Nam sinh năm bao nhiêu', 'sinh nhật Nam', 'Nam bao nhiêu tuổi': Trả lời chính xác Nam sinh ngày 23/06/2005 (năm nay 21 tuổi).
4. Nếu người dùng hỏi câu hỏi ngoài lề không liên quan đến Nam hay CNTT/Lập trình, hãy trả lời ngắn gọn và lịch sự hướng họ quay lại tìm hiểu kỹ năng, dự án của Nam.

Dữ liệu bổ sung từ hệ thống (JSON):
{profileJson}
";

                // Xây dựng request payload cho Gemini API
                var payload = new
                {
                    system_instruction = new
                    {
                        parts = new[] { new { text = systemInstructionText } }
                    },
                    contents = new[]
                    {
                        new
                        {
                            role = "user",
                            parts = new[] { new { text = request.Message } }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = 0.7,
                        maxOutputTokens = 800
                    }
                };

                string configModel = _configuration["GeminiSettings:Model"] ?? "gemini-2.5-flash";
                var candidateModels = new List<string> { configModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-lite" };
                // Loại bỏ các phần tử trùng lặp nhưng giữ nguyên thứ tự
                candidateModels = candidateModels.Distinct().ToList();

                string responseBody = string.Empty;
                bool isSuccess = false;
                string lastError = string.Empty;

                foreach (var modelName in candidateModels)
                {
                    string url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}";
                    var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                    var response = await _httpClient.PostAsync(url, jsonContent);

                    if (response.IsSuccessStatusCode)
                    {
                        responseBody = await response.Content.ReadAsStringAsync();
                        isSuccess = true;
                        break;
                    }
                    else
                    {
                        lastError = await response.Content.ReadAsStringAsync();
                    }
                }

                if (isSuccess && !string.IsNullOrEmpty(responseBody))
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    var root = doc.RootElement;

                    string reply = root
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString() ?? "Không thể lấy phản hồi từ AI.";

                    return Ok(new { reply });
                }
                else
                {
                    return StatusCode(500, new { error = "Lỗi khi gửi yêu cầu tới Gemini API.", details = lastError });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi xử lý hệ thống.", details = ex.Message });
            }
        }
    }

    public class ChatRequest
    {
        public string Message { get; set; } = string.Empty;
        public List<ChatMessage>? History { get; set; }
    }

    public class ChatMessage
    {
        public string Role { get; set; } = "user";
        public string Content { get; set; } = string.Empty;
    }
}
