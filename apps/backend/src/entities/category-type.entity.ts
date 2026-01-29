import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Exclude } from 'class-transformer'

@Entity({ name: 'category_type' })
export class CategoryType {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: false, length: 255, unique: true })
  name: string

  @Column({ nullable: true, length: 255 })
  namekh?: string

  @Column({ nullable: true, length: 255 })
  namejp?: string

  @Exclude()
  @Column({ nullable: false, type: 'bytea' })
  icon: Buffer

  @Column({ nullable: true, length: 255 })
  mimeType?: string

  @Column({ nullable: true, length: 255 })
  originalFileName?: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt?: Date

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt?: Date
}
