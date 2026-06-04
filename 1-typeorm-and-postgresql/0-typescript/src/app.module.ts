/**
 * Root module — connects PostgreSQL (TypeORM) + CatModule.
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
    CatModule,
} from "./modules"
import {
    Cat,
    CatPassport,
    Toy,
    Owner,
} from "./entities/postgresql/main"

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig],
        }),
        // Centralized PostgreSQL connection config.
        TypeOrmModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                type: "postgres",
                host: dbConfig.postgres.host,
                port: dbConfig.postgres.port,
                username: dbConfig.postgres.username,
                password: dbConfig.postgres.password,
                database: dbConfig.postgres.database,
                // Auto-load declared entities.
                entities: [Cat,
                    CatPassport,
                    Toy,
                    Owner],
                // [IMPORTANT] Auto-sync database schema — do not use in production!
                synchronize: true,
            }),
        }),
        CatModule,
    ],
})
export class AppModule {}
