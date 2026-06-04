/**
 * SQL vs NoSQL comparison service — parallel write/read to PostgreSQL + MongoDB.
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
     * Persist the same payload to both SQL and NoSQL for behavior comparison.
     */
    async write(dto: CreateCompareDto) {
        // Save in parallel to reduce latency and keep comparison timing consistent.
        const [sqlRecord,
            noSqlRecord] = await Promise.all([
            this.sqlRepository.save(this.sqlRepository.create(dto)),
            this.noSqlModel.create(dto),
        ])

        // Normalize response fields for straightforward content/docs verification.
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
     * Read latest items from both SQL and NoSQL for side-by-side comparison.
     */
    async read() {
        // Limit to 20 records to keep endpoint lightweight for smoke tests.
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

        // Return both count and items to compare parity between two storage branches.
        return {
            sqlCount: sqlItems.length,
            noSqlCount: noSqlItems.length,
            sqlItems,
            noSqlItems,
        }
    }

    /**
     * Measure parallel latency of the same workload on SQL and NoSQL.
     *
     * @returns Promise<{ sqlMs: number; noSqlMs: number; deltaMs: number }>
     */
    async getTimings(): Promise<{
        sqlMs: number;
        noSqlMs: number;
        deltaMs: number;
    }> {
        // [prepare] Use performance.now() for sub-millisecond precision.
        const sqlStart = performance.now()
        await this.sqlRepository.find({
            order: {
                createdAt: "DESC",
            },
            take: 20,
        })
        const sqlMs = Number((performance.now() - sqlStart).toFixed(3))

        // [execute] Measure each engine separately to avoid Promise.all scheduling noise.
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

        // [confirm] deltaMs > 0 means NoSQL is faster; < 0 means SQL is faster.
        const deltaMs = Number((sqlMs - noSqlMs).toFixed(3))
        return {
            sqlMs,
            noSqlMs,
            deltaMs,
        }
    }

    /**
     * Clear all data in both PG (TRUNCATE in a transaction) and Mongo (deleteMany).
     *
     * @returns Promise<{ pgDeleted: number; mongoDeleted: number }>
     */
    async deleteAll(): Promise<{
        pgDeleted: number;
        mongoDeleted: number;
    }> {
        // [prepare] Count records first so tests can validate the delete count.
        const pgBefore = await this.sqlRepository.count()

        // [execute] Use a TypeORM transaction so TRUNCATE remains atomic.
        await this.sqlRepository.manager.transaction(async (trx) => {
            await trx.query(
                `TRUNCATE TABLE "${this.sqlRepository.metadata.tableName}" RESTART IDENTITY CASCADE`,
            )
        })

        // [execute] Mongo deleteMany returns deletedCount — accurate counter.
        const mongoResult = await this.noSqlModel.deleteMany({}).exec()

        // [confirm] Normalize polyglot response for easy side-by-side verification.
        return {
            pgDeleted: pgBefore,
            mongoDeleted: mongoResult.deletedCount ?? 0,
        }
    }
}
