/**
 * CatModule — đăng ký entity + controller + service cho feature mèo.
 * (EN: CatModule — registers entity + controller + service for cat feature.)
 */
import {
    Module 
} from "@nestjs/common"
import {
    TypeOrmModule 
} from "@nestjs/typeorm"
import {
    Cat, CatPassport, Toy, Owner 
} from "./entities"
import {
    CatService 
} from "./cat.service"
import {
    CatController 
} from "./cat.controller"

/**
 * Cat Module — Quản lý các thành phần liên quan đến mèo.
 * (EN: Manages components related to cats.)
 */
@Module({
    imports: [
    // Đăng ký các thực thể vào context của module này
    // (EN: Register entities into this module's context)
        TypeOrmModule.forFeature([Cat,
            CatPassport,
            Toy,
            Owner]),
    ],
    controllers: [CatController],
    providers: [CatService],
    exports: [CatService], // Export để module khác có thể dùng (EN: Export for other modules)
})
export class CatModule {}
