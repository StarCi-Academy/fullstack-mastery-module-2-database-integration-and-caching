package academy.starci.cachingredis.services;

import academy.starci.cachingredis.entities.Cat;
import academy.starci.cachingredis.repositories.CatRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * CatService — Business logic for the Cat feature.
 *
 * <p>Demonstrates three Redis caching layers:
 * <ul>
 *   <li>Layer 1 (DB): Manual cache-aside wrapping {@code catRepository.findAll()}.
 *       Serialises the {@code List<Cat>} to JSON and stores it in Redis with a 30 s TTL.</li>
 *   <li>Layer 2 (Logic): Cache-aside for a slow computation (1 s simulated delay).
 *       Stores a small JSON map in Redis with a 60 s TTL.</li>
 *   <li>Layer 3 (Response): Same pattern as Layer 2, but conceptually the cache sits at
 *       the HTTP-entry point (controller / middleware) rather than inside business logic.</li>
 * </ul>
 *
 * <p>All three layers share the same {@code StringRedisTemplate} and use
 * {@code ObjectMapper} for JSON serialisation/deserialisation.
 */
@Service
public class CatService {

    private static final Logger logger = LoggerFactory.getLogger(CatService.class);

    /** JPA repository for Postgres CRUD on the {@code cats} table. */
    private final CatRepository catRepository;

    /** Spring Data Redis template — serialises keys/values as plain UTF-8 strings. */
    private final StringRedisTemplate redisTemplate;

    /** Jackson mapper used to convert Java objects ↔ JSON strings stored in Redis. */
    private final ObjectMapper objectMapper;

    /** Redis key for the response-layer cache (Layer 3). */
    private final String responseCacheKey = "cats_res_layer";

    /** Redis key for the logic-layer cache (Layer 2). */
    private final String logicCacheKey = "cats_logic_layer_cache";

    /** Redis key for the DB query-result cache (Layer 1). */
    private final String dbQueryCacheKey = "cats_db_layer_cache";

    /**
     * Constructor injection — preferred over {@code @Autowired} field injection
     * because it makes dependencies explicit and enables easy unit-testing.
     *
     * @param catRepository  JPA repository for the {@code cats} table.
     * @param redisTemplate  Redis template for manual GET/SETEX/DEL operations.
     * @param objectMapper   Jackson mapper for JSON serialisation.
     */
    public CatService(CatRepository catRepository, StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.catRepository = catRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Sleeps the calling thread for {@code ms} milliseconds.
     * Used to simulate expensive computation so the MISS/HIT latency gap is
     * clearly visible in the response-time logs.
     * Restores the interrupt flag if the thread is interrupted during sleep.
     *
     * @param ms Duration in milliseconds.
     */
    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            // Restore interrupt flag — never swallow InterruptedException silently
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Layer 1 — DB query cache (manual cache-aside).
     *
     * <p>Algorithm:
     * <ol>
     *   <li>Try to GET {@code cats_db_layer_cache} from Redis (JSON string).</li>
     *   <li>If HIT → deserialise JSON → return list (fast path).</li>
     *   <li>If MISS → run {@code findAll()} against Postgres (slow path).</li>
     *   <li>Serialise the result to JSON and SETEX with 30 s TTL.</li>
     * </ol>
     *
     * @return All Cat rows either from the Redis cache or from Postgres.
     */
    public List<Cat> findByDbCache() {
        logger.info("Executing Layer 1: DB Query Cache check...");

        // Attempt to read the cached JSON from Redis (O(1) network lookup)
        try {
            String cached = redisTemplate.opsForValue().get(dbQueryCacheKey);
            if (cached != null) {
                logger.debug("DB Query Cache Hit! Returning data.");
                // Deserialise the JSON string back into a typed List<Cat>
                return objectMapper.readValue(cached, new TypeReference<List<Cat>>() {});
            }
        } catch (Exception e) {
            // Log and fall through to the real DB query rather than crashing
            logger.error("Failed to read from DB query cache: {}", e.getMessage());
        }

        // Cache MISS — execute the real (potentially slow) Postgres query
        logger.warn("DB Query Cache Miss! Querying PostgreSQL...");
        List<Cat> cats = catRepository.findAll();

        // Populate the cache so the next call is fast (TTL = 30 s)
        try {
            String json = objectMapper.writeValueAsString(cats);
            redisTemplate.opsForValue().set(dbQueryCacheKey, json, 30, TimeUnit.SECONDS);
        } catch (Exception e) {
            // Non-fatal: the response is still correct, just without caching
            logger.error("Failed to write to DB query cache: {}", e.getMessage());
        }

        return cats;
    }

    /**
     * Layer 2 — Logic cache (manual cache-aside for heavy business logic).
     *
     * <p>Simulates a 1-second heavy computation on MISS so learners can observe
     * the dramatic latency difference between MISS (~1 s) and HIT (~few ms).
     *
     * @return Map with keys {@code message} and {@code timestamp}.
     *         The timestamp is frozen at MISS time so both calls return the same value on HIT.
     */
    public Map<String, String> findByLogicCache() {
        logger.info("Executing Layer 2: Programmatic Logic Cache check...");

        // Try to retrieve an already-computed result from Redis
        try {
            String cached = redisTemplate.opsForValue().get(logicCacheKey);
            if (cached != null) {
                logger.debug("Logic Cache Hit! Returning data.");
                // Deserialise JSON string → Map<String, String>
                return objectMapper.readValue(cached, new TypeReference<Map<String, String>>() {});
            }
        } catch (Exception e) {
            logger.error("Failed to read from logic cache: {}", e.getMessage());
        }

        // Cache MISS — simulate the expensive business operation (1 second delay)
        logger.warn("Logic Cache Miss! Simulating heavy work for 1 second...");
        sleep(1000);

        // Build the result with the current timestamp (frozen at MISS time)
        Map<String, String> result = new HashMap<>();
        result.put("message", "Hải sản cho mèo cực phẩm");
        result.put("timestamp", Instant.now().toString());

        // Store in Redis for 60 s so subsequent calls skip the 1-second delay
        try {
            String json = objectMapper.writeValueAsString(result);
            redisTemplate.opsForValue().set(logicCacheKey, json, 60, TimeUnit.SECONDS);
        } catch (Exception e) {
            logger.error("Failed to write to logic cache: {}", e.getMessage());
        }

        return result;
    }

    /**
     * Layer 3 — Response cache (conceptual entry-point layer).
     * Returns a simple description string; no delay because this method is
     * only reached after the response-layer check has already passed through.
     *
     * @return A description string confirming the request reached the service layer.
     */
    public String findForResponseCache() {
        logger.info("Layer 3 flow: Request reaching Service (it means Response Cache was MISS)");
        return "This data would be cached at the Controller level using CacheInterceptor";
    }

    /**
     * Layer 3 — Response cache with explicit 1-second simulated delay.
     *
     * <p>Applies a manual cache-aside at the service level to demonstrate the
     * response-layer concept in Java (Spring does not have a built-in
     * HTTP-response-level cache interceptor equivalent to NestJS CacheInterceptor
     * for this demo — we implement it here with the same Redis key).
     *
     * @return The response string, either from Redis (HIT, fast) or computed (MISS, ~1 s).
     */
    public String findForResponseCacheWithDelay() {
        logger.info("Executing Layer 3: Response Cache check...");

        // Check Redis for a previously cached response
        try {
            String cached = redisTemplate.opsForValue().get(responseCacheKey);
            if (cached != null) {
                logger.debug("Response Cache Hit! Returning data.");
                // Redis might store JSON-encoded strings with surrounding quotes — strip them
                if (cached.startsWith("\"") && cached.endsWith("\"") && cached.length() > 1) {
                    return cached.substring(1, cached.length() - 1);
                }
                return cached;
            }
        } catch (Exception e) {
            logger.error("Failed to read from response cache: {}", e.getMessage());
        }

        // MISS — simulate work then cache the result
        logger.warn("Response Cache Miss! Simulating controller-layer work for 1 second...");
        sleep(1000);
        String result = findForResponseCache();

        // Cache with 30 s TTL (same as DB layer for demo consistency)
        try {
            redisTemplate.opsForValue().set(responseCacheKey, result, 30, TimeUnit.SECONDS);
        } catch (Exception e) {
            logger.error("Failed to write to response cache: {}", e.getMessage());
        }

        return result;
    }

    /**
     * Invalidates the response-layer cache key so the next GET /cats/response-layer is a MISS.
     *
     * @return Map with {@code message} and {@code cacheKey} fields.
     */
    public Map<String, String> clearResponseLayerCache() {
        // Remove the Redis key immediately — next request will be a cold MISS
        redisTemplate.delete(responseCacheKey);
        logger.warn("Response cache cleared: {}", responseCacheKey);
        Map<String, String> res = new HashMap<>();
        res.put("message", "Response-layer cache key was cleared successfully.");
        res.put("cacheKey", responseCacheKey);
        return res;
    }

    /**
     * Invalidates the logic-layer cache key so the next GET /cats/logic-layer is a MISS.
     *
     * @return Map with {@code message} and {@code cacheKey} fields.
     */
    public Map<String, String> clearLogicLayerCache() {
        redisTemplate.delete(logicCacheKey);
        logger.warn("Logic cache cleared: {}", logicCacheKey);
        Map<String, String> res = new HashMap<>();
        res.put("message", "Logic-layer cache key was cleared successfully.");
        res.put("cacheKey", logicCacheKey);
        return res;
    }

    /**
     * Invalidates the DB query-layer cache key so the next GET /cats/db-layer is a MISS.
     *
     * @return Map with {@code message} and {@code cacheKey} fields.
     */
    public Map<String, String> clearDbLayerCache() {
        redisTemplate.delete(dbQueryCacheKey);
        logger.warn("DB query cache cleared: {}", dbQueryCacheKey);
        Map<String, String> res = new HashMap<>();
        res.put("message", "DB query-layer cache key was cleared successfully.");
        res.put("cacheKey", dbQueryCacheKey);
        return res;
    }

    /**
     * Fills all 3 cache layers in order and returns a compact snapshot.
     * Learners hit this once to warm all layers, then each individual
     * layer endpoint to observe MISS → HIT behaviour.
     *
     * @return Map with {@code responseSample}, {@code logicSample}, and {@code dbCount}.
     */
    public Map<String, Object> findAllLayers() {
        logger.info("--- Triggering ALL 3 layers (cascade fill) ---");

        // Trigger each layer in order so all caches are populated after this call
        String responseSample = findForResponseCacheWithDelay();
        Map<String, String> logicSample = findByLogicCache();
        List<Cat> dbItems = findByDbCache();

        // Return a compact summary so the client can easily verify all caches are warm
        Map<String, Object> res = new HashMap<>();
        res.put("responseSample", responseSample);
        res.put("logicSample", logicSample);
        res.put("dbCount", dbItems.size());
        return res;
    }

    /**
     * Invalidates all 3 cache keys at once (cascade invalidation).
     * After this call, the next request to each endpoint will be a cold MISS.
     *
     * @return Map with {@code message} and a {@code cleared} sub-map listing each key.
     */
    public Map<String, Object> invalidateAllLayers() {
        // Delete all 3 Redis keys in a single round-trip using multi-key DEL
        redisTemplate.delete(Arrays.asList(responseCacheKey, logicCacheKey, dbQueryCacheKey));
        logger.warn("All 3 cache layers invalidated (response + logic + db).");

        // Build a structured response so the client knows which keys were cleared
        Map<String, String> cleared = new HashMap<>();
        cleared.put("responseLayer", responseCacheKey);
        cleared.put("logicLayer", logicCacheKey);
        cleared.put("dbLayer", dbQueryCacheKey);

        Map<String, Object> res = new HashMap<>();
        res.put("message", "All 3 cache layers cleared. Next /cats/all-layers/:id will MISS on every layer.");
        res.put("cleared", cleared);
        return res;
    }

    /**
     * Seeds the {@code cats} table with {@code count} random rows.
     * Large datasets (e.g. 1000 rows) make the DB-layer MISS/HIT latency
     * difference clearly observable because Postgres must scan more pages.
     *
     * @param count Number of Cat rows to insert.
     * @return Map with {@code message} and {@code inserted} count.
     */
    public Map<String, Object> seedCats(int count) {
        // Predefined name and breed pools to avoid an external Faker dependency in Java
        String[] names = {"Milo", "Luna", "Oliver", "Leo", "Bella", "Charlie", "Lilly", "Lucy", "Simba", "Chloe"};
        String[] breeds = {"Siamese", "Bengal", "Persian", "Maine Coon", "Ragdoll", "Abyssinian", "Birman", "Sphynx"};
        Random random = new Random();

        // Build the entity list in memory before a single bulk saveAll() call
        List<Cat> cats = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            // Append index to make each name unique for readability in DB
            String name = names[random.nextInt(names.length)] + " #" + (i + 1);
            String breed = breeds[random.nextInt(breeds.length)];
            cats.add(new Cat(name, breed));
        }

        // Bulk insert — faster than per-row saves because Hibernate batches the INSERTs
        catRepository.saveAll(cats);
        logger.warn("Seeded {} cats for caching demo.", count);

        Map<String, Object> res = new HashMap<>();
        res.put("message", "Seed completed successfully.");
        res.put("inserted", count);
        return res;
    }
}
