import express from 'express'
import { authentikClient } from '../services/authentikClient.js'
import { ldapClient } from '../services/ldapClient.js'
import { getSyncState } from '../services/syncService.js'
import { logger } from '../utils/logger.js'

export const dashboardRouter = express.Router()

dashboardRouter.get('/stats', async (req, res) => {
  try {
    const syncState = getSyncState()

    const [authentikUsers, ldapUsers] = await Promise.all([
      authentikClient.getUsers(),
      ldapClient.getUsers(),
    ])

    res.json({
      authentikUsers: authentikUsers.length,
      ldapUsers: ldapUsers.length,
      pendingChanges: 0,
      failedSyncs: syncState.recentErrors.length,
      lastSyncTime: syncState.lastSyncTime,
      lastSyncDuration: syncState.lastSyncDuration,
      syncStatus: syncState.status,
      syncConfig: syncState.config,
    })
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error)
    res.status(500).json({ error: error.message })
  }
})

dashboardRouter.get('/activity', async (req, res) => {
  const syncState = getSyncState()

  const activity = syncState.history.map(h => ({
    action: h.errors > 0 ? 'warning' : 'success',
    message: `Sync: ${h.created} created, ${h.updated} updated, ${h.deleted} deleted${h.errors > 0 ? `, ${h.errors} errors` : ''}`,
    timestamp: h.timestamp,
    details: h,
  }))

  res.json(activity)
})

dashboardRouter.get('/health', async (req, res) => {
  const syncState = getSyncState()

  try {
    await Promise.all([
      authentikClient.getUsers(),
      ldapClient.getUsers(),
    ])

    res.json({
      status: 'healthy',
      services: {
        authentik: 'up',
        ldap: 'up',
        sync: syncState.status,
      },
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    })
  }
})
