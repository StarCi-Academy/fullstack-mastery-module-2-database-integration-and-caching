/**
 * Controller REST cho feature Cat.
 * (EN: REST controller for Cat feature.)
 */
import {
    BadRequestException,
    Controller,
    Post,
    Get,
    Query,
    UseInterceptors,
    Logger,
    Delete,
} from "@nestjs/common"
import {
    CacheInterceptor, CacheKey, CacheTTL 
} from "@nestjs/cache-manager"
import {
    CatService 
} from "./cat.service"

/**
 * Cat Controller — Trình diễn 3 tầng caching qua 3 endpoints khác nhau.
 * (EN: Cat Controller — Demonstrates 3 caching layers through 3 different endpoints.)
 */
@Controller("cats")
export class CatController {
    private readonly logger = new Logger(CatController.name)

    constructor(private readonly catService: CatService) {}

  /**
   * POST /cats/seed?count=1000 — Seed nhanh dữ liệu bằng faker.
   * (EN: POST /cats/seed?count=1000 — Quick faker-based seed endpoint.)
   */
  @Post("seed")
    async seedCats(
    @Query("count") count?: string,
    ): Promise<{ message: string; inserted: number }> {
        const seedCount = count ? Number(count) : 1000

        if (!Number.isInteger(seedCount) || seedCount <= 0) {
            throw new BadRequestException(
                "count must be a positive integer (example: /cats/seed?count=1000)",
            )
        }

        this.logger.warn(`--- Seeding ${seedCount} cats for cache demo ---`)
        return await this.catService.seedCats(seedCount)
    }

  /**
   * ENDPOINT 1: Demo Response Cache (Request Level).
   * Tự Ä‘á»™ng cache toÃ n bá»™ HTTP Response dựa trên URL vÃ  Key.
   * (EN: ENDPOINT 1: Demo Response Cache (Request Level). Auto-caches HTTP Response based on URL and Key.)
   */
  @Get("response-layer")
   
  @UseInterceptors(CacheInterceptor) // Tầng 3: Chặn ngay tại entry point (EN: Block at entry point)
   
  @CacheKey("cats_res_layer")
   
  @CacheTTL(30000) // 30 giây (EN: 30 seconds)
  async getResponseCache(): Promise<string> {
      this.logger.log("--- Triggering Layer 3 (Response Cache) flow ---")
      return await this.catService.findForResponseCacheWithDelay()
  }

  /**
   * DELETE /cats/response-layer/cache — Xóa key cache tầng controller.
   * (EN: DELETE /cats/response-layer/cache — Clear response-layer cache key.)
   */
  @Delete("response-layer/cache")
  async clearResponseLayerCache(): Promise<{
    message: string;
    cacheKey: string;
  }> {
      this.logger.warn("--- Clearing Layer 3 (Response Cache) key ---")
      return await this.catService.clearResponseLayerCache()
  }

  /**
   * ENDPOINT 2: Demo Logic Cache (Service Level).
   * Service chủ động kiểm tra cache bằng code trước khi tính toán.
   * (EN: ENDPOINT 2: Demo Logic Cache (Service Level). Service manually checks cache before computing.)
   */
  @Get("logic-layer")
  async getLogicCache(): Promise<{ message: string; timestamp: string }> {
      this.logger.log("--- Triggering Layer 2 (Logic Cache) flow ---")
      return await this.catService.findByLogicCache()
  }

  /**
   * DELETE /cats/logic-layer/cache — Xóa key cache tầng logic.
   * (EN: DELETE /cats/logic-layer/cache — Clear logic-layer cache key.)
   */
  @Delete("logic-layer/cache")
  async clearLogicLayerCache(): Promise<{
    message: string;
    cacheKey: string;
  }> {
      this.logger.warn("--- Clearing Layer 2 (Logic Cache) key ---")
      return await this.catService.clearLogicLayerCache()
  }

  /**
   * ENDPOINT 3: Demo DB Query Cache (Data Level).
   * TypeORM tự động cache kết quả của câu lệnh SQL.
   * (EN: ENDPOINT 3: Demo DB Query Cache (Data Level). TypeORM auto-caches SQL query results.)
   */
  @Get("db-layer")
  async getDbCache() {
      this.logger.log("--- Triggering Layer 1 (DB Query Cache) flow ---")
      return await this.catService.findByDbCache()
  }

  /**
   * DELETE /cats/db-layer/cache — Xóa key query cache tầng DB.
   * (EN: DELETE /cats/db-layer/cache — Clear DB query-layer cache key.)
   */
  @Delete("db-layer/cache")
  async clearDbLayerCache(): Promise<{
    message: string;
    cacheKey: string;
  }> {
      this.logger.warn("--- Clearing Layer 1 (DB Query Cache) key ---")
      return await this.catService.clearDbLayerCache()
  }
}
