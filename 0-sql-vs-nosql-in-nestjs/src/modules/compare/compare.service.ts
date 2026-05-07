/**
 * Service so sánh SQL vs NoSQL — ghi/đọc song song PostgreSQL + MongoDB.
 * (EN: SQL vs NoSQL comparison service — parallel write/read to PostgreSQL + MongoDB.)
 */
import {
    Injectable,
} from "@nestjs/common"
import {
    InjectModel,
} from "@nestjs/mongoose"
import {
    InjectRepository,
} from "@nestjs/typeorm"
import {
    Model,
} from "mongoose"
import {
    Repository,
} from "typeorm"
import {
    CreateCompareDto,
} from "./dto"
import {
    SqlComparisonItemEntity,
} from "./entities"
import {
    NoSqlComparisonItem,
    NoSqlComparisonItemDocument,
} from "./schemas"

@Injectable()
export class CompareService {
    constructor(
        @InjectRepository(SqlComparisonItemEntity)
        private readonly sqlRepository: Repository<SqlComparisonItemEntity>,
        @InjectModel(NoSqlComparisonItem.name)
        private readonly noSqlModel: Model<NoSqlComparisonItemDocument>,
    ) {}

    /**
     * Ghi cùng một payload vào cả SQL và NoSQL để so sánh hành vi lưu trữ.
     * (EN: Persist the same payload to both SQL and NoSQL for behavior comparison.)
     */
    async write(dto: CreateCompareDto) {
        // Lưu song song để giảm độ trễ và giữ cùng thời điểm test giữa 2 storage.
        // (EN: Save in parallel to reduce latency and keep comparison timing consistent.)
        const [sqlRecord,
            noSqlRecord] = await Promise.all([
            this.sqlRepository.save(this.sqlRepository.create(dto)),
            this.noSqlModel.create(dto),
        ])

        // Chuẩn hóa response để phía content/docs có thể đối chiếu field rõ ràng.
        // (EN: Normalize response fields for straightforward content/docs verification.)
        return {
            message: "Saved to both SQL and NoSQL stores.",
            sql: {
                id: sqlRecord.id,
                title: sqlRecord.title,
                amount: sqlRecord.amount,
                createdAt: sqlRecord.createdAt,
            },
            noSql: {
                id: noSqlRecord._id.toString(),
                title: noSqlRecord.title,
                amount: noSqlRecord.amount,
                createdAt: noSqlRecord.createdAt,
            },
        }
    }

    /**
     * Đọc dữ liệu mới nhất từ cả SQL và NoSQL để đối chiếu trực tiếp.
     * (EN: Read latest items from both SQL and NoSQL for side-by-side comparison.)
     */
    async read() {
        // Giới hạn 20 bản ghi để endpoint luôn nhẹ và dễ smoke test.
        // (EN: Limit to 20 records to keep endpoint lightweight for smoke tests.)
        const [sqlItems,
            noSqlItems] = await Promise.all([
            this.sqlRepository.find({
                order: {
                    createdAt: "DESC" 
                },
                take: 20,
            }),
            this.noSqlModel
                .find()
                .sort({
                    createdAt: -1 
                })
                .limit(20)
                .lean(),
        ])

        // Trả cả count và list để người học nhận độ tương đồng giữa 2 nhánh lưu trữ.
        // (EN: Return both count and items to compare parity between two storage branches.)
        return {
            sqlCount: sqlItems.length,
            noSqlCount: noSqlItems.length,
            sqlItems,
            noSqlItems,
        }
    }
}
