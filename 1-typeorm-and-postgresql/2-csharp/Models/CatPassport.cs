using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace cat_relations.Models
{
    [Table("cat_passports")]
    public class CatPassport
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("passportNumber")]
        public string PassportNumber { get; set; } = string.Empty;

        // Foreign Key to Cat (optional or required depending on configuration)
        [Column("catId")]
        public int? CatId { get; set; }

        [JsonIgnore]
        public Cat? Cat { get; set; }
    }
}
