/**
 * Service gốc — trả trạng thái health.
 * (EN: Root service — returns health status.)
 */
import {
    Injectable,
} from "@nestjs/common"

@Injectable()
export class AppService {
    /**
     * Trả health check payload.
     * (EN: Return health check payload.)
     */
    getHealth() {
        return {
            ok: true,
            service: "sql-vs-nosql-in-nestjs",
        }
    }
}
