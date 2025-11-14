import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'bakong_user' })
export class BakongUser {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ nullable: false, length: 32, unique: true })
  @Index()
  accountId: string

  @Column({ nullable: false, length: 255 })
  fcmToken: string

  @Column({ nullable: true, length: 32 })
  participantCode?: string

  @Column({ nullable: true, length: 32 })
  platform?: string

  @Column({ nullable: true, length: 2 })
  language?: string

  @CreateDateColumn({ nullable: false, type: 'timestamp' })
  @Index()
  createdAt: Date

  @UpdateDateColumn({ nullable: true, type: 'timestamp' })
  updatedAt?: Date
}
