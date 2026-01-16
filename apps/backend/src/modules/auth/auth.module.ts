import { Module, forwardRef } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import k from 'src/constant'
import { UserModule } from '../user/user.module'
import { ImageModule } from '../image/image.module'
import { VerificationToken } from 'src/entities/verification-token.entity'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { OtpService } from './otp.service'
import { JwtStrategy } from './jwt.strategy'
import { LocalStrategy } from './local.strategy'

@Module({
  imports: [
    forwardRef(() => UserModule), // Use forwardRef to avoid circular dependency
    ImageModule,
    PassportModule,
    TypeOrmModule.forFeature([VerificationToken]),
    JwtModule.register({
      secret: k.API_JWT_KEY,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, LocalStrategy, JwtStrategy],
  exports: [AuthService, OtpService],
})
export class AuthModule {}
