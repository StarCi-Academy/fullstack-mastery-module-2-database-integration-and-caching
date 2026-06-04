using Microsoft.EntityFrameworkCore;
using caching_redis.Data;

var builder = WebApplication.CreateBuilder(args);

// Port setup to 3000
builder.WebHost.UseUrls("http://localhost:3000");

// Services configuration
builder.Services.AddControllers();

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

// Redis setup
builder.Services.AddStackExchangeRedisCache(options =>
{
    var redisHost = Environment.GetEnvironmentVariable("REDIS_HOST") ?? "localhost";
    var redisPort = Environment.GetEnvironmentVariable("REDIS_PORT") ?? "6379";
    options.Configuration = $"{redisHost}:{redisPort}";
});

var app = builder.Build();

// Ensure Database and tables are created
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

app.MapControllers();

app.Run();
