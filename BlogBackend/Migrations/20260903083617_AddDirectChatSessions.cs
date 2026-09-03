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
            migrationBuilder.CreateTable(
                name: "DirectChatSessions",
                columns: table => new
                {
                    SessionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    VisitorName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    VisitorEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    WantsEmailNotification = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    LastActivityAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectChatSessions", x => x.SessionId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DirectChatSessions");
        }
    }
}
