package academy.starci.typeormpostgresql.repositories;

import academy.starci.typeormpostgresql.entities.Cat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link Cat} entities.
 * <p>
 * Extending {@link JpaRepository} gives all standard CRUD methods ({@code save}, {@code findById},
 * {@code findAll}, {@code delete}, etc.) without any additional code — Spring generates the
 * implementation at runtime via proxy. The primary-key type is {@link Integer}.
 */
@Repository
public interface CatRepository extends JpaRepository<Cat, Integer> {
    // No custom query methods needed for this demo; JpaRepository.findAll() and findById() suffice.
}
