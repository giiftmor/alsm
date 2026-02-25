import express from 'express'
import { ldapClient } from '../services/ldapClient.js'
import { authentikClient } from '../services/authentikClient.js'
import { logger } from '../utils/logger.js'
import { addLogToCache } from '../services/logCache.js'
import { createAuditLog } from '../services/auditService.js'

export const passwordRouter = express.Router()

passwordRouter.post('/sync/:username', async (req, res) => {
  try {
    const { username } = req.params
    const { password } = req.body
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }
    
    addLogToCache({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[PASSWORD-SYNC] Setting password for user: ${username}`,
      context: { username }
    })
    
    // 1. Set password in LDAP
    const ldapResult = await ldapClient.setUserPassword(username, password)
    
    if (!ldapResult) {
      await createAuditLog({
        action: 'password_sync_failed',
        actor: 'api',
        entity_type: 'user',
        entity_id: username,
        changes: { target: 'ldap', success: false },
        source: 'api',
        success: false,
        error_message: 'Failed to set password in LDAP',
      })
      return res.status(500).json({ error: 'Failed to set password in LDAP' })
    }
    
    addLogToCache({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[PASSWORD-SYNC] Password set in LDAP for: ${username}`,
      context: { username, target: 'ldap' }
    })
    
    // 2. Get Authentik user
    const akUser = await authentikClient.getUserByUsername(username)
    
    let authentikResult = 'skipped'
    
    if (!akUser) {
      addLogToCache({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `[PASSWORD-SYNC] User ${username} not found in Authentik`,
        context: { username }
      })
    } else {
      try {
        await authentikClient.setPassword(akUser.pk, password)
        authentikResult = 'success'
        addLogToCache({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `[PASSWORD-SYNC] Password set in Authentik for: ${username}`,
          context: { username, target: 'authentik' }
        })
      } catch (akError) {
        authentikResult = `failed: ${akError.message}`
        addLogToCache({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `[PASSWORD-SYNC] Authentik error: ${akError.message}`,
          context: { username, error: akError.message }
        })
      }
    }
    
    // Create audit log entry
    await createAuditLog({
      action: 'password_synced',
      actor: 'api',
      entity_type: 'user',
      entity_id: username,
      changes: { ldap: 'success', authentik: authentikResult },
      source: 'api',
      success: authentikResult === 'success',
    })
    
    res.json({
      success: authentikResult === 'success',
      username,
      ldap: 'success',
      authentik: authentikResult,
    })
  } catch (error) {
    addLogToCache({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `[PASSWORD-SYNC] Error: ${error.message}`,
      context: { error: error.message }
    })
    res.status(500).json({ error: error.message })
  }
})
