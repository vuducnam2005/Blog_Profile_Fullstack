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
        public async Task<ActionResult<IEnumerable<Comment>>> GetCommentsByPost(int postId, CancellationToken cancellationToken)
        {
            return await _context.Comments
                .AsNoTracking()
                .Where(c => c.MaBaiViet == postId)
                .OrderBy(c => c.NgayBinhLuan) // Cũ nhất trước để dễ sắp xếp cây reply ở frontend
                .ToListAsync(cancellationToken);
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

            // Nếu là reply (có ParentId), kiểm tra comment cha tồn tại không
            if (comment.ParentId.HasValue)
            {
                var parent = await _context.Comments.FindAsync(comment.ParentId.Value);
                if (parent == null)
                    return BadRequest(new { message = "Bình luận gốc không tồn tại." });
                // Không cho phép reply của reply (chỉ 1 cấp)
                if (parent.ParentId.HasValue)
                    comment.ParentId = parent.ParentId;
            }

            comment.NgayBinhLuan = DateTime.UtcNow;
            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCommentsByPost), new { postId = comment.MaBaiViet }, comment);
        }
    }
}
