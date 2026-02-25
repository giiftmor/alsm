export function getTimestamp() {
  return new Date().toISOString()
}

export function formatTimestamp(date) {
  const tz = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const d = new Date(date)
  return d.toLocaleString('en-US', { timeZone: tz })
}

export function getTimezone() {
  return process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
