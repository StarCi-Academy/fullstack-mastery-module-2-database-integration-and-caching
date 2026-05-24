/**
 * Service CRUD mèo — TypeORM repository + demo 1:1, 1:N, N:N relationships.
 * (EN: Cat CRUD service — TypeORM repository + demo 1:1, 1:N, N:N relationships.)
 */
import {
    Injectable, Logger, NotFoundException 
} from "@nestjs/common"
import {
    InjectRepository 
} from "@nestjs/typeorm"
import {
    Repository 
} from "typeorm"
import {
    Cat, Toy
} from "../../entities/postgresql/main"

/**
 * Cat Service — Xử lý logic nghiệp vụ cho mèo và các quan hệ.
 * Tuân thủ pattern: prepare → execute → confirm.
 * (EN: Business logic service for cats and relationships. Follows pattern: prepare → execute → confirm.)
 */
@Injectable()
export class CatService {
    private readonly logger = new Logger(CatService.name)

    constructor(
    @InjectRepository(Cat)
    private readonly catRepository: Repository<Cat>,
    @InjectRepository(Toy)
    private readonly toyRepository: Repository<Toy>,
    ) {}

    /**
   * Lấy danh sách toàn bộ mèo kèm theo các quan hệ (JOIN).
   * (EN: Retrieves all cats with their relationships (JOIN).)
   *
   * @returns Promise<Cat[]> - Danh sách mèo đầy đủ thông tin (EN: list of cats with full info)
   */
    async findAll(): Promise<Cat[]> {
    // [execute] Thực hiện truy vấn JOIN với tất cả các bảng liên quan
    // (EN: Execute JOIN query with all related tables)
        this.logger.log("Fetching all cats with relations...")
        return await this.catRepository.find({
            relations: ["passport",
                "toys",
                "owners"],
        })
    }

    /**
   * Tạo mèo mới với đầy đủ các quan hệ (CASCADE).
   * (EN: Creates a new cat with all relationships (CASCADE).)
   *
   * @param catData - Dữ liệu mèo (EN: cat data)
   * @returns Promise<Cat> - Mèo vừa được tạo (EN: newly created cat)
   */
    async create(catData: Partial<Cat>): Promise<Cat> {
    // [prepare] Khởi tạo instance mới từ dữ liệu đầu vào
    // (EN: Prepare new instance from input data)
        this.logger.log({
            message: "Preparing to create new cat", data: catData 
        })
        const cat = this.catRepository.create(catData)

        // [execute] Lưu vào database (TypeORM sẽ tự động lưu các quan hệ nhờ cascade)
        // (EN: Execute save to database (TypeORM auto-saves relations due to cascade))
        const savedCat = await this.catRepository.save(cat)

        // [confirm] Log kết quả thành công
        // (EN: Confirm success result)
        this.logger.log({
            message: "Cat created successfully", id: savedCat.id 
        })
        return savedCat
    }

    /**
   * Lấy chi tiết một con mèo theo ID.
   * (EN: Returns details of a cat by ID.)
   *
   * @param id - ID của mèo (EN: cat ID)
   * @returns Promise<Cat> - Thông tin chi tiết mèo (EN: detailed cat info)
   */
    async findOne(id: number): Promise<Cat> {
    // [execute] Tìm kiếm mèo kèm JOIN quan hệ
    // (EN: Execute find cat with relationship JOIN)
        const cat = await this.catRepository.findOne({
            where: {
                id 
            },
            relations: ["passport",
                "toys",
                "owners"],
        })

        // [confirm] Kiểm tra sự tồn tại (EN: confirm existence)
        if (!cat) {
            this.logger.error(`Cat with ID ${id} not found`)
            throw new NotFoundException(`Cat with ID ${id} not found`)
        }

        return cat
    }

    /**
     * Lấy chi tiết một con mèo theo ID kèm explicit relation loading (passport, toys, owners).
     * (EN: Returns cat details by ID with explicit relation loading (passport, toys, owners).)
     *
     * @param id - ID của mèo (EN: cat ID)
     * @returns Promise<Cat> - Mèo + các quan hệ đã được hydrate (EN: cat + hydrated relations)
     */
    async findWithRelations(id: number): Promise<Cat> {
        // [execute] Liệt kê tường minh các relations để chứng minh eager-loading.
        // (EN: Explicitly list relations to demonstrate eager-loading.)
        const cat = await this.catRepository.findOne({
            where: {
                id,
            },
            relations: ["passport",
                "toys",
                "owners"],
        })

        // [confirm] Ném 404 nếu không tồn tại để client dễ phân biệt empty vs missing.
        // (EN: Throw 404 if missing so the client can tell empty vs missing apart.)
        if (!cat) {
            this.logger.error(`Cat with ID ${id} not found`)
            throw new NotFoundException(`Cat with ID ${id} not found`)
        }

        return cat
    }

    /**
     * Thêm một Toy mới vào con mèo đang tồn tại (chứng minh 1:N collection mutation).
     * (EN: Append a new Toy to an existing cat (demonstrates 1:N collection mutation).)
     *
     * @param catId - ID của mèo (EN: cat ID)
     * @param toyData - Dữ liệu toy mới (EN: new toy data)
     * @returns Promise<Cat> - Mèo sau khi thêm toy + collection refresh (EN: cat after adding toy with refreshed collection)
     */
    async addToy(catId: number, toyData: Partial<Toy>): Promise<Cat> {
        // [prepare] Đảm bảo cat tồn tại trước khi đính kèm toy.
        // (EN: Make sure the cat exists before attaching a toy.)
        const cat = await this.findOne(catId)

        // [execute] Tạo Toy mới gắn FK `cat` qua relation -- TypeORM tự gán `catId`.
        // (EN: Create new Toy attached via the `cat` relation -- TypeORM auto-fills `catId`.)
        const toy = this.toyRepository.create({
            ...toyData,
            cat,
        })
        await this.toyRepository.save(toy)

        // [confirm] Đọc lại cat kèm relations để response phản ánh state mới nhất.
        // (EN: Re-read cat with relations so the response reflects the freshest state.)
        this.logger.log({
            message: "Toy added to cat", catId, toyId: toy.id,
        })
        return await this.findWithRelations(catId)
    }
}
