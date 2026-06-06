/**
 * Business logic service for Cat.
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
 * Cat Service — Business logic service for cats using Mongoose.
 */
@Injectable()
export class CatService {
    private readonly logger = new Logger(CatService.name)

    constructor(
    // Inject registered Mongoose Model
    @InjectModel(Cat.name) private readonly catModel: Model<CatDocument>,
    ) {}

    /**
   * Creates a new cat.
   *
   * @param catData - Cat data
   * @returns Promise<Cat> - Newly created cat
   */
    async create(catData: Partial<Cat>): Promise<Cat> {
        // [prepare] Prepare new instance from model
        this.logger.log({
            message: "Preparing to create new cat", data: catData 
        })
        const createdCat = new this.catModel(catData)

        // [execute] Execute save to MongoDB
        const savedCat = await createdCat.save()

        // [confirm] Confirm and log success
        this.logger.log({
            message: "Cat created successfully", id: savedCat._id 
        })
        return savedCat
    }

    /**
   * Retrieves all cats with basic search and filter.
   *
   * @returns Promise<Cat[]>
   */
    async findAll(): Promise<Cat[]> {
        // [execute] Advanced query: sort by age descending, limit 10
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
   * Find cat by name (illustrates findOne syntax).
   */
    async findByName(name: string): Promise<Cat> {
        this.logger.log(`Searching for cat with name: ${name}`)
    
        // [execute] Search by name attribute (indexed in schema)
        const cat = await this.catModel.findOne({
            name 
        }).exec()

        // [confirm] Confirm
        if (!cat) {
            throw new NotFoundException(`Cat with name "${name}" not found`)
        }

        return cat
    }

    /**
   * Updates cat by ID.
   */
    async update(id: string, updateData: Partial<Cat>): Promise<Cat> {
        // [execute] findByIdAndUpdate: { new: true } to return the record after update
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
     * Find cats by an element inside the `hobbies` array (using `$in` operator).
     *
     * @param hobby - Hobby name to look up
     * @returns Promise<Cat[]> - Cats with the matching hobby
     */
    async findByHobby(hobby: string): Promise<Cat[]> {
        // [execute] `$in` matches any element inside the hobbies array.
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
     * Increment `likes` for a cat using the atomic `$inc` update (race-free).
     *
     * @param id - Mongo ObjectId string
     * @returns Promise<Cat> - Cat after `likes` was incremented
     */
    async like(id: string): Promise<Cat> {
        // [execute] `$inc` runs server-side -- no read-modify-write round trip from the client.
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

        // [confirm] Return the updated document or 404 if missing.
        if (!updated) {
            throw new NotFoundException(`Cat with id "${id}" not found`)
        }
        return updated
    }
}
