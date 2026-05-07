/**
 * Controller REST cho feature Cat.
 * (EN: REST controller for Cat feature.)
 */
import { Controller, Get, Post, Body, Param, Put, Query } from '@nestjs/common';
import { CatService } from './cat.service';
import { Cat } from './schemas/cat.schema';

/**
 * Cat Controller â€” REST API Endpoints cho mÃ¨o báº±ng MongoDB.
 * (EN: REST API Endpoints for cats using MongoDB.)
 */
@Controller('cats')
export class CatController {
  constructor(private readonly catService: CatService) {}

  /**
   * POST /cats â€” Táº¡o mÃ¨o má»›i.
   * (EN: POST /cats â€” Create a new cat.)
   */
  @Post()
  async create(@Body() catData: Partial<Cat>): Promise<Cat> {
    return await this.catService.create(catData);
  }

  /**
   * GET /cats â€” Láº¥y danh sÃ¡ch mÃ¨o (máº·c Ä‘á»‹nh limit 10).
   * (EN: GET /cats â€” Get cat list (default limit 10).)
   */
  @Get()
  async findAll(): Promise<Cat[]> {
    return await this.catService.findAll();
  }

  /**
   * GET /cats/search?name=xxx â€” TÃ¬m mÃ¨o theo tÃªn.
   * (EN: GET /cats/search?name=xxx â€” Find cat by name.)
   */
  @Get('search')
  async findByName(@Query('name') name: string): Promise<Cat> {
    return await this.catService.findByName(name);
  }

  /**
   * PUT /cats/:id â€” Cáº­p nháº­t thông tin mÃ¨o.
   * (EN: PUT /cats/:id â€” Update cat details.)
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<Cat>,
  ): Promise<Cat> {
    return await this.catService.update(id, updateData);
  }
}
