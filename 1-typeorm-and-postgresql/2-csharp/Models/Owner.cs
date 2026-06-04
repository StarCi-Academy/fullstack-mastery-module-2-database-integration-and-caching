using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace cat_relations.Models
{
    [Table("owners")]
    public class Owner
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [JsonIgnore]
        public List<Cat> Cats { get; set; } = new();
    }
}
