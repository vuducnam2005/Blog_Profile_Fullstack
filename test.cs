using System;

class Program
{
    static void Main()
    {
        string connectionString = "postgresql://blogdbducnam_user:PWlyKyDOSWYS2lw6WQdATYYvok6Eou1n@dpg-d76vj7juibrs73a2bp60-a.singapore-postgres.render.com/blogdbducnam";
        
        if (connectionString.StartsWith("postgres"))
        {
            var uri = new Uri(connectionString);
            var userInfo = uri.UserInfo.Split(':');
            connectionString = $"Host={uri.Host};Port={(uri.IsDefaultPort ? 5432 : uri.Port)};Database={uri.LocalPath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};Ssl Mode=Require;Trust Server Certificate=true;";
            Console.WriteLine("Parsed:");
            Console.WriteLine(connectionString);
        }
        else
        {
            Console.WriteLine("Did not start with postgres");
        }
    }
}
