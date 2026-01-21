import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Template } from 'src/entities/template.entity'
import { NotificationService } from './notification.service'
import { SendType, ApprovalStatus } from '@bakong/shared'

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name)

  constructor(
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
    private readonly notificationService: NotificationService,
  ) {
    const frontendControlled = process.env.FRONTEND_CONTROLLED_SENDING === 'true'
    if (frontendControlled) {
      this.logger.warn(
        '⚠️ Frontend-controlled sending is ENABLED - scheduled notifications will NOT be sent automatically',
      )
    } else {
      this.logger.log(
        '✅ Notification scheduler initialized - will check for scheduled notifications every minute',
      )
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledNotifications() {
    try {
      const frontendControlled = process.env.FRONTEND_CONTROLLED_SENDING === 'true'

      if (frontendControlled) {
        return
      }

      const now = new Date()

      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
      const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000)

      // CRITICAL: Only fetch scheduled templates that are APPROVED or legacy (no approvalStatus)
      // NEVER fetch PENDING scheduled templates - they must be approved first
      const dueScheduledTemplates = await this.templateRepo
        .createQueryBuilder('template')
        .leftJoinAndSelect('template.translations', 'translations')
        .leftJoinAndSelect('translations.image', 'image')
        .where('template.sendType = :sendType', { sendType: 'SEND_SCHEDULE' })
        .andWhere('template.isSent = :isSent', { isSent: false })
        .andWhere('template.sendSchedule <= :oneMinuteFromNow', { oneMinuteFromNow })
        .andWhere(
          '(template.approvalStatus IS NULL OR template.approvalStatus = :approvedStatus)',
          { approvedStatus: ApprovalStatus.APPROVED },
        )
        .andWhere('template.sendSchedule >= :fifteenMinutesAgo', { fifteenMinutesAgo })
        .getMany()

      this.logger.log(
        `🔍 Checking scheduled notifications at ${now.toISOString()} (${now.toLocaleString(
          'en-US',
          { timeZone: 'Asia/Phnom_Penh' },
        )} Cambodia time): found ${dueScheduledTemplates.length} due notifications`,
      )

      if (dueScheduledTemplates.length > 0) {
        dueScheduledTemplates.forEach((template) => {
          const scheduledLocal = template.sendSchedule
            ? new Date(template.sendSchedule).toLocaleString('en-US', {
                timeZone: 'Asia/Phnom_Penh',
              })
            : 'N/A'
          this.logger.log(
            `  - Template ${
              template.id
            }: scheduled at ${template.sendSchedule?.toISOString()} (${scheduledLocal} Cambodia), isSent: ${
              template.isSent
            }`,
          )
        })
      } else {
        this.logger.debug(
          `  - No scheduled notifications found in range (${fifteenMinutesAgo.toISOString()} to ${oneMinuteFromNow.toISOString()})`,
        )
      }

      for (const template of dueScheduledTemplates) {
        await this.processScheduledTemplate(template, now)
      }
    } catch (error) {
      this.logger.error('❌ Error in handleScheduledNotifications:', error)
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleIntervalNotifications() {
    try {
      const frontendControlled = process.env.FRONTEND_CONTROLLED_SENDING === 'true'

      if (frontendControlled) {
        return
      }

      const now = new Date()
      const activeIntervalTemplates = await this.templateRepo.find({
        where: {
          sendType: 'SEND_INTERVAL' as SendType,
          isSent: false,
        },
        relations: ['translations'],
      })

      for (const template of activeIntervalTemplates) {
        await this.processIntervalTemplate(template, now)
      }
    } catch (error) {
      this.logger.error('❌ Error in handleIntervalNotifications:', error)
    }
  }

  private async processIntervalTemplate(template: Template, now: Date) {
    try {
      if (!template.sendInterval || typeof template.sendInterval !== 'object') {
        this.logger.warn(`⚠️ Template ${template.id} has no sendInterval configuration`)
        return
      }

      const { startAt, endAt } = template.sendInterval

      if (!startAt || !endAt) {
        this.logger.warn(`⚠️ Template ${template.id} missing startAt or endAt`)
        return
      }

      const startTime = new Date(startAt)
      const endTime = new Date(endAt)

      this.logger.log(`🔍 Processing template ${template.id}:`, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        now: now.toISOString(),
        isActive: now >= startTime && now <= endTime,
        isExpired: now > endTime,
      })

      if (now >= startTime && now <= endTime) {
        if (this.shouldSendNow(template, now)) {
          await this.notificationService.sendWithTemplate(template)
          await this.updateLastSentAt(template, now)
        }
      } else if (now > endTime) {
        await this.templateRepo.update(template.id, { isSent: true })
      }
    } catch (error) {
      this.logger.error(`❌ Error processing template ${template.id}:`, error)
    }
  }

  private shouldSendNow(template: Template, now: Date): boolean {
    const cron = template.sendInterval?.cron
    if (!cron) return false

    const parts = cron.split(' ')
    if (parts.length !== 6) return false

    const [, minute] = parts

    const currentMinute = now.getMinutes()

    if (minute.startsWith('*/')) {
      const interval = parseInt(minute.substring(2))
      return currentMinute % interval === 0
    }

    return false
  }

  private async processScheduledTemplate(template: Template, now: Date) {
    try {
      if (!template.sendSchedule) {
        this.logger.warn(`⚠️ Template ${template.id} has no sendSchedule`)
        return
      }

      const freshTemplate = await this.templateRepo.findOne({
        where: { id: template.id },
      })

      if (!freshTemplate || freshTemplate.isSent) {
        this.logger.log(`⏭️ Template ${template.id} is already marked as sent, skipping`)
        return
      }

      const scheduledTime = new Date(template.sendSchedule)
      const timeDifference = now.getTime() - scheduledTime.getTime()
      const timeDifferenceMinutes = timeDifference / (1000 * 60)
      const timeDifferenceSeconds = timeDifference / 1000

      if (timeDifferenceSeconds < -60) {
        this.logger.log(
          `⏳ Template ${template.id} scheduled time ${scheduledTime.toISOString()} is ${Math.abs(
            timeDifferenceMinutes,
          ).toFixed(2)} minutes in the future, will process later`,
        )
        return
      }

      if (timeDifferenceMinutes > 15) {
        this.logger.warn(
          `⚠️ Template ${
            template.id
          } scheduled time ${scheduledTime.toISOString()} is too far in the past (${timeDifferenceMinutes.toFixed(
            2,
          )} minutes ago), marking as sent to prevent retries`,
        )
        await this.templateRepo.update(template.id, { isSent: true })
        return
      }

      if (timeDifferenceSeconds < -30) {
        this.logger.log(
          `⏳ Template ${template.id} scheduled time is ${Math.abs(timeDifferenceSeconds).toFixed(
            0,
          )} seconds in the future, waiting...`,
        )
        return
      }

      this.logger.log(`📅 Processing scheduled notification for template ${template.id}:`, {
        scheduledTime: scheduledTime.toISOString(),
        scheduledTimeLocal: scheduledTime.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
        now: now.toISOString(),
        nowLocal: now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
        timeDifferenceMinutes: timeDifferenceMinutes.toFixed(2),
        timeDifferenceSeconds: timeDifferenceSeconds.toFixed(0),
        approvalStatus: freshTemplate.approvalStatus,
      })

      // Check if this scheduled notification requires approval
      // If approvalStatus is PENDING, it's already in Pending tab - don't process here
      // (Scheduled templates with PENDING status should stay in Pending tab until approved)
      if (freshTemplate.approvalStatus === ApprovalStatus.PENDING) {
        this.logger.log(
          `⏸️ Template ${template.id} is PENDING approval - skipping scheduler processing. It will be processed after approval.`,
        )
        return // Don't process PENDING scheduled templates - they need approval first
      }
      
      // If approvalStatus is null (DRAFT) - this shouldn't happen for scheduled templates created by Editor
      // (They should be created with PENDING status), but handle it just in case
      if (freshTemplate.approvalStatus === null || freshTemplate.approvalStatus === undefined) {
        // Legacy case - set to PENDING and move to Pending tab
        this.logger.log(
          `⏸️ Template ${template.id} is DRAFT (null) - setting to PENDING and moving to Pending tab`,
        )
        const updateResult = await this.templateRepo
          .createQueryBuilder()
          .update(Template)
          .set({
            approvalStatus: ApprovalStatus.PENDING,
            sendType: SendType.SEND_NOW,
            sendSchedule: null,
          })
          .where('id = :id', { id: template.id })
          .andWhere('isSent = :isSent', { isSent: false })
          .execute()

        if (updateResult.affected === 0) {
          this.logger.log(
            `⏭️ Template ${template.id} was already processed by another process, skipping`,
          )
          return
        }

        this.logger.log(
          `✅ Template ${template.id} moved to Pending tab (approvalStatus: PENDING) - awaiting approval before sending`,
        )
        return // Don't send the notification, just wait for approval
      }

      // Additional safety check: Only proceed if APPROVED
      // Block REJECTED or any other unexpected status
      // (PENDING and null were already checked above, this handles REJECTED and other cases)
      const approvalStatus = freshTemplate.approvalStatus
      if (
        approvalStatus !== ApprovalStatus.APPROVED &&
        approvalStatus !== null &&
        approvalStatus !== undefined
      ) {
        // This should never happen due to query filter, but safety check
        // Block REJECTED or any other unexpected status
        this.logger.warn(
          `🚫 SECURITY: Template ${template.id} has invalid approval status for sending: ${approvalStatus} - BLOCKING send. Only APPROVED templates can be sent automatically.`,
        )
        return // DO NOT send - invalid status
      }
      
      // At this point, approvalStatus must be APPROVED (null/undefined already handled above)
      // Double-check to be absolutely sure
      if (approvalStatus !== ApprovalStatus.APPROVED) {
        this.logger.error(
          `🚫 CRITICAL: Template ${template.id} reached send logic with invalid status: ${approvalStatus} - This should never happen!`,
        )
        return // DO NOT send
      }

      // If approved or no approval status (legacy notifications), send immediately
      // When scheduled notification is sent, mark as published and clear schedule
      // This moves it from Scheduled tab to Published tab

      const updateResult = await this.templateRepo
        .createQueryBuilder()
        .update(Template)
        .set({
          isSent: true,
          sendType: SendType.SEND_NOW, // Change to SEND_NOW so it appears in Published tab
          sendSchedule: null, // Clear schedule since it's been sent
        })
        .where('id = :id', { id: template.id })
        .andWhere('isSent = :isSent', { isSent: false })
        .execute()

      if (updateResult.affected === 0) {
        this.logger.log(
          `⏭️ Template ${template.id} was already claimed by another process, skipping to prevent duplicate send`,
        )
        return
      }

      this.logger.log(`🔒 Successfully claimed template ${template.id} for sending`)

      // Final safety check before actually sending
      const finalCheck = await this.templateRepo.findOne({
        where: { id: template.id },
        select: ['id', 'approvalStatus', 'isSent'],
      })

      if (finalCheck?.approvalStatus === ApprovalStatus.PENDING) {
        this.logger.error(
          `🚫 CRITICAL: Template ${template.id} is PENDING - REVERTING isSent flag. This should never happen!`,
        )
        await this.templateRepo.update(template.id, { isSent: false })
        return // DO NOT send
      }

      if (!template.translations || template.translations.length === 0) {
        this.logger.warn(`⚠️ Template ${template.id} has no translations, reloading...`)
        const templateWithTranslations = await this.templateRepo.findOne({
          where: { id: template.id },
          relations: ['translations', 'translations.image'],
        })

        if (
          !templateWithTranslations ||
          !templateWithTranslations.translations ||
          templateWithTranslations.translations.length === 0
        ) {
          this.logger.error(`❌ Template ${template.id} has no translations, cannot send`)
          await this.templateRepo.update(template.id, { isSent: false })
          return
        }

        const sentCount = await this.notificationService.sendWithTemplate(templateWithTranslations)

        if (typeof sentCount === 'number' && sentCount > 0) {
          this.logger.log(
            `✅ Scheduled notification sent successfully for template ${template.id} to ${sentCount} users`,
          )
        } else {
          this.logger.error(
            `❌ Failed to send scheduled notification for template ${template.id} - sentCount: ${sentCount}`,
          )
        }
      } else {
        const sentCount = await this.notificationService.sendWithTemplate(template)

        if (typeof sentCount === 'number' && sentCount > 0) {
          this.logger.log(
            `✅ Scheduled notification sent successfully for template ${template.id} to ${sentCount} users`,
          )
        } else {
          this.logger.error(
            `❌ Failed to send scheduled notification for template ${template.id} - sentCount: ${sentCount}`,
          )
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error processing scheduled template ${template.id}:`, error)
      this.logger.error(`❌ Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  private async updateLastSentAt(template: Template, now: Date) {
    await this.templateRepo.update(template.id, {
      updatedAt: now,
    })
  }
}
