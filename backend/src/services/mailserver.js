import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger.js'

const execPromise = promisify(exec)

export class MailserverIntegration {
  constructor(config) {
    this.config = config
    this.containerName = config.containerName || 'mailserver'
  }

  async createMailbox(username, email) {
    if (!this.config.enabled) return

    try {
      const command = `docker exec ${this.containerName} setup email add ${email}`
      logger.info('Creating mailbox', { username, email })
      await execPromise(command)
      logger.info('Mailbox created successfully', { email })
    } catch (error) {
      if (error.message.includes('already exists')) {
        logger.debug('Mailbox already exists', { email })
      } else {
        logger.error('Failed to create mailbox', { username, email, error: error.message })
      }
    }
  }

  async deleteMailbox(username) {
    if (!this.config.enabled) return

    try {
      const email = `${username}@${this.config.domain}`
      const command = `docker exec ${this.containerName} setup email del ${email}`
      logger.info('Deleting mailbox', { username, email })
      await execPromise(command)
      logger.info('Mailbox deleted successfully', { email })
    } catch (error) {
      logger.error('Failed to delete mailbox', { username, error: error.message })
    }
  }

  async updateQuota(email, quotaInMB) {
    if (!this.config.enabled || !this.config.quotaManagement) return

    try {
      const command = `docker exec ${this.containerName} setup quota set ${email} ${quotaInMB}M`
      await execPromise(command)
      logger.info('Updated mailbox quota', { email, quota: quotaInMB })
    } catch (error) {
      logger.error('Failed to update quota', { email, error: error.message })
    }
  }

  async listMailboxes() {
    if (!this.config.enabled) return []

    try {
      const command = `docker exec ${this.containerName} setup email list`
      const { stdout } = await execPromise(command)
      const mailboxes = stdout.trim().split('\n').filter(line => line.includes('@'))
      logger.debug('Listed mailboxes', { count: mailboxes.length })
      return mailboxes
    } catch (error) {
      logger.error('Failed to list mailboxes', { error: error.message })
      return []
    }
  }
}
