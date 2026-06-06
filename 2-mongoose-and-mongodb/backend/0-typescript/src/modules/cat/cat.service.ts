/**
 * Business logic service for the Cat feature.
 *
 * Encapsulates all Mongoose operations for the `cats` collection:
 *   - create     — persist a new document with array + nested-object fields
 *   - findAll    — list cats sorted by age desc, capped at 10
 *   - findByName — exact lookup by name (uses the name index)
 *   - findByHobby — array-element query via `$in`
 *   - update     — partial document update via findByIdAndUpdate
 *   - like       — atomic `$inc` counter increment (race-free)
 */
import {
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common"
import {
    InjectModel,
} from "@nestjs/mongoose"
import {
    Model,
} from "mongoose"
import {
    Cat,
    CatDocument,
} from "../../schemas/mongodb/main"

/**
 * CatService — Mongoose-backed business logic for cats.
 *
 * Key teaching points demonstrated here:
 *  1. A document can hold an array (`hobbies`) and a nested object (`metadata`)
 *     in one record — no side table, no join.
 *  2. `{ hobbies: { $in: [hobby] } }` queries inside the array element directly.
 *  3. `$inc` is an atomic server-side update — eliminates the read-modify-write
 *     race that occurs when two requests read the same `likes` value simultaneously.
 */
@Injectable()
export class CatService {
    /**
     * Logger instance scoped to this service class name for structured log output.
     */
    private readonly logger = new Logger(CatService.name)

    /**
     * @param catModel - Mongoose Model injected via @InjectModel using the schema
     *                   class name `Cat.name` as the token.  The model gives access
     *                   to all Mongoose query methods (find, findById, etc.).
     */
    constructor(
        @InjectModel(Cat.name) private readonly catModel: Model<CatDocument>,
    ) {}

    /**
     * Create a new cat document in the `cats` collection.
     *
     * Demonstrates that a single MongoDB document can hold scalars (`name`, `age`,
     * `breed`, `likes`), an array (`hobbies`), and a nested object (`metadata`)
     * without any side tables — the shape is stored as-is.
     *
     * @param catData - Partial Cat fields supplied by the caller (from the DTO/body).
     * @returns Promise<Cat> - The saved document including MongoDB-generated `_id`,
     *                         `createdAt`, and `updatedAt` (from `timestamps: true`).
     */
    async create(catData: Partial<Cat>): Promise<Cat> {
        // [prepare] Instantiate a new Mongoose document from the model class;
        // this does NOT yet persist to the database — it only builds the in-memory doc.
        this.logger.log({
            message: "Preparing to create new cat",
            data: catData,
        })
        const createdCat = new this.catModel(catData)

        // [execute] Persist the document; Mongoose validates against the schema
        // (required fields, min values) before writing to MongoDB.
        const savedCat = await createdCat.save()

        // [confirm] Log the assigned ObjectId so we can trace the document later.
        this.logger.log({
            message: "Cat created successfully",
            id: savedCat._id,
        })
        return savedCat
    }

    /**
     * Retrieve all cats, sorted by age descending and limited to 10 documents.
     *
     * The sort+limit pipeline runs entirely on MongoDB, so only the top-10 results
     * travel over the wire — important for collections that could grow large.
     *
     * @returns Promise<Cat[]> - Up to 10 cat documents, newest-age-first.
     */
    async findAll(): Promise<Cat[]> {
        this.logger.log("Fetching all cats from MongoDB...")

        // [execute] Chaining .sort() and .limit() before .exec() builds a single
        // MongoDB query cursor — no extra round trip compared to calling find() alone.
        return await this.catModel
            .find()
            .sort({
                age: -1,  // -1 = descending; the youngest cat appears last
            })
            .limit(10)   // cap results to prevent unbounded response sizes
            .exec()
    }

    /**
     * Find a single cat by exact name match.
     *
     * The `name` field has `index: true` in the schema, so MongoDB uses a B-tree
     * index for this lookup rather than a full collection scan.
     *
     * @param name - Exact cat name to look up (case-sensitive).
     * @returns Promise<Cat> - The matching cat document.
     * @throws NotFoundException if no document with the given name exists.
     */
    async findByName(name: string): Promise<Cat> {
        this.logger.log(`Searching for cat with name: ${name}`)

        // [execute] findOne returns the first matching document or null;
        // shorthand { name } is equivalent to the filter { name: name }.
        const cat = await this.catModel.findOne({
            name,
        }).exec()

        // [guard] Surface a 404 instead of returning null, so the controller
        // can propagate a meaningful HTTP response to the client.
        if (!cat) {
            throw new NotFoundException(`Cat with name "${name}" not found`)
        }

        return cat
    }

    /**
     * Partially update a cat document by its MongoDB ObjectId.
     *
     * Uses `findByIdAndUpdate` with `returnDocument: "after"` so the caller
     * always receives the document state *after* the write, not before.
     * The caller sends only the fields that changed (PATCH semantics).
     *
     * @param id - MongoDB ObjectId string identifying the document to update.
     * @param updateData - Partial Cat fields to merge into the existing document.
     * @returns Promise<Cat> - The updated document with all fields.
     * @throws NotFoundException if no document with the given id exists.
     */
    async update(id: string, updateData: Partial<Cat>): Promise<Cat> {
        // [execute] findByIdAndUpdate atomically applies `updateData` fields;
        // `returnDocument: "after"` is the Mongoose 6+ replacement for `{ new: true }`.
        const updatedCat = await this.catModel
            .findByIdAndUpdate(
                id,
                updateData,
                {
                    returnDocument: "after",  // return the post-update state
                },
            )
            .exec()

        // [guard] findByIdAndUpdate returns null when no document matches the id.
        if (!updatedCat) {
            throw new NotFoundException(`Cat with id "${id}" not found`)
        }

        return updatedCat
    }

    /**
     * Find cats whose `hobbies` array contains a specific element.
     *
     * Core teaching point: the document model stores the hobbies array *inside*
     * the document, so querying by a single hobby element is a direct field
     * match — no join to a side table.
     *
     * `{ hobbies: { $in: [hobby] } }` asks MongoDB: "does any element in the
     * `hobbies` array equal `hobby`?".  Wrapping the value in an array is the
     * standard `$in` syntax; a single-element array is equivalent to a direct
     * equality match here but makes the intent explicit and easy to extend later
     * (e.g. pass multiple hobbies at once).
     *
     * @param hobby - Hobby name to search for inside the `hobbies` array field.
     * @returns Promise<Cat[]> - All cat documents that have the hobby listed.
     */
    async findByHobby(hobby: string): Promise<Cat[]> {
        this.logger.log(`Querying cats with hobby="${hobby}"`)

        // [execute] `$in` evaluates each element of the stored hobbies array against
        // the provided value — one read, no join, no extra collection involved.
        return await this.catModel
            .find({
                hobbies: {
                    $in: [hobby],  // match any document where hobbies contains `hobby`
                },
            })
            .exec()
    }

    /**
     * Atomically increment the `likes` counter for a cat by 1.
     *
     * Core teaching point: `$inc` is a *server-side* update operator.  MongoDB
     * reads the current `likes` value, adds 1, and writes it back in a single
     * atomic operation — the client never sees the intermediate value.
     *
     * Contrast with the read-modify-write anti-pattern:
     *   ```
     *   cat.likes += 1  // reads likes on the client
     *   await cat.save()  // writes likes back — RACE if two requests do this simultaneously
     *   ```
     * Two concurrent requests using read-modify-write both read `likes: 5`, both
     * compute `6`, and both write `6` — one increment is lost.  `$inc` makes each
     * increment unconditionally correct regardless of concurrency.
     *
     * @param id - MongoDB ObjectId string of the cat to like.
     * @returns Promise<Cat> - The cat document with the post-increment `likes` value.
     * @throws NotFoundException if no document with the given id exists.
     */
    async like(id: string): Promise<Cat> {
        // [execute] `$inc: { likes: 1 }` tells MongoDB to add 1 to the `likes` field
        // entirely on the server — no read-modify-write window, no lost increments.
        const updated = await this.catModel
            .findByIdAndUpdate(
                id,
                {
                    $inc: {
                        likes: 1,  // atomic server-side increment — race-free
                    },
                },
                {
                    returnDocument: "after",  // respond with the post-increment document
                },
            )
            .exec()

        // [guard] Return 404 if the document does not exist rather than silently
        // succeeding — a missing id is a client error, not a silent no-op.
        if (!updated) {
            throw new NotFoundException(`Cat with id "${id}" not found`)
        }
        return updated
    }
}
