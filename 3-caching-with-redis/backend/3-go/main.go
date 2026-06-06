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

type Cat struct {
	ID    uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name  string `gorm:"not null" json:"name"`
	Breed string `gorm:"not null" json:"breed"`
}

var (
	db  *gorm.DB
	rdb *redis.Client
	ctx = context.Background()
)

const (
	responseCacheKey = "cats_res_layer"
	logicCacheKey    = "cats_logic_layer_cache"
	dbQueryCacheKey  = "cats_db_layer_cache"
)

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return defaultVal
}

func main() {
	var err error

	// Connect PostgreSQL
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		getEnv("POSTGRES_HOST", "localhost"),
		getEnv("POSTGRES_USER", "postgres"),
		getEnv("POSTGRES_PASSWORD", "postgres"),
		getEnv("POSTGRES_DB", "demo"),
		getEnv("POSTGRES_PORT", "5432"),
	)
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect PostgreSQL: %v", err)
	}

	// Auto Migrate
	if err := db.AutoMigrate(&Cat{}); err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	// Connect Redis
	redisAddr := fmt.Sprintf("%s:%s", getEnv("REDIS_HOST", "localhost"), getEnv("REDIS_PORT", "6379"))
	rdb = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect Redis: %v", err)
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Endpoints
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
	fmt.Printf("Go server running on port %s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func seedCats(c *gin.Context) {
	countStr := c.DefaultQuery("count", "1000")
	count, err := strconv.Atoi(countStr)
	if err != nil || count <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "count must be a positive integer"})
		return
	}

	names := []string{"Milo", "Luna", "Oliver", "Leo", "Bella", "Charlie", "Lilly", "Lucy", "Simba", "Chloe"}
	breeds := []string{"Siamese", "Bengal", "Persian", "Maine Coon", "Ragdoll", "Abyssinian", "Birman", "Sphynx"}

	cats := make([]Cat, count)
	for i := 0; i < count; i++ {
		cats[i] = Cat{
			Name:  names[rand.Intn(len(names))] + " #" + strconv.Itoa(i+1),
			Breed: breeds[rand.Intn(len(breeds))],
		}
	}

	if err := db.Create(&cats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Seed completed successfully.",
		"inserted": count,
	})
}

func getResponseLayer(c *gin.Context) {
	val, err := rdb.Get(ctx, responseCacheKey).Result()
	if err == nil {
		c.String(http.StatusOK, val)
		return
	}

	// Simulate controller work for 1 second
	time.Sleep(1 * time.Second)
	result := "This data would be cached at the Controller level using CacheInterceptor"

	_ = rdb.Set(ctx, responseCacheKey, result, 30*time.Second).Err()
	c.String(http.StatusOK, result)
}

func deleteResponseLayerCache(c *gin.Context) {
	_ = rdb.Del(ctx, responseCacheKey).Err()
	c.JSON(http.StatusOK, gin.H{
		"message":  "Response-layer cache key was cleared successfully.",
		"cacheKey": responseCacheKey,
	})
}

func getLogicLayer(c *gin.Context) {
	val, err := rdb.Get(ctx, logicCacheKey).Result()
	if err == nil {
		c.Data(http.StatusOK, "application/json", []byte(val))
		return
	}

	// Simulate heavy logic work for 1 second
	time.Sleep(1 * time.Second)
	result := map[string]string{
		"message":   "Hải sản cho mèo cực phẩm",
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
	}

	bytes, _ := json.Marshal(result)
	_ = rdb.Set(ctx, logicCacheKey, bytes, 60*time.Second).Err()

	c.JSON(http.StatusOK, result)
}

func deleteLogicLayerCache(c *gin.Context) {
	_ = rdb.Del(ctx, logicCacheKey).Err()
	c.JSON(http.StatusOK, gin.H{
		"message":  "Logic-layer cache key was cleared successfully.",
		"cacheKey": logicCacheKey,
	})
}

func getDbLayer(c *gin.Context) {
	val, err := rdb.Get(ctx, dbQueryCacheKey).Result()
	if err == nil {
		c.Data(http.StatusOK, "application/json", []byte(val))
		return
	}

	var cats []Cat
	if err := db.Find(&cats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	bytes, _ := json.Marshal(cats)
	_ = rdb.Set(ctx, dbQueryCacheKey, bytes, 30*time.Second).Err()

	c.JSON(http.StatusOK, cats)
}

func deleteDbLayerCache(c *gin.Context) {
	_ = rdb.Del(ctx, dbQueryCacheKey).Err()
	c.JSON(http.StatusOK, gin.H{
		"message":  "DB query-layer cache key was cleared successfully.",
		"cacheKey": dbQueryCacheKey,
	})
}

func getAllLayers(c *gin.Context) {
	// 1. Response Layer cache
	responseSample, err := rdb.Get(ctx, responseCacheKey).Result()
	if err != nil {
		time.Sleep(1 * time.Second)
		responseSample = "This data would be cached at the Controller level using CacheInterceptor"
		_ = rdb.Set(ctx, responseCacheKey, responseSample, 30*time.Second).Err()
	}

	// 2. Logic Layer cache
	var logicSample map[string]string
	logicVal, err := rdb.Get(ctx, logicCacheKey).Result()
	if err == nil {
		_ = json.Unmarshal([]byte(logicVal), &logicSample)
	} else {
		time.Sleep(1 * time.Second)
		logicSample = map[string]string{
			"message":   "Hải sản cho mèo cực phẩm",
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		}
		bytes, _ := json.Marshal(logicSample)
		_ = rdb.Set(ctx, logicCacheKey, bytes, 60*time.Second).Err()
	}

	// 3. DB Layer cache
	var cats []Cat
	dbVal, err := rdb.Get(ctx, dbQueryCacheKey).Result()
	if err == nil {
		_ = json.Unmarshal([]byte(dbVal), &cats)
	} else {
		_ = db.Find(&cats).Error
		bytes, _ := json.Marshal(cats)
		_ = rdb.Set(ctx, dbQueryCacheKey, bytes, 30*time.Second).Err()
	}

	c.JSON(http.StatusOK, gin.H{
		"responseSample": responseSample,
		"logicSample":    logicSample,
		"dbCount":        len(cats),
	})
}

func deleteAllLayersCache(c *gin.Context) {
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
