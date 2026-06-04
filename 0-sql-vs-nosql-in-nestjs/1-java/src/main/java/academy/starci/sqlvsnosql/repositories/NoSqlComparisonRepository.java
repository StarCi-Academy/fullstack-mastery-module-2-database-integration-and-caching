package academy.starci.sqlvsnosql.repositories;

import academy.starci.sqlvsnosql.entities.NoSqlComparisonItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NoSqlComparisonRepository extends MongoRepository<NoSqlComparisonItem, String> {
    List<NoSqlComparisonItem> findTop20ByOrderByCreatedAtDesc();
}
