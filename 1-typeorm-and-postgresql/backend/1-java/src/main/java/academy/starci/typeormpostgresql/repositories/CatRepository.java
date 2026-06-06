package academy.starci.typeormpostgresql.repositories;

import academy.starci.typeormpostgresql.entities.Cat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CatRepository extends JpaRepository<Cat, Integer> {
}
