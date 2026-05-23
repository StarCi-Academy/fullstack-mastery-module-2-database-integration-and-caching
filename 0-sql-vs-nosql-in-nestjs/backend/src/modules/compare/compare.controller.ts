/**
 * Controller `/compare` — ghi + đọc dữ liệu song song SQL vs NoSQL.
 * (EN: Controller `/compare` — write + read data in parallel SQL vs NoSQL.)
 */
import {
    Body,
    Controller,
    Delete,
    Get,
    Post,
} from "@nestjs/common"
import {
    CreateCompareDto,
} from "./dto"
import {
    CompareService,
} from "./compare.service"

@Controller("compare")
export class CompareController {
    constructor(private readonly compareService: CompareService) {}

    /**
     * Ghi payload vào cả hai storage để kiểm tra write path.
     * (EN: Write payload to both storages to verify write path.)
     */
    @Post("write")
    write(@Body() dto: CreateCompareDto) {
        return this.compareService.write(dto)
    }

    /**
     * Đọc dữ liệu từ cả hai storage để đối chiếu kết quả.
     * (EN: Read data from both storages for side-by-side comparison.)
     */
    @Get("read")
    read() {
        return this.compareService.read()
    }

    /**
     * Đo song song latency của cùng workload trên SQL vs NoSQL.
     * (EN: Measure parallel latency of the same workload on SQL vs NoSQL.)
     */
    @Get("timings")
    getTimings(): Promise<{
        sqlMs: number;
        noSqlMs: number;
        deltaMs: number;
    }> {
        return this.compareService.getTimings()
    }

    /**
     * Dọn dữ liệu trên cả 2 engine (polyglot cleanup) bằng PG TRUNCATE + Mongo deleteMany.
     * (EN: Clean data on both engines (polyglot cleanup) via PG TRUNCATE + Mongo deleteMany.)
     */
    @Delete("all")
    deleteAll(): Promise<{ pgDeleted: number; mongoDeleted: number }> {
        return this.compareService.deleteAll()
    }
}
