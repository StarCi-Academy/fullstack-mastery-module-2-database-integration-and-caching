using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using cat_relations.Data;

var builder = WebApplication.CreateBuilder(args);

// Port setup to 3000
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://localhost:{port}");

// Services configuration
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Avoid reference cycles during entity serialization
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // Ignore null properties for cleaner JSON output matching typescript shape
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// Postgres DB Context setup
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
    var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
    var user = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "postgres";
    var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "postgres";
    var db = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "demo";
    var connString = $"Host={host};Port={port};Username={user};Password={password};Database={db};Include Error Detail=true";
    options.UseNpgsql(connString);
});

var app = builder.Build();

// Ensure DB and Tables are created automatically on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

app.MapControllers();

app.Run();
