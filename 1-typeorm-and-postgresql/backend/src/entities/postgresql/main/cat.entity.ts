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
 * Cat Entity — Thực thể chính đại diện cho mèo.
 * Minh há»a đầy đủ các loại quan hệ trong TypeORM.
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
   * Tên con mèo.
   * (EN: Name of the cat.)
   */
  @Column()
      name: string

  /**
   * Quan hệ 1:1 với CatPassport.
   * @JoinColumn cho biết quan hệ nÃ y sở hữu khóa ngoại (foreign key).
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
   * Quan hệ 1:N với Toy.
   * Má»™t con mèo có thể có danh sách đồ chơi.
   * (EN: 1:N relationship with Toy. A cat can have a list of toys.)
   */
  @OneToMany(() => Toy,
      (toy) => toy.cat,
      {
          cascade: true 
      })
      toys: Toy[]

  /**
   * Quan hệ N:N với Owner.
   * @JoinTable cần thiết ở má»™t phía của quan hệ N:N.
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
