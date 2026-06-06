package academy.starci.mongoosemongodb.repositories;

import academy.starci.mongoosemongodb.entities.Cat;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CatRepository extends MongoRepository<Cat, String> {
    Optional<Cat> findByName(String name);
}
