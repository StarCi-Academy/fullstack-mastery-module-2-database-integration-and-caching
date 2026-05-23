/**
 * Controller REST cho feature Cat.
 * (EN: REST controller for Cat feature.)
 */
import {
    Controller, Get, Post, Body, Param, Put, Query 
} from "@nestjs/common"
import {
    CatService 
} from "./cat.service"
import {
    Cat 
} from "./schemas/cat.schema"

/**
 * Cat Controller — REST API Endpoints cho mèo bằng MongoDB.
 * (EN: REST API Endpoints for cats using MongoDB.)
 */
@Controller("cats")
export class CatController {
    constructor(private readonly catService: CatService) {}

  /**
   * POST /cats — Tạo mèo mới.
   * (EN: POST /cats — Create a new cat.)
   */
  @Post()
    async create(@Body() catData: Partial<Cat>): Promise<Cat> {
        return await this.catService.create(catData)
    }

  /**
   * GET /cats — Lấy danh sách mèo (mặc định limit 10);
   * `GET /cats?hobby=fishing` để filter theo phần tử trong mảng hobbies.
   * (EN: GET /cats — Get cat list (default limit 10); `GET /cats?hobby=fishing`
   * to filter by an element inside the hobbies array.)
   */
  @Get()
  async findAll(@Query("hobby") hobby?: string): Promise<Cat[]> {
      // Nhánh `$in: [hobby]` chỉ kích hoạt khi query string có `hobby`.
      // (EN: The `$in: [hobby]` branch only triggers when the `hobby` query is present.)
      if (hobby) {
          return await this.catService.findByHobby(hobby)
      }
      return await this.catService.findAll()
  }

  /**
   * GET /cats/search?name=xxx — Tìm mèo theo tên.
   * (EN: GET /cats/search?name=xxx — Find cat by name.)
   */
  @Get("search")
  async findByName(@Query("name") name: string): Promise<Cat> {
      return await this.catService.findByName(name)
  }

  /**
   * PUT /cats/:id — Cập nhật thông tin mèo.
   * (EN: PUT /cats/:id — Update cat details.)
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
   * POST /cats/:id/like — Tăng `likes` bằng atomic `$inc`.
   * (EN: POST /cats/:id/like — Increment `likes` using atomic `$inc`.)
   */
  @Post(":id/like")
  async like(@Param("id") id: string): Promise<Cat> {
      // Atomic update -- không race condition khi nhiều client gọi cùng lúc.
      // (EN: Atomic update -- no race condition when multiple clients call concurrently.)
      return await this.catService.like(id)
  }
}
