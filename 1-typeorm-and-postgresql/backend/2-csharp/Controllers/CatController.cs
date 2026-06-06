using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using cat_relations.Data;
using cat_relations.Models;

namespace cat_relations.Controllers
{
    /// <summary>
    /// REST controller for the <c>/cats</c> resource — HTTP layer only.
    /// <para>
    /// Uses <see cref="AppDbContext"/> directly (no separate service layer) to keep the demo minimal
    /// while still demonstrating EF Core <c>.Include()</c> eager-loading of all three relation types.
    /// </para>
    /// All write endpoints call <c>SaveChangesAsync()</c> inside a single async operation
    /// so EF Core's change-tracker commits atomically.
    /// </summary>
    [ApiController]
    [Route("cats")]
    public class CatController : ControllerBase
    {
        /// <summary>EF Core DbContext — scoped per HTTP request by ASP.NET Core DI.</summary>
        private readonly AppDbContext _dbContext;

        /// <summary>
        /// Constructor injection — DI provides the scoped <see cref="AppDbContext"/>.
        /// </summary>
        /// <param name="dbContext">The EF Core database context for this request.</param>
        public CatController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// GET /cats — Returns all cats with all three relations eager-loaded via <c>.Include()</c>.
        /// </summary>
        /// <returns>HTTP 200 with the list of cats (may be empty).</returns>
        [HttpGet]
        public async Task<IActionResult> FindAll()
        {
            // .Include() chains load Passport (1:1), Toys (1:N), and Owners (N:N) in a single query.
            var cats = await _dbContext.Cats
                .Include(c => c.Passport)
                .Include(c => c.Toys)
                .Include(c => c.Owners)
                .ToListAsync();
            return Ok(cats);
        }

        /// <summary>
        /// POST /cats — Creates a new cat with nested relations (passport, toys, owners).
        /// Responds with HTTP 201 Created on success.
        /// </summary>
        /// <param name="cat">Deserialized cat payload from the JSON request body.</param>
        /// <returns>HTTP 201 with the persisted cat; HTTP 400 if model validation fails.</returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Cat cat)
        {
            // Reject invalid payloads early; ModelState is populated by ASP.NET Core model binding.
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Owners in the request body may reference existing owners by ID (from previous requests).
            // Attach them from the DB context to avoid EF Core trying to INSERT duplicates with conflicting PKs.
            if (cat.Owners != null && cat.Owners.Count > 0)
            {
                var resolvedOwners = new List<Owner>();
                foreach (var owner in cat.Owners)
                {
                    if (owner.Id > 0)
                    {
                        // Try to find an already-tracked owner in the DB.
                        var existingOwner = await _dbContext.Owners.FindAsync(owner.Id);
                        if (existingOwner != null)
                        {
                            // Use the tracked entity to avoid a duplicate-key INSERT.
                            resolvedOwners.Add(existingOwner);
                        }
                        else
                        {
                            // ID was provided but not found — treat as new (let DB assign a new PK).
                            resolvedOwners.Add(owner);
                        }
                    }
                    else
                    {
                        // No ID → brand new owner; EF Core will INSERT and assign the PK.
                        resolvedOwners.Add(owner);
                    }
                }
                cat.Owners = resolvedOwners;
            }

            // EF Core change-tracker will cascade to Passport (1:1) and Toys (1:N) automatically
            // based on the navigation properties declared on Cat.
            _dbContext.Cats.Add(cat);
            await _dbContext.SaveChangesAsync();

            return StatusCode(201, cat);
        }

        /// <summary>
        /// GET /cats/{id} — Returns a single cat by primary key with all relations loaded.
        /// </summary>
        /// <param name="id">The cat's primary key.</param>
        /// <returns>HTTP 200 with the cat; HTTP 404 if not found.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> FindOne(int id)
        {
            // .Include() chains eager-load all three relation types in one DB round trip.
            var cat = await _dbContext.Cats
                .Include(c => c.Passport)
                .Include(c => c.Toys)
                .Include(c => c.Owners)
                .FirstOrDefaultAsync(c => c.Id == id);

            // Return 404 with a message body so clients can distinguish missing vs empty.
            if (cat == null)
            {
                return NotFound(new { message = $"Cat with ID {id} not found" });
            }

            return Ok(cat);
        }

        /// <summary>
        /// GET /cats/{id}/with-relations — Alias for <see cref="FindOne"/> that explicitly names
        /// the eager-loading intent. Mirrors the TypeScript API contract endpoint.
        /// </summary>
        /// <param name="id">The cat's primary key.</param>
        /// <returns>HTTP 200 with the cat and all relations; HTTP 404 if not found.</returns>
        [HttpGet("{id}/with-relations")]
        public async Task<IActionResult> FindWithRelations(int id)
        {
            // Same eager-load query as FindOne — the endpoint name signals intent to the learner.
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

        /// <summary>
        /// POST /cats/{id}/toys — Appends a new toy to an existing cat (1:N collection mutation).
        /// Responds with HTTP 201 and the updated cat (toys array enlarged).
        /// </summary>
        /// <param name="id">The cat's primary key.</param>
        /// <param name="toy">Toy data from the request body (requires at minimum a <c>name</c>).</param>
        /// <returns>HTTP 201 with the updated cat; HTTP 400 on validation failure; HTTP 404 if cat not found.</returns>
        [HttpPost("{id}/toys")]
        public async Task<IActionResult> AddToy(int id, [FromBody] Toy toy)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Verify the cat exists before attaching the toy (fail fast with a clear 404).
            var catExists = await _dbContext.Cats.AnyAsync(c => c.Id == id);
            if (!catExists)
            {
                return NotFound(new { message = $"Cat with ID {id} not found" });
            }

            // Set the FK directly on the Toy entity — EF Core writes catId to the toys table.
            // This avoids reloading the full Cat graph and re-triggering cascades on all relations.
            toy.CatId = id;
            _dbContext.Toys.Add(toy);
            await _dbContext.SaveChangesAsync();

            // Re-fetch the cat with all relations so the response reflects the new toys array.
            var updatedCat = await _dbContext.Cats
                .Include(c => c.Passport)
                .Include(c => c.Toys)
                .Include(c => c.Owners)
                .FirstOrDefaultAsync(c => c.Id == id);

            return StatusCode(201, updatedCat);
        }
    }
}
