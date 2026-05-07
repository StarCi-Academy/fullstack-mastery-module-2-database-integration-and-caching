/**
 * AppModule — dang ky cac thanh phan cua feature App.
 * (EN: AppModule — registers components for App feature.)
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import { CacheableMemory } from 'cacheable';
import { AppController } from './app.controller';
import { CatModule, Cat } from './modules';
import { RequestTimingInterceptor } from './common/interceptors/request-timing.interceptor';

/**
 * AppModule â€” Cáº¥u hÃ¬nh há»‡ thá»‘ng Caching 3 lá»›p (Response, Logic, DB).
 * (EN: Root module â€” Configures 3-layer caching system: Response, Logic, DB.)
 */
@Module({
  imports: [
    // [Layer 2 & 3] Khá»Ÿi táº¡o CacheModule vá»›i Ä‘a táº§ng (Multi-tier)
    // Táº§ng 1: Redis, Táº§ng 2: Local Memory
    // (EN: [Layer 2 & 3] Initialize multi-tier CacheModule. L1: Redis, L2: Local Memory.)
    CacheModule.registerAsync({
      isGlobal: true, // Quan trá»ng: Cho phÃ©p Inject CACHE_MANAGER vÃ o service layer
      useFactory: async () => {
        return {
          stores: [
            // Æ¯u tiÃªn Redis cho data chia sáº» (EN: Prioritize Redis for shared data)
            new KeyvRedis('redis://localhost:6379'),
            // Fallback memcache náº¿u cáº§n (EN: Fallback memcache)
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
          ],
        };
      },
    }),

    // [Layer 1] Cáº¥u hÃ¬nh TypeORM Query Cache (EN: TypeORM Query Cache setup)
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'demo',
      entities: [Cat],
      synchronize: true,
      cache: {
        type: 'ioredis',
        options: {
          host: 'localhost',
          port: 6379,
        },
      },
    }),

    // Domain modules
    CatModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTimingInterceptor,
    },
  ],
})
export class AppModule {}
