using System.Security.Cryptography;
using System.Text;

namespace BlogBackend.Infrastructure;

public static class EntityTag
{
    public static string Create(string content)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return $"\"{Convert.ToHexString(hash)}\"";
    }

    public static bool Matches(HttpRequest request, string entityTag)
    {
        var ifNoneMatch = request.Headers.IfNoneMatch.ToString();
        if (string.IsNullOrWhiteSpace(ifNoneMatch))
        {
            return false;
        }

        return ifNoneMatch
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(candidate =>
                candidate == "*" ||
                candidate == entityTag ||
                candidate == $"W/{entityTag}");
    }
}
