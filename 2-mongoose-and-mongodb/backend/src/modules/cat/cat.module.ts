/**
 * CatModule — dang ky cac thanh phan cua feature Cat.
 * (EN: CatModule — registers components for Cat feature.)
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
 * Cat Module — Kết nối Schema vÃ  các thÃ nh phần xử lý của Cat.
 * (EN: Connects Schema and processing components for Cat.)
 */
@Module({
    imports: [
    // ÄÄƒng ký Model vÃ o MongooseModule (EN: Register Model into MongooseModule)
        MongooseModule.forFeature([{
            name: Cat.name, schema: CatSchema 
        }]),
    ],
    controllers: [CatController],
    providers: [CatService],
    exports: [CatService],
})
export class CatModule {}
