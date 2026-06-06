/**
 * Mongoose schema — Cat schema.
 */
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    HydratedDocument 
} from "mongoose"

/**
 * Cat Document — Hydrated document type from the database.
 */
export type CatDocument = HydratedDocument<Cat>;

/**
 * Cat Schema — Represents the 'cats' collection in MongoDB. Non-relational, but Mongoose provides schema validation.
 */
@Schema({
    // Auto-adds createdAt and updatedAt
    timestamps: true,
    // Collection name in DB
    collection: "cats",
})
export class Cat {
  /**
   * Name of the cat.
   */
  @Prop({
      required: true, index: true 
  })
      name: string

  /**
   * Age of the cat.
   */
  @Prop({
      required: true, min: 0 
  })
      age: number

  /**
   * Breed of the cat.
   */
  @Prop()
      breed: string

  /**
   * List of hobbies (array of strings).
   */
  @Prop([String])
      hobbies: string[]

  /**
   * Additional metadata (nested object).
   */
  @Prop({
      type: Object
  })
      metadata: Record<string, unknown>

  /**
   * Like count (used for the atomic `$inc` demo).
   */
  @Prop({
      required: true, default: 0, min: 0,
  })
      likes: number
}

/**
 * Schema Factory — Converts the Cat class into an actual Mongoose Schema.
 */
export const CatSchema = SchemaFactory.createForClass(Cat)
