/**
 * Schema Mongoose — Cat schema.
 * (EN: Mongoose schema — Cat schema.)
 */
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    HydratedDocument 
} from "mongoose"

/**
 * Cat Document — Kiá»ƒu dữ liệu được hydrate từ database.
 * (EN: Hydrated document type from the database.)
 */
export type CatDocument = HydratedDocument<Cat>;

/**
 * Cat Schema — Äáº¡i diện cho collection 'cats' trong MongoDB.
 * MongoDB lÃ  NoSQL, nhưng Mongoose giúp quản lý schema chặt chẽ.
 * (EN: Represents the 'cats' collection in MongoDB. Non-relational, but Mongoose provides schema validation.)
 */
@Schema({
    // Tự Ä‘á»™ng thêm createdAt vÃ  updatedAt (EN: Auto-adds createdAt and updatedAt)
    timestamps: true,
    // Tên collection trong DB (EN: Collection name in DB)
    collection: "cats",
})
export class Cat {
  /**
   * Tên của mèo.
   * (EN: Name of the cat.)
   */
  @Prop({
      required: true, index: true 
  })
      name: string

  /**
   * Tuổi của mèo.
   * (EN: Age of the cat.)
   */
  @Prop({
      required: true, min: 0 
  })
      age: number

  /**
   * Giống mèo.
   * (EN: Breed of the cat.)
   */
  @Prop()
      breed: string

  /**
   * Danh sách các sở thích (mảng chuỗi).
   * (EN: List of hobbies (array of strings).)
   */
  @Prop([String])
      hobbies: string[]

  /**
   * Metadata bổ sung (Object lồng nhau).
   * (EN: Additional metadata (nested object).)
   */
  @Prop({
      type: Object
  })
      metadata: Record<string, unknown>

  /**
   * Số lượt thích (dùng cho demo atomic `$inc`).
   * (EN: Like count (used for the atomic `$inc` demo).)
   */
  @Prop({
      required: true, default: 0, min: 0,
  })
      likes: number
}

/**
 * Schema Factory — Chuyá»ƒn đổi class Cat thÃ nh Mongoose Schema thực thụ.
 * (EN: Converts the Cat class into an actual Mongoose Schema.)
 */
export const CatSchema = SchemaFactory.createForClass(Cat)
