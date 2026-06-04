package academy.starci.typeormpostgresql.entities;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cats")
public class Cat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "passport_id")
    private CatPassport passport;

    @OneToMany(mappedBy = "cat", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Toy> toys = new ArrayList<>();

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "cats_owners_owners",
        joinColumns = @JoinColumn(name = "catsId"),
        inverseJoinColumns = @JoinColumn(name = "ownersId")
    )
    private List<Owner> owners = new ArrayList<>();

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public CatPassport getPassport() {
        return passport;
    }

    public void setPassport(CatPassport passport) {
        this.passport = passport;
        if (passport != null) {
            passport.setCat(this);
        }
    }

    public List<Toy> getToys() {
        return toys;
    }

    public void setToys(List<Toy> toys) {
        this.toys = toys;
        if (toys != null) {
            for (Toy toy : toys) {
                toy.setCat(this);
            }
        }
    }

    public List<Owner> getOwners() {
        return owners;
    }

    public void setOwners(List<Owner> owners) {
        this.owners = owners;
    }
}
