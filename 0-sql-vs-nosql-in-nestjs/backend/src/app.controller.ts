/**
 * Controller gốc — health endpoint.
 * (EN: Root controller — health endpoint.)
 */
import {
    Controller,
    Get,
} from "@nestjs/common"
import {
    AppService,
} from "./app.service"

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    /**
     * Trả trạng thái health cho root endpoint.
     * (EN: Return health status for root endpoint.)
     */
    @Get()
    getHealth() {
        return this.appService.getHealth()
    }
}
