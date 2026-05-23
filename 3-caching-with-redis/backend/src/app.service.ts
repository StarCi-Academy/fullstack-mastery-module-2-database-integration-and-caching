/**
 * Service xu ly logic nghiep vu cua App.
 * (EN: Business logic service for App.)
 */
import {
    Injectable 
} from "@nestjs/common"

@Injectable()
export class AppService {
    getHello(): string {
        return "Hello World!"
    }
}
