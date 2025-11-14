import { Exclude } from 'class-transformer'
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { UserRole } from '@bakong/shared'

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

  @Column({ nullable: false, default: 0 })
  failLoginAttempt: number

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt?: Date

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt?: Date
}
