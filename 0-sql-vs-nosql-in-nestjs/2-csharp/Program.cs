using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using sql_vs_nosql.Data;

var builder = WebApplication.CreateBuilder(args);

// Port setup to 3000
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://localhost:{port}");

// Services configuration
builder.Services.AddControllers();

// Postgres DB Context
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
    var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
    var user = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "starci_user";
    var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "starci_password";
    var db = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "starci_sql_db";
    var connString = $"Host={host};Port={port};Username={user};Password={password};Database={db};Include Error Detail=true";
    options.UseNpgsql(connString);
});

// MongoDB Context
builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var mongoUri = Environment.GetEnvironmentVariable("MONGO_URI") 
        ?? "mongodb://starci_admin:starci_password@localhost:27017/starci_nosql_db?authSource=admin";
    var client = new MongoClient(mongoUri);
    var url = new MongoUrl(mongoUri);
    var dbName = url.DatabaseName ?? "starci_nosql_db";
    return client.GetDatabase(dbName);
});

var app = builder.Build();

// Auto-create database & table
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

app.MapControllers();

app.Run();
