using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace sql_vs_nosql.Models
{
    public class NoSqlComparisonItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("amount")]
        public double Amount { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("__v")]
        public int Version { get; set; } = 0;
    }
}
