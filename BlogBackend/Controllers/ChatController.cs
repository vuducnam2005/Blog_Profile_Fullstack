using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using BlogBackend.Data;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BlogBackend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ChatController : ControllerBase
{
    private const int MaxHistoryMessages = 10;
    private readonly BlogDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ChatController> _logger;

    public ChatController(
        BlogDbContext context,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        ILogger<ChatController> logger)
    {
        _context = context;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        if (!IsValidRequest(request))
        {
            return BadRequest(new { error = "Tin nhắn không được để trống." });
        }

        var apiKey = GetApiKey();
        if (apiKey is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "Trợ lý AI chưa được cấu hình API key trên máy chủ."
            });
        }

        try
        {
            using var upstream = await SendGeminiRequestAsync(request, apiKey, stream: false, cancellationToken);
            var responseBody = await upstream.Content.ReadAsStringAsync(cancellationToken);

            if (!upstream.IsSuccessStatusCode)
            {
                LogUpstreamError(upstream, responseBody);
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    error = GetFriendlyUpstreamError(upstream.StatusCode)
                });
            }

            var reply = ExtractText(responseBody);
            if (string.IsNullOrWhiteSpace(reply))
            {
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    error = "AI không trả về nội dung. Vui lòng thử lại."
                });
            }

            return Ok(new { reply });
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout, new
            {
                error = "AI phản hồi quá lâu. Vui lòng thử lại."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini chat request failed");
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                error = "Không thể kết nối tới trợ lý AI. Vui lòng thử lại."
            });
        }
    }

    [HttpPost("stream")]
    public async Task Stream([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        if (!IsValidRequest(request))
        {
            await WriteStreamErrorAsync(StatusCodes.Status400BadRequest, "Tin nhắn không được để trống.", cancellationToken);
            return;
        }

        var apiKey = GetApiKey();
        if (apiKey is null)
        {
            await WriteStreamErrorAsync(
                StatusCodes.Status503ServiceUnavailable,
                "Trợ lý AI chưa được cấu hình API key trên máy chủ.",
                cancellationToken);
            return;
        }

        try
        {
            using var upstream = await SendGeminiRequestAsync(request, apiKey, stream: true, cancellationToken);
            if (!upstream.IsSuccessStatusCode)
            {
                var responseBody = await upstream.Content.ReadAsStringAsync(cancellationToken);
                LogUpstreamError(upstream, responseBody);
                await WriteStreamErrorAsync(
                    StatusCodes.Status502BadGateway,
                    GetFriendlyUpstreamError(upstream.StatusCode),
                    cancellationToken);
                return;
            }

            Response.StatusCode = StatusCodes.Status200OK;
            Response.ContentType = "text/plain; charset=utf-8";
            Response.Headers.CacheControl = "no-cache, no-transform";
            Response.Headers.Append("X-Accel-Buffering", "no");
            HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

            await using var responseStream = await upstream.Content.ReadAsStreamAsync(cancellationToken);
            using var reader = new StreamReader(responseStream, Encoding.UTF8);
            var wroteAnyText = false;

            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync(cancellationToken);
                if (line is null || !line.StartsWith("data:", StringComparison.Ordinal))
                {
                    continue;
                }

                var json = line[5..].Trim();
                if (json.Length == 0 || json == "[DONE]")
                {
                    continue;
                }

                var chunk = ExtractText(json);
                if (string.IsNullOrEmpty(chunk))
                {
                    continue;
                }

                wroteAnyText = true;
                await Response.WriteAsync(chunk, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }

            if (!wroteAnyText && !Response.HasStarted)
            {
                await WriteStreamErrorAsync(
                    StatusCodes.Status502BadGateway,
                    "AI không trả về nội dung. Vui lòng thử lại.",
                    cancellationToken);
            }
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            if (!Response.HasStarted)
            {
                await WriteStreamErrorAsync(
                    StatusCodes.Status504GatewayTimeout,
                    "AI phản hồi quá lâu. Vui lòng thử lại.",
                    CancellationToken.None);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini streaming request failed");
            if (!Response.HasStarted)
            {
                await WriteStreamErrorAsync(
                    StatusCodes.Status502BadGateway,
                    "Không thể kết nối tới trợ lý AI. Vui lòng thử lại.",
                    CancellationToken.None);
            }
        }
    }

    private async Task<HttpResponseMessage> SendGeminiRequestAsync(
        ChatRequest request,
        string apiKey,
        bool stream,
        CancellationToken cancellationToken)
    {
        var profileJson = await GetProfileJsonAsync(cancellationToken);
        var payload = BuildPayload(request, profileJson);
        var model = _configuration["GeminiSettings:Model"] ?? "gemini-2.5-flash";
        var action = stream ? "streamGenerateContent?alt=sse" : "generateContent";
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(model)}:{action}";

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(45));

        using var message = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        message.Headers.Add("x-goog-api-key", apiKey);
        message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(stream ? "text/event-stream" : "application/json"));

        var completionOption = stream
            ? HttpCompletionOption.ResponseHeadersRead
            : HttpCompletionOption.ResponseContentRead;

        var client = _httpClientFactory.CreateClient("Gemini");
        return await client.SendAsync(message, completionOption, timeout.Token);
    }

    private object BuildPayload(ChatRequest request, string profileJson)
    {
        var contents = new List<GeminiContent>();

        foreach (var historyMessage in request.History?.TakeLast(MaxHistoryMessages) ?? [])
        {
            if (string.IsNullOrWhiteSpace(historyMessage.Content))
            {
                continue;
            }

            var role = historyMessage.Role.Equals("model", StringComparison.OrdinalIgnoreCase)
                || historyMessage.Role.Equals("ai", StringComparison.OrdinalIgnoreCase)
                    ? "model"
                    : "user";

            if (contents.Count == 0 && role == "model")
            {
                continue;
            }

            if (contents.LastOrDefault()?.Role == role)
            {
                contents[^1].Parts[0].Text += $"\n{historyMessage.Content.Trim()}";
                continue;
            }

            contents.Add(new GeminiContent(role, historyMessage.Content.Trim()));
        }

        if (contents.LastOrDefault()?.Role == "user")
        {
            contents[^1].Parts[0].Text += $"\n{request.Message.Trim()}";
        }
        else
        {
            contents.Add(new GeminiContent("user", request.Message.Trim()));
        }

        return new
        {
            system_instruction = new
            {
                parts = new[] { new { text = BuildSystemInstruction(profileJson) } }
            },
            contents,
            generationConfig = new
            {
                temperature = 0.55,
                maxOutputTokens = 600,
                thinkingConfig = new
                {
                    thinkingBudget = 0
                }
            }
        };
    }

    private async Task<string> GetProfileJsonAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await _cache.GetOrCreateAsync("chat-profile-json", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
                return await _context.PortfolioConfigs
                    .AsNoTracking()
                    .Select(config => config.JsonData)
                    .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;
            }) ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not load portfolio data for chat; using built-in profile");
            return string.Empty;
        }
    }

    private string? GetApiKey()
    {
        var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? _configuration["GeminiSettings:ApiKey"];

        return string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY"
            ? null
            : apiKey.Trim();
    }

    private static bool IsValidRequest(ChatRequest? request) =>
        request is not null && !string.IsNullOrWhiteSpace(request.Message);

    private async Task WriteStreamErrorAsync(int statusCode, string message, CancellationToken cancellationToken)
    {
        Response.StatusCode = statusCode;
        Response.ContentType = "text/plain; charset=utf-8";
        Response.Headers.CacheControl = "no-store";
        await Response.WriteAsync(message, cancellationToken);
    }

    private void LogUpstreamError(HttpResponseMessage response, string responseBody)
    {
        _logger.LogWarning(
            "Gemini returned HTTP {StatusCode}: {ResponseBody}",
            (int)response.StatusCode,
            responseBody.Length > 1_000 ? responseBody[..1_000] : responseBody);
    }

    private static string GetFriendlyUpstreamError(System.Net.HttpStatusCode statusCode) => statusCode switch
    {
        System.Net.HttpStatusCode.BadRequest => "API key hoặc model Gemini chưa đúng. Vui lòng kiểm tra cấu hình máy chủ.",
        System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden =>
            "API key Gemini không hợp lệ hoặc chưa được cấp quyền.",
        System.Net.HttpStatusCode.TooManyRequests =>
            "Gemini đang giới hạn lượt gọi. Vui lòng thử lại sau ít phút.",
        _ => "Gemini đang tạm thời không phản hồi. Vui lòng thử lại."
    };

    private static string ExtractText(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            if (!document.RootElement.TryGetProperty("candidates", out var candidates)
                || candidates.ValueKind != JsonValueKind.Array
                || candidates.GetArrayLength() == 0
                || !candidates[0].TryGetProperty("content", out var content)
                || !content.TryGetProperty("parts", out var parts)
                || parts.ValueKind != JsonValueKind.Array)
            {
                return string.Empty;
            }

            var result = new StringBuilder();
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textElement))
                {
                    result.Append(textElement.GetString());
                }
            }

            return result.ToString();
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }

    private static string BuildSystemInstruction(string profileJson) => $$"""
        Bạn là Trợ lý AI đại diện chính thức cho Vũ Đức Nam trên website Blog Profile cá nhân.
        Hãy trả lời bằng tiếng Việt tự nhiên, chính xác, thân thiện, ngắn gọn và dựa trên hồ sơ sau.

        HỒ SƠ CÁ NHÂN VŨ ĐỨC NAM:
        - Ngày sinh: 23/06/2005. Năm 2026 Nam 21 tuổi kể từ ngày 23/06.
        - Định hướng: Backend Developer (Intern / Fresher).
        - Điện thoại/Zalo: 0362 183 511.
        - Email: vuducnam12345678@gmail.com.
        - Quê quán: Hợp Nhất, Đoan Hùng, Phú Thọ.
        - Địa chỉ hiện tại: 43 Thanh Lương, Bình Minh, Hà Nội.
        - Website: ducnamdev.site. GitHub: https://github.com/vuducnam2005.
        - Học CNTT tại Đại học Đại Nam giai đoạn 2023-2027, GPA 3.2/4.0, loại Giỏi.
        - Thành tích: giải Nhì cuộc thi Tài năng Lập trình cơ bản khoa CNTT, chứng chỉ Gemini University Student, học bổng khuyến khích học tập nhiều kỳ.
        - Kinh nghiệm: Tư vấn viên 03/2024-06/2025; Trợ giảng CNTT 09/2024-11/2025.
        - Kỹ năng: Python, C#, JavaScript, TypeScript, PHP, Node.js, C++, .NET, Vue 3, ReactJS, Flutter, REST API, SQL Server, PostgreSQL, RabbitMQ, Docker, Git và SQLite.
        - Dự án: Quản lý phòng khám Medicare (C#, Vue 3, RabbitMQ, PostgreSQL, Docker, Microservices); web quản lý và bán khóa học; ứng dụng quản lý chi tiêu AI One More Coin; chữ ký số RSA-2048; Voice Chat E2EE.

        QUY TẮC PHẢN HỒI:
        1. Xưng "Mình" hoặc "Trợ lý của Nam", gọi người hỏi là "bạn".
        2. Trả lời thẳng vào câu hỏi, thường trong 2-5 câu. Chỉ liệt kê dài khi người dùng yêu cầu chi tiết.
        3. Không bịa thông tin ngoài hồ sơ. Với câu hỏi ngoài Nam hoặc CNTT, lịch sự hướng người dùng quay lại chủ đề chính.
        4. Nếu người dùng công kích Nam, phản hồi dứt khoát nhưng không chửi tục, đe dọa hay miệt thị; yêu cầu trao đổi dựa trên dữ kiện và sự tôn trọng.
        5. Không lặp lại nguyên văn lời lẽ tục tĩu nếu không cần thiết.

        Dữ liệu bổ sung từ hệ thống (có thể trống):
        {{profileJson}}
        """;

    private sealed class GeminiContent
    {
        public GeminiContent(string role, string text)
        {
            Role = role;
            Parts = [new GeminiPart(text)];
        }

        [JsonPropertyName("role")]
        public string Role { get; }

        [JsonPropertyName("parts")]
        public GeminiPart[] Parts { get; }
    }

    private sealed class GeminiPart
    {
        public GeminiPart(string text)
        {
            Text = text;
        }

        [JsonPropertyName("text")]
        public string Text { get; set; }
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
