package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Cat struct {
	ID        primitive.ObjectID     `bson:"_id,omitempty" json:"_id"`
	Name      string                 `bson:"name" json:"name" binding:"required"`
	Age       int                    `bson:"age" json:"age" binding:"required"`
	Breed     string                 `bson:"breed" json:"breed"`
	Hobbies   []string               `bson:"hobbies" json:"hobbies"`
	Metadata  map[string]interface{} `bson:"metadata" json:"metadata"`
	Likes     int                    `bson:"likes" json:"likes"`
	CreatedAt time.Time              `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time              `bson:"updatedAt" json:"updatedAt"`
	Version   int                    `bson:"__v" json:"__v"`
}

var (
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

	// Connect MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURI := getEnv("MONGO_URI", "mongodb://localhost:27017/demo")
	clientOpts := options.Client().ApplyURI(mongoURI)
	mongoClient, err = mongo.Connect(ctx, clientOpts)
	if err != nil {
		log.Fatalf("Failed to connect MongoDB: %v", err)
	}

	// Ping MongoDB
	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}

	mongoDBName := "demo"
	if u, err := url.Parse(mongoURI); err == nil {
		if len(u.Path) > 1 {
			mongoDBName = u.Path[1:]
		}
	}
	mongoColl = mongoClient.Database(mongoDBName).Collection("cats")

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Endpoints
	r.POST("/cats", createCat)
	r.GET("/cats", findAllCats)
	r.GET("/cats/search", findByName)
	r.PUT("/cats/:id", updateCat)
	r.PATCH("/cats/:id", updateCat)
	r.POST("/cats/:id/like", likeCat)

	port := getEnv("PORT", "3000")
	fmt.Printf("Go server running on port %s\n", port)
	if err := r.Run("127.0.0.1:" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func createCat(c *gin.Context) {
	var cat Cat
	if err := c.ShouldBindJSON(&cat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cat.ID = primitive.NewObjectID()
	now := time.Now().UTC()
	cat.CreatedAt = now
	cat.UpdatedAt = now
	cat.Likes = 0
	cat.Version = 0

	_, err := mongoColl.InsertOne(context.Background(), cat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cat)
}

func findAllCats(c *gin.Context) {
	hobby := c.Query("hobby")

	var cats []Cat
	filter := bson.M{}
	var findOpts *options.FindOptions

	if hobby != "" {
		filter = bson.M{"hobbies": bson.M{"$in": []string{hobby}}}
		findOpts = options.Find()
	} else {
		findOpts = options.Find().SetSort(bson.D{{Key: "age", Value: -1}}).SetLimit(10)
	}

	cursor, err := mongoColl.Find(context.Background(), filter, findOpts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &cats); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if cats == nil {
		cats = []Cat{}
	}

	c.JSON(http.StatusOK, cats)
}

func findByName(c *gin.Context) {
	name := c.Query("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'name' is required"})
		return
	}

	var cat Cat
	filter := bson.M{"name": name}
	err := mongoColl.FindOne(context.Background(), filter).Decode(&cat)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(http.StatusNotFound, gin.H{"message": fmt.Sprintf("Cat with name \"%s\" not found", name)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, cat)
}

func updateCat(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Clean up payload fields to protect values
	delete(payload, "_id")
	delete(payload, "id")
	delete(payload, "likes")
	delete(payload, "createdAt")
	delete(payload, "updatedAt")
	delete(payload, "__v")
	payload["updatedAt"] = time.Now().UTC()

	filter := bson.M{"_id": objID}
	update := bson.M{"$set": payload}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updatedCat Cat
	err = mongoColl.FindOneAndUpdate(context.Background(), filter, update, opts).Decode(&updatedCat)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(http.StatusNotFound, gin.H{"message": fmt.Sprintf("Cat with id \"%s\" not found", idStr)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, updatedCat)
}

func likeCat(c *gin.Context) {
	idStr := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	filter := bson.M{"_id": objID}
	update := bson.M{
		"$inc": bson.M{"likes": 1},
		"$set": bson.M{"updatedAt": time.Now().UTC()},
	}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updatedCat Cat
	err = mongoColl.FindOneAndUpdate(context.Background(), filter, update, opts).Decode(&updatedCat)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(http.StatusNotFound, gin.H{"message": fmt.Sprintf("Cat with id \"%s\" not found", idStr)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, updatedCat)
}
