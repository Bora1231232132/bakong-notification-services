// apps/backend/src/common/services/email.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import { ConfigService } from './config.service'
import { API_BASE_URL } from '@/constant'

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name)
  private transporter: nodemailer.Transporter
  private isConfigured = false

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Validate SMTP configuration
    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const smtpPassword = process.env.SMTP_PASSWORD

    if (!smtpHost || !smtpUser || !smtpPassword) {
      this.logger.warn(
        '⚠️  SMTP configuration incomplete. Email sending will fail. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in your .env file.',
      )
      this.isConfigured = false
      return
    }

    // Create transporter from config
    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      })

      // Verify connection
      await this.transporter.verify()
      this.isConfigured = true
      this.logger.log('✅ Email service configured successfully')
    } catch (error) {
      this.logger.error('❌ Failed to configure email service:', error.message)
      this.isConfigured = false
    }
  }

  /**
   * Send account verification email with styled button (Google-like design)
   * @param email - User's email address
   * @param verificationLink - Full URL to verification endpoint
   * @param displayName - User's display name
   */
  async sendVerificationEmail(email: string, verificationLink: string, displayName: string) {
    if (!this.isConfigured) {
      throw new Error(
        'Email service is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in your .env file.',
      )
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@bakong.com',
      to: email,
      subject: 'Verify your account - Bakong Notification Service',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              padding: 40px 40px 20px;
              text-align: center;
              background-color: #ffffff;
            }
            .logo {
              font-size: 32px;
              font-weight: 400;
              color: #5f6368;
              margin-bottom: 20px;
            }
            .content {
              padding: 0 40px 40px;
              text-align: center;
            }
            .title {
              font-size: 24px;
              font-weight: 400;
              color: #202124;
              margin-bottom: 16px;
            }
            .account-info {
              background-color: #f8f9fa;
              border-radius: 8px;
              padding: 16px;
              margin: 24px 0;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
            }
            .account-icon {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background-color: #4285f4;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 500;
              font-size: 18px;
            }
            .account-email {
              font-size: 16px;
              color: #202124;
              font-weight: 500;
            }
            .message {
              font-size: 14px;
              color: #5f6368;
              line-height: 1.6;
              margin: 24px 0;
              text-align: left;
            }
            .button-container {
              margin: 32px 0;
            }
            .verify-button {
              display: inline-block;
              background-color: #1a73e8;
              color: #ffffff;
              text-decoration: none;
              padding: 12px 24px;
              border-radius: 4px;
              font-size: 14px;
              font-weight: 500;
              text-align: center;
              min-width: 120px;
            }
            .verify-button:hover {
              background-color: #1557b0;
            }
            .footer {
              padding: 24px 40px;
              background-color: #f8f9fa;
              text-align: center;
              font-size: 12px;
              color: #5f6368;
            }
            .footer-link {
              color: #1a73e8;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Bakong</div>
            </div>
            <div class="content">
              <h1 class="title">Account verification required</h1>

              <div class="account-info">
                <div class="account-icon">${displayName.charAt(0).toUpperCase()}</div>
                <div class="account-email">${email}</div>
              </div>

              <div class="message">
                <p>Welcome to <strong>Bakong Notification Service</strong>!</p>
                <p>An account has been created for you. Please verify your account to activate it and set your password.</p>
                <p>If you didn't request this account, you can safely ignore this email.</p>
              </div>

              <div class="button-container">
                <a href="${verificationLink}" class="verify-button">Verify Account</a>
              </div>
            </div>
            <div class="footer">
              <p>You can also verify your account by visiting:</p>
              <p><a href="${API_BASE_URL}/v1/auth/verify?token=${
        verificationLink.split('token=')[1] || ''
      }" class="footer-link">${API_BASE_URL}/v1/auth/verify?token=${
        verificationLink.split('token=')[1] || ''
      }</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    try {
      const info = await this.transporter.sendMail(mailOptions)
      this.logger.log(`📧 Verification email sent to ${email} (Message ID: ${info.messageId})`)
      return info
    } catch (error) {
      this.logger.error(`❌ Failed to send verification email to ${email}:`, error.message)
      throw error
    }
  }
}
