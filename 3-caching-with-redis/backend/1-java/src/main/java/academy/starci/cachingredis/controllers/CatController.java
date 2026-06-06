package academy.starci.cachingredis.controllers;

import academy.starci.cachingredis.entities.Cat;
import academy.starci.cachingredis.services.CatService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * CatController — REST endpoints for the Cat feature.
 *
 * <p>Exposes three cache-layer demo endpoints plus seed and invalidation helpers:
 * <ul>
 *   <li>{@code GET /cats/response-layer} — Layer 3: HTTP response cache.</li>
 *   <li>{@code GET /cats/logic-layer}    — Layer 2: Business logic cache-aside.</li>
 *   <li>{@code GET /cats/db-layer}       — Layer 1: DB query result cache.</li>
 *   <li>{@code DELETE /cats/*\/cache}    — Invalidation endpoints per layer.</li>
 *   <li>{@code POST /cats/seed}          — Seed helper for demo data.</li>
 * </ul>
 */
@RestController
@RequestMapping("/cats")
public class CatController {

    /** Service holding all caching logic — injected via constructor (no field injection). */
    private final CatService catService;

    /**
     * Constructor injection so {@code CatService} can be swapped in tests.
     *
     * @param catService The Cat business-logic and cache service.
     */
    public CatController(CatService catService) {
        this.catService = catService;
    }

    /**
     * POST /cats/seed?count={n} — Inserts {@code count} random Cat rows into Postgres.
     * Seeding with a large count (e.g. 1000) ensures the DB-layer query is
     * expensive enough to make the MISS/HIT latency difference observable.
     *
     * @param count Number of rows to insert (default 1000).
     * @return Map with {@code message} and {@code inserted} count.
     */
    @PostMapping("/seed")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> seedCats(@RequestParam(required = false, defaultValue = "1000") int count) {
        return catService.seedCats(count);
    }

    /**
     * GET /cats/response-layer — Demonstrates Layer 3 (Response / entry-point cache).
     * First call simulates ~1 s work; subsequent calls within 30 s return instantly from Redis.
     *
     * @return Cached string payload.
     */
    @GetMapping("/response-layer")
    public String getResponseCache() {
        return catService.findForResponseCacheWithDelay();
    }

    /**
     * DELETE /cats/response-layer/cache — Clears the Layer 3 Redis key.
     * Forces the next GET /cats/response-layer to be a cold MISS.
     *
     * @return Map with {@code message} and {@code cacheKey} fields.
     */
    @DeleteMapping("/response-layer/cache")
    public Map<String, String> clearResponseLayerCache() {
        return catService.clearResponseLayerCache();
    }

    /**
     * GET /cats/logic-layer — Demonstrates Layer 2 (Business logic cache-aside).
     * MISS sleeps 1 s and computes a result with a timestamp; HIT returns the
     * same frozen timestamp instantly, proving the cache is active.
     *
     * @return Map with {@code message} and {@code timestamp} fields.
     */
    @GetMapping("/logic-layer")
    public Map<String, String> getLogicCache() {
        return catService.findByLogicCache();
    }

    /**
     * DELETE /cats/logic-layer/cache — Clears the Layer 2 Redis key.
     * Forces the next GET /cats/logic-layer to be a cold MISS (~1 s delay).
     *
     * @return Map with {@code message} and {@code cacheKey} fields.
     */
    @DeleteMapping("/logic-layer/cache")
    public Map<String, String> clearLogicLayerCache() {
        return catService.clearLogicLayerCache();
    }

    /**
     * GET /cats/db-layer — Demonstrates Layer 1 (DB query result cache).
     * MISS runs a real Postgres {@code SELECT *} on 1000 rows (slower);
     * HIT returns the Redis-cached JSON (much faster, within 30 s TTL).
     *
     * @return List of all Cat entities.
     */
    @GetMapping("/db-layer")
    public List<Cat> getDbCache() {
        return catService.findByDbCache();
    }

    /**
     * DELETE /cats/db-layer/cache — Clears the Layer 1 Redis key.
     * Forces the next GET /cats/db-layer to hit Postgres again.
     *
     * @return Map with {@code message} and {@code cacheKey} fields.
     */
    @DeleteMapping("/db-layer/cache")
    public Map<String, String> clearDbLayerCache() {
        return catService.clearDbLayerCache();
    }

    /**
     * GET /cats/all-layers/{id} — Warms all 3 cache layers in one request.
     * The {@code id} path variable is a scenario tag for the learner; the
     * service does not use it.
     *
     * @param id Scenario identifier (unused).
     * @return Map with {@code responseSample}, {@code logicSample}, and {@code dbCount}.
     */
    @GetMapping("/all-layers/{id}")
    public Map<String, Object> getAllLayers(@PathVariable String id) {
        // id is intentionally ignored — serves only as a URL differentiator in the demo
        return catService.findAllLayers();
    }

    /**
     * DELETE /cats/all-layers/cache — Cascade-invalidates all 3 cache layers at once.
     * After this call every subsequent GET to any cache-layer endpoint will be a MISS.
     *
     * @return Map with {@code message} and {@code cleared} sub-map.
     */
    @DeleteMapping("/all-layers/cache")
    public Map<String, Object> clearAllLayers() {
        return catService.invalidateAllLayers();
    }
}
