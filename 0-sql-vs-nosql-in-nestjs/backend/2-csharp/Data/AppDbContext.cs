using Microsoft.EntityFrameworkCore;
using sql_vs_nosql.Models;

namespace sql_vs_nosql.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<SqlComparisonItem> SqlComparisonItems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Map the createdAt property correctly for PostgreSQL timestamptz
            modelBuilder.Entity<SqlComparisonItem>()
                .Property(e => e.CreatedAt)
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        }
    }
}
