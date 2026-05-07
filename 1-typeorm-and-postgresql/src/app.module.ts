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
    Cat,
    CatPassport,
    Toy,
    Owner,
    CatModule,
} from "./modules"

@Module({
    imports: [
        // Cấu hình kết nối PostgreSQL tập trung.
        // (EN: Centralized PostgreSQL connection config.)
        TypeOrmModule.forRoot({
            type: "postgres",
            host: "localhost",
            port: 5432,
            username: "postgres",
            password: "postgres",
            database: "demo",
            // Tự động load các entities được khai báo.
            // (EN: Auto-load declared entities.)
            entities: [Cat, CatPassport, Toy, Owner],
            // [QUAN TRỌNG] Tự động đồng bộ schema — không dùng cho production!
            // (EN: [IMPORTANT] Auto-sync database schema — do not use in production!)
            synchronize: true,
        }),
        CatModule,
    ],
})
export class AppModule {}
