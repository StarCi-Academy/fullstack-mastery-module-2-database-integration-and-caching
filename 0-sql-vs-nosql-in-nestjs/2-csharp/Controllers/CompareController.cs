using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver;
using sql_vs_nosql.Data;
using sql_vs_nosql.Models;
using System.Diagnostics;

namespace sql_vs_nosql.Controllers
{
    [ApiController]
    [Route("compare")]
    public class CompareController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly IMongoCollection<NoSqlComparisonItem> _mongoCollection;

        public CompareController(AppDbContext dbContext, IMongoDatabase mongoDatabase)
        {
            _dbContext = dbContext;
            _mongoCollection = mongoDatabase.GetCollection<NoSqlComparisonItem>("comparison_items");
        }

        [HttpPost("write")]
        public async Task<IActionResult> Write([FromBody] CreateCompareDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var sqlItem = new SqlComparisonItem
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Amount = dto.Amount,
                CreatedAt = DateTime.UtcNow
            };

            var noSqlItem = new NoSqlComparisonItem
            {
                Title = dto.Title,
                Amount = dto.Amount,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Version = 0
            };

            var sqlTask = _dbContext.SqlComparisonItems.AddAsync(sqlItem).AsTask();
            var noSqlTask = _mongoCollection.InsertOneAsync(noSqlItem);

            await Task.WhenAll(sqlTask, noSqlTask);
            await _dbContext.SaveChangesAsync();

            return StatusCode(201, new
            {
                message = "Saved to both SQL and NoSQL stores.",
                sql = new
                {
                    id = sqlItem.Id.ToString(),
                    title = sqlItem.Title,
                    amount = sqlItem.Amount,
                    createdAt = sqlItem.CreatedAt.ToString("o")
                },
                noSql = new
                {
                    id = noSqlItem.Id,
                    title = noSqlItem.Title,
                    amount = noSqlItem.Amount,
                    createdAt = noSqlItem.CreatedAt.ToString("o")
                }
            });
        }

        [HttpGet("read")]
        public async Task<IActionResult> Read()
        {
            var sqlTask = _dbContext.SqlComparisonItems
                .OrderByDescending(x => x.CreatedAt)
                .Take(20)
                .ToListAsync();

            var noSqlTask = _mongoCollection
                .Find(new BsonDocument())
                .Sort(Builders<NoSqlComparisonItem>.Sort.Descending(x => x.CreatedAt))
                .Limit(20)
                .ToListAsync();

            await Task.WhenAll(sqlTask, noSqlTask);

            var sqlItems = sqlTask.Result;
            var noSqlItems = noSqlTask.Result;

            return Ok(new
            {
                sqlCount = sqlItems.Count,
                noSqlCount = noSqlItems.Count,
                sqlItems = sqlItems.Select(x => new SqlReadResponseDto
                {
                    Id = x.Id.ToString(),
                    Title = x.Title,
                    Amount = x.Amount,
                    CreatedAt = x.CreatedAt
                }),
                noSqlItems = noSqlItems.Select(x => new NoSqlReadResponseDto
                {
                    Id = x.Id,
                    Title = x.Title,
                    Amount = x.Amount,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt,
                    Version = x.Version
                })
            });
        }

        [HttpGet("timings")]
        public async Task<IActionResult> GetTimings()
        {
            var sqlWatch = Stopwatch.StartNew();
            await _dbContext.SqlComparisonItems
                .OrderByDescending(x => x.CreatedAt)
                .Take(20)
                .ToListAsync();
            sqlWatch.Stop();
            double sqlMs = Math.Round(sqlWatch.Elapsed.TotalMilliseconds, 3);

            var noSqlWatch = Stopwatch.StartNew();
            await _mongoCollection
                .Find(new BsonDocument())
                .Sort(Builders<NoSqlComparisonItem>.Sort.Descending(x => x.CreatedAt))
                .Limit(20)
                .ToListAsync();
            noSqlWatch.Stop();
            double noSqlMs = Math.Round(noSqlWatch.Elapsed.TotalMilliseconds, 3);

            double deltaMs = Math.Round(sqlMs - noSqlMs, 3);

            return Ok(new
            {
                sqlMs,
                noSqlMs,
                deltaMs
            });
        }

        [HttpDelete("all")]
        public async Task<IActionResult> DeleteAll()
        {
            var pgBefore = await _dbContext.SqlComparisonItems.CountAsync();
            
            // Execute truncate
            await _dbContext.Database.ExecuteSqlRawAsync("TRUNCATE TABLE comparison_items RESTART IDENTITY CASCADE");

            var mongoBefore = await _mongoCollection.CountDocumentsAsync(new BsonDocument());
            await _mongoCollection.DeleteManyAsync(new BsonDocument());

            return Ok(new
            {
                pgDeleted = pgBefore,
                mongoDeleted = mongoBefore
            });
        }
    }
}
