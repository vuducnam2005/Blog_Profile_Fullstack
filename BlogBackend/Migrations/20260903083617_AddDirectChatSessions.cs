using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlogBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddDirectChatSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""DirectChatSessions"" (
                    ""SessionId"" character varying(100) NOT NULL PRIMARY KEY,
                    ""VisitorName"" character varying(100),
                    ""VisitorEmail"" character varying(200),
                    ""WantsEmailNotification"" boolean NOT NULL DEFAULT FALSE,
                    ""CreatedAt"" timestamp without time zone NOT NULL DEFAULT NOW(),
                    ""LastActivityAt"" timestamp without time zone NOT NULL DEFAULT NOW()
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DirectChatSessions");
        }
    }
}
