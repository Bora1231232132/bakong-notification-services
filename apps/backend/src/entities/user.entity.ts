import { Exclude } from 'class-transformer'
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { IsString, Matches, Length, IsNotEmpty } from 'class-validator'
import { UserRole, UserStatus } from '@bakong/shared'
import { VerificationToken } from './verification-token.entity'
import { Image } from './image.entity'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: false, length: 255, unique: true })
  username: string

  @Column({ nullable: false, length: 255, unique: true })
  @Index()
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, {
    message: 'Email must be a valid email address',
  })
  email: string

  @Column({ nullable: false, length: 255 })
  @Exclude()
  password: string

  @Column({ nullable: false, length: 255 })
  displayName: string

  @Column({ nullable: false, type: 'enum', enum: UserRole, default: UserRole.EDITOR })
  role: UserRole

  @Column({ type: 'varchar', length: 20, nullable: false })
  @IsNotEmpty()
  @IsString()
  @Length(10, 20)
  @Matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, {
    message: 'Phone number must be in a valid format',
  })
  phoneNumber: string

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.DEACTIVATED })
  @Index()
  status: UserStatus

  @Column({ type: 'boolean', default: true, nullable: false })
  mustChangePassword: boolean

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageId?: string

  @ManyToOne(() => Image, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'imageId', referencedColumnName: 'fileId' })
  image?: Image

  @OneToMany(() => VerificationToken, (token) => token.user)
  verificationTokens?: VerificationToken[]

  @Column({ type: 'jsonb', nullable: true })
  syncStatus?: {
    failLoginAttempt: number
    login_at: string | null
    changePassword_count: number
  }

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt?: Date

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt?: Date
}
