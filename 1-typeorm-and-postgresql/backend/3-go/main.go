// Package main implements a Cat ORM demo using GORM + PostgreSQL (Gin HTTP server).
// It demonstrates the three ORM relation cardinalities:
//   - 1:1 — Cat ↔ CatPassport (Cat holds the FK via foreignKey:CatID)
//   - 1:N — Cat ↔ Toy (Toy holds catId FK; foreignKey:CatID)
//   - N:N — Cat ↔ Owner (join table cats_owners_owners; joinForeignKey:catsId + joinReferences:ownersId)
//
// All endpoints mirror the TypeScript/NestJS contract so learners can compare implementations.
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

// Owner represents a cat owner — the inverse side of the N:N relation.
// json:"-" is omitted on fields that would cause JSON cycles; the Cats field is not serialised.
type Owner struct {
	// ID is the auto-incremented primary key.
	ID uint `gorm:"primaryKey;autoIncrement" json:"id"`
	// Name is the owner's display name (e.g. "Alice").
	Name string `gorm:"not null" json:"name"`
}

// Toy represents a cat's toy — holds the FK (catId) for the 1:N relation.
// json:"-" on CatID suppresses the raw FK integer from the JSON response (only id and name are exposed).
type Toy struct {
	// ID is the auto-incremented primary key.
	ID uint `gorm:"primaryKey;autoIncrement" json:"id"`
	// Name is the toy's display name (e.g. "Ball").
	Name string `gorm:"not null" json:"name"`
	// CatID is the FK column referencing the owning Cat. Hidden from JSON to keep the response clean.
	CatID uint `gorm:"column:catId" json:"-"`
}

// CatPassport represents the 1:1 relation entity — each cat has exactly one passport.
// CatID is the FK column on this table pointing back to the Cat that owns this passport.
type CatPassport struct {
	// ID is the auto-incremented primary key.
	ID uint `gorm:"primaryKey;autoIncrement" json:"id"`
	// PassportNumber is the passport identifier string (e.g. "CAT-001").
	// gorm:"column:passportNumber" forces the camelCase column name for cross-lang schema parity.
	PassportNumber string `gorm:"column:passportNumber;not null" json:"passportNumber"`
	// CatID is the FK column pointing to the owning Cat. Hidden from JSON.
	CatID uint `gorm:"column:catId" json:"-"`
}

// TableName overrides the default GORM table name (would be "cat_passports" by convention anyway,
// but explicit override makes the intent clear and avoids issues if the struct is renamed).
func (CatPassport) TableName() string {
	return "cat_passports"
}

// Cat is the central domain entity — maps to the cats table and holds three relation fields.
//
// GORM relation tags:
//   - Passport: foreignKey:CatID — GORM looks for CatID on CatPassport to link the 1:1 side.
//   - Toys:     foreignKey:CatID — GORM looks for CatID on Toy for the 1:N relation.
//   - Owners:   many2many:cats_owners_owners — GORM manages the join table; joinForeignKey/joinReferences
//     match the column names used by TypeORM so all four backends share an identical schema.
type Cat struct {
	// ID is the auto-incremented primary key.
	ID uint `gorm:"primaryKey;autoIncrement" json:"id"`
	// Name is the cat's display name (e.g. "Milo").
	Name string `gorm:"not null" json:"name"`
	// Passport is the 1:1 associated passport. GORM uses CatPassport.CatID as the FK.
	Passport CatPassport `gorm:"foreignKey:CatID;constraint:OnDelete:CASCADE" json:"passport"`
	// Toys is the 1:N collection. Each Toy has a catId FK pointing to this Cat.
	Toys []Toy `gorm:"foreignKey:CatID;constraint:OnDelete:CASCADE" json:"toys"`
	// Owners is the N:N collection managed via the cats_owners_owners join table.
	Owners []Owner `gorm:"many2many:cats_owners_owners;joinForeignKey:catsId;joinReferences:ownersId" json:"owners"`
}

// db is the global GORM database handle. Initialised once in main() and shared across handlers.
// In production code a context-scoped or repository-scoped handle is preferred, but for a single-file
// demo a package-level variable is acceptable.
var db *gorm.DB

// getEnv returns the value of an environment variable, or defaultVal if the variable is unset or empty.
func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return defaultVal
}

// main is the application entry point.
// It connects to PostgreSQL, runs AutoMigrate to create/update tables, registers Gin routes, and starts the server.
func main() {
	var err error

	// Build the DSN from environment variables with local-dev defaults so the demo works out-of-the-box.
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		getEnv("POSTGRES_HOST", "localhost"),
		getEnv("POSTGRES_USER", "postgres"),
		getEnv("POSTGRES_PASSWORD", "postgres"),
		getEnv("POSTGRES_DB", "demo"),
		getEnv("POSTGRES_PORT", "5432"),
	)

	// Open the database connection. gorm.Open does not actually dial the server — it returns
	// a configured *gorm.DB; the real TCP connection is established on the first query.
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect PostgreSQL: %v", err)
	}

	// AutoMigrate creates or updates tables to match the struct definitions.
	// For demo only — production should use explicit migration files.
	err = db.AutoMigrate(&Cat{}, &CatPassport{}, &Toy{}, &Owner{})
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	// Release mode disables Gin's debug logging for cleaner output.
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Register routes — one handler per API endpoint.
	r.GET("/cats", findAllCats)
	r.POST("/cats", createCat)
	r.GET("/cats/:id", findOneCat)
	r.GET("/cats/:id/with-relations", findOneCatWithRelations)
	r.POST("/cats/:id/toys", addToyToCat)

	port := getEnv("PORT", "3000")
	fmt.Printf("Go server running on port %s\n", port)
	// Run starts the Gin HTTP server. Prepend "127.0.0.1:" to bind loopback only (avoids Windows firewall prompts).
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// findAllCats handles GET /cats.
// Returns all cats with Passport (1:1), Toys (1:N), and Owners (N:N) preloaded.
func findAllCats(c *gin.Context) {
	var cats []Cat
	// Preload chains trigger GORM to issue separate SELECT queries per relation and assemble the result.
	if err := db.Preload("Passport").Preload("Toys").Preload("Owners").Find(&cats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cats)
}

// createCat handles POST /cats.
// Accepts a JSON body with name, passport, toys, and owners; creates all entities in one GORM Create call.
// Existing owners (id > 0) are resolved from the DB to avoid duplicate-key violations.
func createCat(c *gin.Context) {
	var cat Cat
	// ShouldBindJSON deserialises the request body into the Cat struct; returns 400 on malformed JSON.
	if err := c.ShouldBindJSON(&cat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Resolve owners: if an owner with a positive ID already exists in the DB, use the existing record
	// to avoid GORM trying to INSERT with a conflicting primary key.
	if len(cat.Owners) > 0 {
		var resolvedOwners []Owner
		for _, owner := range cat.Owners {
			if owner.ID > 0 {
				var existing Owner
				if err := db.First(&existing, owner.ID).Error; err == nil {
					// Found — reuse the tracked record so GORM writes to the join table only.
					resolvedOwners = append(resolvedOwners, existing)
				} else {
					// Not found despite positive ID — treat as new and let GORM INSERT.
					resolvedOwners = append(resolvedOwners, owner)
				}
			} else {
				// No ID — brand new owner; GORM will INSERT and assign a PK.
				resolvedOwners = append(resolvedOwners, owner)
			}
		}
		cat.Owners = resolvedOwners
	}

	// db.Create cascades to Passport, Toys (via foreignKey:CatID), and Owners (via join table).
	if err := db.Create(&cat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cat)
}

// findOneCat handles GET /cats/:id.
// Returns the cat with all relations preloaded; 404 if not found, 400 if id is not an integer.
func findOneCat(c *gin.Context) {
	idStr := c.Param("id")
	// Parse the path parameter to int; reject non-numeric values early.
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var cat Cat
	// Preload all three relation types so the response shape matches the TypeScript contract.
	if err := db.Preload("Passport").Preload("Toys").Preload("Owners").First(&cat, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Distinguish "not found" from other DB errors to return the correct HTTP status.
			c.JSON(http.StatusNotFound, gin.H{"message": fmt.Sprintf("Cat with ID %d not found", id)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, cat)
}

// findOneCatWithRelations handles GET /cats/:id/with-relations.
// Alias for findOneCat — exists to mirror the TypeScript endpoint naming and make the eager-loading intent explicit.
func findOneCatWithRelations(c *gin.Context) {
	findOneCat(c)
}

// addToyToCat handles POST /cats/:id/toys.
// Appends a new Toy to an existing Cat by setting CatID on the Toy before saving.
// Returns HTTP 201 with the updated cat (toys array includes the new entry).
func addToyToCat(c *gin.Context) {
	idStr := c.Param("id")
	catID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	// Verify the cat exists before attaching the toy (fail fast with a 404 rather than a FK violation).
	var cat Cat
	if err := db.First(&cat, catID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"message": fmt.Sprintf("Cat with ID %d not found", catID)})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// Deserialise the request body into a Toy struct (requires at minimum a name field).
	var toy Toy
	if err := c.ShouldBindJSON(&toy); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set the FK directly on the Toy struct — GORM writes catId to the toys table on Create.
	// This avoids loading the full Cat + cascading saves; only the new Toy row is inserted.
	toy.CatID = uint(catID)
	if err := db.Create(&toy).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Re-fetch the cat with all relations preloaded so the response reflects the freshest state
	// (the toys array now contains the newly added toy).
	if err := db.Preload("Passport").Preload("Toys").Preload("Owners").First(&cat, catID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cat)
}
