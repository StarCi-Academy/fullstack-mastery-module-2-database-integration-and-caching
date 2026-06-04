/**
 * CatModule — registers components for Cat feature.
 */
import {
    Module 
} from "@nestjs/common"
import {
    TypeOrmModule 
} from "@nestjs/typeorm"
import {
    Cat
} from "../../entities/postgresql/main"
import {
    CatService 
} from "./cat.service"
import {
    CatController 
} from "./cat.controller"

/**
 * Cat Module — Registers entity and business logic for cats.
 */
@Module({
    imports: [TypeOrmModule.forFeature([Cat])],
    controllers: [CatController],
    providers: [CatService],
    exports: [CatService],
})
export class CatModule {}
