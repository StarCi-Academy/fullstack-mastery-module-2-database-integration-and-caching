/**
 * REST controller for Cat feature.
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
 * Cat Controller — Demonstrates 3 caching layers through 3 different endpoints.
 */
@Controller("cats")
export class CatController {
    private readonly logger = new Logger(CatController.name)

    constructor(private readonly catService: CatService) {}

  /**
   * POST /cats/seed?count=1000 — Quick faker-based seed endpoint.
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
   * Auto-caches HTTP Response based on URL and Key.
   */
  @Get("response-layer")
   
  @UseInterceptors(CacheInterceptor) // L3: Block at entry point
   
  @CacheKey("cats_res_layer")
   
  @CacheTTL(30000) // 30 seconds
  async getResponseCache(): Promise<string> {
      this.logger.log("--- Triggering Layer 3 (Response Cache) flow ---")
      return await this.catService.findForResponseCacheWithDelay()
  }

  /**
   * DELETE /cats/response-layer/cache — Clear response-layer cache key.
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
   * Service manually checks cache before computing.
   */
  @Get("logic-layer")
  async getLogicCache(): Promise<{ message: string; timestamp: string }> {
      this.logger.log("--- Triggering Layer 2 (Logic Cache) flow ---")
      return await this.catService.findByLogicCache()
  }

  /**
   * DELETE /cats/logic-layer/cache — Clear logic-layer cache key.
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
   * TypeORM auto-caches SQL query results.
   */
  @Get("db-layer")
  async getDbCache() {
      this.logger.log("--- Triggering Layer 1 (DB Query Cache) flow ---")
      return await this.catService.findByDbCache()
  }

  /**
   * DELETE /cats/db-layer/cache — Clear DB query-layer cache key.
   */
  @Delete("db-layer/cache")
  async clearDbLayerCache(): Promise<{
    message: string;
    cacheKey: string;
  }> {
      this.logger.warn("--- Clearing Layer 1 (DB Query Cache) key ---")
      return await this.catService.clearDbLayerCache()
  }

  /**
   * GET /cats/all-layers/:id — Trigger all 3 layers in order to populate every cache.
   *
   * `:id` is only a scenario tag chosen by the learner; the service does not use the value.
   */
  @Get("all-layers/:id")
  async getAllLayers(): Promise<{
    responseSample: string;
    logicSample: { message: string; timestamp: string };
    dbCount: number;
  }> {
      this.logger.log("--- Triggering ALL 3 layers (cascade fill) ---")
      return await this.catService.findAllLayers()
  }

  /**
   * DELETE /cats/all-layers/cache — Clear all 3 cache layers at once (cascade invalidation).
   */
  @Delete("all-layers/cache")
  async clearAllLayers(): Promise<{
    message: string;
    cleared: { responseLayer: string; logicLayer: string; dbLayer: string };
  }> {
      this.logger.warn("--- Clearing ALL 3 cache layers ---")
      return await this.catService.invalidateAllLayers()
  }
}
