/**
 * Mongoose schema definition for the Cat entity.
 *
 * Teaching purpose: shows how a single MongoDB document can hold
 *  - scalar fields   (`name`, `age`, `breed`, `likes`)
 *  - an array field  (`hobbies: string[]`) — no side table needed
 *  - a nested object (`metadata: Record<string, unknown>`) — stored inline
 *
 * This eliminates the relational model's need to normalize arrays into child
 * tables and join them back on every read.
 */
import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"
import {
    HydratedDocument,
} from "mongoose"

/**
 * CatDocument — the Mongoose "hydrated" type for a Cat record.
 *
 * `HydratedDocument<Cat>` extends `Cat` with Mongoose document methods
 * (`save()`, `toObject()`, `$set()`, etc.) and MongoDB metadata (`_id`,
 * `__v`, `createdAt`, `updatedAt`).
 */
export type CatDocument = HydratedDocument<Cat>

/**
 * Cat — Mongoose-decorated class that defines the `cats` collection shape.
 *
 * `@Schema({ timestamps: true, collection: "cats" })`:
 *   - `timestamps: true`  → Mongoose automatically manages `createdAt` / `updatedAt`.
 *   - `collection: "cats"` → explicit collection name; avoids Mongoose's default
 *     pluralization heuristics that can produce unexpected names.
 *
 * All fields stored together in one BSON document — the document model's
 * key advantage over the relational model for entity-centric reads.
 */
@Schema({
    timestamps: true,   // auto-manages createdAt + updatedAt on every write
    collection: "cats", // pin the collection name to avoid pluralization surprises
})
export class Cat {
    /**
     * Name of the cat.
     *
     * `required: true`  — the document is rejected if this field is absent.
     * `index: true`     — MongoDB creates a B-tree index on `name`, making
     *                     `findOne({ name })` an indexed lookup instead of a
     *                     full collection scan.
     */
    @Prop({
        required: true,
        index: true,
    })
        name: string

    /**
     * Age of the cat in years.
     *
     * `required: true` — must be provided on creation.
     * `min: 0`         — Mongoose schema-level validation; rejects negative ages.
     */
    @Prop({
        required: true,
        min: 0,
    })
        age: number

    /**
     * Breed of the cat (optional free-text field).
     *
     * No `required` constraint — cats of unknown breed are still valid documents.
     */
    @Prop()
        breed: string

    /**
     * List of hobbies — stored as an inline string array inside the document.
     *
     * `@Prop([String])` is Mongoose shorthand for `{ type: [{ type: String }] }`.
     *
     * Teaching point: the array lives *directly in the document* — there is no
     * `cat_hobbies` child collection and no join.  Querying by element is done
     * with `{ hobbies: { $in: [hobby] } }` — a single read, no join.
     *
     * Edge case: if this array can grow without bound (e.g. thousands of entries),
     * the document risks breaching MongoDB's 16 MB document size limit.  For
     * unbounded arrays, switch to a referenced child collection.
     */
    @Prop([String])
        hobbies: string[]

    /**
     * Free-form nested object for arbitrary key-value metadata.
     *
     * `@Prop({ type: Object })` tells Mongoose to store a plain JS object without
     * enforcing a fixed sub-schema — useful for flexible, per-document attributes
     * (e.g. `{ color: "orange", vaccinated: true }`).
     *
     * Teaching point: the object is stored inline in the same document (embedding),
     * not in a separate `cat_metadata` collection.  This is "embed when data belongs
     * to the parent and is usually read with it."
     *
     * Edge case: without schema enforcement, any value can be written into `metadata`.
     * Always validate the structure at the DTO layer to prevent data quality issues.
     */
    @Prop({
        type: Object,
    })
        metadata: Record<string, unknown>

    /**
     * Like count — the hot counter incremented atomically via `$inc`.
     *
     * `required: true` + `default: 0` → every new document starts with `likes: 0`.
     * `min: 0`                         → rejects any write that would make it negative.
     *
     * Teaching point: this field is updated with `$inc` (a server-side operator),
     * NOT with the read-modify-write pattern (`cat.likes += 1; cat.save()`).
     * `$inc` is atomic at the document level — two concurrent requests each get
     * their own isolated increment with no lost counts.
     */
    @Prop({
        required: true,
        default: 0,
        min: 0,
    })
        likes: number
}

/**
 * CatSchema — compiled Mongoose Schema derived from the Cat class.
 *
 * `SchemaFactory.createForClass` inspects the `@Schema` / `@Prop` decorators
 * and produces a Mongoose `Schema` instance ready to be registered with
 * `MongooseModule.forFeature(...)` in the module.
 */
export const CatSchema = SchemaFactory.createForClass(Cat)
