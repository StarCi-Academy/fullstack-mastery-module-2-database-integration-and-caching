package academy.starci.typeormpostgresql.entities;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * JPA entity representing a toy owned by a cat — demonstrates the N:1 (many-to-one) side of a 1:N relation.
 * <p>
 * The FK column ({@code catId}) lives on this table, making Toy the "owning" side of the 1:N relation.
 * {@code @JsonIgnore} on {@code cat} prevents serialisation cycles (toy → cat → toys[toy] → …).
 */
@Entity
@Table(name = "toys")
public class Toy {

    /**
     * Auto-generated primary key.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * Display name of the toy, e.g. {@code "Ball"}.
     */
    @Column(nullable = false)
    private String name;

    /**
     * N:1 relation back to {@link Cat}.
     * {@code @JoinColumn(name = "catId")} maps this to the FK column on the {@code toys} table.
     * {@code @JsonIgnore} avoids infinite recursion during JSON serialisation.
     */
    @ManyToOne
    @JoinColumn(name = "catId")
    @JsonIgnore
    private Cat cat;

    /** Returns the auto-generated primary key. */
    public Integer getId() {
        return id;
    }

    /** Sets the primary key (normally managed by the persistence provider). */
    public void setId(Integer id) {
        this.id = id;
    }

    /** Returns the toy's display name. */
    public String getName() {
        return name;
    }

    /** Sets the toy's display name. */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Returns the owning {@link Cat}.
     * Not serialised in JSON (see {@code @JsonIgnore}).
     */
    public Cat getCat() {
        return cat;
    }

    /**
     * Sets the owning cat, which causes Hibernate to write the {@code catId} FK column on save.
     * Setting this via object reference (not a raw integer) is the ORM-native pattern:
     * the framework reads the cat's ID from the object graph to populate the FK.
     *
     * @param cat the Cat that owns this toy.
     */
    public void setCat(Cat cat) {
        this.cat = cat;
    }
}
