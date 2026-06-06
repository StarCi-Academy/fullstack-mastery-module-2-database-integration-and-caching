using Microsoft.EntityFrameworkCore;
using caching_redis.Models;

namespace caching_redis.Data
{
    /// <summary>
    /// EF Core database context for the caching-with-redis demo.
    /// Manages the <see cref="Cat"/> entity and its mapping to the Postgres <c>cats</c> table.
    /// Registered as a scoped service in <c>Program.cs</c> via <c>AddDbContext</c>.
    /// </summary>
    public class AppDbContext : DbContext
    {
        /// <summary>
        /// Passes EF Core options (connection string, driver) from DI to the base <see cref="DbContext"/>.
        /// Options are configured in <c>Program.cs</c> using <c>UseNpgsql</c>.
        /// </summary>
        /// <param name="options">EF Core options including the Npgsql connection string.</param>
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        /// <summary>
        /// Represents the <c>cats</c> table in Postgres.
        /// Seeded with up to 1000 rows via <c>POST /cats/seed</c> for the caching demo.
        /// </summary>
        public DbSet<Cat> Cats { get; set; }
    }
}
