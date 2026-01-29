import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomUUID } from 'crypto'
import { VerificationToken, VerificationTokenType } from 'src/entities/verification-token.entity'
import { BaseResponseDto } from 'src/common/base-response.dto'
import { ErrorCode } from '@bakong/shared'

@Injectable()
export class OtpService {
  private readonly VERIFICATION_EXPIRY_HOURS = 24 // Verification link valid for 24 hours

  constructor(
    @InjectRepository(VerificationToken)
    private tokenRepo: Repository<VerificationToken>,
  ) {}

  /**
   * Generate a unique verification token (UUID-based)
   * Used for email verification links
   */
  generateVerificationToken(): string {
    return randomUUID()
  }

  /**
   * Create verification token in database
   * Invalidates any existing unused verification tokens for the user
   */
  async createVerificationToken(userId: number, token: string): Promise<VerificationToken> {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + this.VERIFICATION_EXPIRY_HOURS)

    // Invalidate any existing unused verification tokens for this user
    await this.tokenRepo.update(
      {
        userId,
        type: VerificationTokenType.ACCOUNT_ACTIVATION,
        usedAt: null as any,
      },
      { usedAt: new Date() },
    )

    // Create new token
    return this.tokenRepo.save({
      token,
      userId,
      type: VerificationTokenType.ACCOUNT_ACTIVATION,
      expiresAt,
    })
  }

  /**
   * Verify token from email link
   * Returns validation result with reason if invalid
   */
  async verifyToken(token: string): Promise<{ valid: boolean; userId?: number; reason?: string }> {
    const verificationToken = await this.tokenRepo.findOne({
      where: {
        token,
        type: VerificationTokenType.ACCOUNT_ACTIVATION,
        usedAt: null as any,
      },
    })

    if (!verificationToken) {
      return { valid: false, reason: 'INVALID_TOKEN' }
    }

    // Check expiration
    if (new Date() > verificationToken.expiresAt) {
      return { valid: false, reason: 'EXPIRED' }
    }

    // Mark as used (single-use token)
    verificationToken.usedAt = new Date()
    await this.tokenRepo.save(verificationToken)

    return { valid: true, userId: verificationToken.userId }
  }

  /**
   * Check if user has a valid unused verification token
   * Used before allowing password setup
   */
  async hasValidToken(userId: number): Promise<boolean> {
    const token = await this.tokenRepo.findOne({
      where: {
        userId,
        type: VerificationTokenType.ACCOUNT_ACTIVATION,
        usedAt: null as any,
      },
    })

    if (!token) {
      return false
    }

    return new Date() <= token.expiresAt
  }
}
