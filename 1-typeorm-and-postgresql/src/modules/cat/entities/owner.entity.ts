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
 * Owner Entity — Äáº¡i diện cho ngÆ°á»i chủ của mèo.
 * Má»™t ngÆ°á»i chủ có thể có nhiá»u mèo, vÃ  má»™t con mèo có thể có nhiá»u chủ (N:N).
 * (EN: Represents the owner of a cat. An owner can have many cats, and a cat can have many owners (N:N).)
 */
@Entity("owners")
export class Owner {
  /**
   * ID tự tăng của ngÆ°á»i chủ.
   * (EN: Auto-incremented ID of the owner.)
   */
  @PrimaryGeneratedColumn()
      id: number

  /**
   * Tên của ngÆ°á»i chủ.
   * (EN: Name of the owner.)
   */
  @Column()
      name: string

  /**
   * Quan hệ N:N với Cat.
   * (EN: N:N relationship with Cat.)
   */
  @ManyToMany(() => Cat,
      (cat) => cat.owners)
      cats: Cat[]
}
