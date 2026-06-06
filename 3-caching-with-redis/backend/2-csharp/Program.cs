using Microsoft.EntityFrameworkCore;
using caching_redis.Data;

// ─── Application builder ───────────────────────────────────────────────────────
var builder = WebApplication.CreateBuilder(args);

// Bind the listen port from the PORT env-var; default 3000 matches the lesson contract.
// Listening on localhost (not 0.0.0.0) because the backend runs on the host, not in a container.
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://localhost:{port}");

// ─── Service registrations ─────────────────────────────────────────────────────

// Register MVC controllers so [ApiController] / [Route] attributes are discovered.
builder.Services.AddControllers();

// Register EF Core with Npgsql (Postgres driver).
// Connection string is assembled from env-vars with sensible defaults matching compose.yaml.
builder.Services.AddDbContext<AppDbContext>(options =>
{
    // Read each component separately so partial overrides work (e.g. change only POSTGRES_PORT)
    var host     = Environment.GetEnvironmentVariable("POSTGRES_HOST")     ?? "localhost";
    var port     = Environment.GetEnvironmentVariable("POSTGRES_PORT")     ?? "5432";
    var user     = Environment.GetEnvironmentVariable("POSTGRES_USER")     ?? "postgres";
    var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "postgres";
    var db       = Environment.GetEnvironmentVariable("POSTGRES_DB")       ?? "demo";

    // Include Error Detail surfaces Postgres constraint/error messages in exceptions (dev only)
    var connString = $"Host={host};Port={port};Username={user};Password={password};Database={db};Include Error Detail=true";
    options.UseNpgsql(connString);
});

// Register IDistributedCache backed by StackExchange.Redis.
// This single registration covers all three cache layers (response, logic, db-query).
builder.Services.AddStackExchangeRedisCache(options =>
{
    var redisHost = Environment.GetEnvironmentVariable("REDIS_HOST") ?? "localhost";
    var redisPort = Environment.GetEnvironmentVariable("REDIS_PORT") ?? "6379";
    // StackExchange.Redis expects "host:port" configuration string
    options.Configuration = $"{redisHost}:{redisPort}";
});

// ─── Build and configure the middleware pipeline ───────────────────────────────
var app = builder.Build();

// EnsureCreated creates tables if they do not exist (dev convenience; use migrations in production).
// Runs once at startup inside a short-lived DI scope.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

// Map all controller routes — attribute routing picks up [Route] on each controller
app.MapControllers();

app.Run();
