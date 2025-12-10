import { Exclude } from 'class-transformer'
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { UserRole } from '@bakong/shared'
import { Image } from './image.entity'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: false, length: 255, unique: true })
  username: string

  @Column({ nullable: false, length: 255 })
  @Exclude()
  password: string

  @Column({ nullable: false, length: 255 })
  displayName: string

  @Column({ nullable: false, type: 'enum', enum: UserRole, default: UserRole.NORMAL_USER })
  role: UserRole

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageId?: string

  @ManyToOne(() => Image, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'imageId', referencedColumnName: 'fileId' })
  image?: Image

  @Column({ nullable: false, default: 0 })
  failLoginAttempt: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt?: Date

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt?: Date
}
