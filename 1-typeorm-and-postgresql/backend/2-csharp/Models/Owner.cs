using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace cat_relations.Models
{
    /// <summary>
    /// EF Core model for a cat owner — one side of the N:N relation with <see cref="Cat"/>.
    /// <para>
    /// The join table (<c>cats_owners_owners</c>) is configured in <c>AppDbContext.OnModelCreating</c>
    /// on the Cat side (<c>HasMany(c => c.Owners).WithMany(o => o.Cats)</c>).
    /// This model does not hold a FK column — the relation is managed via the join table only.
    /// </para>
    /// <c>[JsonIgnore]</c> on <c>Cats</c> prevents serialisation cycles (Owner → Cats → Owners[Owner] → …).
    /// </summary>
    [Table("owners")]
    public class Owner
    {
        /// <summary>Auto-generated primary key.</summary>
        [Key]
        [Column("id")]
        public int Id { get; set; }

        /// <summary>Display name of the owner, e.g. <c>"Alice"</c>.</summary>
        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Navigation property for the N:N inverse — list of <see cref="Cat"/> associated with this owner.
        /// Excluded from JSON output to prevent serialisation cycles.
        /// Initialised to an empty list so EF Core and Jackson never encounter a null collection.
        /// </summary>
        [JsonIgnore]
        public List<Cat> Cats { get; set; } = new();
    }
}
