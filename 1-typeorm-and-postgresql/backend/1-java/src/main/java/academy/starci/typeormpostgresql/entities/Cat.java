package academy.starci.typeormpostgresql.entities;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity representing a cat — the central domain object.
 * <p>
 * Demonstrates all three ORM relation cardinalities:
 * <ul>
 *   <li>1:1 with {@link CatPassport} via {@code @OneToOne} + {@code @JoinColumn} (Cat owns the FK).</li>
 *   <li>1:N with {@link Toy} via {@code @OneToMany} (Toy side holds the FK {@code catId}).</li>
 *   <li>N:N with {@link Owner} via {@code @ManyToMany} + {@code @JoinTable} (intermediate join table).</li>
 * </ul>
 * Mapped to the {@code cats} table. {@code cascade = ALL} propagates save/delete to owned relations.
 */
@Entity
@Table(name = "cats")
public class Cat {

    /**
     * Auto-generated primary key (IDENTITY strategy → database-assigned sequential integer).
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * Display name of the cat. Must not be null (enforced by {@code nullable = false}).
     */
    @Column(nullable = false)
    private String name;

    /**
     * 1:1 relation to {@link CatPassport}.
     * {@code @JoinColumn} places the FK column ({@code passportId}) on the {@code cats} table — this side "owns" the relation.
     * {@code cascade = ALL} + {@code orphanRemoval = true} ensure the passport is saved and deleted with the cat.
     */
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "passportId")
    private CatPassport passport;

    /**
     * 1:N relation to {@link Toy}.
     * {@code mappedBy = "cat"} tells Hibernate the FK lives on the Toy side (not here).
     * Initialized to an empty list to avoid NPE when Jackson serializes the collection.
     */
    @OneToMany(mappedBy = "cat", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Toy> toys = new ArrayList<>();

    /**
     * N:N relation to {@link Owner}.
     * {@code @JoinTable} creates the intermediate join table {@code cats_owners_owners}
     * with columns {@code catsId} and {@code ownersId} — matches TypeORM naming for cross-lang parity.
     * Only PERSIST and MERGE are cascaded (not REMOVE) to avoid deleting shared owners.
     */
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "cats_owners_owners",
        joinColumns = @JoinColumn(name = "catsId"),
        inverseJoinColumns = @JoinColumn(name = "ownersId")
    )
    private List<Owner> owners = new ArrayList<>();

    /** Returns the auto-generated primary key. */
    public Integer getId() {
        return id;
    }

    /** Sets the primary key (normally managed by the persistence provider). */
    public void setId(Integer id) {
        this.id = id;
    }

    /** Returns the cat's display name. */
    public String getName() {
        return name;
    }

    /** Sets the cat's display name. */
    public void setName(String name) {
        this.name = name;
    }

    /** Returns the associated passport (may be {@code null} before persistence). */
    public CatPassport getPassport() {
        return passport;
    }

    /**
     * Sets the associated passport and synchronises the inverse side of the bidirectional 1:1 relation.
     * Without calling {@code passport.setCat(this)} Hibernate would not know the inverse pointer,
     * leading to inconsistent in-memory state even if the database FK is written correctly.
     *
     * @param passport the passport to associate, or {@code null} to clear the relation.
     */
    public void setPassport(CatPassport passport) {
        this.passport = passport;
        // Synchronise inverse side so in-memory object graph stays consistent.
        if (passport != null) {
            passport.setCat(this);
        }
    }

    /** Returns the list of toys owned by this cat. */
    public List<Toy> getToys() {
        return toys;
    }

    /**
     * Sets the toy collection and wires the owning side of each Toy to this Cat.
     * Because the FK lives on Toy ({@code mappedBy = "cat"}), each toy's {@code cat}
     * pointer must be set explicitly for Hibernate to write the FK column on save.
     *
     * @param toys list of toys to associate; each toy's {@code cat} field is updated in place.
     */
    public void setToys(List<Toy> toys) {
        this.toys = toys;
        // Wire the owning FK side on every Toy so Hibernate writes catId correctly.
        if (toys != null) {
            for (Toy toy : toys) {
                toy.setCat(this);
            }
        }
    }

    /** Returns the list of owners sharing this cat. */
    public List<Owner> getOwners() {
        return owners;
    }

    /** Sets the owner collection for the N:N relation. */
    public void setOwners(List<Owner> owners) {
        this.owners = owners;
    }
}
