package academy.starci.typeormpostgresql.entities;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * JPA entity representing a cat's passport — the inverse (non-owning) side of the 1:1 relation.
 * <p>
 * The FK column ({@code passportId}) lives on the {@code cats} table (owned by {@link Cat}).
 * This side uses {@code mappedBy = "passport"} to signal that it does NOT hold the FK.
 * {@code @JsonIgnore} on {@code cat} prevents serialisation cycles (passport → cat → passport …).
 */
@Entity
@Table(name = "cat_passports")
public class CatPassport {

    /**
     * Auto-generated primary key.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * Passport identifier string, e.g. {@code "CAT-001"}.
     * Column name is explicitly set to preserve camelCase ({@code passportNumber}) matching TypeORM output.
     */
    @Column(name = "passportNumber", nullable = false)
    private String passportNumber;

    /**
     * Inverse side of the 1:1 relation with {@link Cat}.
     * {@code mappedBy = "passport"} tells Hibernate the FK is on the Cat table.
     * {@code @JsonIgnore} breaks the bidirectional serialisation cycle.
     */
    @OneToOne(mappedBy = "passport")
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

    /** Returns the passport number string. */
    public String getPassportNumber() {
        return passportNumber;
    }

    /** Sets the passport number string. */
    public void setPassportNumber(String passportNumber) {
        this.passportNumber = passportNumber;
    }

    /**
     * Returns the owning {@link Cat} of this passport.
     * Not serialised in JSON responses (see {@code @JsonIgnore}).
     */
    public Cat getCat() {
        return cat;
    }

    /**
     * Sets the back-reference to the owning Cat (used for in-memory graph consistency).
     * Hibernate does not use this setter to write the FK — the FK lives on Cat.
     *
     * @param cat the owning Cat instance.
     */
    public void setCat(Cat cat) {
        this.cat = cat;
    }
}
