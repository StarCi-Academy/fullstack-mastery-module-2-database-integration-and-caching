using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using cat_relations.Data;

var builder = WebApplication.CreateBuilder(args);

// Read port from environment so the demo can be run on a custom port without code changes.
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
// UseUrls overrides launchSettings.json; bind loopback only to avoid Windows firewall prompts.
builder.WebHost.UseUrls($"http://localhost:{port}");

// --- Service registration ---

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Prevent infinite recursion when EF Core navigation properties form cycles
        // (e.g. Cat → Toys → Cat → …). IgnoreCycles writes null instead of throwing.
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // Omit null fields from the JSON response for a cleaner shape matching TypeScript output.
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// Register EF Core with Npgsql (PostgreSQL) provider.
// Connection string is built from environment variables with sensible local-dev defaults.
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
    var dbPort = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
    var user = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "postgres";
    var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "postgres";
    var db = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "demo";
    // Include Error Detail exposes Postgres error messages in development (do not enable in production).
    var connString = $"Host={host};Port={dbPort};Username={user};Password={password};Database={db};Include Error Detail=true";
    options.UseNpgsql(connString);
});

var app = builder.Build();

// --- Schema initialisation ---

// EnsureCreated creates the schema from EF Core model if it does not already exist.
// For demo only — production should use migrations (`dotnet ef migrations add` / `database update`).
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

// --- Middleware pipeline ---

// Map attribute-routed controllers (e.g. [Route("cats")]).
app.MapControllers();

app.Run();
