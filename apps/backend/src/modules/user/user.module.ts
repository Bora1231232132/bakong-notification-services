import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from 'src/entities/user.entity'
import { VerificationToken } from 'src/entities/verification-token.entity'
import { AuthModule } from '../auth/auth.module'
import { AppModule } from '../app.module'
import { UserService } from './user.service'
import { UserController } from './user.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, VerificationToken]),
    forwardRef(() => AuthModule), // Import AuthModule to access OtpService (forwardRef to avoid circular dependency)
    forwardRef(() => AppModule), // Import AppModule to access EmailService and ConfigService (forwardRef to avoid circular dependency)
  ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
