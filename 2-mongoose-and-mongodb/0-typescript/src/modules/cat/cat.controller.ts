/**
 * REST controller for Cat feature.
 */
import {
    Controller, Get, Post, Body, Param, Put, Query 
} from "@nestjs/common"
import {
    CatService 
} from "./cat.service"
import {
    Cat
} from "../../schemas/mongodb/main"

/**
 * Cat Controller — REST API Endpoints for cats using MongoDB.
 */
@Controller("cats")
export class CatController {
    constructor(private readonly catService: CatService) {}

  /**
   * POST /cats — Create a new cat.
   */
  @Post()
    async create(@Body() catData: Partial<Cat>): Promise<Cat> {
        return await this.catService.create(catData)
    }

  /**
   * GET /cats — Get cat list (default limit 10); `GET /cats?hobby=fishing`
   * to filter by an element inside the hobbies array.
   */
  @Get()
  async findAll(@Query("hobby") hobby?: string): Promise<Cat[]> {
      // The `$in: [hobby]` branch only triggers when the `hobby` query is present.
      if (hobby) {
          return await this.catService.findByHobby(hobby)
      }
      return await this.catService.findAll()
  }

  /**
   * GET /cats/search?name=xxx — Find cat by name.
   */
  @Get("search")
  async findByName(@Query("name") name: string): Promise<Cat> {
      return await this.catService.findByName(name)
  }

  /**
   * PUT /cats/:id — Update cat details.
   */
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateData: Partial<Cat>,
  ): Promise<Cat> {
      return await this.catService.update(id,
          updateData)
  }

  /**
   * POST /cats/:id/like — Increment `likes` using atomic `$inc`.
   */
  @Post(":id/like")
  async like(@Param("id") id: string): Promise<Cat> {
      // Atomic update -- no race condition when multiple clients call concurrently.
      return await this.catService.like(id)
  }
}
