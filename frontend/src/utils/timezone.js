export function formatTimestamp(date, options = {}) {
  const d = new Date(date)
  const tz = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  
  return d.toLocaleString('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  })
}

export function formatTime(date) {
  const d = new Date(date)
  const tz = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  
  return d.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function getTimezone() {
  return localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
