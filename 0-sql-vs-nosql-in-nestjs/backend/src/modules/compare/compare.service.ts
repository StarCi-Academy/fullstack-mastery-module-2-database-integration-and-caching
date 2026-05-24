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
} from "../../entities/postgresql/main"
import {
    NoSqlComparisonItem,
    NoSqlComparisonItemDocument,
} from "../../schemas/mongodb/main"

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

    /**
     * Đo độ trễ song song của cùng một workload trên SQL và NoSQL.
     * (EN: Measure parallel latency of the same workload on SQL and NoSQL.)
     *
     * @returns Promise<{ sqlMs: number; noSqlMs: number; deltaMs: number }>
     */
    async getTimings(): Promise<{
        sqlMs: number;
        noSqlMs: number;
        deltaMs: number;
    }> {
        // [prepare] Dùng performance.now() cho độ chính xác sub-millisecond.
        // (EN: Use performance.now() for sub-millisecond precision.)
        const sqlStart = performance.now()
        await this.sqlRepository.find({
            order: {
                createdAt: "DESC",
            },
            take: 20,
        })
        const sqlMs = Number((performance.now() - sqlStart).toFixed(3))

        // [execute] Đo riêng từng engine để không bị nhiễu bởi Promise.all scheduling.
        // (EN: Measure each engine separately to avoid Promise.all scheduling noise.)
        const noSqlStart = performance.now()
        await this.noSqlModel
            .find()
            .sort({
                createdAt: -1,
            })
            .limit(20)
            .lean()
            .exec()
        const noSqlMs = Number((performance.now() - noSqlStart).toFixed(3))

        // [confirm] deltaMs > 0 nghĩa NoSQL nhanh hơn; < 0 nghĩa SQL nhanh hơn.
        // (EN: deltaMs > 0 means NoSQL is faster; < 0 means SQL is faster.)
        const deltaMs = Number((sqlMs - noSqlMs).toFixed(3))
        return {
            sqlMs,
            noSqlMs,
            deltaMs,
        }
    }

    /**
     * Xóa toàn bộ dữ liệu cả PG (TRUNCATE trong transaction) và Mongo (deleteMany).
     * (EN: Clear all data in both PG (TRUNCATE in a transaction) and Mongo (deleteMany).)
     *
     * @returns Promise<{ pgDeleted: number; mongoDeleted: number }>
     */
    async deleteAll(): Promise<{
        pgDeleted: number;
        mongoDeleted: number;
    }> {
        // [prepare] Đếm trước số bản ghi để phía test kiểm chứng được lượng xóa.
        // (EN: Count records first so tests can validate the delete count.)
        const pgBefore = await this.sqlRepository.count()

        // [execute] Dùng TypeORM transaction để TRUNCATE đảm bảo atomicity.
        // (EN: Use a TypeORM transaction so TRUNCATE remains atomic.)
        await this.sqlRepository.manager.transaction(async (trx) => {
            await trx.query(
                `TRUNCATE TABLE "${this.sqlRepository.metadata.tableName}" RESTART IDENTITY CASCADE`,
            )
        })

        // [execute] Mongo deleteMany trả về deletedCount — bộ đếm chính xác.
        // (EN: Mongo deleteMany returns deletedCount — accurate counter.)
        const mongoResult = await this.noSqlModel.deleteMany({}).exec()

        // [confirm] Chuẩn hóa response polyglot để dễ verify side-by-side.
        // (EN: Normalize polyglot response for easy side-by-side verification.)
        return {
            pgDeleted: pgBefore,
            mongoDeleted: mongoResult.deletedCount ?? 0,
        }
    }
}
