/**
 * Entity TypeORM — thuc the Cat.
 * (EN: TypeORM entity — Cat entity.)
 */
import {
    Entity, PrimaryGeneratedColumn, Column, OneToOne 
} from "typeorm"
import {
    Cat 
} from "./cat.entity"

/**
 * CatPassport Entity — Äáº¡i diện cho hộ chiếu của mèo.
 * Mỗi con mèo chỉ có duy nhất một hộ chiếu (1:1).
 * (EN: Represents a cat's passport. Each cat has exactly one passport (1:1).)
 */
@Entity("cat_passports")
export class CatPassport {
  /**
   * ID tự tăng.
   * (EN: Auto-incremented ID.)
   */
  @PrimaryGeneratedColumn()
      id: number

  /**
   * Số hiệu hộ chiếu.
   * (EN: Passport number.)
   */
  @Column()
      passportNumber: string

  /**
   * Quan hệ 1:1 ngược lại với Cat.
   * (EN: Inverse 1:1 relationship with Cat.)
   */
  @OneToOne(() => Cat,
      (cat) => cat.passport)
      cat: Cat
}
