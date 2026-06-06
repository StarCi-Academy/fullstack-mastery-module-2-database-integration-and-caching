using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization;

namespace mongoose_mongodb.Models
{
    [BsonIgnoreExtraElements]
    public class Cat
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        [JsonPropertyName("_id")]
        public string? Id { get; set; }

        [BsonElement("name")]
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("age")]
        [JsonPropertyName("age")]
        public int Age { get; set; }

        [BsonElement("breed")]
        [JsonPropertyName("breed")]
        public string Breed { get; set; } = string.Empty;

        [BsonElement("hobbies")]
        [JsonPropertyName("hobbies")]
        public List<string> Hobbies { get; set; } = new();

        [BsonElement("metadata")]
        [JsonPropertyName("metadata")]
        public Dictionary<string, object> Metadata { get; set; } = new();

        [BsonElement("likes")]
        [JsonPropertyName("likes")]
        public int Likes { get; set; } = 0;

        [BsonElement("createdAt")]
        [JsonPropertyName("createdAt")]
        public DateTime? CreatedAt { get; set; }

        [BsonElement("updatedAt")]
        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }

        [BsonElement("__v")]
        [JsonPropertyName("__v")]
        public int Version { get; set; } = 0;
    }
}
