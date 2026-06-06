using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace caching_redis.Models
{
    /// <summary>
    /// EF Core model mapped to the <c>cats</c> Postgres table.
    ///
    /// <para>Intentionally simple (id, name, breed) so learners focus on caching
    /// mechanics rather than complex ORM relationships.
    /// The table is seeded with 1000 rows via <c>POST /cats/seed?count=1000</c>
    /// to make the DB-layer MISS/HIT latency difference observable.</para>
    /// </summary>
    [Table("cats")]
    public class Cat
    {
        /// <summary>
        /// Auto-incremented primary key assigned by Postgres.
        /// <c>[Key]</c> tells EF Core this is the PK; <c>[Column("id")]</c> maps it to the
        /// lower-case <c>id</c> column name used in the Postgres DDL.
        /// </summary>
        [Key]
        [Column("id")]
        public int Id { get; set; }

        /// <summary>
        /// Cat display name (e.g. "Milo #42").
        /// <c>[Required]</c> adds a NOT NULL constraint; <c>string.Empty</c> satisfies the
        /// C# nullable reference type checker without compromising the constraint.
        /// </summary>
        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Cat breed string (e.g. "Siamese").
        /// Randomised from a predefined pool during seeding.
        /// </summary>
        [Required]
        [Column("breed")]
        public string Breed { get; set; } = string.Empty;
    }
}
