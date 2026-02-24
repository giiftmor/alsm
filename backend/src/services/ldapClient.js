import { Client } from 'ldapts'
import { logger } from '../utils/logger.js'

export class LDAPClient {
  constructor() {
    this.host = process.env.LDAP_HOST || '172.17.0.1'
    this.port = parseInt(process.env.LDAP_PORT || '389')
    this.bindDN = process.env.LDAP_BIND_DN || 'cn=Directory Manager,dc=spectres,dc=co,dc=za'
    this.bindPassword = process.env.LDAP_BIND_PASSWORD
    this.baseDN = process.env.LDAP_BASE_DN || 'dc=spectres,dc=co,dc=za'
    this.client = null
    this.isConnected = false
  }

  async connect() {
    if (this.isConnected) return

    this.client = new Client({
      url: `ldap://${this.host}:${this.port}`,
      timeout: 5000,
      connectTimeout: 10000,
    })

    await this.client.bind(this.bindDN, this.bindPassword)
    this.isConnected = true
    logger.info('Connected to LDAP server')
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.unbind()
      this.client = null
      this.isConnected = false
      logger.info('Disconnected from LDAP server')
    }
  }

  async search(base, options = {}) {
    await this.connect()

    const { searchEntries } = await this.client.search(base, {
      scope: 'sub',
      filter: '(objectClass=*)',
      ...options,
    })

    return searchEntries
  }

  async getUsers() {
    try {
      return await this.search(`ou=people,${this.baseDN}`, {
        filter: '(objectClass=inetOrgPerson)',
        attributes: ['uid', 'cn', 'sn', 'mail', 'memberOf'],
      })
    } catch (error) {
      logger.error('Failed to get LDAP users:', error)
      throw error
    }
  }

  async getUser(uid) {
    try {
      const entries = await this.search(`ou=people,${this.baseDN}`, {
        filter: `(uid=${uid})`,
      })
      return entries[0] || null
    } catch (error) {
      logger.error(`Failed to get LDAP user ${uid}:`, error)
      throw error
    }
  }

  async getGroups() {
    try {
      return await this.search(`ou=groups,${this.baseDN}`, {
        filter: '(objectClass=groupOfNames)',
        attributes: ['cn', 'description', 'member'],
      })
    } catch (error) {
      logger.error('Failed to get LDAP groups:', error)
      throw error
    }
  }

  async getGroup(cn) {
    try {
      const entries = await this.search(`ou=groups,${this.baseDN}`, {
        filter: `(cn=${cn})`,
      })
      return entries[0] || null
    } catch (error) {
      logger.error(`Failed to get LDAP group ${cn}:`, error)
      throw error
    }
  }
}

export const ldapClient = new LDAPClient()