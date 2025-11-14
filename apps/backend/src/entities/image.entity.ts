import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { TemplateTranslation } from './template-translation.entity'
import { Exclude } from 'class-transformer'

@Entity()
export class Image {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ nullable: false, type: 'uuid', unique: true })
  @Generated('uuid')
  fileId: string

  @Exclude()
  @Column({ nullable: false, type: 'bytea' })
  file: Buffer

  @Column({ nullable: false, length: 255 })
  mimeType: string

  @Column({ nullable: true, length: 255 })
  originalFileName: string

  @CreateDateColumn({ nullable: false, type: 'timestamp' })
  createdAt: Date

  @OneToMany(() => TemplateTranslation, (translation) => translation.image)
  translations: TemplateTranslation[]
}
