import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Language } from '@bakong/shared'
import { Template } from './template.entity'
import { Image } from './image.entity'

@Entity()
export class TemplateTranslation {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Template, (template) => template.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'templateId' })
  template: Template

  @Column({ type: 'integer', nullable: false })
  templateId: number

  @Column({ nullable: false, type: 'enum', enum: Language })
  language?: Language

  @Column({ length: 1024, nullable: false, default: '' })
  title?: string

  @Column({ type: 'text', nullable: false, default: '' })
  content?: string

  @Column({ type: 'uuid', nullable: true })
  imageId?: string

  @ManyToOne(() => Image, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'imageId', referencedColumnName: 'fileId' })
  image?: Image

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt?: Date

  @Column({ type: 'text', nullable: true })
  linkPreview?: string
}
