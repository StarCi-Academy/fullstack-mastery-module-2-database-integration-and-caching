using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using caching_redis.Data;
using caching_redis.Models;

namespace caching_redis.Controllers
{
    [ApiController]
    [Route("cats")]
    public class CatController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly IDistributedCache _cache;

        private const string ResponseCacheKey = "cats_res_layer";
        private const string LogicCacheKey = "cats_logic_layer_cache";
        private const string DbQueryCacheKey = "cats_db_layer_cache";

        public CatController(AppDbContext dbContext, IDistributedCache cache)
        {
            _dbContext = dbContext;
            _cache = cache;
        }

        [HttpPost("seed")]
        public async Task<IActionResult> SeedCats([FromQuery] int count = 1000)
        {
            if (count <= 0)
            {
                return BadRequest(new { message = "count must be a positive integer" });
            }

            var names = new[] { "Milo", "Luna", "Oliver", "Leo", "Bella", "Charlie", "Lilly", "Lucy", "Simba", "Chloe" };
            var breeds = new[] { "Siamese", "Bengal", "Persian", "Maine Coon", "Ragdoll", "Abyssinian", "Birman", "Sphynx" };
            var random = new Random();

            var cats = new List<Cat>();
            for (int i = 0; i < count; i++)
            {
                cats.Add(new Cat
                {
                    Name = names[random.Next(names.Length)] + " #" + (i + 1),
                    Breed = breeds[random.Next(breeds.Length)]
                });
            }

            _dbContext.Cats.AddRange(cats);
            await _dbContext.SaveChangesAsync();

            return StatusCode(201, new { message = "Seed completed successfully.", inserted = count });
        }

        [HttpGet("response-layer")]
        public async Task<IActionResult> GetResponseCache()
        {
            var cached = await _cache.GetStringAsync(ResponseCacheKey);
            if (cached != null)
            {
                return Content(cached, "text/plain");
            }

            // Simulate controller layer work for 1 second
            await Task.Delay(1000);
            var result = "This data would be cached at the Controller level using CacheInterceptor";

            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
            };
            await _cache.SetStringAsync(ResponseCacheKey, result, options);

            return Content(result, "text/plain");
        }

        [HttpDelete("response-layer/cache")]
        public async Task<IActionResult> ClearResponseLayerCache()
        {
            await _cache.RemoveAsync(ResponseCacheKey);
            return Ok(new
            {
                message = "Response-layer cache key was cleared successfully.",
                cacheKey = ResponseCacheKey
            });
        }

        [HttpGet("logic-layer")]
        public async Task<IActionResult> GetLogicCache()
        {
            var cached = await _cache.GetStringAsync(LogicCacheKey);
            if (cached != null)
            {
                return Content(cached, "application/json");
            }

            // Simulate heavy logic work for 1 second
            await Task.Delay(1000);
            var result = new
            {
                message = "Hải sản cho mèo cực phẩm",
                timestamp = DateTime.UtcNow.ToString("o")
            };

            var json = JsonSerializer.Serialize(result);
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60)
            };
            await _cache.SetStringAsync(LogicCacheKey, json, options);

            return Content(json, "application/json");
        }

        [HttpDelete("logic-layer/cache")]
        public async Task<IActionResult> ClearLogicLayerCache()
        {
            await _cache.RemoveAsync(LogicCacheKey);
            return Ok(new
            {
                message = "Logic-layer cache key was cleared successfully.",
                cacheKey = LogicCacheKey
            });
        }

        [HttpGet("db-layer")]
        public async Task<IActionResult> GetDbCache()
        {
            var cached = await _cache.GetStringAsync(DbQueryCacheKey);
            if (cached != null)
            {
                return Content(cached, "application/json");
            }

            var cats = await _dbContext.Cats.ToListAsync();
            var json = JsonSerializer.Serialize(cats);

            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
            };
            await _cache.SetStringAsync(DbQueryCacheKey, json, options);

            return Content(json, "application/json");
        }

        [HttpDelete("db-layer/cache")]
        public async Task<IActionResult> ClearDbLayerCache()
        {
            await _cache.RemoveAsync(DbQueryCacheKey);
            return Ok(new
            {
                message = "DB query-layer cache key was cleared successfully.",
                cacheKey = DbQueryCacheKey
            });
        }

        [HttpGet("all-layers/{id}")]
        public async Task<IActionResult> GetAllLayers(string id)
        {
            // Populate response cache
            var responseCached = await _cache.GetStringAsync(ResponseCacheKey);
            string responseSample;
            if (responseCached != null)
            {
                responseSample = responseCached;
            }
            else
            {
                await Task.Delay(1000);
                responseSample = "This data would be cached at the Controller level using CacheInterceptor";
                await _cache.SetStringAsync(ResponseCacheKey, responseSample, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
                });
            }

            // Populate logic cache
            var logicCached = await _cache.GetStringAsync(LogicCacheKey);
            object logicSample;
            if (logicCached != null)
            {
                logicSample = JsonSerializer.Deserialize<object>(logicCached)!;
            }
            else
            {
                await Task.Delay(1000);
                var sampleObj = new
                {
                    message = "Hải sản cho mèo cực phẩm",
                    timestamp = DateTime.UtcNow.ToString("o")
                };
                var json = JsonSerializer.Serialize(sampleObj);
                await _cache.SetStringAsync(LogicCacheKey, json, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60)
                });
                logicSample = sampleObj;
            }

            // Populate db cache
            var dbCached = await _cache.GetStringAsync(DbQueryCacheKey);
            List<Cat> cats;
            if (dbCached != null)
            {
                cats = JsonSerializer.Deserialize<List<Cat>>(dbCached)!;
            }
            else
            {
                cats = await _dbContext.Cats.ToListAsync();
                var json = JsonSerializer.Serialize(cats);
                await _cache.SetStringAsync(DbQueryCacheKey, json, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
                });
            }

            return Ok(new
            {
                responseSample,
                logicSample,
                dbCount = cats.Count
            });
        }

        [HttpDelete("all-layers/cache")]
        public async Task<IActionResult> ClearAllLayers()
        {
            await Task.WhenAll(
                _cache.RemoveAsync(ResponseCacheKey),
                _cache.RemoveAsync(LogicCacheKey),
                _cache.RemoveAsync(DbQueryCacheKey)
            );

            return Ok(new
            {
                message = "All 3 cache layers cleared. Next /cats/all-layers/:id will MISS on every layer.",
                cleared = new
                {
                    responseLayer = ResponseCacheKey,
                    logicLayer = LogicCacheKey,
                    dbLayer = DbQueryCacheKey
                }
            });
        }
    }
}
