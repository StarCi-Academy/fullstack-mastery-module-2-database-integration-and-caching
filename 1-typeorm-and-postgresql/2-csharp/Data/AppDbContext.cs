using Microsoft.EntityFrameworkCore;
using cat_relations.Models;

namespace cat_relations.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Cat> Cats { get; set; }
        public DbSet<CatPassport> CatPassports { get; set; }
        public DbSet<Toy> Toys { get; set; }
        public DbSet<Owner> Owners { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1:1 relationship between Cat and CatPassport
            modelBuilder.Entity<Cat>()
                .HasOne(c => c.Passport)
                .WithOne(p => p.Cat)
                .HasForeignKey<CatPassport>(p => p.CatId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1:N relationship between Cat and Toy
            modelBuilder.Entity<Cat>()
                .HasMany(c => c.Toys)
                .WithOne(t => t.Cat)
                .HasForeignKey(t => t.CatId)
                .OnDelete(DeleteBehavior.Cascade);

            // N:N relationship between Cat and Owner using TypeORM naming conventions
            modelBuilder.Entity<Cat>()
                .HasMany(c => c.Owners)
                .WithMany(o => o.Cats)
                .UsingEntity<Dictionary<string, object>>(
                    "cats_owners_owners",
                    j => j.HasOne<Owner>().WithMany().HasForeignKey("ownersId"),
                    j => j.HasOne<Cat>().WithMany().HasForeignKey("catsId")
                );
        }
    }
}
