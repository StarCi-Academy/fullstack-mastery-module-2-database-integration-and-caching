using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace cat_relations.Models
{
    /// <summary>
    /// EF Core model for a toy — the dependent (many) end of the 1:N relation with <see cref="Cat"/>.
    /// <para>
    /// The FK column (<c>catId</c>) lives on this table, making Toy the owning side of the 1:N relation.
    /// EF Core writes <c>catId</c> when a Toy is saved with <c>CatId</c> set (or via the navigation property).
    /// </para>
    /// <c>[JsonIgnore]</c> on the <c>Cat</c> navigation property prevents the serialisation cycle
    /// (Toy → Cat → Toys[Toy] → …).
    /// </summary>
    [Table("toys")]
    public class Toy
    {
        /// <summary>Auto-generated primary key.</summary>
        [Key]
        [Column("id")]
        public int Id { get; set; }

        /// <summary>Display name of the toy, e.g. <c>"Ball"</c>.</summary>
        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// FK column referencing the owning <see cref="Cat"/>.
        /// Set directly in <c>CatController.AddToy</c> to attach the toy without re-loading the full Cat graph.
        /// Nullable during model binding (the JSON request body does not include it).
        /// </summary>
        [Column("catId")]
        public int? CatId { get; set; }

        /// <summary>
        /// Navigation property back to the owning <see cref="Cat"/>.
        /// Excluded from JSON output to avoid serialisation cycles.
        /// EF Core uses <c>CatId</c> (shadow or explicit property) to load this when <c>.Include()</c> is requested.
        /// </summary>
        [JsonIgnore]
        public Cat? Cat { get; set; }
    }
}
