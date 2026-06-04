/**
 * TypeORM entity — `comparison_items` table in PostgreSQL.
 */
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from "typeorm"

@Entity("comparison_items")
export class SqlComparisonItemEntity {
    @PrimaryGeneratedColumn("uuid")
        id!: string

    @Column({
        type: "varchar", length: 255 
    })
        title!: string

    @Column({
        type: "double precision" 
    })
        amount!: number

    @CreateDateColumn({
        type: "timestamptz" 
    })
        createdAt!: Date
}
