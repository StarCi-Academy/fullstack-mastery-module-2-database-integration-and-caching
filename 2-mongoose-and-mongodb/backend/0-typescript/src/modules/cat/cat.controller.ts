/**
 * REST controller for Cat feature.
 *
 * Maps HTTP routes to CatService methods.
 * Routes exposed:
 *   POST   /cats           — create a cat document
 *   GET    /cats           — list all cats (or filter by hobby query param)
 *   GET    /cats/search    — find one cat by name
 *   PATCH  /cats/:id       — partial update of a cat document
 *   POST   /cats/:id/like  — atomically increment the `likes` counter
 */
import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
} from "@nestjs/common"
import {
    CatService,
} from "./cat.service"
import {
    Cat,
} from "../../schemas/mongodb/main"

/**
 * CatController — REST API Endpoints for cats using MongoDB.
 *
 * All routes are prefixed with `/cats` via the `@Controller("cats")` decorator.
 * The service layer owns all Mongoose interactions; the controller only routes
 * and delegates — no business logic lives here.
 */
@Controller("cats")
export class CatController {
    /**
     * @param catService - Injected CatService that handles all Mongoose operations.
     */
    constructor(private readonly catService: CatService) {}

    /**
     * POST /cats — Create a new cat document.
     *
     * NestJS defaults to HTTP 201 for @Post handlers, which matches the
     * MongoDB "document created" semantic.
     *
     * @param catData - Partial Cat fields from the request body.
     * @returns Promise<Cat> - The newly persisted cat document.
     */
    @Post()
    async create(@Body() catData: Partial<Cat>): Promise<Cat> {
        // Delegate creation to the service; no transformation needed at this layer.
        return await this.catService.create(catData)
    }

    /**
     * GET /cats — List cats (sorted by age desc, limit 10).
     * GET /cats?hobby=fishing — Filter by a single hobby element via `$in`.
     *
     * The optional `hobby` query param switches the query from "all cats" to
     * "cats whose hobbies array contains this value" — one handler covers both
     * paths so the client uses a single familiar endpoint.
     *
     * @param hobby - Optional query param; when present, delegates to findByHobby.
     * @returns Promise<Cat[]> - Matching cat documents.
     */
    @Get()
    async findAll(@Query("hobby") hobby?: string): Promise<Cat[]> {
        // Branch: if the caller passes ?hobby=X, use the $in array-element query.
        // Otherwise fall back to the default findAll (sorted, limited).
        if (hobby) {
            return await this.catService.findByHobby(hobby)
        }
        return await this.catService.findAll()
    }

    /**
     * GET /cats/search?name=xxx — Find a single cat by name.
     *
     * This route must be declared BEFORE `@Get(":id")` (if one existed) so that
     * Express does not interpret "search" as an id segment.
     *
     * @param name - Cat name to search for (exact match, leverages the name index).
     * @returns Promise<Cat> - The matching cat document, or 404 if not found.
     */
    @Get("search")
    async findByName(@Query("name") name: string): Promise<Cat> {
        // The service throws NotFoundException if no document matches the name.
        return await this.catService.findByName(name)
    }

    /**
     * PATCH /cats/:id — Partially update a cat document.
     *
     * PATCH is preferred over PUT for partial updates: the client sends only the
     * fields that changed, not the entire document.  The service uses
     * findByIdAndUpdate with { returnDocument: "after" } so the response always
     * reflects the latest persisted state.
     *
     * @param id - MongoDB ObjectId string from the URL path.
     * @param updateData - Partial Cat fields to merge into the existing document.
     * @returns Promise<Cat> - The updated cat document, or 404 if not found.
     */
    @Patch(":id")
    async update(
        @Param("id") id: string,
        @Body() updateData: Partial<Cat>,
    ): Promise<Cat> {
        // Delegate to service; it resolves the ObjectId and applies the partial update.
        return await this.catService.update(id, updateData)
    }

    /**
     * POST /cats/:id/like — Increment the `likes` counter by 1 using atomic `$inc`.
     *
     * Uses @Post (HTTP 201) because each call creates a new "like" event on the
     * server, consistent with REST conventions for non-idempotent increments.
     * The atomic `$inc` operator means concurrent requests from many clients will
     * each count exactly once — no lost increments, no race condition.
     *
     * @param id - MongoDB ObjectId string of the cat to like.
     * @returns Promise<Cat> - The cat document with the updated `likes` value.
     */
    @Post(":id/like")
    async like(@Param("id") id: string): Promise<Cat> {
        // $inc runs entirely on the database side — the client never reads `likes`
        // before writing, so two concurrent requests cannot overwrite each other.
        return await this.catService.like(id)
    }
}
