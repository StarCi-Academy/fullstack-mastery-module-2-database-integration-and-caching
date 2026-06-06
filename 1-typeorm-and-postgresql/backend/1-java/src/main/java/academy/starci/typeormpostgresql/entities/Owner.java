package academy.starci.typeormpostgresql.entities;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity representing a cat owner — the inverse (non-owning) side of the N:N relation.
 * <p>
 * The join table ({@code cats_owners_owners}) is declared on the {@link Cat} side via {@code @JoinTable}.
 * This side uses {@code mappedBy = "owners"} and does not control the join table.
 * {@code @JsonIgnore} on {@code cats} prevents infinite recursion during JSON serialisation.
 */
@Entity
@Table(name = "owners")
public class Owner {

    /**
     * Auto-generated primary key.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * Display name of the owner, e.g. {@code "Alice"}.
     */
    @Column(nullable = false)
    private String name;

    /**
     * Inverse side of the N:N relation with {@link Cat}.
     * {@code mappedBy = "owners"} delegates join-table ownership to Cat.
     * {@code @JsonIgnore} breaks the serialisation cycle (owner → cats → owners[owner] → …).
     */
    @ManyToMany(mappedBy = "owners")
    @JsonIgnore
    private List<Cat> cats = new ArrayList<>();

    /** Returns the auto-generated primary key. */
    public Integer getId() {
        return id;
    }

    /** Sets the primary key (normally managed by the persistence provider). */
    public void setId(Integer id) {
        this.id = id;
    }

    /** Returns the owner's display name. */
    public String getName() {
        return name;
    }

    /** Sets the owner's display name. */
    public void setName(String name) {
        this.name = name;
    }

    /**
     * Returns the list of cats owned by this owner.
     * Not serialised in JSON responses (see {@code @JsonIgnore}).
     */
    public List<Cat> getCats() {
        return cats;
    }

    /**
     * Sets the cat collection for the inverse side of the N:N relation.
     * Hibernate does not use this to write join-table rows — that is controlled by Cat.
     *
     * @param cats the cats to associate with this owner.
     */
    public void setCats(List<Cat> cats) {
        this.cats = cats;
    }
}
