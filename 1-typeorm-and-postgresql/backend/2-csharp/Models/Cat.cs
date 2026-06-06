using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace cat_relations.Models
{
    /// <summary>
    /// EF Core model for a cat — the central domain object.
    /// <para>
    /// Demonstrates all three ORM relation cardinalities via navigation properties:
    /// <list type="bullet">
    ///   <item>1:1 with <see cref="CatPassport"/> — Cat owns the FK (<c>PassportId</c>).</item>
    ///   <item>1:N with <see cref="Toy"/> — Toy side holds <c>CatId</c> FK.</item>
    ///   <item>N:N with <see cref="Owner"/> — join table <c>cats_owners_owners</c> configured in <c>AppDbContext</c>.</item>
    /// </list>
    /// </para>
    /// Mapped to the <c>cats</c> table via <c>[Table("cats")]</c>.
    /// </summary>
    [Table("cats")]
    public class Cat
    {
        /// <summary>Auto-generated primary key (IDENTITY / SERIAL column in PostgreSQL).</summary>
        [Key]
        [Column("id")]
        public int Id { get; set; }

        /// <summary>Display name of the cat. Required — validated by model-binding.</summary>
        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// FK column pointing to the associated <see cref="CatPassport"/>.
        /// Nullable because the passport is created together with the cat (not pre-existing).
        /// </summary>
        [Column("passportId")]
        public int? PassportId { get; set; }

        /// <summary>
        /// 1:1 navigation property to <see cref="CatPassport"/>.
        /// EF Core follows <c>PassportId</c> as the FK (declared via <c>[ForeignKey]</c> on <see cref="PassportId"/>).
        /// </summary>
        [ForeignKey("PassportId")]
        public CatPassport? Passport { get; set; }

        /// <summary>
        /// 1:N navigation property — collection of <see cref="Toy"/> owned by this cat.
        /// EF Core stores the FK (<c>catId</c>) on the <c>toys</c> table; the relation is configured
        /// in <c>AppDbContext.OnModelCreating</c> via <c>HasMany().WithOne().HasForeignKey()</c>.
        /// Initialised to an empty list to avoid null-reference exceptions before EF Core populates it.
        /// </summary>
        public List<Toy> Toys { get; set; } = new();

        /// <summary>
        /// N:N navigation property — collection of <see cref="Owner"/> sharing this cat.
        /// The join table (<c>cats_owners_owners</c>) is configured in <c>AppDbContext.OnModelCreating</c>.
        /// Initialised to an empty list to match safe-initialisation convention.
        /// </summary>
        public List<Owner> Owners { get; set; } = new();
    }
}
