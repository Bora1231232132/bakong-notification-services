import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { TemplateTranslation } from './template-translation.entity'
import { Exclude } from 'class-transformer'
import { randomUUID } from 'crypto'

@Entity()
export class Image {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number

  @Column({ nullable: false, type: 'varchar', length: 255, unique: true })
  fileId: string

  @BeforeInsert()
  generateFileId() {
    if (!this.fileId) {
      this.fileId = randomUUID()
    }
  }

  @Exclude()
  @Column({ nullable: false, type: 'bytea' })
  file: Buffer

  @Column({ nullable: true, type: 'varchar', length: 32, unique: true })
  fileHash: string

  @Column({ nullable: false, length: 255 })
  mimeType: string

  @Column({ nullable: true, length: 255 })
  originalFileName: string

  @CreateDateColumn({ nullable: false, type: 'timestamp' })
  createdAt: Date

  @OneToMany(() => TemplateTranslation, (translation) => translation.image)
  translations: TemplateTranslation[]
}
