/**
 * CatModule — dang ky cac thanh phan cua feature Cat.
 * (EN: CatModule — registers components for Cat feature.)
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cat } from './cat.entity';
import { CatService } from './cat.service';
import { CatController } from './cat.controller';

/**
 * Cat Module â€” ÄÄƒng kÃ½ entity vÃ  bá»™ xử lý logic cho mÃ¨o.
 * (EN: Cat Module â€” Registers entity and business logic for cats.)
 */
@Module({
  imports: [TypeOrmModule.forFeature([Cat])],
  controllers: [CatController],
  providers: [CatService],
  exports: [CatService],
})
export class CatModule {}
