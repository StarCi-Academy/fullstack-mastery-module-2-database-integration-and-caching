package academy.starci.sqlvsnosql.services;

import academy.starci.sqlvsnosql.dto.CreateCompareDto;
import academy.starci.sqlvsnosql.entities.NoSqlComparisonItem;
import academy.starci.sqlvsnosql.entities.SqlComparisonItem;
import academy.starci.sqlvsnosql.repositories.NoSqlComparisonRepository;
import academy.starci.sqlvsnosql.repositories.SqlComparisonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class CompareService {

    private final SqlComparisonRepository sqlRepository;
    private final NoSqlComparisonRepository noSqlRepository;

    public CompareService(SqlComparisonRepository sqlRepository, NoSqlComparisonRepository noSqlRepository) {
        this.sqlRepository = sqlRepository;
        this.noSqlRepository = noSqlRepository;
    }

    public Map<String, Object> write(CreateCompareDto dto) {
        Instant now = Instant.now();

        SqlComparisonItem sqlItem = new SqlComparisonItem();
        sqlItem.setTitle(dto.getTitle());
        sqlItem.setAmount(dto.getAmount());
        // createdAt is handled by @CreationTimestamp, but we can set it or let Hibernate do it.

        NoSqlComparisonItem noSqlItem = new NoSqlComparisonItem();
        noSqlItem.setTitle(dto.getTitle());
        noSqlItem.setAmount(dto.getAmount());
        noSqlItem.setCreatedAt(now);
        noSqlItem.setUpdatedAt(now);
        noSqlItem.setVersion(0);

        CompletableFuture<SqlComparisonItem> sqlFuture = CompletableFuture.supplyAsync(() -> sqlRepository.save(sqlItem));
        CompletableFuture<NoSqlComparisonItem> noSqlFuture = CompletableFuture.supplyAsync(() -> noSqlRepository.save(noSqlItem));

        CompletableFuture.allOf(sqlFuture, noSqlFuture).join();

        SqlComparisonItem savedSql = sqlFuture.join();
        NoSqlComparisonItem savedNoSql = noSqlFuture.join();

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Saved to both SQL and NoSQL stores.");

        Map<String, Object> sqlMap = new HashMap<>();
        sqlMap.put("id", savedSql.getId().toString());
        sqlMap.put("title", savedSql.getTitle());
        sqlMap.put("amount", savedSql.getAmount());
        sqlMap.put("createdAt", savedSql.getCreatedAt());
        response.put("sql", sqlMap);

        Map<String, Object> noSqlMap = new HashMap<>();
        noSqlMap.put("id", savedNoSql.getId());
        noSqlMap.put("title", savedNoSql.getTitle());
        noSqlMap.put("amount", savedNoSql.getAmount());
        noSqlMap.put("createdAt", savedNoSql.getCreatedAt());
        response.put("noSql", noSqlMap);

        return response;
    }

    public Map<String, Object> read() {
        CompletableFuture<List<SqlComparisonItem>> sqlFuture = CompletableFuture.supplyAsync(
                sqlRepository::findTop20ByOrderByCreatedAtDesc
        );
        CompletableFuture<List<NoSqlComparisonItem>> noSqlFuture = CompletableFuture.supplyAsync(
                noSqlRepository::findTop20ByOrderByCreatedAtDesc
        );

        CompletableFuture.allOf(sqlFuture, noSqlFuture).join();

        List<SqlComparisonItem> sqlItems = sqlFuture.join();
        List<NoSqlComparisonItem> noSqlItems = noSqlFuture.join();

        Map<String, Object> response = new HashMap<>();
        response.put("sqlCount", sqlItems.size());
        response.put("noSqlCount", noSqlItems.size());

        List<Map<String, Object>> sqlList = sqlItems.stream().map(item -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", item.getId().toString());
            m.put("title", item.getTitle());
            m.put("amount", item.getAmount());
            m.put("createdAt", item.getCreatedAt());
            return m;
        }).collect(Collectors.toList());
        response.put("sqlItems", sqlList);

        List<Map<String, Object>> noSqlList = noSqlItems.stream().map(item -> {
            Map<String, Object> m = new HashMap<>();
            m.put("_id", item.getId());
            m.put("title", item.getTitle());
            m.put("amount", item.getAmount());
            m.put("createdAt", item.getCreatedAt());
            m.put("updatedAt", item.getUpdatedAt());
            m.put("__v", item.getVersion());
            return m;
        }).collect(Collectors.toList());
        response.put("noSqlItems", noSqlList);

        return response;
    }

    public Map<String, Object> getTimings() {
        long sqlStart = System.nanoTime();
        sqlRepository.findTop20ByOrderByCreatedAtDesc();
        double sqlMs = (System.nanoTime() - sqlStart) / 1_000_000.0;
        sqlMs = Math.round(sqlMs * 1000.0) / 1000.0;

        long noSqlStart = System.nanoTime();
        noSqlRepository.findTop20ByOrderByCreatedAtDesc();
        double noSqlMs = (System.nanoTime() - noSqlStart) / 1_000_000.0;
        noSqlMs = Math.round(noSqlMs * 1000.0) / 1000.0;

        double deltaMs = sqlMs - noSqlMs;
        deltaMs = Math.round(deltaMs * 1000.0) / 1000.0;

        Map<String, Object> response = new HashMap<>();
        response.put("sqlMs", sqlMs);
        response.put("noSqlMs", noSqlMs);
        response.put("deltaMs", deltaMs);

        return response;
    }

    @Transactional
    public Map<String, Object> deleteAll() {
        long pgBefore = sqlRepository.count();
        sqlRepository.truncateTable();

        long mongoBefore = noSqlRepository.count();
        noSqlRepository.deleteAll();

        Map<String, Object> response = new HashMap<>();
        response.put("pgDeleted", pgBefore);
        response.put("mongoDeleted", mongoBefore);
        return response;
    }
}
