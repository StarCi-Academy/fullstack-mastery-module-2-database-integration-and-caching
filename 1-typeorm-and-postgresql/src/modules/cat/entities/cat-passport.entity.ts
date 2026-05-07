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
 * CatPassport Entity â€” Äáº¡i diá»‡n cho hộ chiếu của mÃ¨o.
 * Má»—i con mÃ¨o chá»‰ cÃ³ duy nhất một hộ chiếu (1:1).
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
   * Quan há»‡ 1:1 ngÆ°á»£c lại vá»›i Cat.
   * (EN: Inverse 1:1 relationship with Cat.)
   */
  @OneToOne(() => Cat,
      (cat) => cat.passport)
      cat: Cat
}
