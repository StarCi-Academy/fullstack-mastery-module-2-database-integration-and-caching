package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type SqlComparisonItem struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Title     string    `gorm:"type:varchar(255);not null" json:"title"`
	Amount    float64   `gorm:"type:double precision;not null" json:"amount"`
	CreatedAt time.Time `gorm:"type:timestamp with time zone;not null;default:CURRENT_TIMESTAMP" json:"createdAt"`
}

func (SqlComparisonItem) TableName() string {
	return "comparison_items"
}

type NoSqlComparisonItem struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Title     string             `bson:"title" json:"title"`
	Amount    float64            `bson:"amount" json:"amount"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
	Version   int                `bson:"__v" json:"__v"`
}

type CreateCompareDto struct {
	Title  string  `json:"title" binding:"required"`
	Amount float64 `json:"amount" binding:"required"`
}

var (
	sqlDB       *gorm.DB
	mongoClient *mongo.Client
	mongoColl   *mongo.Collection
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
		getEnv("POSTGRES_USER", "starci_user"),
		getEnv("POSTGRES_PASSWORD", "starci_password"),
		getEnv("POSTGRES_DB", "starci_sql_db"),
		getEnv("POSTGRES_PORT", "5432"),
	)
	sqlDB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect PostgreSQL: %v", err)
	}

	// Auto migrate PostgreSQL
	if err := sqlDB.AutoMigrate(&SqlComparisonItem{}); err != nil {
		log.Fatalf("Failed to auto migrate PostgreSQL: %v", err)
	}

	// Connect MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURI := getEnv("MONGO_URI", "mongodb://starci_admin:starci_password@localhost:27017/starci_nosql_db?authSource=admin")
	clientOpts := options.Client().ApplyURI(mongoURI)
	mongoClient, err = mongo.Connect(ctx, clientOpts)
	if err != nil {
		log.Fatalf("Failed to connect MongoDB: %v", err)
	}

	// Ping MongoDB
	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}

	mongoDBName := "starci_nosql_db"
	if u, err := url.Parse(mongoURI); err == nil {
		if len(u.Path) > 1 {
			mongoDBName = u.Path[1:]
		}
	}
	mongoColl = mongoClient.Database(mongoDBName).Collection("comparison_items")

	// Set Gin mode
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Endpoints
	r.POST("/compare/write", writeHandler)
	r.GET("/compare/read", readHandler)
	r.GET("/compare/timings", timingsHandler)
	r.DELETE("/compare/all", deleteAllHandler)

	port := getEnv("PORT", "3000")
	fmt.Printf("Go server running on port %s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run HTTP server: %v", err)
	}
}

func writeHandler(c *gin.Context) {
	var dto CreateCompareDto
	if err := c.ShouldBindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now().UTC()

	// Prepare records
	sqlItem := SqlComparisonItem{
		ID:        uuid.New(),
		Title:     dto.Title,
		Amount:    dto.Amount,
		CreatedAt: now,
	}

	noSqlItem := NoSqlComparisonItem{
		ID:        primitive.NewObjectID(),
		Title:     dto.Title,
		Amount:    dto.Amount,
		CreatedAt: now,
		UpdatedAt: now,
		Version:   0,
	}

	// Run in parallel
	errChan := make(chan error, 2)

	go func() {
		errChan <- sqlDB.Create(&sqlItem).Error
	}()

	go func() {
		_, err := mongoColl.InsertOne(context.Background(), noSqlItem)
		errChan <- err
	}()

	// Wait for both
	for i := 0; i < 2; i++ {
		if err := <-errChan; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Saved to both SQL and NoSQL stores.",
		"sql": gin.H{
			"id":        sqlItem.ID.String(),
			"title":     sqlItem.Title,
			"amount":    sqlItem.Amount,
			"createdAt": sqlItem.CreatedAt.Format(time.RFC3339Nano),
		},
		"noSql": gin.H{
			"id":        noSqlItem.ID.Hex(),
			"title":     noSqlItem.Title,
			"amount":    noSqlItem.Amount,
			"createdAt": noSqlItem.CreatedAt.Format(time.RFC3339Nano),
		},
	})
}

func readHandler(c *gin.Context) {
	var sqlItems []SqlComparisonItem
	var noSqlItems []NoSqlComparisonItem

	errChan := make(chan error, 2)

	go func() {
		errChan <- sqlDB.Order("created_at DESC").Limit(20).Find(&sqlItems).Error
	}()

	go func() {
		opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(20)
		cursor, err := mongoColl.Find(context.Background(), bson.D{}, opts)
		if err != nil {
			errChan <- err
			return
		}
		defer cursor.Close(context.Background())
		errChan <- cursor.All(context.Background(), &noSqlItems)
	}()

	for i := 0; i < 2; i++ {
		if err := <-errChan; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Ensure empty slices are serialized as empty arrays instead of null
	if sqlItems == nil {
		sqlItems = []SqlComparisonItem{}
	}
	if noSqlItems == nil {
		noSqlItems = []NoSqlComparisonItem{}
	}

	c.JSON(http.StatusOK, gin.H{
		"sqlCount":   len(sqlItems),
		"noSqlCount": len(noSqlItems),
		"sqlItems":   sqlItems,
		"noSqlItems": noSqlItems,
	})
}

func timingsHandler(c *gin.Context) {
	// SQL timing
	sqlStart := time.Now()
	var sqlItems []SqlComparisonItem
	if err := sqlDB.Order("created_at DESC").Limit(20).Find(&sqlItems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	sqlMs := float64(time.Since(sqlStart).Nanoseconds()) / 1e6
	sqlMs = math.Round(sqlMs*1000) / 1000

	// NoSQL timing
	noSqlStart := time.Now()
	var noSqlItems []NoSqlComparisonItem
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(20)
	cursor, err := mongoColl.Find(context.Background(), bson.D{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(context.Background())
	if err := cursor.All(context.Background(), &noSqlItems); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	noSqlMs := float64(time.Since(noSqlStart).Nanoseconds()) / 1e6
	noSqlMs = math.Round(noSqlMs*1000) / 1000

	deltaMs := sqlMs - noSqlMs
	deltaMs = math.Round(deltaMs*1000) / 1000

	c.JSON(http.StatusOK, gin.H{
		"sqlMs":   sqlMs,
		"noSqlMs": noSqlMs,
		"deltaMs": deltaMs,
	})
}

func deleteAllHandler(c *gin.Context) {
	// SQL count
	var pgBefore int64
	if err := sqlDB.Model(&SqlComparisonItem{}).Count(&pgBefore).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Truncate SQL
	if err := sqlDB.Exec("TRUNCATE TABLE comparison_items RESTART IDENTITY CASCADE").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// NoSQL count
	mongoBefore, err := mongoColl.CountDocuments(context.Background(), bson.D{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Delete NoSQL
	if _, err := mongoColl.DeleteMany(context.Background(), bson.D{}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"pgDeleted":    pgBefore,
		"mongoDeleted": mongoBefore,
	})
}
