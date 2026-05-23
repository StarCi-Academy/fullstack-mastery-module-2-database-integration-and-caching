/**
 * Service gốc — trả Hello World mặc định.
 * (EN: Root service — returns default Hello World.)
 */
import {
    Injectable,
} from "@nestjs/common"

@Injectable()
export class AppService {
    getHello(): string {
        return "Hello World!"
    }
}
