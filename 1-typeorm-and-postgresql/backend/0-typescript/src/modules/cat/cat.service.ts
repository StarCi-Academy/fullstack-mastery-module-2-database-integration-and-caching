/**
 * Cat CRUD service — TypeORM repository + demo 1:1, 1:N, N:N relationships.
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
 * Cat Service — Business logic service for cats and relationships. Follows pattern: prepare → execute → confirm.
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
   * Retrieves all cats with their relationships (JOIN).
   *
   * @returns Promise<Cat[]> - List of cats with full info
   */
    async findAll(): Promise<Cat[]> {
        // [execute] Execute JOIN query with all related tables
        this.logger.log("Fetching all cats with relations...")
        return await this.catRepository.find({
            relations: ["passport",
                "toys",
                "owners"],
        })
    }

    /**
   * Creates a new cat with all relationships (CASCADE).
   *
   * @param catData - Cat data
   * @returns Promise<Cat> - Newly created cat
   */
    async create(catData: Partial<Cat>): Promise<Cat> {
        // [prepare] Prepare new instance from input data
        this.logger.log({
            message: "Preparing to create new cat", data: catData 
        })
        const cat = this.catRepository.create(catData)

        // [execute] Execute save to database (TypeORM auto-saves relations due to cascade)
        const savedCat = await this.catRepository.save(cat)

        // [confirm] Confirm success result
        this.logger.log({
            message: "Cat created successfully", id: savedCat.id 
        })
        return savedCat
    }

    /**
   * Returns details of a cat by ID.
   *
   * @param id - Cat ID
   * @returns Promise<Cat> - Detailed cat info
   */
    async findOne(id: number): Promise<Cat> {
        // [execute] Execute find cat with relationship JOIN
        const cat = await this.catRepository.findOne({
            where: {
                id 
            },
            relations: ["passport",
                "toys",
                "owners"],
        })

        // [confirm] Confirm existence
        if (!cat) {
            this.logger.error(`Cat with ID ${id} not found`)
            throw new NotFoundException(`Cat with ID ${id} not found`)
        }

        return cat
    }

    /**
     * Returns cat details by ID with explicit relation loading (passport, toys, owners).
     *
     * @param id - Cat ID
     * @returns Promise<Cat> - Cat + hydrated relations
     */
    async findWithRelations(id: number): Promise<Cat> {
        // [execute] Explicitly list relations to demonstrate eager-loading.
        const cat = await this.catRepository.findOne({
            where: {
                id,
            },
            relations: ["passport",
                "toys",
                "owners"],
        })

        // [confirm] Throw 404 if missing so the client can tell empty vs missing apart.
        if (!cat) {
            this.logger.error(`Cat with ID ${id} not found`)
            throw new NotFoundException(`Cat with ID ${id} not found`)
        }

        return cat
    }

    /**
     * Append a new Toy to an existing cat (demonstrates 1:N collection mutation).
     *
     * @param catId - Cat ID
     * @param toyData - New toy data
     * @returns Promise<Cat> - Cat after adding toy with refreshed collection
     */
    async addToy(catId: number, toyData: Partial<Toy>): Promise<Cat> {
        // [prepare] Make sure the cat exists before attaching a toy.
        const cat = await this.findOne(catId)

        // [execute] Create new Toy attached via the `cat` relation -- TypeORM auto-fills `catId`.
        const toy = this.toyRepository.create({
            ...toyData,
            cat,
        })
        await this.toyRepository.save(toy)

        // [confirm] Re-read cat with relations so the response reflects the freshest state.
        this.logger.log({
            message: "Toy added to cat", catId, toyId: toy.id,
        })
        return await this.findWithRelations(catId)
    }
}
