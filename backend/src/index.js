// CRITICAL: Load env vars before anything else
import dotenv from 'dotenv'

dotenv.config()

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'

import { dashboardRouter } from './routes/dashboard.js'
import { usersRouter } from './routes/users.js'
import { groupsRouter } from './routes/groups.js'
import { schemaRouter } from './routes/schema.js'
import { changesRouter } from './routes/changes.js'
import { syncRouter } from './routes/sync.js'
import { setupWebSocket } from './services/websocket.js'
import { startSyncService, stopSyncService } from './services/syncService.js'
import { logger } from './utils/logger.js'

import { initializeDatabase, closeDatabase } from './lib/db.js'  // ← Import db after config



const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3331',
    methods: ['GET', 'POST'],
  },
})

initializeDatabase()

// Make io accessible in routes via req.app.get('io')
app.set('io', io)

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3331',
}))
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'alsm-ui-backend',
    timestamp: new Date().toISOString(),
  })
})

// API Routes
app.use('/api/dashboard', dashboardRouter)
app.use('/api/users', usersRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/schema', schemaRouter)
app.use('/api/changes', changesRouter)
app.use('/api/sync', syncRouter)


// WebSocket setup
setupWebSocket(io)

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  })
})

// Start server
const PORT = process.env.PORT || 3333
httpServer.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`WebSocket server ready`)

  // Start sync service after server is up
  await startSyncService(io)
})

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down gracefully...')
  stopSyncService()
  httpServer.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
