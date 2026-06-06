using Microsoft.EntityFrameworkCore;
using cat_relations.Models;

namespace cat_relations.Data
{
    /// <summary>
    /// EF Core <see cref="DbContext"/> for the Cat ORM demo.
    /// <para>
    /// Exposes <see cref="DbSet{TEntity}"/> properties for each entity type so the
    /// ORM can track, query, and persist them. Relation configurations that cannot be
    /// inferred from data-annotation attributes alone are done in <see cref="OnModelCreating"/>.
    /// </para>
    /// </summary>
    public class AppDbContext : DbContext
    {
        /// <summary>
        /// Forwards connection options (connection string, provider) to the base <see cref="DbContext"/>.
        /// Options are configured in <c>Program.cs</c> via <c>AddDbContext</c>.
        /// </summary>
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        /// <summary>Table of cats — principal entity for all three relation demos.</summary>
        public DbSet<Cat> Cats { get; set; }

        /// <summary>Table of cat passports — 1:1 dependent of <see cref="Cat"/>.</summary>
        public DbSet<CatPassport> CatPassports { get; set; }

        /// <summary>Table of toys — 1:N dependents, each holding a <c>catId</c> FK.</summary>
        public DbSet<Toy> Toys { get; set; }

        /// <summary>Table of owners — N:N peers linked to cats via the join table.</summary>
        public DbSet<Owner> Owners { get; set; }

        /// <summary>
        /// Fluent API relation configuration — supplements data-annotation attributes
        /// for relations that require custom join-table names or delete behaviours.
        /// </summary>
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1:1 — Cat.PassportId FK → CatPassport.Id; delete passport when cat is deleted.
            modelBuilder.Entity<Cat>()
                .HasOne(c => c.Passport)
                .WithOne(p => p.Cat)
                .HasForeignKey<Cat>(c => c.PassportId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1:N — Toy.CatId FK → Cat.Id; delete toys when cat is deleted.
            modelBuilder.Entity<Cat>()
                .HasMany(c => c.Toys)
                .WithOne(t => t.Cat)
                .HasForeignKey(t => t.CatId)
                .OnDelete(DeleteBehavior.Cascade);

            // N:N — explicit join table name and FK column names match TypeORM naming convention
            // so all four language backends produce an identical schema (cross-lang parity).
            modelBuilder.Entity<Cat>()
                .HasMany(c => c.Owners)
                .WithMany(o => o.Cats)
                .UsingEntity<Dictionary<string, object>>(
                    "cats_owners_owners",
                    // FK from join table to Owner
                    j => j.HasOne<Owner>().WithMany().HasForeignKey("ownersId"),
                    // FK from join table to Cat
                    j => j.HasOne<Cat>().WithMany().HasForeignKey("catsId")
                );
        }
    }
}
