/**
 * Service xu ly logic nghiep vu cua Cat.
 * (EN: Business logic service for Cat.)
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
} from "./cat.entity"

/**
 * Cat Service — Minh há»a 3 tầng caching (DB, Logic, Response).
 * (EN: Cat Service — Demonstrates 3 caching layers: DB, Logic, Response.)
 */
@Injectable()
export class CatService {
    private readonly logger = new Logger(CatService.name)
    private readonly responseCacheKey = "cats_res_layer"
    private readonly logicCacheKey = "cats_logic_layer_cache"
    private readonly dbQueryCacheKey = "cats_db_layer_cache"

    private async sleep(ms: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve,
            ms))
    }

    private isLogicCacheResult(
        value: unknown,
    ): value is { message: string; timestamp: string } {
        if (typeof value !== "object" || value === null) {
            return false
        }

        const candidate = value as Record<string, unknown>
        return (
            typeof candidate.message === "string" &&
      typeof candidate.timestamp === "string"
        )
    }

    constructor(
    @InjectRepository(Cat)
    private readonly catRepository: Repository<Cat>,
    private readonly dataSource: DataSource,
    // Inject CACHE_MANAGER để thực hiện manual caching bằng code logic
    // (EN: Inject CACHE_MANAGER for manual programmatic caching)
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    ) {}

    /**
   * LAYER 1: Database Query Cache (Tầng Database).
   * Dùng TypeORM để cache lại kết quả sau khi thực thi SQL.
   * (EN: LAYER 1: Database Query Cache (Database layer). Uses TypeORM to cache SQL execution results.)
   */
    async findByDbCache(): Promise<Cat[]> {
        this.logger.log("Executing Layer 1: TypeORM Query Cache check...")

        // [execute] DB query với tùy chá»n cache của TypeORM
        // (EN: DB query with TypeORM cache option)
        return await this.catRepository.find({
            cache: {
                id: this.dbQueryCacheKey,
                milliseconds: 30000, // Cache trong 30 giây (EN: 30s cache)
            },
        })
    }

    /**
   * LAYER 2: Cache By Logic (Tầng Nghiệp vụ).
   * Tự viết code để kiểm tra cache trước khi thực hiện logic nặng.
   * (EN: LAYER 2: Cache By Logic (Business layer). Manually check cache before heavy logic.)
   */
    async findByLogicCache(): Promise<{ message: string; timestamp: string }> {
    // [prepare] Kiá»ƒm tra xem dữ liệu đã có trong cache chưa
    // (EN: Check if data already exists in cache)
        this.logger.log("Executing Layer 2: Programmatic Logic Cache check...")
        const cachedData = await this.cacheManager.get(this.logicCacheKey)

        if (this.isLogicCacheResult(cachedData)) {
            this.logger.debug("Logic Cache Hit! Returning data directly.")
            return cachedData
        }

        // [execute] Giả lập xử lý nghiệp vụ nặng (EN: Simulate heavy business logic)
        this.logger.warn("Logic Cache Miss! Simulating heavy work for 1 second...")
        await this.sleep(1000) // Sleep 1s
        const result = {
            message: "Hải sản cho mèo cực phẩm",
            timestamp: new Date().toISOString(),
        }

        // [confirm] Lưu kết quả vÃ o cache đễ dùng cho lần sau
        // (EN: Save result to cache for future use)
        await this.cacheManager.set(this.logicCacheKey,
            result,
            60000) // 1 phút (EN: 1 minute)

        return result
    }

    /**
   * LAYER 3: Response Cache (Tầng Tiếp nhận).
   * Tầng nÃ y thÆ°á»ng được handle ở Controller, service chỉ trả vá» data thô.
   * (EN: LAYER 3: Response Cache (Entry layer). Usually handled at Controller; service just returns raw data.)
   */
    findForResponseCache(): string {
        this.logger.log(
            "Layer 3 flow: Request reaching Service (it means Response Cache was MISS)",
        )
        // Intentionally no delay here because method is sync
        return "This data would be cached at the Controller level using CacheInterceptor"
    }

    /**
   * LAYER 3 helper: mô phá»ng tác vụ nặng 1 giây cho lần cache miss.
   * (EN: Simulates 1-second heavy work for response-layer cache miss.)
   */
    async findForResponseCacheWithDelay(): Promise<string> {
        this.logger.warn(
            "Response Cache Miss! Simulating controller-layer work for 1 second...",
        )
        await this.sleep(1000) // Sleep 1s
        return this.findForResponseCache()
    }

    /**
   * Xóa key cache của tầng response để demo lại miss/hit.
   * (EN: Clears response-layer cache key to replay miss/hit demo.)
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
   * Xóa key cache của tầng logic để thử lại luồng miss/hit.
   * (EN: Clears logic-layer cache key to replay miss/hit.)
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
   * Xóa query cache của TypeORM để thử lại luồng DB cache.
   * (EN: Clears TypeORM query cache key to replay DB-layer cache flow.)
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
   * Seed nhanh dữ liệu cat để demo caching với tập dữ liệu lớn.
   * (EN: Quickly seeds cat data for large-dataset caching demo.)
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
