/**
 * Business logic service for Cat.
 * Implements three caching strategies demonstrated in the lesson:
 *  - Layer 1 (DB): TypeORM query-result cache stored in Redis via ioredis.
 *  - Layer 2 (Logic): Manual cache-aside with `CACHE_MANAGER` (cache-manager + Redis).
 *  - Layer 3 (Response): HTTP response cache via `CacheInterceptor` at the controller.
 */
import {
    Injectable, Logger, Inject
} from "@nestjs/common"
import {
    InjectRepository
} from "@nestjs/typeorm"
import {
    CACHE_MANAGER
} from "@nestjs/cache-manager"
import type {
    Cache
} from "cache-manager"
import {
    faker
} from "@faker-js/faker"
import {
    DataSource, Repository
} from "typeorm"
import {
    Cat
} from "../../entities/postgresql/main"

/**
 * CatService — Demonstrates 3 caching layers: DB, Logic, Response.
 * All three layers share the same Redis instance but use different
 * client libraries: ioredis (TypeORM), cache-manager/keyv (logic+response).
 */
@Injectable()
export class CatService {
    private readonly logger = new Logger(CatService.name)

    /** Cache key for the response-layer (CacheInterceptor) cache entry. */
    private readonly responseCacheKey = "cats_res_layer"
    /** Cache key for the logic-layer (CACHE_MANAGER cache-aside) entry. */
    private readonly logicCacheKey = "cats_logic_layer_cache"
    /** Cache key for the DB-layer (TypeORM query cache) entry. */
    private readonly dbQueryCacheKey = "cats_db_layer_cache"

    /**
     * Utility to simulate expensive computation or I/O during a cache MISS.
     * The 1-second delay makes the MISS/HIT latency difference clearly
     * visible in the terminal `[TIME]` log line.
     * @param ms - Duration in milliseconds to sleep.
     */
    private async sleep(ms: number): Promise<void> {
        // Wrap setTimeout in a Promise so it is compatible with async/await
        await new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * Type guard for the logic-cache result shape.
     * Cache-manager returns `unknown` — narrowing prevents runtime errors
     * when the cache holds an unexpected value (e.g. after a schema change).
     * @param value - Raw value retrieved from the cache store.
     * @returns `true` when the value matches `{ message: string; timestamp: string }`.
     */
    private isLogicCacheResult(
        value: unknown,
    ): value is { message: string; timestamp: string } {
        // Reject null and non-objects immediately
        if (typeof value !== "object" || value === null) {
            return false
        }

        // Cast to a record so we can check individual string fields
        const candidate = value as Record<string, unknown>
        return (
            typeof candidate.message === "string" &&
            typeof candidate.timestamp === "string"
        )
    }

    constructor(
        /** TypeORM repository for Cat — used in Layer 1 (DB cache). */
        @InjectRepository(Cat)
        private readonly catRepository: Repository<Cat>,
        /** DataSource gives access to `queryResultCache` for manual invalidation. */
        private readonly dataSource: DataSource,
        /** Inject the shared CACHE_MANAGER for Layer 2 (logic) and Layer 3 (response) cache operations. */
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    /**
    * LAYER 1: Database Query Cache (Database layer). Uses TypeORM to cache SQL execution results.
    */
    async findByDbCache(): Promise<Cat[]> {
        this.logger.log("Executing Layer 1: TypeORM Query Cache check...")

        // [execute] DB query with TypeORM cache option
        return await this.catRepository.find({
            cache: {
                id: this.dbQueryCacheKey,
                milliseconds: 30000, // 30s cache
            },
        })
    }

    /**
    * LAYER 2: Cache By Logic (Business layer). Manually check cache before heavy logic.
    */
    async findByLogicCache(): Promise<{ message: string; timestamp: string }> {
    // [prepare] Check if data already exists in cache
        this.logger.log("Executing Layer 2: Programmatic Logic Cache check...")
        const cachedData = await this.cacheManager.get(this.logicCacheKey)

        if (this.isLogicCacheResult(cachedData)) {
            this.logger.debug("Logic Cache Hit! Returning data directly.")
            return cachedData
        }

        // [execute] Simulate heavy business logic
        this.logger.warn("Logic Cache Miss! Simulating heavy work for 1 second...")
        await this.sleep(1000) // Sleep 1s
        const result = {
            message: "Hải sản cho mèo cực phẩm",
            timestamp: new Date().toISOString(),
        }

        // [confirm] Save result to cache for future use
        await this.cacheManager.set(this.logicCacheKey,
            result,
            60000) // 1 minute

        return result
    }

    /**
    * LAYER 3: Response Cache (Entry layer). Usually handled at Controller; service just returns raw data.
    */
    findForResponseCache(): string {
        this.logger.log(
            "Layer 3 flow: Request reaching Service (it means Response Cache was MISS)",
        )
        // Intentionally no delay here because method is sync
        return "This data would be cached at the Controller level using CacheInterceptor"
    }

    /**
    * LAYER 3 helper: Simulates 1-second heavy work for response-layer cache miss.
    */
    async findForResponseCacheWithDelay(): Promise<string> {
        this.logger.warn(
            "Response Cache Miss! Simulating controller-layer work for 1 second...",
        )
        await this.sleep(1000) // Sleep 1s
        return this.findForResponseCache()
    }

    /**
    * Clears response-layer cache key to replay miss/hit demo.
    */
    async clearResponseLayerCache(): Promise<{
    message: string;
    cacheKey: string;
  }> {
        await this.cacheManager.del(this.responseCacheKey)
        this.logger.warn(`Response cache cleared: ${this.responseCacheKey}`)
        return {
            message: "Response-layer cache key was cleared successfully.",
            cacheKey: this.responseCacheKey,
        }
    }

    /**
    * Clears logic-layer cache key to replay miss/hit.
    */
    async clearLogicLayerCache(): Promise<{
    message: string;
    cacheKey: string;
  }> {
        await this.cacheManager.del(this.logicCacheKey)
        this.logger.warn(`Logic cache cleared: ${this.logicCacheKey}`)
        return {
            message: "Logic-layer cache key was cleared successfully.",
            cacheKey: this.logicCacheKey,
        }
    }

    /**
    * Clears TypeORM query cache key to replay DB-layer cache flow.
    */
    async clearDbLayerCache(): Promise<{
    message: string;
    cacheKey: string;
  }> {
        if (this.dataSource.queryResultCache) {
            await this.dataSource.queryResultCache.remove([this.dbQueryCacheKey])
        }

        this.logger.warn(`DB query cache cleared: ${this.dbQueryCacheKey}`)
        return {
            message: "DB query-layer cache key was cleared successfully.",
            cacheKey: this.dbQueryCacheKey,
        }
    }

    /**
     * Read data through all 3 layers (response/logic/db) for cascade invalidation demo.
     */
    async findAllLayers(): Promise<{
        responseSample: string;
        logicSample: { message: string; timestamp: string };
        dbCount: number;
    }> {
        // [execute] Trigger each layer in order so the first call fills every cache.
        const responseSample = await this.findForResponseCacheWithDelay()
        const logicSample = await this.findByLogicCache()
        const dbItems = await this.findByDbCache()

        // [confirm] Return a compact snapshot so the client can easily verify hit/miss.
        return {
            responseSample,
            logicSample,
            dbCount: dbItems.length,
        }
    }

    /**
     * Clear all 3 cache layers at once — cascade invalidation so the next read is fresh.
     */
    async invalidateAllLayers(): Promise<{
        message: string;
        cleared: { responseLayer: string; logicLayer: string; dbLayer: string };
    }> {
        // [execute] Delete in parallel to show that inter-layer order does not matter.
        await Promise.all([
            this.cacheManager.del(this.responseCacheKey),
            this.cacheManager.del(this.logicCacheKey),
            this.dataSource.queryResultCache
                ? this.dataSource.queryResultCache.remove([this.dbQueryCacheKey])
                : Promise.resolve(),
        ])

        // [confirm] Log for demo purposes and return a readable structure for the client.
        this.logger.warn("All 3 cache layers invalidated (response + logic + db).")
        return {
            message: "All 3 cache layers cleared. Next /cats/all-layers/:id will MISS on every layer.",
            cleared: {
                responseLayer: this.responseCacheKey,
                logicLayer: this.logicCacheKey,
                dbLayer: this.dbQueryCacheKey,
            },
        }
    }

    /**
    * Quickly seeds cat data for large-dataset caching demo.
    */
    async seedCats(count = 1000): Promise<{
    message: string;
    inserted: number;
  }> {
        const payload: Array<Pick<Cat, "name" | "breed">> = Array.from(
            {
                length: count 
            },
            () => ({
                name: faker.person.firstName(),
                breed: faker.animal.cat(),
            }),
        )

        await this.catRepository.insert(payload)
        this.logger.warn(`Seeded ${count} cats for caching demo.`)

        return {
            message: "Seed completed successfully.",
            inserted: count,
        }
    }
}
