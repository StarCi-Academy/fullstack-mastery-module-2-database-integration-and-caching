/**
 * CompareModule — đăng ký TypeORM + Mongoose feature cho so sánh SQL vs NoSQL.
 * (EN: CompareModule — registers TypeORM + Mongoose features for SQL vs NoSQL comparison.)
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
    CompareController,
} from "./compare.controller"
import {
    CompareService,
} from "./compare.service"
import {
    SqlComparisonItemEntity,
} from "../../entities/postgresql/main"
import {
    NoSqlComparisonItem,
    NoSqlComparisonItemSchema,
} from "../../schemas/mongodb/main"

@Module({
    imports: [
        TypeOrmModule.forFeature([SqlComparisonItemEntity]),
        MongooseModule.forFeature([
            {
                name: NoSqlComparisonItem.name, schema: NoSqlComparisonItemSchema 
            },
        ]),
    ],
    controllers: [CompareController],
    providers: [CompareService],
})
export class CompareModule {}
