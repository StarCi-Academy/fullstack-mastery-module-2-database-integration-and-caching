using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace caching_redis.Models
{
    [Table("cats")]
    public class Cat
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("breed")]
        public string Breed { get; set; } = string.Empty;
    }
}
