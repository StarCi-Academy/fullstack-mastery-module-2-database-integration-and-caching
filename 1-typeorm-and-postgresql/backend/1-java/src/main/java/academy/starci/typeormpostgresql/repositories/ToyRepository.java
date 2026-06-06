package academy.starci.typeormpostgresql.repositories;

import academy.starci.typeormpostgresql.entities.Toy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Toy} entities.
 * <p>
 * Used in {@code CatService#addToy} to persist a new Toy independently of the full Cat graph,
 * which avoids re-triggering cascades on all Cat relations when only a single Toy is added.
 */
@Repository
public interface ToyRepository extends JpaRepository<Toy, Integer> {
    // Standard save() from JpaRepository is all that is needed for single-toy persistence.
}
