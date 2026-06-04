/**
 * CatModule — registers entity + controller + service for cat feature.
 */
import {
    Module 
} from "@nestjs/common"
import {
    TypeOrmModule 
} from "@nestjs/typeorm"
import {
    Cat, CatPassport, Toy, Owner
} from "../../entities/postgresql/main"
import {
    CatService 
} from "./cat.service"
import {
    CatController 
} from "./cat.controller"

/**
 * Cat Module — Manages components related to cats.
 */
@Module({
    imports: [
        // Register entities into this module's context
        TypeOrmModule.forFeature([Cat,
            CatPassport,
            Toy,
            Owner]),
    ],
    controllers: [CatController],
    providers: [CatService],
    exports: [CatService], // Export for other modules
})
export class CatModule {}
