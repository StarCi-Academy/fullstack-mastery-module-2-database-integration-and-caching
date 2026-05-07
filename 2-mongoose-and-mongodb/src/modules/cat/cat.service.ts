/**
 * Service xu ly logic nghiep vu cua Cat.
 * (EN: Business logic service for Cat.)
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cat, CatDocument } from './schemas/cat.schema';

/**
 * Cat Service â€” Xá»­ lÃ½ logic nghiệp vụ cho mÃ¨o báº±ng Mongoose.
 * (EN: Business logic service for cats using Mongoose.)
 */
@Injectable()
export class CatService {
  private readonly logger = new Logger(CatService.name);

  constructor(
    // Inject Mongoose Model Ä‘Ã£ Ä‘Äƒng kÃ½ (EN: Inject registered Mongoose Model)
    @InjectModel(Cat.name) private readonly catModel: Model<CatDocument>,
  ) {}

  /**
   * Táº¡o mÃ¨o má»›i. (EN: Creates a new cat.)
   *
   * @param catData - Dá»¯ liá»‡u mÃ¨o (EN: cat data)
   * @returns Promise<Cat> - MÃ¨o vá»«a được táº¡o (EN: newly created cat)
   */
  async create(catData: Partial<Cat>): Promise<Cat> {
    // [prepare] Khởi tạo instance má»›i tá»« model
    // (EN: Prepare new instance from model)
    this.logger.log({ message: 'Preparing to create new cat', data: catData });
    const createdCat = new this.catModel(catData);

    // [execute] Lưu vÃ o MongoDB (EN: Execute save to MongoDB)
    const savedCat = await createdCat.save();

    // [confirm] Tráº£ vá» vÃ  log thÃ nh cÃ´ng (EN: Confirm and log success)
    this.logger.log({ message: 'Cat created successfully', id: savedCat._id });
    return savedCat;
  }

  /**
   * Láº¥y toÃ n bá»™ danh sÃ¡ch mÃ¨o vá»›i search vÃ  filter cÆ¡ báº£n.
   * (EN: Retrieves all cats with basic search and filter.)
   *
   * @returns Promise<Cat[]>
   */
  async findAll(): Promise<Cat[]> {
    // [execute] Truy váº¥n nÃ¢ng cao: sort theo age giáº£m dáº§n, limit 10
    // (EN: Advanced query: sort by age descending, limit 10)
    this.logger.log('Fetching all cats from MongoDB...');
    return await this.catModel
      .find()
      .sort({ age: -1 })
      .limit(10)
      .exec();
  }

  /**
   * TÃ¬m mÃ¨o theo tÃªn (Minh há»a syntax findOne).
   * (EN: Find cat by name (illustrates findOne syntax).)
   */
  async findByName(name: string): Promise<Cat> {
    this.logger.log(`Searching for cat with name: ${name}`);
    
    // [execute] TÃ¬m kiáº¿m theo thuá»™c tÃ­nh name (Ä‘Ã£ Ä‘Ã¡nh index trong schema)
    // (EN: Search by name attribute (indexed in schema))
    const cat = await this.catModel.findOne({ name }).exec();

    // [confirm] Kiá»ƒm tra (EN: Confirm)
    if (!cat) {
      throw new NotFoundException(`Cat with name "${name}" not found`);
    }

    return cat;
  }

  /**
   * Cáº­p nháº­t thông tin mÃ¨o theo ID. (EN: Updates cat by ID.)
   */
  async update(id: string, updateData: Partial<Cat>): Promise<Cat> {
    // [execute] findByIdAndUpdate: { new: true } để tráº£ vá» báº£n ghi sau khi update
    // (EN: findByIdAndUpdate: { new: true } to return the record after update)
    const updatedCat = await this.catModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .exec();

    if (!updatedCat) {
      throw new NotFoundException(`Cat with id "${id}" not found`);
    }

    return updatedCat;
  }
}
