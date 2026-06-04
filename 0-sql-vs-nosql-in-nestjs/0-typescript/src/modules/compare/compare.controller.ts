/**
 * Controller `/compare` — write + read data in parallel SQL vs NoSQL.
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
     * Write payload to both storages to verify write path.
     */
    @Post("write")
    write(@Body() dto: CreateCompareDto) {
        return this.compareService.write(dto)
    }

    /**
     * Read data from both storages for side-by-side comparison.
     */
    @Get("read")
    read() {
        return this.compareService.read()
    }

    /**
     * Measure parallel latency of the same workload on SQL vs NoSQL.
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
     * Clean data on both engines (polyglot cleanup) via PG TRUNCATE + Mongo deleteMany.
     */
    @Delete("all")
    deleteAll(): Promise<{ pgDeleted: number; mongoDeleted: number }> {
        return this.compareService.deleteAll()
    }
}
