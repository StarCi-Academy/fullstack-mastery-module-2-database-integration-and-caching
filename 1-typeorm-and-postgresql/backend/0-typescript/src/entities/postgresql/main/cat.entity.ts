/**
 * TypeORM entity — Cat entity.
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    OneToMany,
    ManyToMany,
    JoinTable,
} from "typeorm"
import {
    CatPassport 
} from "./cat-passport.entity"
import {
    Toy 
} from "./toy.entity"
import {
    Owner 
} from "./owner.entity"

/**
 * Cat Entity — Main entity representing a cat. Illustrates all types of relationships in TypeORM.
 */
@Entity("cats")
export class Cat {
  /**
   * Auto-incremented ID.
   */
  @PrimaryGeneratedColumn()
      id: number

  /**
   * Name of the cat.
   */
  @Column()
      name: string

  /**
   * 1:1 relationship with CatPassport. @JoinColumn indicates this side owns the foreign key.
   */
  @OneToOne(() => CatPassport,
      (passport) => passport.cat,
      {
          cascade: true 
      })
  @JoinColumn()
      passport: CatPassport

  /**
   * 1:N relationship with Toy. A cat can have a list of toys.
   */
  @OneToMany(() => Toy,
      (toy) => toy.cat,
      {
          cascade: true 
      })
      toys: Toy[]

  /**
   * N:N relationship with Owner. @JoinTable is required on one side of the N:N relation.
   */
  @ManyToMany(() => Owner,
      (owner) => owner.cats,
      {
          cascade: true 
      })
  @JoinTable()
      owners: Owner[]
}
