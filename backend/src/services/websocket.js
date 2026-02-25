import { logger } from '../utils/logger.js'
import { addLogToCache } from './logCache.js'

export function setupWebSocket(io) {
  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`)

    socket.on('subscribe', (data) => {
      const { channel } = data
      socket.join(channel)
      logger.info(`Client ${socket.id} subscribed to ${channel}`)
    })

    socket.on('unsubscribe', (data) => {
      const { channel } = data
      socket.leave(channel)
      logger.info(`Client ${socket.id} unsubscribed from ${channel}`)
    })

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`)
    })
  })

  // Heartbeat every 5 minutes
  setInterval(() => {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Service heartbeat',
        context: { test: true }
      }
      addLogToCache(logEntry)
      io.to('logs').emit('log', logEntry)
    } catch (error) {
      console.error('[websocket] Interval error:', error.message)
    }
  }, 300000) // 5 minutes

  return io
}
