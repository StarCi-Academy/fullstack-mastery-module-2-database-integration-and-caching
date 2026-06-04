package academy.starci.sqlvsnosql.repositories;

import academy.starci.sqlvsnosql.entities.SqlComparisonItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SqlComparisonRepository extends JpaRepository<SqlComparisonItem, UUID> {
    List<SqlComparisonItem> findTop20ByOrderByCreatedAtDesc();

    @Modifying
    @Query(value = "TRUNCATE TABLE comparison_items RESTART IDENTITY CASCADE", nativeQuery = true)
    void truncateTable();
}
