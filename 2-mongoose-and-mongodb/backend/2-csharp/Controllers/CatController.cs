using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using mongoose_mongodb.Models;

namespace mongoose_mongodb.Controllers
{
    [ApiController]
    [Route("cats")]
    public class CatController : ControllerBase
    {
        private readonly IMongoCollection<Cat> _cats;

        public CatController(IMongoDatabase database)
        {
            _cats = database.GetCollection<Cat>("cats");
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Cat cat)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            cat.Id = null; // Let MongoDB driver generate the ObjectId
            cat.CreatedAt = DateTime.UtcNow;
            cat.UpdatedAt = DateTime.UtcNow;
            cat.Likes = 0;
            cat.Version = 0;

            await _cats.InsertOneAsync(cat);

            return StatusCode(201, cat);
        }

        [HttpGet]
        public async Task<IActionResult> FindAll([FromQuery] string? hobby)
        {
            if (!string.IsNullOrEmpty(hobby))
            {
                var filter = Builders<Cat>.Filter.AnyEq(c => c.Hobbies, hobby);
                var matchedCats = await _cats.Find(filter).ToListAsync();
                return Ok(matchedCats);
            }

            var cats = await _cats.Find(FilterDefinition<Cat>.Empty)
                .SortByDescending(c => c.Age)
                .Limit(10)
                .ToListAsync();

            return Ok(cats);
        }

        [HttpGet("search")]
        public async Task<IActionResult> FindByName([FromQuery] string name)
        {
            var cat = await _cats.Find(c => c.Name == name).FirstOrDefaultAsync();
            if (cat == null)
            {
                return NotFound(new { message = $"Cat with name \"{name}\" not found" });
            }
            return Ok(cat);
        }

        [HttpPut("{id}")]
        [HttpPatch("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] Cat updateData)
        {
            var filter = Builders<Cat>.Filter.Eq(c => c.Id, id);
            var updateList = new List<UpdateDefinition<Cat>>();

            if (updateData.Name != null) updateList.Add(Builders<Cat>.Update.Set(c => c.Name, updateData.Name));
            if (updateData.Age != 0) updateList.Add(Builders<Cat>.Update.Set(c => c.Age, updateData.Age));
            if (updateData.Breed != null) updateList.Add(Builders<Cat>.Update.Set(c => c.Breed, updateData.Breed));
            if (updateData.Hobbies != null) updateList.Add(Builders<Cat>.Update.Set(c => c.Hobbies, updateData.Hobbies));
            if (updateData.Metadata != null) updateList.Add(Builders<Cat>.Update.Set(c => c.Metadata, updateData.Metadata));
            updateList.Add(Builders<Cat>.Update.Set(c => c.UpdatedAt, DateTime.UtcNow));

            var update = Builders<Cat>.Update.Combine(updateList);
            var options = new FindOneAndUpdateOptions<Cat> { ReturnDocument = ReturnDocument.After };

            var updatedCat = await _cats.FindOneAndUpdateAsync(filter, update, options);
            if (updatedCat == null)
            {
                return NotFound(new { message = $"Cat with id \"{id}\" not found" });
            }

            return Ok(updatedCat);
        }

        [HttpPost("{id}/like")]
        public async Task<IActionResult> Like(string id)
        {
            var filter = Builders<Cat>.Filter.Eq(c => c.Id, id);
            var update = Builders<Cat>.Update.Inc(c => c.Likes, 1).Set(c => c.UpdatedAt, DateTime.UtcNow);
            var options = new FindOneAndUpdateOptions<Cat> { ReturnDocument = ReturnDocument.After };

            var updatedCat = await _cats.FindOneAndUpdateAsync(filter, update, options);
            if (updatedCat == null)
            {
                return NotFound(new { message = $"Cat with id \"{id}\" not found" });
            }

            return StatusCode(201, updatedCat);
        }
    }
}
