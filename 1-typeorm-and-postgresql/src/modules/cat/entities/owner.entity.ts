/**
 * Entity TypeORM — thuc the Cat.
 * (EN: TypeORM entity — Cat entity.)
 */
import {
    Entity, PrimaryGeneratedColumn, Column, ManyToMany 
} from "typeorm"
import {
    Cat 
} from "./cat.entity"

/**
 * Owner Entity â€” Äáº¡i diá»‡n cho ngÆ°á»i chá»§ của mÃ¨o.
 * Má»™t ngÆ°á»i chá»§ cÃ³ thể cÃ³ nhiá»u mÃ¨o, vÃ  má»™t con mÃ¨o cÃ³ thể cÃ³ nhiá»u chá»§ (N:N).
 * (EN: Represents the owner of a cat. An owner can have many cats, and a cat can have many owners (N:N).)
 */
@Entity("owners")
export class Owner {
  /**
   * ID tự tăng của ngÆ°á»i chá»§.
   * (EN: Auto-incremented ID of the owner.)
   */
  @PrimaryGeneratedColumn()
      id: number

  /**
   * Tên của ngÆ°á»i chá»§.
   * (EN: Name of the owner.)
   */
  @Column()
      name: string

  /**
   * Quan há»‡ N:N vá»›i Cat.
   * (EN: N:N relationship with Cat.)
   */
  @ManyToMany(() => Cat,
      (cat) => cat.owners)
      cats: Cat[]
}
