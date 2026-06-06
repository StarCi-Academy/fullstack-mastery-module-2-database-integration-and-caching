using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace sql_vs_nosql.Models
{
    [Table("comparison_items")]
    public class SqlComparisonItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("title")]
        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        [Column("amount", TypeName = "double precision")]
        public double Amount { get; set; }

        [Column("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
