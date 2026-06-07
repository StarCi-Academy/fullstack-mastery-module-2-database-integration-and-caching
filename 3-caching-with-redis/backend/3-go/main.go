// Package main implements the caching-with-redis demo backend in Go.
// It exposes the same REST API contract as the TypeScript, Java, and C# variants
// so learners can observe three Redis caching layers in a language they know:
//
//   - Layer 1 (DB)      — manual cache-aside wrapping a GORM SELECT query.
//   - Layer 2 (Logic)   — manual cache-aside for a slow computation (1 s delay on MISS).
//   - Layer 3 (Response)— manual cache-aside mimicking HTTP-response-level caching.
//
// All three layers share the same go-redis client and use explicit GET/SETEX/DEL calls
// (no abstraction library), which makes the caching mechanics transparent to the reader.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Cat is the GORM model mapped to the `cats` PostgreSQL table.
// Intentionally simple (id, name, breed) so the lesson focuses on caching, not ORM complexity.
// The `json` struct tags ensure the JSON field names match the shared API contract.
type Cat struct {
	ID    uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name  string `gorm:"not null" json:"name"`
	Breed string `gorm:"not null" json:"breed"`
}

// Package-level singletons shared across all request handlers.
// In a production app these would be injected; here they are globals for demo simplicity.
var (
	db  *gorm.DB         // GORM database handle connected to Postgres
	rdb *redis.Client    // go-redis client connected to Redis
	ctx = context.Background() // Background context reused for all Redis operations
)

// Redis cache key constants — must match across all four language implementations
// so the E2E test suite can verify consistent behaviour.
const (
	responseCacheKey = "cats_res_layer"        // Layer 3: HTTP response cache
	logicCacheKey    = "cats_logic_layer_cache" // Layer 2: business logic cache
	dbQueryCacheKey  = "cats_db_layer_cache"    // Layer 1: DB query result cache
)

// getEnv returns the value of the environment variable named `key`,
// or `defaultVal` when the variable is not set.
// This keeps the server runnable without any .env file using the Docker Compose defaults.
func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return defaultVal
}

// main bootstraps the application:
//  1. Opens a GORM/Postgres connection and runs AutoMigrate to create the `cats` table.
//  2. Opens a go-redis connection and pings to verify connectivity.
//  3. Registers all HTTP routes on a Gin engine.
//  4. Starts listening on the configured port (default 3000).
func main() {
	var err error

	// ── Connect Postgres via GORM ─────────────────────────────────────────────
	// Build the DSN from env-vars with defaults matching compose.yaml
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		getEnv("POSTGRES_HOST", "localhost"),
		getEnv("POSTGRES_USER", "postgres"),
		getEnv("POSTGRES_PASSWORD", "postgres"),
		getEnv("POSTGRES_DB", "demo"),
		getEnv("POSTGRES_PORT", "5432"),
	)
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		// Fatal: the server cannot function without a DB connection
		log.Fatalf("Failed to connect PostgreSQL: %v", err)
	}

	// AutoMigrate creates the `cats` table if it does not exist (dev convenience)
	if err := db.AutoMigrate(&Cat{}); err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	// ── Connect Redis via go-redis ────────────────────────────────────────────
	redisAddr := fmt.Sprintf("%s:%s", getEnv("REDIS_HOST", "localhost"), getEnv("REDIS_PORT", "6379"))
	rdb = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	// Ping to fail fast if Redis is unreachable rather than getting cryptic errors later
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect Redis: %v", err)
	}

	// ── Gin HTTP router ───────────────────────────────────────────────────────
	gin.SetMode(gin.ReleaseMode) // suppress debug log noise; keep output clean for demo

	r := gin.Default() // Default includes Logger + Recovery middleware

	// Register all routes — order matters for Gin's trie-based router
	r.POST("/cats/seed", seedCats)
	r.GET("/cats/response-layer", getResponseLayer)
	r.DELETE("/cats/response-layer/cache", deleteResponseLayerCache)
	r.GET("/cats/logic-layer", getLogicLayer)
	r.DELETE("/cats/logic-layer/cache", deleteLogicLayerCache)
	r.GET("/cats/db-layer", getDbLayer)
	r.DELETE("/cats/db-layer/cache", deleteDbLayerCache)
	r.GET("/cats/all-layers/:id", getAllLayers)
	r.DELETE("/cats/all-layers/cache", deleteAllLayersCache)

	port := getEnv("PORT", "3000")
	// Bind to 127.0.0.1 (loopback only) to avoid Windows Firewall popup on 0.0.0.0/::
	addr := "127.0.0.1:" + port
	fmt.Printf("Go server running on %s\n", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// seedCats handles POST /cats/seed?count={n}.
// Inserts `count` random Cat rows into Postgres in a single bulk CREATE call.
// A large count (e.g. 1000) makes the DB-layer MISS latency visible in the timing log.
func seedCats(c *gin.Context) {
	// Parse the count query param; default to 1000 if absent
	countStr := c.DefaultQuery("count", "1000")
	count, err := strconv.Atoi(countStr)
	if err != nil || count <= 0 {
		// Reject invalid or non-positive values early
		c.JSON(http.StatusBadRequest, gin.H{"error": "count must be a positive integer"})
		return
	}

	// Predefined pools for random name and breed assignment
	names  := []string{"Milo", "Luna", "Oliver", "Leo", "Bella", "Charlie", "Lilly", "Lucy", "Simba", "Chloe"}
	breeds := []string{"Siamese", "Bengal", "Persian", "Maine Coon", "Ragdoll", "Abyssinian", "Birman", "Sphynx"}

	// Pre-allocate the slice to avoid repeated append reallocations
	cats := make([]Cat, count)
	for i := 0; i < count; i++ {
		cats[i] = Cat{
			// Append loop index so each name is unique and traceable in the DB
			Name:  names[rand.Intn(len(names))] + " #" + strconv.Itoa(i+1),
			Breed: breeds[rand.Intn(len(breeds))],
		}
	}

	// GORM bulk insert — one SQL INSERT with multiple value tuples
	if err := db.Create(&cats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Seed completed successfully.",
		"inserted": count,
	})
}

// getResponseLayer handles GET /cats/response-layer.
// Layer 3 (Response) cache-aside: check Redis first; on MISS simulate 1 s work then populate cache.
// First call ~1 s; subsequent calls within the 30 s TTL are instant.
func getResponseLayer(c *gin.Context) {
	// Attempt HIT — rdb.Get returns redis.Nil on miss (non-nil error)
	val, err := rdb.Get(ctx, responseCacheKey).Result()
	if err == nil {
		// HIT path: return the cached string directly without any delay
		c.String(http.StatusOK, val)
		return
	}

	// MISS path: simulate 1 s controller-layer work so the latency gap is visible
	time.Sleep(1 * time.Second)
	result := "This data would be cached at the Controller level using CacheInterceptor"

	// Populate Redis with a 30 s TTL; ignore the error (non-fatal — response is still correct)
	_ = rdb.Set(ctx, responseCacheKey, result, 30*time.Second).Err()
	c.String(http.StatusOK, result)
}

// deleteResponseLayerCache handles DELETE /cats/response-layer/cache.
// Removes the Layer 3 Redis key so the next GET /cats/response-layer is a cold MISS.
func deleteResponseLayerCache(c *gin.Context) {
	_ = rdb.Del(ctx, responseCacheKey).Err()
	c.JSON(http.StatusOK, gin.H{
		"message":  "Response-layer cache key was cleared successfully.",
		"cacheKey": responseCacheKey,
	})
}

// getLogicLayer handles GET /cats/logic-layer.
// Layer 2 (Logic) cache-aside: on HIT returns the frozen timestamp from Redis;
// on MISS simulates 1 s heavy computation and stores the result for 60 s.
// Two consecutive calls return the same timestamp — the key proof that caching is active.
func getLogicLayer(c *gin.Context) {
	// Attempt HIT — rdb.Get returns the stored JSON bytes as a string
	val, err := rdb.Get(ctx, logicCacheKey).Result()
	if err == nil {
		// HIT path: forward the raw JSON bytes — avoids double-marshal overhead
		c.Data(http.StatusOK, "application/json", []byte(val))
		return
	}

	// MISS path: simulate expensive business logic (1 second delay)
	time.Sleep(1 * time.Second)
	result := map[string]string{
		"message":   "Hải sản cho mèo cực phẩm",
		// Record the timestamp at MISS time; HIT path returns the same value (proof of caching)
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
	}

	// Serialise to JSON and store in Redis with a 60 s TTL
	bytes, _ := json.Marshal(result)
	_ = rdb.Set(ctx, logicCacheKey, bytes, 60*time.Second).Err()

	c.JSON(http.StatusOK, result)
}

// deleteLogicLayerCache handles DELETE /cats/logic-layer/cache.
// Removes the Layer 2 Redis key so the next GET /cats/logic-layer takes ~1 s again.
func deleteLogicLayerCache(c *gin.Context) {
	_ = rdb.Del(ctx, logicCacheKey).Err()
	c.JSON(http.StatusOK, gin.H{
		"message":  "Logic-layer cache key was cleared successfully.",
		"cacheKey": logicCacheKey,
	})
}

// getDbLayer handles GET /cats/db-layer.
// Layer 1 (DB) cache-aside: on HIT returns the Redis-cached JSON (very fast);
// on MISS runs a real GORM SELECT on potentially 1000 rows (slower) and caches the result.
func getDbLayer(c *gin.Context) {
	// Attempt HIT — return the serialised JSON bytes without hitting Postgres
	val, err := rdb.Get(ctx, dbQueryCacheKey).Result()
	if err == nil {
		// HIT: forward the stored JSON directly (no re-marshalling)
		c.Data(http.StatusOK, "application/json", []byte(val))
		return
	}

	// MISS: run the real Postgres query (may be slow with 1000+ rows)
	var cats []Cat
	if err := db.Find(&cats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Serialise and cache with a 30 s TTL so the next call hits the HIT path
	bytes, _ := json.Marshal(cats)
	_ = rdb.Set(ctx, dbQueryCacheKey, bytes, 30*time.Second).Err()

	c.JSON(http.StatusOK, cats)
}

// deleteDbLayerCache handles DELETE /cats/db-layer/cache.
// Removes the Layer 1 Redis key; the next GET /cats/db-layer will hit Postgres again.
func deleteDbLayerCache(c *gin.Context) {
	_ = rdb.Del(ctx, dbQueryCacheKey).Err()
	c.JSON(http.StatusOK, gin.H{
		"message":  "DB query-layer cache key was cleared successfully.",
		"cacheKey": dbQueryCacheKey,
	})
}

// getAllLayers handles GET /cats/all-layers/{id}.
// Warms all 3 cache layers in order and returns a compact snapshot.
// The `id` path parameter is a learner-chosen scenario tag and is not used by the handler.
func getAllLayers(c *gin.Context) {
	// ── Layer 3: response cache ──────────────────────────────────────────────
	responseSample, err := rdb.Get(ctx, responseCacheKey).Result()
	if err != nil {
		// MISS: simulate work and populate the response cache
		time.Sleep(1 * time.Second)
		responseSample = "This data would be cached at the Controller level using CacheInterceptor"
		_ = rdb.Set(ctx, responseCacheKey, responseSample, 30*time.Second).Err()
	}

	// ── Layer 2: logic cache ─────────────────────────────────────────────────
	var logicSample map[string]string
	logicVal, err := rdb.Get(ctx, logicCacheKey).Result()
	if err == nil {
		// HIT: unmarshal the cached JSON into the map
		_ = json.Unmarshal([]byte(logicVal), &logicSample)
	} else {
		// MISS: simulate heavy logic and populate the logic cache
		time.Sleep(1 * time.Second)
		logicSample = map[string]string{
			"message":   "Hải sản cho mèo cực phẩm",
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		}
		bytes, _ := json.Marshal(logicSample)
		_ = rdb.Set(ctx, logicCacheKey, bytes, 60*time.Second).Err()
	}

	// ── Layer 1: DB query cache ──────────────────────────────────────────────
	var cats []Cat
	dbVal, err := rdb.Get(ctx, dbQueryCacheKey).Result()
	if err == nil {
		// HIT: deserialise the cached JSON into the cats slice
		_ = json.Unmarshal([]byte(dbVal), &cats)
	} else {
		// MISS: run the real Postgres query and populate the DB cache
		_ = db.Find(&cats).Error
		bytes, _ := json.Marshal(cats)
		_ = rdb.Set(ctx, dbQueryCacheKey, bytes, 30*time.Second).Err()
	}

	// Return a compact summary so the learner can confirm all caches are warm
	c.JSON(http.StatusOK, gin.H{
		"responseSample": responseSample,
		"logicSample":    logicSample,
		"dbCount":        len(cats),
	})
}

// deleteAllLayersCache handles DELETE /cats/all-layers/cache.
// Cascade-invalidates all 3 Redis keys in a single DEL command (multi-key DEL is atomic).
// After this call every layer endpoint will return a cold MISS on the next request.
func deleteAllLayersCache(c *gin.Context) {
	// Redis DEL accepts multiple keys — removes all 3 in one round-trip
	_ = rdb.Del(ctx, responseCacheKey, logicCacheKey, dbQueryCacheKey).Err()
	c.JSON(http.StatusOK, gin.H{
		"message": "All 3 cache layers cleared. Next /cats/all-layers/:id will MISS on every layer.",
		"cleared": gin.H{
			"responseLayer": responseCacheKey,
			"logicLayer":    logicCacheKey,
			"dbLayer":       dbQueryCacheKey,
		},
	})
}
