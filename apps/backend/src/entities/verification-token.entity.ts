import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'

export enum VerificationTokenType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_ACTIVATION = 'ACCOUNT_ACTIVATION',
}

@Entity()
export class VerificationToken {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: false, length: 255, unique: true })
  @Index()
  token: string

  @Column({ nullable: false, type: 'int' })
  userId: number

  @ManyToOne(() => User, (user) => user.verificationTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({
    nullable: false,
    type: 'enum',
    enum: VerificationTokenType,
    default: VerificationTokenType.EMAIL_VERIFICATION,
  })
  type: VerificationTokenType

  @Column({ nullable: false, type: 'timestamp' })
  expiresAt: Date

  @Column({ nullable: true, type: 'timestamp' })
  usedAt?: Date

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date
}
