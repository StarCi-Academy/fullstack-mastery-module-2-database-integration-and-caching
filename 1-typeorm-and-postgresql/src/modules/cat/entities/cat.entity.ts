/**
 * Entity TypeORM — thuc the Cat.
 * (EN: TypeORM entity — Cat entity.)
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
 * Cat Entity â€” Thực thể chÃ­nh Ä‘áº¡i diá»‡n cho mÃ¨o.
 * Minh há»a đầy đủ cÃ¡c loại quan hệ trong TypeORM.
 * (EN: Main entity representing a cat. Illustrates all types of relationships in TypeORM.)
 */
@Entity("cats")
export class Cat {
  /**
   * ID tự tăng.
   * (EN: Auto-incremented ID.)
   */
  @PrimaryGeneratedColumn()
      id: number

  /**
   * Tên con mÃ¨o.
   * (EN: Name of the cat.)
   */
  @Column()
      name: string

  /**
   * Quan há»‡ 1:1 vá»›i CatPassport.
   * @JoinColumn cho biáº¿t quan há»‡ nÃ y sở hữu khóa ngoại (foreign key).
   * (EN: 1:1 relationship with CatPassport. @JoinColumn indicates this side owns the foreign key.)
   */
  @OneToOne(() => CatPassport,
      (passport) => passport.cat,
      {
          cascade: true 
      })
  @JoinColumn()
      passport: CatPassport

  /**
   * Quan há»‡ 1:N vá»›i Toy.
   * Má»™t con mÃ¨o cÃ³ thể cÃ³ danh sÃ¡ch đồ chơi.
   * (EN: 1:N relationship with Toy. A cat can have a list of toys.)
   */
  @OneToMany(() => Toy,
      (toy) => toy.cat,
      {
          cascade: true 
      })
      toys: Toy[]

  /**
   * Quan há»‡ N:N vá»›i Owner.
   * @JoinTable cáº§n thiáº¿t á»Ÿ má»™t phÃ­a của quan há»‡ N:N.
   * (EN: N:N relationship with Owner. @JoinTable is required on one side of the N:N relation.)
   */
  @ManyToMany(() => Owner,
      (owner) => owner.cats,
      {
          cascade: true 
      })
  @JoinTable()
      owners: Owner[]
}
