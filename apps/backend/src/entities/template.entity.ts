import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { SendType, NotificationType, BakongApp, ApprovalStatus } from '@bakong/shared'
import { TemplateTranslation } from './template-translation.entity'
import { CategoryType as CategoryTypeEntity } from './category-type.entity'

export type SendIntervalData = { cron: string; startAt: Date; endAt: Date }
@Entity()
export class Template {
  @PrimaryGeneratedColumn()
  id: number

  @OneToMany(() => TemplateTranslation, (translation) => translation.template, {
    cascade: ['insert'],
  })
  translations: TemplateTranslation[]

  @Column('text', { array: true, nullable: false })
  platforms?: string[]

  @Column({ nullable: true, type: 'enum', enum: BakongApp })
  bakongPlatform?: BakongApp

  @Column({ nullable: false, type: 'enum', enum: SendType, default: SendType.SEND_SCHEDULE })
  sendType?: SendType

  @Column({
    nullable: false,
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.FLASH_NOTIFICATION,
  })
  notificationType?: NotificationType

  @Column({ nullable: true, type: 'integer' })
  categoryTypeId?: number

  @ManyToOne(() => CategoryTypeEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryTypeId', referencedColumnName: 'id' })
  categoryTypeEntity?: CategoryTypeEntity

  @Column({ nullable: false, type: 'integer', default: 0 })
  priority?: number

  @Column({ type: 'json', nullable: true })
  sendInterval?: SendIntervalData

  @Column({ type: 'boolean', default: false })
  isSent?: boolean

  @Column({ type: 'timestamptz', nullable: true })
  sendSchedule?: Date

  @Column({ nullable: true })
  createdBy?: string

  @Column({ nullable: true })
  updatedBy?: string

  @Column({ nullable: true })
  publishedBy?: string

  @Column({ nullable: true, type: 'enum', enum: ApprovalStatus })
  approvalStatus?: ApprovalStatus

  @Column({ nullable: true })
  approvedBy?: string

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date

  @Column({ type: 'integer', nullable: true, default: 1 })
  showPerDay?: number

  @Column({ type: 'integer', nullable: true, default: 1 })
  maxDayShowing?: number

  @Column({ type: 'text', nullable: true })
  reasonForRejection?: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt?: Date

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date
}
