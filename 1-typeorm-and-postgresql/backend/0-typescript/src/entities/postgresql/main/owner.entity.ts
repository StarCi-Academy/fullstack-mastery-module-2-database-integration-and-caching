/**
 * TypeORM entity — Cat entity.
 */
import {
    Entity, PrimaryGeneratedColumn, Column, ManyToMany 
} from "typeorm"
import {
    Cat 
} from "./cat.entity"

/**
 * Owner Entity — Represents the owner of a cat. An owner can have many cats, and a cat can have many owners (N:N).
 */
@Entity("owners")
export class Owner {
  /**
   * Auto-incremented ID of the owner.
   */
  @PrimaryGeneratedColumn()
      id: number

  /**
   * Name of the owner.
   */
  @Column()
      name: string

  /**
   * N:N relationship with Cat.
   */
  @ManyToMany(() => Cat,
      (cat) => cat.owners)
      cats: Cat[]
}
