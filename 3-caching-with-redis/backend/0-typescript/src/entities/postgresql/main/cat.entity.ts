/**
 * TypeORM entity — Cat entity.
 */
import {
    Entity, PrimaryGeneratedColumn, Column 
} from "typeorm"

/**
 * Cat Entity — Cat Entity for caching demonstration.
 */
@Entity("cats")
export class Cat {
  @PrimaryGeneratedColumn()
      id: number

  @Column()
      name: string

  @Column()
      breed: string
}
