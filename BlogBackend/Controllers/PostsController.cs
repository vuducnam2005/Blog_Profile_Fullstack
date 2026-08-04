using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BlogBackend.Data;
using BlogBackend.Infrastructure;
using BlogBackend.Models;
using System.Text.Json;

namespace BlogBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PostsController : ControllerBase
    {
        private readonly BlogDbContext _context;

        public PostsController(BlogDbContext context)
        {
            _context = context;
        }

        private bool IsAuthorized()
        {
            var key = Request.Headers["X-Admin-Key"].FirstOrDefault();
            return key == "DucNamAdmin2005SecretKey";
        }

        // GET: api/Posts
        [HttpGet]
        public async Task<IActionResult> GetBlogPosts(CancellationToken cancellationToken)
        {
            var posts = await _context.BlogPosts
                .AsNoTracking()
                .OrderByDescending(p => p.NgayDang)
                .Select(p => new
                {
                    p.MaBaiViet,
                    p.TieuDe,
                    p.NoiDung,
                    p.HinhAnhBia,
                    p.TomTat,
                    p.TheLoai,
                    p.NgayDang,
                    p.LuotTim,
                    CommentCount = _context.Comments.Count(c => c.MaBaiViet == p.MaBaiViet)
                })
                .ToListAsync(cancellationToken);

            var json = JsonSerializer.Serialize(posts, new JsonSerializerOptions(JsonSerializerDefaults.Web));
            var entityTag = EntityTag.Create(json);
            Response.Headers.ETag = entityTag;
            Response.Headers.CacheControl = "public, max-age=0, must-revalidate";

            if (EntityTag.Matches(Request, entityTag))
            {
                return StatusCode(StatusCodes.Status304NotModified);
            }

            return Content(json, "application/json");
        }

        // GET: api/Posts/5
        [HttpGet("{id}")]
        public async Task<ActionResult<BlogPost>> GetBlogPost(int id, CancellationToken cancellationToken)
        {
            var blogPost = await _context.BlogPosts
                .AsNoTracking()
                .FirstOrDefaultAsync(post => post.MaBaiViet == id, cancellationToken);

            if (blogPost == null)
            {
                return NotFound();
            }

            return blogPost;
        }

        // PUT: api/Posts/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutBlogPost(int id, BlogPost blogPost)
        {
            if (!IsAuthorized()) return Unauthorized(new { message = "Bạn không có quyền thực hiện chức năng này." });

            if (id != blogPost.MaBaiViet)
            {
                return BadRequest();
            }

            _context.Entry(blogPost).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!BlogPostExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Posts
        [HttpPost]
        public async Task<ActionResult<BlogPost>> PostBlogPost(BlogPost blogPost)
        {
            if (!IsAuthorized()) return Unauthorized(new { message = "Bạn không có quyền thực hiện chức năng này." });

            if (blogPost.NgayDang == default) {
                blogPost.NgayDang = DateTime.UtcNow;
            }
            _context.BlogPosts.Add(blogPost);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetBlogPost", new { id = blogPost.MaBaiViet }, blogPost);
        }

        // DELETE: api/Posts/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBlogPost(int id)
        {
            if (!IsAuthorized()) return Unauthorized(new { message = "Bạn không có quyền thực hiện chức năng này." });

            var blogPost = await _context.BlogPosts.FindAsync(id);
            if (blogPost == null)
            {
                return NotFound();
            }

            _context.BlogPosts.Remove(blogPost);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // PATCH: api/Posts/5/like
        [HttpPatch("{id}/like")]
        public async Task<ActionResult<object>> LikePost(int id)
        {
            var blogPost = await _context.BlogPosts.FindAsync(id);
            if (blogPost == null)
            {
                return NotFound();
            }

            blogPost.LuotTim += 1;
            await _context.SaveChangesAsync();

            return Ok(new { luotTim = blogPost.LuotTim });
        }

        private bool BlogPostExists(int id)
        {
            return _context.BlogPosts.Any(e => e.MaBaiViet == id);
        }
    }
}
