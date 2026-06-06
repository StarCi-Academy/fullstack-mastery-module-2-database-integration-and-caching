using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

// Port setup to 3000
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
builder.WebHost.UseUrls($"http://localhost:{port}");

// Services configuration
builder.Services.AddControllers();

// MongoDB Context setup
builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var mongoUri = Environment.GetEnvironmentVariable("MONGO_URI") 
        ?? "mongodb://localhost:27017/demo";
    var client = new MongoClient(mongoUri);
    var url = new MongoUrl(mongoUri);
    var dbName = url.DatabaseName ?? "demo";
    return client.GetDatabase(dbName);
});

var app = builder.Build();

app.MapControllers();

app.Run();
