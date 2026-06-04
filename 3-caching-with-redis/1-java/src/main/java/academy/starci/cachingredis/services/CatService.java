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

@Service
public class CatService {

    private static final Logger logger = LoggerFactory.getLogger(CatService.class);

    private final CatRepository catRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private final String responseCacheKey = "cats_res_layer";
    private final String logicCacheKey = "cats_logic_layer_cache";
    private final String dbQueryCacheKey = "cats_db_layer_cache";

    public CatService(CatRepository catRepository, StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.catRepository = catRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public List<Cat> findByDbCache() {
        logger.info("Executing Layer 1: DB Query Cache check...");
        try {
            String cached = redisTemplate.opsForValue().get(dbQueryCacheKey);
            if (cached != null) {
                logger.debug("DB Query Cache Hit! Returning data.");
                return objectMapper.readValue(cached, new TypeReference<List<Cat>>() {});
            }
        } catch (Exception e) {
            logger.error("Failed to read from DB query cache: {}", e.getMessage());
        }

        logger.warn("DB Query Cache Miss! Querying PostgreSQL...");
        List<Cat> cats = catRepository.findAll();

        try {
            String json = objectMapper.writeValueAsString(cats);
            redisTemplate.opsForValue().set(dbQueryCacheKey, json, 30, TimeUnit.SECONDS);
        } catch (Exception e) {
            logger.error("Failed to write to DB query cache: {}", e.getMessage());
        }

        return cats;
    }

    public Map<String, String> findByLogicCache() {
        logger.info("Executing Layer 2: Programmatic Logic Cache check...");
        try {
            String cached = redisTemplate.opsForValue().get(logicCacheKey);
            if (cached != null) {
                logger.debug("Logic Cache Hit! Returning data.");
                return objectMapper.readValue(cached, new TypeReference<Map<String, String>>() {});
            }
        } catch (Exception e) {
            logger.error("Failed to read from logic cache: {}", e.getMessage());
        }

        logger.warn("Logic Cache Miss! Simulating heavy work for 1 second...");
        sleep(1000);

        Map<String, String> result = new HashMap<>();
        result.put("message", "Hải sản cho mèo cực phẩm");
        result.put("timestamp", Instant.now().toString());

        try {
            String json = objectMapper.writeValueAsString(result);
            redisTemplate.opsForValue().set(logicCacheKey, json, 60, TimeUnit.SECONDS);
        } catch (Exception e) {
            logger.error("Failed to write to logic cache: {}", e.getMessage());
        }

        return result;
    }

    public String findForResponseCache() {
        logger.info("Layer 3 flow: Request reaching Service (it means Response Cache was MISS)");
        return "This data would be cached at the Controller level using CacheInterceptor";
    }

    public String findForResponseCacheWithDelay() {
        logger.info("Executing Layer 3: Response Cache check...");
        try {
            String cached = redisTemplate.opsForValue().get(responseCacheKey);
            if (cached != null) {
                logger.debug("Response Cache Hit! Returning data.");
                // Redis might store quotes around string values if serialized, or raw. Let's return the string directly.
                if (cached.startsWith("\"") && cached.endsWith("\"") && cached.length() > 1) {
                    return cached.substring(1, cached.length() - 1);
                }
                return cached;
            }
        } catch (Exception e) {
            logger.error("Failed to read from response cache: {}", e.getMessage());
        }

        logger.warn("Response Cache Miss! Simulating controller-layer work for 1 second...");
        sleep(1000);
        String result = findForResponseCache();

        try {
            redisTemplate.opsForValue().set(responseCacheKey, result, 30, TimeUnit.SECONDS);
        } catch (Exception e) {
            logger.error("Failed to write to response cache: {}", e.getMessage());
        }

        return result;
    }

    public Map<String, String> clearResponseLayerCache() {
        redisTemplate.delete(responseCacheKey);
        logger.warn("Response cache cleared: {}", responseCacheKey);
        Map<String, String> res = new HashMap<>();
        res.put("message", "Response-layer cache key was cleared successfully.");
        res.put("cacheKey", responseCacheKey);
        return res;
    }

    public Map<String, String> clearLogicLayerCache() {
        redisTemplate.delete(logicCacheKey);
        logger.warn("Logic cache cleared: {}", logicCacheKey);
        Map<String, String> res = new HashMap<>();
        res.put("message", "Logic-layer cache key was cleared successfully.");
        res.put("cacheKey", logicCacheKey);
        return res;
    }

    public Map<String, String> clearDbLayerCache() {
        redisTemplate.delete(dbQueryCacheKey);
        logger.warn("DB query cache cleared: {}", dbQueryCacheKey);
        Map<String, String> res = new HashMap<>();
        res.put("message", "DB query-layer cache key was cleared successfully.");
        res.put("cacheKey", dbQueryCacheKey);
        return res;
    }

    public Map<String, Object> findAllLayers() {
        logger.info("--- Triggering ALL 3 layers (cascade fill) ---");
        String responseSample = findForResponseCacheWithDelay();
        Map<String, String> logicSample = findByLogicCache();
        List<Cat> dbItems = findByDbCache();

        Map<String, Object> res = new HashMap<>();
        res.put("responseSample", responseSample);
        res.put("logicSample", logicSample);
        res.put("dbCount", dbItems.size());
        return res;
    }

    public Map<String, Object> invalidateAllLayers() {
        redisTemplate.delete(Arrays.asList(responseCacheKey, logicCacheKey, dbQueryCacheKey));
        logger.warn("All 3 cache layers invalidated (response + logic + db).");

        Map<String, String> cleared = new HashMap<>();
        cleared.put("responseLayer", responseCacheKey);
        cleared.put("logicLayer", logicCacheKey);
        cleared.put("dbLayer", dbQueryCacheKey);

        Map<String, Object> res = new HashMap<>();
        res.put("message", "All 3 cache layers cleared. Next /cats/all-layers/:id will MISS on every layer.");
        res.put("cleared", cleared);
        return res;
    }

    public Map<String, Object> seedCats(int count) {
        String[] names = {"Milo", "Luna", "Oliver", "Leo", "Bella", "Charlie", "Lilly", "Lucy", "Simba", "Chloe"};
        String[] breeds = {"Siamese", "Bengal", "Persian", "Maine Coon", "Ragdoll", "Abyssinian", "Birman", "Sphynx"};
        Random random = new Random();

        List<Cat> cats = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String name = names[random.nextInt(names.length)] + " #" + (i + 1);
            String breed = breeds[random.nextInt(breeds.length)];
            cats.add(new Cat(name, breed));
        }

        catRepository.saveAll(cats);
        logger.warn("Seeded {} cats for caching demo.", count);

        Map<String, Object> res = new HashMap<>();
        res.put("message", "Seed completed successfully.");
        res.put("inserted", count);
        return res;
    }
}
