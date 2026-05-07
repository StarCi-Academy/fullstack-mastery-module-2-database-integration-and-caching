/**
 * Controller REST cho feature App.
 * (EN: REST controller for App feature.)
 */
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';

/**
 * AppController â€” Demo caching cÆ¡ báº£n táº¡i root.
 * (EN: AppController â€” Basic caching demo at root.)
 */
@Controller()
export class AppController {
  /**
   * GET / â€” Demo caching cÆ¡ báº£n táº¡i root.
   * (EN: GET / â€” Basic caching demo at root.)
   */
  @Get()
  // Sử dụng CacheInterceptor để cache response
  // (EN: Use CacheInterceptor to cache response)
  @UseInterceptors(CacheInterceptor)
  // Äáº·t tÃªn cache key
  // (EN: Set cache key name)
  @CacheKey('home_cache')
  // Äáº·t thá»i gian cache
  // (EN: Set cache time)
  @CacheTTL(60) // 60 giây (EN: 60 seconds)
  // Tráº£ vá» response
  getHello(): string {
    return 'Hello Caching with Multi-tier Strategy (Memory + Redis)!';
  }
}
