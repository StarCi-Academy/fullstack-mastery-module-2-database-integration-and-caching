/**
 * AppModule — dang ky cac thanh phan cua feature App.
 * (EN: AppModule — registers components for App feature.)
 */
import {
    Module 
} from "@nestjs/common"
import {
    TypeOrmModule 
} from "@nestjs/typeorm"
import {
    CacheModule 
} from "@nestjs/cache-manager"
import {
    APP_INTERCEPTOR 
} from "@nestjs/core"
import KeyvRedis from "@keyv/redis"
import {
    Keyv 
} from "keyv"
import {
    CacheableMemory 
} from "cacheable"
import {
    AppController 
} from "./app.controller"
import {
    CatModule, Cat 
} from "./modules"
import {
    RequestTimingInterceptor 
} from "./common"

/**
 * AppModule — Cấu hình hệ thống Caching 3 lớp (Response, Logic, DB).
 * (EN: Root module — Configures 3-layer caching system: Response, Logic, DB.)
 */
@Module({
    imports: [
    // [Layer 2 & 3] Khởi tạo CacheModule với đa tầng (Multi-tier)
    // Tầng 1: Redis, Tầng 2: Local Memory
    // (EN: [Layer 2 & 3] Initialize multi-tier CacheModule. L1: Redis, L2: Local Memory.)
        CacheModule.registerAsync({
            isGlobal: true, // Quan trá»ng: Cho phép Inject CACHE_MANAGER vÃ o service layer
            useFactory: async () => {
                return {
                    stores: [
                        // Ưu tiên Redis cho data chia sẻ (EN: Prioritize Redis for shared data)
                        new KeyvRedis("redis://localhost:6379"),
                        // Fallback memcache nếu cần (EN: Fallback memcache)
                        new Keyv({
                            store: new CacheableMemory({
                                ttl: 60000, lruSize: 5000 
                            }),
                        }),
                    ],
                }
            },
        }),

        // [Layer 1] Cấu hình TypeORM Query Cache (EN: TypeORM Query Cache setup)
        TypeOrmModule.forRoot({
            type: "postgres",
            host: "localhost",
            port: 5432,
            username: "postgres",
            password: "postgres",
            database: "demo",
            entities: [Cat],
            synchronize: true,
            cache: {
                type: "ioredis",
                options: {
                    host: "localhost",
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
