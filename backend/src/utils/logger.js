import winston from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function formatTZDate() {
  const tz = process.env.TZ || 'UTC'
  const now = new Date()
  const iso = now.toISOString()
  const tzTime = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  const offsetMinutes = (tzTime.getTime() - now.getTime()) / 60000
  const sign = offsetMinutes <= 0 ? '+' : '-'
  const absOffset = Math.abs(offsetMinutes)
  const h = String(Math.floor(absOffset / 60)).padStart(2, '0')
  const m = String(Math.round(absOffset % 60)).padStart(2, '0')
  return iso.replace('Z', `${sign}${h}:${m}`)
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console output - TZ-aware ISO format
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: formatTZDate }),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`
        })
      ),
    }),
    // Error log file - UTC ISO
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file - UTC ISO
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
})
