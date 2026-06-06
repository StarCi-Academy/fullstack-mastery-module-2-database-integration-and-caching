using Microsoft.EntityFrameworkCore;
using caching_redis.Models;

namespace caching_redis.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Cat> Cats { get; set; }
    }
}
