package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Owner struct {
	ID   uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name string `gorm:"not null" json:"name"`
}

type Toy struct {
	ID    uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name  string `gorm:"not null" json:"name"`
	CatID uint   `gorm:"column:catId" json:"-"`
}

type CatPassport struct {
	ID             uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	PassportNumber string `gorm:"column:passportNumber;not null" json:"passportNumber"`
	CatID          uint   `gorm:"column:catId" json:"-"`
}

func (CatPassport) TableName() string {
	return "cat_passports"
}

type Cat struct {
	ID       uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	Name     string      `gorm:"not null" json:"name"`
	Passport CatPassport `gorm:"foreignKey:CatID;constraint:OnDelete:CASCADE" json:"passport"`
	Toys     []Toy       `gorm:"foreignKey:CatID;constraint:OnDelete:CASCADE" json:"toys"`
	Owners   []Owner     `gorm:"many2many:cats_owners_owners;joinForeignKey:catsId;joinReferences:ownersId" json:"owners"`
}

var db *gorm.DB

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
	err = db.AutoMigrate(&Cat{}, &CatPassport{}, &Toy{}, &Owner{})
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Endpoints
	r.GET("/cats", findAllCats)
	r.POST("/cats", createCat)
	r.GET("/cats/:id", findOneCat)
	r.GET("/cats/:id/with-relations", findOneCatWithRelations)
	r.POST("/cats/:id/toys", addToyToCat)

	port := getEnv("PORT", "3000")
	fmt.Printf("Go server running on port %s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func findAllCats(c *gin.Context) {
	var cats []Cat
	if err := db.Preload("Passport").Preload("Toys").Preload("Owners").Find(&cats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cats)
}

func createCat(c *gin.Context) {
	var cat Cat
	if err := c.ShouldBindJSON(&cat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Resolve existing owners to avoid inserting duplicates
	if len(cat.Owners) > 0 {
		var resolvedOwners []Owner
		for _, owner := range cat.Owners {
			if owner.ID > 0 {
				var existing Owner
				if err := db.First(&existing, owner.ID).Error; err == nil {
					resolvedOwners = append(resolvedOwners, existing)
				} else {
					resolvedOwners = append(resolvedOwners, owner)
				}
			} else {
				resolvedOwners = append(resolvedOwners, owner)
			}
		}
		cat.Owners = resolvedOwners
	}

	if err := db.Create(&cat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cat)
}

func findOneCat(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var cat Cat
	if err := db.Preload("Passport").Preload("Toys").Preload("Owners").First(&cat, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"message": fmt.Sprintf("Cat with ID %d not found", id)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, cat)
}

func findOneCatWithRelations(c *gin.Context) {
	findOneCat(c)
}

func addToyToCat(c *gin.Context) {
	idStr := c.Param("id")
	catID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var cat Cat
	if err := db.First(&cat, catID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"message": fmt.Sprintf("Cat with ID %d not found", catID)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	var toy Toy
	if err := c.ShouldBindJSON(&toy); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	toy.CatID = uint(catID)
	if err := db.Create(&toy).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fetch refreshed cat
	if err := db.Preload("Passport").Preload("Toys").Preload("Owners").First(&cat, catID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cat)
}
