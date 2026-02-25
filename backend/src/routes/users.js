import express from 'express'
import { authentikClient } from '../services/authentikClient.js'
import { ldapClient } from '../services/ldapClient.js'
import { logger } from '../utils/logger.js'

export const usersRouter = express.Router()

usersRouter.get('/', async (req, res) => {
  try {
    const { search, status } = req.query
    
    const authentikUsers = await authentikClient.getUsers({ search })
    const ldapUsers = await ldapClient.getUsers()
    
    // Create map of LDAP users by uid
    const ldapMap = new Map(ldapUsers.map(u => [u.uid, u]))
    
    // Combine and add sync status
    const users = authentikUsers.map(aUser => {
      const lUser = ldapMap.get(aUser.username)
      
      let syncStatus = 'not_synced'
      let error = null
      
      if (lUser) {
        // Check if data matches
        const matches = 
          lUser.mail === aUser.email &&
          lUser.cn === (aUser.name || aUser.username)
        
        syncStatus = matches ? 'synced' : 'pending'
      }
      
      const hasPassword = !!aUser.password_change_date
      
      return {
        id: aUser.pk,
        username: aUser.username,
        email: aUser.email,
        name: aUser.name,
        isActive: aUser.is_active,
        syncStatus,
        error,
        hasPassword,
        lastSynced: lUser ? new Date().toISOString() : null,
      }
    })
    
    // Filter by status if requested
    const filtered = (status && status !== 'all')
      ? users.filter(u => u.syncStatus === status)
      : users
    // Filter by status if requested (but skip if status is 'all')
    // const filtered = (status && status !== 'all')
    //   ? users.filter(u => u.syncStatus === status)
    //   : users


    res.json(filtered)
  } catch (error) {
    logger.error('Error fetching users:', error)
    res.status(500).json({ error: error.message })
  }
})

usersRouter.get('/:id/compare', async (req, res) => {
  try {
    const aUser = await authentikClient.getUser(req.params.id)
    const lUser = await ldapClient.getUser(aUser.username)
    
    const differences = {}
    
    if (lUser) {
      // Compare fields
      if (aUser.email !== lUser.mail) {
        differences.mail = {
          authentik: aUser.email,
          ldap: lUser.mail,
        }
      }
      
      if ((aUser.name || aUser.username) !== lUser.cn) {
        differences.cn = {
          authentik: aUser.name || aUser.username,
          ldap: lUser.cn,
        }
      }
    }
    
    res.json({
      authentik: {
        username: aUser.username,
        email: aUser.email,
        name: aUser.name,
        is_active: aUser.is_active,
      },
      ldap: lUser ? {
        uid: lUser.uid,
        mail: lUser.mail,
        cn: lUser.cn,
        sn: lUser.sn,
      } : null,
      differences,
    })
  } catch (error) {
    logger.error('Error comparing user:', error)
    res.status(500).json({ error: error.message })
  }
})

usersRouter.post('/:id/test-mapping', async (req, res) => {
  try {
    const aUser = await authentikClient.getUser(req.params.id)
    
    // Generate LDAP entry based on current mapping logic
    const ldapEntry = {
      uid: aUser.username,
      cn: aUser.name || aUser.username,
      sn: aUser.name || aUser.username, // THIS IS THE FIX!
      mail: aUser.email || `${aUser.username}@spectres.co.za`,
      objectClass: ['inetOrgPerson', 'organizationalPerson', 'person', 'top'],
    }
    
    // Validate
    const validation = {
      valid: true,
      errors: [],
    }
    
    // Check required attributes
    if (!ldapEntry.uid) validation.errors.push('Missing required attribute: uid')
    if (!ldapEntry.cn) validation.errors.push('Missing required attribute: cn')
    if (!ldapEntry.sn) validation.errors.push('Missing required attribute: sn')
    if (!ldapEntry.mail) validation.errors.push('Missing required attribute: mail')
    
    validation.valid = validation.errors.length === 0
    
    res.json({
      authentikData: aUser,
      ldapEntry,
      validation,
    })
  } catch (error) {
    logger.error('Error testing mapping:', error)
    res.status(500).json({ error: error.message })
  }
})
