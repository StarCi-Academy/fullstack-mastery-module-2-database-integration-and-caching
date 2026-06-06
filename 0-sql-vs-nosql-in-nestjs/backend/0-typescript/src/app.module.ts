/**
 * Root module — connects PostgreSQL (TypeORM) + MongoDB (Mongoose) + CompareModule.
 */
import {
    Module,
} from "@nestjs/common"
import {
    MongooseModule,
} from "@nestjs/mongoose"
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
    AppController,
} from "./app.controller"
import {
    AppService,
} from "./app.service"
import {
    CompareModule,
} from "./modules"
import {
    SqlComparisonItemEntity,
} from "./entities/postgresql/main"

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig],
        }),
        // PostgreSQL connection for SQL branch (TypeORM).
        TypeOrmModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                type: "postgres",
                host: dbConfig.postgres.host,
                port: dbConfig.postgres.port,
                username: dbConfig.postgres.username,
                password: dbConfig.postgres.password,
                database: dbConfig.postgres.database,
                entities: [SqlComparisonItemEntity],
                synchronize: true,
            }),
        }),
        // MongoDB connection for NoSQL branch (Mongoose).
        MongooseModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                uri: dbConfig.mongo.uri,
            }),
        }),
        CompareModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
