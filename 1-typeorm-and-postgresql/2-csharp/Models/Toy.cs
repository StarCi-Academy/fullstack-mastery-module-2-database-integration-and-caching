using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace cat_relations.Models
{
    [Table("toys")]
    public class Toy
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("catId")]
        public int? CatId { get; set; }

        [JsonIgnore]
        public Cat? Cat { get; set; }
    }
}
