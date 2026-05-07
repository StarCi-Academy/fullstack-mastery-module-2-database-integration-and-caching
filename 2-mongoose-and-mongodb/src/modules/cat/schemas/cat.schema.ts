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
 * Cat Document â€” Kiá»ƒu dữ liệu được hydrate tá»« database.
 * (EN: Hydrated document type from the database.)
 */
export type CatDocument = HydratedDocument<Cat>;

/**
 * Cat Schema â€” Äáº¡i diá»‡n cho collection 'cats' trong MongoDB.
 * MongoDB lÃ  NoSQL, nhÆ°ng Mongoose giÃºp quáº£n lÃ½ schema cháº·t cháº½.
 * (EN: Represents the 'cats' collection in MongoDB. Non-relational, but Mongoose provides schema validation.)
 */
@Schema({
    // Tá»± Ä‘á»™ng thÃªm createdAt vÃ  updatedAt (EN: Auto-adds createdAt and updatedAt)
    timestamps: true,
    // Tên collection trong DB (EN: Collection name in DB)
    collection: "cats",
})
export class Cat {
  /**
   * Tên của mÃ¨o.
   * (EN: Name of the cat.)
   */
  @Prop({
      required: true, index: true 
  })
      name: string

  /**
   * Tuá»•i của mÃ¨o.
   * (EN: Age of the cat.)
   */
  @Prop({
      required: true, min: 0 
  })
      age: number

  /**
   * Giá»‘ng mÃ¨o.
   * (EN: Breed of the cat.)
   */
  @Prop()
      breed: string

  /**
   * Danh sÃ¡ch cÃ¡c sá»Ÿ thÃ­ch (máº£ng chuá»—i).
   * (EN: List of hobbies (array of strings).)
   */
  @Prop([String])
      hobbies: string[]

  /**
   * Metadata bá»• sung (Object lá»“ng nhau).
   * (EN: Additional metadata (nested object).)
   */
  @Prop({
      type: Object 
  })
      metadata: Record<string, any>
}

/**
 * Schema Factory â€” Chuyá»ƒn Ä‘á»•i class Cat thÃ nh Mongoose Schema thá»±c thá»¥.
 * (EN: Converts the Cat class into an actual Mongoose Schema.)
 */
export const CatSchema = SchemaFactory.createForClass(Cat)
