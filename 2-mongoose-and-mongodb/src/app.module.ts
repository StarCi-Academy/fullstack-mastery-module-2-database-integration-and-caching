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
    CatModule 
} from "./modules"

/**
 * AppModule — Cấu hình kết nối MongoDB và quản lý modules.
 * (EN: Configures MongoDB connection and manages modules.)
 */
@Module({
    imports: [
    // Kết nối MongoDB với URI từ Docker config
    // (EN: MongoDB connection with URI from Docker config)
        MongooseModule.forRoot(
            "mongodb://starci_admin:starci_password@localhost:27017/starci_db?authSource=admin",
        ),

        // Feature Modules
        CatModule,
    ],
})
export class AppModule {}
