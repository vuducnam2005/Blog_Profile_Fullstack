using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BlogBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddDirectChatMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DirectChatMessages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SessionId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SenderName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    IsFromAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    IsReadByAdmin = table.Column<bool>(type: "boolean", nullable: false),
                    IsReadByUser = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectChatMessages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DirectChatMessages_CreatedAt",
                table: "DirectChatMessages",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DirectChatMessages_SessionId_CreatedAt",
                table: "DirectChatMessages",
                columns: new[] { "SessionId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DirectChatMessages");
        }
    }
}
