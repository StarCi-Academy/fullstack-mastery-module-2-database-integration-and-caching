package academy.starci.cachingredis.entities;

import jakarta.persistence.*;

/**
 * JPA entity mapped to the {@code cats} PostgreSQL table.
 *
 * <p>Intentionally simple (id, name, breed) so learners focus on
 * caching mechanics rather than complex ORM relationships.
 * The table is seeded with 1000 rows via {@code POST /cats/seed?count=1000}
 * to make the DB-layer MISS/HIT latency gap clearly observable.
 */
@Entity
@Table(name = "cats")
public class Cat {

    /**
     * Auto-incremented primary key assigned by Postgres {@code SERIAL} / {@code IDENTITY}.
     * {@code GenerationType.IDENTITY} lets the DB generate the value — no sequence needed.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Cat display name (e.g. "Milo #42"). Not null; set by the seed helper. */
    @Column(nullable = false)
    private String name;

    /** Breed string (e.g. "Siamese"). Not null; randomised during seeding. */
    @Column(nullable = false)
    private String breed;

    /**
     * No-arg constructor required by JPA for proxy creation.
     * Do not use directly — prefer the convenience constructor.
     */
    public Cat() {}

    /**
     * Convenience constructor for the seed endpoint.
     *
     * @param name  Cat display name (non-null).
     * @param breed Cat breed string (non-null).
     */
    public Cat(String name, String breed) {
        this.name = name;
        this.breed = breed;
    }

    /**
     * Returns the auto-generated database primary key.
     *
     * @return Integer id, or {@code null} before the entity is persisted.
     */
    public Integer getId() {
        return id;
    }

    /**
     * Sets the primary key (used by JPA internally; do not call manually).
     *
     * @param id Primary key value assigned by Postgres.
     */
    public void setId(Integer id) {
        this.id = id;
    }

    /**
     * Returns the cat's display name.
     *
     * @return Non-null name string.
     */
    public String getName() {
        return name;
    }

    /**
     * Sets the cat's display name.
     *
     * @param name Non-null name string.
     */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Returns the cat's breed.
     *
     * @return Non-null breed string.
     */
    public String getBreed() {
        return breed;
    }

    /**
     * Sets the cat's breed.
     *
     * @param breed Non-null breed string.
     */
    public void setBreed(String breed) {
        this.breed = breed;
    }
}
