import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Template } from './template.entity'

@Entity()
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ nullable: false, length: 32 })
  @Index()
  accountId: string

  @Column({ nullable: false, length: 255 })
  fcmToken: string

  @Column({ nullable: false, type: 'bigint' })
  templateId: number

  @ManyToOne(() => Template, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template: Template

  @CreateDateColumn({ nullable: false, type: 'timestamp' })
  createdAt: Date

  @Column({ nullable: true, type: 'bigint' })
  firebaseMessageId?: number

  @Column({ nullable: false, type: 'int', default: 1 })
  sendCount: number
}
