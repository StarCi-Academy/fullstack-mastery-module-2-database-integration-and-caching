/**
 * Root service — returns health status.
 */
import {
    Injectable,
} from "@nestjs/common"

@Injectable()
export class AppService {
    /**
     * Return health check payload.
     */
    getHealth() {
        return {
            ok: true,
            service: "sql-vs-nosql-in-nestjs",
        }
    }
}
