/**
 * Controller REST `/cats` — demo TypeORM entity relationships.
 * (EN: REST controller `/cats` — demo TypeORM entity relationships.)
 */
import {
    Controller, Get, Post, Body, Param, ParseIntPipe 
} from "@nestjs/common"
import {
    CatService 
} from "./cat.service"
import {
    Cat, Toy
} from "../../entities/postgresql/main"

/**
 * Cat Controller — Điểm tiếp nhận request cho domain Cat.
 * (EN: Request entry point for the Cat domain.)
 */
@Controller("cats")
export class CatController {
    constructor(private readonly catService: CatService) {}

  /**
   * GET /cats — Lấy toàn bộ danh sách mèo (JOIN).
   * (EN: GET /cats — Get all cats (JOIN).)
   */
  @Get()
    async findAll(): Promise<Cat[]> {
    // Gọi service xử lý logic (EN: call service for logic)
        return await this.catService.findAll()
    }

  /**
   * POST /cats — Tạo mèo mới kèm quan hệ.
   * (EN: POST /cats — Create new cat with relations.)
   */
  @Post()
  async create(@Body() catData: Partial<Cat>): Promise<Cat> {
      // Chuyển dữ liệu xuống service layer (EN: pass data to service layer)
      return await this.catService.create(catData)
  }

  /**
   * GET /cats/:id — Xem chi tiết mèo.
   * (EN: GET /cats/:id — View cat details.)
   */
  @Get(":id")
  async findOne(@Param("id",
      ParseIntPipe) id: number): Promise<Cat> {
      // Tìm kiếm mèo theo ID (EN: find cat by ID)
      return await this.catService.findOne(id)
  }

  /**
   * GET /cats/:id/with-relations — Lấy mèo + explicit relations (passport, toys, owners).
   * (EN: GET /cats/:id/with-relations — Get cat plus explicit relations (passport, toys, owners).)
   */
  @Get(":id/with-relations")
  async findWithRelations(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<Cat> {
      // Eager-load relations để chứng minh trade-off giữa eager vs lazy.
      // (EN: Eager-load relations to demonstrate the eager vs lazy trade-off.)
      return await this.catService.findWithRelations(id)
  }

  /**
   * POST /cats/:id/toys — Thêm Toy mới vào con mèo (1:N mutation).
   * (EN: POST /cats/:id/toys — Add a new Toy to the cat (1:N mutation).)
   */
  @Post(":id/toys")
  async addToy(
    @Param("id", ParseIntPipe) id: number,
    @Body() toyData: Partial<Toy>,
  ): Promise<Cat> {
      // Đẩy dữ liệu xuống service -- TypeORM tự ghi FK `catId` qua relation `cat`.
      // (EN: Pass data to service -- TypeORM auto-writes FK `catId` via the `cat` relation.)
      return await this.catService.addToy(id, toyData)
  }
}
