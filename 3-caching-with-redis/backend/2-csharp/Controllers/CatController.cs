using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using caching_redis.Data;
using caching_redis.Models;

namespace caching_redis.Controllers
{
    /// <summary>
    /// REST controller for the Cat feature.
    /// Exposes endpoints demonstrating three Redis caching layers:
    /// <list type="bullet">
    ///   <item><description>Layer 3 — Response cache: <c>GET /cats/response-layer</c></description></item>
    ///   <item><description>Layer 2 — Logic cache-aside: <c>GET /cats/logic-layer</c></description></item>
    ///   <item><description>Layer 1 — DB query cache: <c>GET /cats/db-layer</c></description></item>
    /// </list>
    /// Each layer has a corresponding <c>DELETE /cats/*/cache</c> invalidation endpoint.
    /// </summary>
    [ApiController]
    [Route("cats")]
    public class CatController : ControllerBase
    {
        /// <summary>EF Core context for Postgres CRUD on the <c>cats</c> table.</summary>
        private readonly AppDbContext _dbContext;

        /// <summary>
        /// <c>IDistributedCache</c> backed by StackExchange.Redis.
        /// Used for all three cache layers via <c>GetStringAsync</c> / <c>SetStringAsync</c> / <c>RemoveAsync</c>.
        /// </summary>
        private readonly IDistributedCache _cache;

        /// <summary>Redis key for the response-layer cache (Layer 3). TTL = 30 s.</summary>
        private const string ResponseCacheKey = "cats_res_layer";

        /// <summary>Redis key for the logic-layer cache (Layer 2). TTL = 60 s.</summary>
        private const string LogicCacheKey = "cats_logic_layer_cache";

        /// <summary>Redis key for the DB query-result cache (Layer 1). TTL = 30 s.</summary>
        private const string DbQueryCacheKey = "cats_db_layer_cache";

        /// <summary>
        /// Injects required services via constructor injection (explicit over field injection).
        /// </summary>
        /// <param name="dbContext">EF Core DB context (Postgres).</param>
        /// <param name="cache">Distributed cache backed by Redis.</param>
        public CatController(AppDbContext dbContext, IDistributedCache cache)
        {
            _dbContext = dbContext;
            _cache = cache;
        }

        /// <summary>
        /// POST /cats/seed?count={n} — Inserts <paramref name="count"/> random Cat rows into Postgres.
        /// Seeding with a large number (e.g. 1000) makes the DB-layer MISS latency clearly observable.
        /// </summary>
        /// <param name="count">Number of rows to insert (defaults to 1000).</param>
        /// <returns>HTTP 201 with inserted count, or 400 if count is not positive.</returns>
        [HttpPost("seed")]
        public async Task<IActionResult> SeedCats([FromQuery] int count = 1000)
        {
            // Reject non-positive count early to avoid meaningless DB writes
            if (count <= 0)
            {
                return BadRequest(new { message = "count must be a positive integer" });
            }

            // Predefined name/breed pools — avoids adding a Faker dependency for Java parity
            var names  = new[] { "Milo", "Luna", "Oliver", "Leo", "Bella", "Charlie", "Lilly", "Lucy", "Simba", "Chloe" };
            var breeds = new[] { "Siamese", "Bengal", "Persian", "Maine Coon", "Ragdoll", "Abyssinian", "Birman", "Sphynx" };
            var random = new Random();

            // Build the entity list in memory; a single AddRange + SaveChangesAsync is far faster
            // than saving each entity individually (Npgsql batches the INSERT statements)
            var cats = new List<Cat>();
            for (int i = 0; i < count; i++)
            {
                cats.Add(new Cat
                {
                    // Append the loop index to make each name unique for readability in the DB
                    Name  = names[random.Next(names.Length)] + " #" + (i + 1),
                    Breed = breeds[random.Next(breeds.Length)]
                });
            }

            // Bulk insert — EF Core groups these into batched INSERT statements
            _dbContext.Cats.AddRange(cats);
            await _dbContext.SaveChangesAsync();

            // Return 201 Created with a summary so the learner can confirm the seed ran
            return StatusCode(201, new { message = "Seed completed successfully.", inserted = count });
        }

        /// <summary>
        /// GET /cats/response-layer — Demonstrates Layer 3 (Response / entry-point cache).
        /// First call simulates ~1 s work; subsequent calls within 30 s return from Redis.
        /// </summary>
        /// <returns>Plain-text string, either from Redis (fast) or computed (slow ~1 s).</returns>
        [HttpGet("response-layer")]
        public async Task<IActionResult> GetResponseCache()
        {
            // Attempt cache HIT — GetStringAsync returns null on MISS
            var cached = await _cache.GetStringAsync(ResponseCacheKey);
            if (cached != null)
            {
                // HIT path: return immediately without re-computing
                return Content(cached, "text/plain");
            }

            // MISS path: simulate 1 s controller-layer work
            await Task.Delay(1000);
            var result = "This data would be cached at the Controller level using CacheInterceptor";

            // Store in Redis with a 30 s absolute TTL so the next call hits the HIT path
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
            };
            await _cache.SetStringAsync(ResponseCacheKey, result, options);

            return Content(result, "text/plain");
        }

        /// <summary>
        /// DELETE /cats/response-layer/cache — Invalidates the Layer 3 Redis key.
        /// Forces the next GET /cats/response-layer to be a cold MISS.
        /// </summary>
        /// <returns>JSON with <c>message</c> and <c>cacheKey</c> fields.</returns>
        [HttpDelete("response-layer/cache")]
        public async Task<IActionResult> ClearResponseLayerCache()
        {
            // Remove the Redis key — next request will recompute and re-warm the cache
            await _cache.RemoveAsync(ResponseCacheKey);
            return Ok(new
            {
                message  = "Response-layer cache key was cleared successfully.",
                cacheKey = ResponseCacheKey
            });
        }

        /// <summary>
        /// GET /cats/logic-layer — Demonstrates Layer 2 (Business logic cache-aside).
        /// MISS sleeps 1 s and records a timestamp; HIT returns the same frozen timestamp
        /// instantly, proving the cache is active.
        /// </summary>
        /// <returns>JSON with <c>message</c> and <c>timestamp</c> fields.</returns>
        [HttpGet("logic-layer")]
        public async Task<IActionResult> GetLogicCache()
        {
            // Check Redis for a previously computed result
            var cached = await _cache.GetStringAsync(LogicCacheKey);
            if (cached != null)
            {
                // HIT: return the cached JSON directly — same timestamp as the MISS call
                return Content(cached, "application/json");
            }

            // MISS: simulate heavy business logic (1 second delay)
            await Task.Delay(1000);
            var result = new
            {
                message   = "Hải sản cho mèo cực phẩm",
                // "o" round-trip format produces ISO-8601 with sub-second precision
                timestamp = DateTime.UtcNow.ToString("o")
            };

            // Serialise and cache with a 60 s TTL
            var json    = JsonSerializer.Serialize(result);
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60)
            };
            await _cache.SetStringAsync(LogicCacheKey, json, options);

            return Content(json, "application/json");
        }

        /// <summary>
        /// DELETE /cats/logic-layer/cache — Invalidates the Layer 2 Redis key.
        /// The next GET /cats/logic-layer will take ~1 s again (forced MISS).
        /// </summary>
        /// <returns>JSON with <c>message</c> and <c>cacheKey</c> fields.</returns>
        [HttpDelete("logic-layer/cache")]
        public async Task<IActionResult> ClearLogicLayerCache()
        {
            await _cache.RemoveAsync(LogicCacheKey);
            return Ok(new
            {
                message  = "Logic-layer cache key was cleared successfully.",
                cacheKey = LogicCacheKey
            });
        }

        /// <summary>
        /// GET /cats/db-layer — Demonstrates Layer 1 (DB query result cache).
        /// MISS runs a real Postgres SELECT on all rows; HIT returns the Redis-cached JSON
        /// within the 30 s TTL window.
        /// </summary>
        /// <returns>JSON array of Cat objects.</returns>
        [HttpGet("db-layer")]
        public async Task<IActionResult> GetDbCache()
        {
            // Check Redis first (avoids the Postgres round-trip on HIT)
            var cached = await _cache.GetStringAsync(DbQueryCacheKey);
            if (cached != null)
            {
                // HIT: return the pre-serialised JSON directly
                return Content(cached, "application/json");
            }

            // MISS: execute the real DB query (slower with 1000 rows)
            var cats = await _dbContext.Cats.ToListAsync();
            var json = JsonSerializer.Serialize(cats);

            // Populate the cache so the next call is fast (TTL = 30 s)
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
            };
            await _cache.SetStringAsync(DbQueryCacheKey, json, options);

            return Content(json, "application/json");
        }

        /// <summary>
        /// DELETE /cats/db-layer/cache — Invalidates the Layer 1 Redis key.
        /// Forces the next GET /cats/db-layer to hit Postgres again.
        /// </summary>
        /// <returns>JSON with <c>message</c> and <c>cacheKey</c> fields.</returns>
        [HttpDelete("db-layer/cache")]
        public async Task<IActionResult> ClearDbLayerCache()
        {
            await _cache.RemoveAsync(DbQueryCacheKey);
            return Ok(new
            {
                message  = "DB query-layer cache key was cleared successfully.",
                cacheKey = DbQueryCacheKey
            });
        }

        /// <summary>
        /// GET /cats/all-layers/{id} — Warms all 3 cache layers in one request.
        /// The <paramref name="id"/> path segment is a learner-chosen scenario tag;
        /// the controller does not use its value.
        /// </summary>
        /// <param name="id">Scenario identifier (unused).</param>
        /// <returns>JSON with <c>responseSample</c>, <c>logicSample</c>, and <c>dbCount</c>.</returns>
        [HttpGet("all-layers/{id}")]
        public async Task<IActionResult> GetAllLayers(string id)
        {
            // ── Layer 3: response cache ──────────────────────────────────────────
            var responseCached = await _cache.GetStringAsync(ResponseCacheKey);
            string responseSample;
            if (responseCached != null)
            {
                // HIT: reuse the cached value without delay
                responseSample = responseCached;
            }
            else
            {
                // MISS: simulate work then populate cache
                await Task.Delay(1000);
                responseSample = "This data would be cached at the Controller level using CacheInterceptor";
                await _cache.SetStringAsync(ResponseCacheKey, responseSample, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
                });
            }

            // ── Layer 2: logic cache ─────────────────────────────────────────────
            var logicCached = await _cache.GetStringAsync(LogicCacheKey);
            object logicSample;
            if (logicCached != null)
            {
                // HIT: deserialise the cached JSON (typed as object for the response envelope)
                logicSample = JsonSerializer.Deserialize<object>(logicCached)!;
            }
            else
            {
                // MISS: simulate heavy business logic then populate cache
                await Task.Delay(1000);
                var sampleObj = new
                {
                    message   = "Hải sản cho mèo cực phẩm",
                    timestamp = DateTime.UtcNow.ToString("o")
                };
                var json = JsonSerializer.Serialize(sampleObj);
                await _cache.SetStringAsync(LogicCacheKey, json, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60)
                });
                logicSample = sampleObj;
            }

            // ── Layer 1: DB query cache ──────────────────────────────────────────
            var dbCached = await _cache.GetStringAsync(DbQueryCacheKey);
            List<Cat> cats;
            if (dbCached != null)
            {
                // HIT: deserialise cached JSON back into List<Cat>
                cats = JsonSerializer.Deserialize<List<Cat>>(dbCached)!;
            }
            else
            {
                // MISS: run the real Postgres SELECT then populate the cache
                cats = await _dbContext.Cats.ToListAsync();
                var json = JsonSerializer.Serialize(cats);
                await _cache.SetStringAsync(DbQueryCacheKey, json, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
                });
            }

            // Return a compact snapshot; learners verify each field to confirm all layers are warm
            return Ok(new
            {
                responseSample,
                logicSample,
                dbCount = cats.Count
            });
        }

        /// <summary>
        /// DELETE /cats/all-layers/cache — Cascade-invalidates all 3 cache layers in parallel.
        /// After this call every layer endpoint will return a cold MISS on the next request.
        /// </summary>
        /// <returns>JSON with <c>message</c> and a <c>cleared</c> sub-object listing each key.</returns>
        [HttpDelete("all-layers/cache")]
        public async Task<IActionResult> ClearAllLayers()
        {
            // Remove all 3 Redis keys concurrently — order does not matter between layers
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
                    logicLayer    = LogicCacheKey,
                    dbLayer       = DbQueryCacheKey
                }
            });
        }
    }
}
