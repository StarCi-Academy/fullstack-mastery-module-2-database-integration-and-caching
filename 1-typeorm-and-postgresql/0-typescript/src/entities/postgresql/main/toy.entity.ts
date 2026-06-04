/**
 * TypeORM entity — Cat entity.
 */
import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne 
} from "typeorm"
import {
    Cat 
} from "./cat.entity"

/**
 * Toy Entity — Represents a cat's toy. Many toys can belong to the same cat (N:1).
 */
@Entity("toys")
export class Toy {
  /**
   * Auto-incremented ID.
   */
  @PrimaryGeneratedColumn()
      id: number

  /**
   * Name of the toy.
   */
  @Column()
      name: string

  /**
   * N:1 relationship with Cat.
   */
  @ManyToOne(() => Cat,
      (cat) => cat.toys)
      cat: Cat
}
