/**
 * REST controller for App feature.
 */
import {
    Controller, Get, UseInterceptors 
} from "@nestjs/common"
import {
    CacheInterceptor, CacheKey, CacheTTL 
} from "@nestjs/cache-manager"

/**
 * AppController — Basic caching demo at root.
 */
@Controller()
export class AppController {
  /**
   * GET / — Basic caching demo at root.
   */
  @Get()
  // Use CacheInterceptor to cache response
  @UseInterceptors(CacheInterceptor)
  // Set cache key name
  @CacheKey("home_cache")
  // Set cache time
  @CacheTTL(60) // 60 seconds
  // Return response
    getHello(): string {
        return "Hello Caching with Multi-tier Strategy (Memory + Redis)!"
    }
}
