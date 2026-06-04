using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace cat_relations.Models
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

        [Column("passportId")]
        public int? PassportId { get; set; }

        [ForeignKey("PassportId")]
        public CatPassport? Passport { get; set; }

        public List<Toy> Toys { get; set; } = new();

        public List<Owner> Owners { get; set; } = new();
    }
}
