/**
 * Module gốc — kết nối PostgreSQL (TypeORM) + CatModule.
 * (EN: Root module — connects PostgreSQL (TypeORM) + CatModule.)
 */
import {
    Module,
} from "@nestjs/common"
import {
    TypeOrmModule,
} from "@nestjs/typeorm"
import {
    ConfigModule,
} from "@nestjs/config"
import {
    databaseConfig, DatabaseConfig,
} from "./config"
import {
    Cat,
    CatPassport,
    Toy,
    Owner,
    CatModule,
} from "./modules"

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig],
        }),
        // Cấu hình kết nối PostgreSQL tập trung.
        // (EN: Centralized PostgreSQL connection config.)
        TypeOrmModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                type: "postgres",
                host: dbConfig.postgres.host,
                port: dbConfig.postgres.port,
                username: dbConfig.postgres.username,
                password: dbConfig.postgres.password,
                database: dbConfig.postgres.database,
                // Tự động load các entities được khai báo.
                // (EN: Auto-load declared entities.)
                entities: [Cat,
                    CatPassport,
                    Toy,
                    Owner],
                // [QUAN TRỌNG] Tự động đồng bộ schema — không dùng cho production!
                // (EN: [IMPORTANT] Auto-sync database schema — do not use in production!)
                synchronize: true,
            }),
        }),
        CatModule,
    ],
})
export class AppModule {}
