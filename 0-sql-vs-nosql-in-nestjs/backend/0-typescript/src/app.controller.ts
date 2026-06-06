/**
 * Root controller — health endpoint.
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
     * Return health status for root endpoint.
     */
    @Get()
    getHealth() {
        return this.appService.getHealth()
    }
}
