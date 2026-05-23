/**
 * AppModule — dang ky cac thanh phan cua feature App.
 * (EN: AppModule — registers components for App feature.)
 */
import {
    Module 
} from "@nestjs/common"
import {
    MongooseModule 
} from "@nestjs/mongoose"
import {
    ConfigModule 
} from "@nestjs/config"
import {
    databaseConfig, DatabaseConfig 
} from "./config"
import {
    CatModule 
} from "./modules"

/**
 * AppModule — Cấu hình kết nối MongoDB và quản lý modules.
 * (EN: Configures MongoDB connection and manages modules.)
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig],
        }),
        // Kết nối MongoDB với URI từ Docker config
        // (EN: MongoDB connection with URI from Docker config)
        MongooseModule.forRootAsync({
            inject: [databaseConfig.KEY],
            useFactory: (dbConfig: DatabaseConfig) => ({
                uri: dbConfig.mongo.uri,
            }),
        }),

        // Feature Modules
        CatModule,
    ],
})
export class AppModule {}
