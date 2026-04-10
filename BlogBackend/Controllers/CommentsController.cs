using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BlogBackend.Data;
using BlogBackend.Models;

namespace BlogBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommentsController : ControllerBase
    {
        private readonly BlogDbContext _context;

        public CommentsController(BlogDbContext context)
        {
            _context = context;
        }

        // GET: api/comments/bypost/5
        [HttpGet("bypost/{postId}")]
        public async Task<ActionResult<IEnumerable<Comment>>> GetCommentsByPost(int postId)
        {
            return await _context.Comments
                .Where(c => c.MaBaiViet == postId)
                .OrderByDescending(c => c.NgayBinhLuan)
                .ToListAsync();
        }

        // POST: api/comments
        [HttpPost]
        public async Task<ActionResult<Comment>> PostComment(Comment comment)
        {
            // Validate basic fields
            if (string.IsNullOrWhiteSpace(comment.NoiDung))
            {
                return BadRequest(new { message = "Nội dung bình luận không được để trống." });
            }

            if (string.IsNullOrWhiteSpace(comment.TenNguoiDung))
            {
                comment.TenNguoiDung = "Ẩn danh";
            }

            comment.NgayBinhLuan = DateTime.UtcNow;
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCommentsByPost), new { postId = comment.MaBaiViet }, comment);
        }
    }
}
