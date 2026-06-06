package academy.starci.typeormpostgresql.services;

import academy.starci.typeormpostgresql.entities.Cat;
import academy.starci.typeormpostgresql.entities.Toy;
import academy.starci.typeormpostgresql.exceptions.NotFoundException;
import academy.starci.typeormpostgresql.repositories.CatRepository;
import academy.starci.typeormpostgresql.repositories.ToyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Business-logic service for the Cat domain.
 * <p>
 * Encapsulates all data-access operations and relation-wiring logic so the controller
 * stays thin (HTTP mapping only). Each method follows prepare → execute → return.
 * {@link Transactional} is applied to write operations so all DB changes commit or roll back together.
 */
@Service
public class CatService {

    /**
     * Repository for {@link Cat} — provides JPA CRUD and query-by-id.
     */
    private final CatRepository catRepository;

    /**
     * Repository for {@link Toy} — used when appending a single toy without touching the full cat graph.
     */
    private final ToyRepository toyRepository;

    /**
     * Constructor injection ensures dependencies are immutable after construction (no field injection).
     *
     * @param catRepository JPA repository for cats.
     * @param toyRepository JPA repository for toys.
     */
    public CatService(CatRepository catRepository, ToyRepository toyRepository) {
        this.catRepository = catRepository;
        this.toyRepository = toyRepository;
    }

    /**
     * Returns all cats. Spring Data JPA loads relations lazily by default;
     * the {@link CatRepository#findAll()} override in the repository uses
     * {@code @EntityGraph} or {@code JOIN FETCH} if eager loading is required.
     * For this demo, default lazy is acceptable because the serialisation context
     * is still open (Open-in-View enabled by default in Spring Boot).
     *
     * @return list of all cats (may be empty, never {@code null}).
     */
    public List<Cat> findAll() {
        return catRepository.findAll();
    }

    /**
     * Creates a new cat with all provided relations.
     * <p>
     * Hibernate requires the owning side of every relation to hold a back-reference
     * to the parent before calling {@code save}; otherwise the FK column is left null.
     * This method fixes the bidirectional links (passport.cat, toy.cat) before saving.
     *
     * @param cat cat data (deserialized from JSON — may contain nested passport, toys, owners).
     * @return the persisted cat with auto-generated IDs on all nested entities.
     */
    @Transactional
    public Cat create(Cat cat) {
        // Wire the inverse 1:1 side so Hibernate populates passport.cat back-reference.
        if (cat.getPassport() != null) {
            cat.getPassport().setCat(cat);
        }
        // Wire the owning FK side on each Toy so Hibernate writes catId correctly.
        if (cat.getToys() != null) {
            for (Toy toy : cat.getToys()) {
                toy.setCat(cat);
            }
        }
        // A single save cascades to passport (CascadeType.ALL), toys (CascadeType.ALL),
        // and owners (CascadeType.PERSIST + MERGE) via the Cat entity declarations.
        return catRepository.save(cat);
    }

    /**
     * Finds a cat by its primary key, throwing {@link NotFoundException} (HTTP 404) if absent.
     *
     * @param id the cat's primary key.
     * @return the found cat entity.
     * @throws NotFoundException if no cat with the given id exists.
     */
    public Cat findOne(Integer id) {
        // orElseThrow converts Optional.empty() into our domain exception (maps to HTTP 404 in controller).
        return catRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cat with ID " + id + " not found"));
    }

    /**
     * Returns a cat with all relations explicitly loaded.
     * Delegates to {@link #findOne(Integer)} — Spring Data JPA's default fetch strategy
     * (EAGER on {@code @OneToOne}, LAZY on collections) means all relations are already
     * available within the Open-Session-In-View window.
     *
     * @param id the cat's primary key.
     * @return the cat with hydrated relations.
     */
    public Cat findWithRelations(Integer id) {
        return findOne(id);
    }

    /**
     * Appends a new toy to an existing cat (demonstrates 1:N collection mutation).
     * <p>
     * Rather than loading the full cat graph and re-saving, we create and persist the
     * Toy independently — only setting the FK via {@code toy.setCat(cat)}. This avoids
     * re-triggering cascades on the whole cat and is the recommended pattern for large collections.
     *
     * @param catId primary key of the cat that will own the new toy.
     * @param toy   toy data to persist (name is required).
     * @return the updated cat with the new toy included in the {@code toys} collection.
     * @throws NotFoundException if no cat with the given catId exists.
     */
    @Transactional
    public Cat addToy(Integer catId, Toy toy) {
        // Verify the cat exists before attaching the toy (fail fast with a clear 404).
        Cat cat = findOne(catId);

        // Link the toy to the cat — Hibernate uses this object reference to populate catId FK.
        toy.setCat(cat);
        toyRepository.save(toy);

        // Re-fetch the cat so the returned object reflects the new toy in the collection.
        return findOne(catId);
    }
}
