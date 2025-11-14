import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { SendType, NotificationType, CategoryType } from '@bakong/shared'
import { TemplateTranslation } from './template-translation.entity'

export type SendIntervalData = { cron: string; startAt: Date; endAt: Date }
@Entity()
export class Template {
  @PrimaryGeneratedColumn()
  id: number

  @OneToMany(() => TemplateTranslation, (translation) => translation.template, {
    eager: true,
    cascade: ['insert'],
  })
  translations: TemplateTranslation[]

  @Column('text', { array: true, nullable: false })
  platforms?: string[]

  @Column({ nullable: false, type: 'enum', enum: SendType, default: SendType.SEND_SCHEDULE })
  sendType?: SendType

  @Column({
    nullable: false,
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.FLASH_NOTIFICATION,
  })
  notificationType?: NotificationType

  @Column({ nullable: false, type: 'enum', enum: CategoryType, default: CategoryType.NEWS })
  categoryType?: CategoryType

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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt?: Date

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date
}
