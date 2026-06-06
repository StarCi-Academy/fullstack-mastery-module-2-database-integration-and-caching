/**
 * TypeORM entity — Cat entity.
 */
import {
    Entity, PrimaryGeneratedColumn, Column, OneToOne 
} from "typeorm"
import {
    Cat 
} from "./cat.entity"

/**
 * CatPassport Entity — Represents a cat's passport. Each cat has exactly one passport (1:1).
 */
@Entity("cat_passports")
export class CatPassport {
  /**
   * Auto-incremented ID.
   */
  @PrimaryGeneratedColumn()
      id: number

  /**
   * Passport number.
   */
  @Column()
      passportNumber: string

  /**
   * Inverse 1:1 relationship with Cat.
   */
  @OneToOne(() => Cat,
      (cat) => cat.passport)
      cat: Cat
}
