/**
 * CatModule — registers components for Cat feature.
 */
import {
    Module 
} from "@nestjs/common"
import {
    MongooseModule 
} from "@nestjs/mongoose"
import {
    Cat, CatSchema
} from "../../schemas/mongodb/main"
import {
    CatService 
} from "./cat.service"
import {
    CatController 
} from "./cat.controller"

/**
 * Cat Module — Connects Schema and processing components for Cat.
 */
@Module({
    imports: [
        // Register Model into MongooseModule
        MongooseModule.forFeature([{
            name: Cat.name, schema: CatSchema 
        }]),
    ],
    controllers: [CatController],
    providers: [CatService],
    exports: [CatService],
})
export class CatModule {}
