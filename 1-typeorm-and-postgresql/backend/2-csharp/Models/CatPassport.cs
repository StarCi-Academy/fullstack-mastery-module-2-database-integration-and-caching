using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace cat_relations.Models
{
    /// <summary>
    /// EF Core model for a cat's passport — the dependent (non-owning) end of the 1:1 relation.
    /// <para>
    /// The FK (<c>passportId</c>) lives on the <c>cats</c> table, making <see cref="Cat"/> the principal end.
    /// This model maps to the <c>cat_passports</c> table and is deleted when its owning Cat is deleted
    /// (configured via <c>OnDelete(DeleteBehavior.Cascade)</c> in <c>AppDbContext</c>).
    /// </para>
    /// <c>[JsonIgnore]</c> on the <c>Cat</c> navigation property prevents infinite serialisation loops
    /// (Cat → Passport → Cat → …) during JSON serialisation.
    /// </summary>
    [Table("cat_passports")]
    public class CatPassport
    {
        /// <summary>Auto-generated primary key.</summary>
        [Key]
        [Column("id")]
        public int Id { get; set; }

        /// <summary>
        /// Passport identifier string, e.g. <c>"CAT-001"</c>.
        /// Column name is forced to <c>passportNumber</c> (camelCase) to match TypeORM naming convention for cross-lang parity.
        /// </summary>
        [Required]
        [Column("passportNumber")]
        public string PassportNumber { get; set; } = string.Empty;

        /// <summary>
        /// Inverse navigation to the owning <see cref="Cat"/>.
        /// Excluded from JSON output to prevent serialisation cycle.
        /// EF Core uses this property for graph traversal only — the FK is on Cat.
        /// </summary>
        [JsonIgnore]
        public Cat? Cat { get; set; }
    }
}
