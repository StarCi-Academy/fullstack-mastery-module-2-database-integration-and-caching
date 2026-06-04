using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using cat_relations.Data;
using cat_relations.Models;

namespace cat_relations.Controllers
{
    [ApiController]
    [Route("cats")]
    public class CatController : ControllerBase
    {
        private readonly AppDbContext _dbContext;

        public CatController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        [HttpGet]
        public async Task<IActionResult> FindAll()
        {
            var cats = await _dbContext.Cats
                .Include(c => c.Passport)
                .Include(c => c.Toys)
                .Include(c => c.Owners)
                .ToListAsync();
            return Ok(cats);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Cat cat)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Resolve existing vs new owners to avoid duplicate insert key errors
            if (cat.Owners != null && cat.Owners.Count > 0)
            {
                var resolvedOwners = new List<Owner>();
                foreach (var owner in cat.Owners)
                {
                    if (owner.Id > 0)
                    {
                        var existingOwner = await _dbContext.Owners.FindAsync(owner.Id);
                        if (existingOwner != null)
                        {
                            resolvedOwners.Add(existingOwner);
                        }
                        else
                        {
                            resolvedOwners.Add(owner);
                        }
                    }
                    else
                    {
                        resolvedOwners.Add(owner);
                    }
                }
                cat.Owners = resolvedOwners;
            }

            _dbContext.Cats.Add(cat);
            await _dbContext.SaveChangesAsync();

            return StatusCode(201, cat);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> FindOne(int id)
        {
            var cat = await _dbContext.Cats
                .Include(c => c.Passport)
                .Include(c => c.Toys)
                .Include(c => c.Owners)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (cat == null)
            {
                return NotFound(new { message = $"Cat with ID {id} not found" });
            }

            return Ok(cat);
        }

        [HttpGet("{id}/with-relations")]
        public async Task<IActionResult> FindWithRelations(int id)
        {
            var cat = await _dbContext.Cats
                .Include(c => c.Passport)
                .Include(c => c.Toys)
                .Include(c => c.Owners)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (cat == null)
            {
                return NotFound(new { message = $"Cat with ID {id} not found" });
            }

            return Ok(cat);
        }

        [HttpPost("{id}/toys")]
        public async Task<IActionResult> AddToy(int id, [FromBody] Toy toy)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var catExists = await _dbContext.Cats.AnyAsync(c => c.Id == id);
            if (!catExists)
            {
                return NotFound(new { message = $"Cat with ID {id} not found" });
            }

            toy.CatId = id;
            _dbContext.Toys.Add(toy);
            await _dbContext.SaveChangesAsync();

            var updatedCat = await _dbContext.Cats
                .Include(c => c.Passport)
                .Include(c => c.Toys)
                .Include(c => c.Owners)
                .FirstOrDefaultAsync(c => c.Id == id);

            return StatusCode(201, updatedCat);
        }
    }
}
