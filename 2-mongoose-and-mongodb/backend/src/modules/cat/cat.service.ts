/**
 * Service xu ly logic nghiep vu cua Cat.
 * (EN: Business logic service for Cat.)
 */
import {
    Injectable, Logger, NotFoundException 
} from "@nestjs/common"
import {
    InjectModel 
} from "@nestjs/mongoose"
import {
    Model 
} from "mongoose"
import {
    Cat, CatDocument
} from "../../schemas/mongodb/main"

/**
 * Cat Service — Xử lý logic nghiệp vụ cho mèo bằng Mongoose.
 * (EN: Business logic service for cats using Mongoose.)
 */
@Injectable()
export class CatService {
    private readonly logger = new Logger(CatService.name)

    constructor(
    // Inject Mongoose Model đã Ä‘Äƒng ký (EN: Inject registered Mongoose Model)
    @InjectModel(Cat.name) private readonly catModel: Model<CatDocument>,
    ) {}

    /**
   * Tạo mèo mới. (EN: Creates a new cat.)
   *
   * @param catData - Dữ liệu mèo (EN: cat data)
   * @returns Promise<Cat> - Mèo vừa được tạo (EN: newly created cat)
   */
    async create(catData: Partial<Cat>): Promise<Cat> {
    // [prepare] Khởi tạo instance mới từ model
    // (EN: Prepare new instance from model)
        this.logger.log({
            message: "Preparing to create new cat", data: catData 
        })
        const createdCat = new this.catModel(catData)

        // [execute] Lưu vÃ o MongoDB (EN: Execute save to MongoDB)
        const savedCat = await createdCat.save()

        // [confirm] Trả vá» vÃ  log thÃ nh công (EN: Confirm and log success)
        this.logger.log({
            message: "Cat created successfully", id: savedCat._id 
        })
        return savedCat
    }

    /**
   * Lấy toÃ n bá»™ danh sách mèo với search vÃ  filter cơ bản.
   * (EN: Retrieves all cats with basic search and filter.)
   *
   * @returns Promise<Cat[]>
   */
    async findAll(): Promise<Cat[]> {
    // [execute] Truy vấn nâng cao: sort theo age giảm dần, limit 10
    // (EN: Advanced query: sort by age descending, limit 10)
        this.logger.log("Fetching all cats from MongoDB...")
        return await this.catModel
            .find()
            .sort({
                age: -1 
            })
            .limit(10)
            .exec()
    }

    /**
   * Tìm mèo theo tên (Minh há»a syntax findOne).
   * (EN: Find cat by name (illustrates findOne syntax).)
   */
    async findByName(name: string): Promise<Cat> {
        this.logger.log(`Searching for cat with name: ${name}`)
    
        // [execute] Tìm kiếm theo thuá»™c tính name (đã đánh index trong schema)
        // (EN: Search by name attribute (indexed in schema))
        const cat = await this.catModel.findOne({
            name 
        }).exec()

        // [confirm] Kiá»ƒm tra (EN: Confirm)
        if (!cat) {
            throw new NotFoundException(`Cat with name "${name}" not found`)
        }

        return cat
    }

    /**
   * Cập nhật thông tin mèo theo ID. (EN: Updates cat by ID.)
   */
    async update(id: string, updateData: Partial<Cat>): Promise<Cat> {
    // [execute] findByIdAndUpdate: { new: true } để trả vá» bản ghi sau khi update
    // (EN: findByIdAndUpdate: { new: true } to return the record after update)
        const updatedCat = await this.catModel
            .findByIdAndUpdate(id,
                updateData,
                {
                    returnDocument: "after" 
                })
            .exec()

        if (!updatedCat) {
            throw new NotFoundException(`Cat with id "${id}" not found`)
        }

        return updatedCat
    }

    /**
     * Tìm mèo theo phần tử trong mảng `hobbies` (toán tử `$in`).
     * (EN: Find cats by an element inside the `hobbies` array (using `$in` operator).)
     *
     * @param hobby - Tên hobby cần tìm (EN: hobby name to look up)
     * @returns Promise<Cat[]> - Danh sách mèo có hobby tương ứng (EN: cats with the matching hobby)
     */
    async findByHobby(hobby: string): Promise<Cat[]> {
        // [execute] `$in` so khớp bất kỳ phần tử nào trong mảng hobbies.
        // (EN: `$in` matches any element inside the hobbies array.)
        this.logger.log(`Querying cats with hobby="${hobby}"`)
        return await this.catModel
            .find({
                hobbies: {
                    $in: [hobby],
                },
            })
            .exec()
    }

    /**
     * Tăng `likes` cho cat bằng atomic update `$inc` (race-free).
     * (EN: Increment `likes` for a cat using the atomic `$inc` update (race-free).)
     *
     * @param id - ID Mongo object (EN: Mongo ObjectId string)
     * @returns Promise<Cat> - Cat sau khi `likes` đã tăng (EN: cat after `likes` was incremented)
     */
    async like(id: string): Promise<Cat> {
        // [execute] `$inc` chạy server-side -- không cần read-modify-write từ client.
        // (EN: `$inc` runs server-side -- no read-modify-write round trip from the client.)
        const updated = await this.catModel
            .findByIdAndUpdate(
                id,
                {
                    $inc: {
                        likes: 1,
                    },
                },
                {
                    returnDocument: "after",
                },
            )
            .exec()

        // [confirm] Trả về document mới hoặc 404 nếu không tồn tại.
        // (EN: Return the updated document or 404 if missing.)
        if (!updated) {
            throw new NotFoundException(`Cat with id "${id}" not found`)
        }
        return updated
    }
}
