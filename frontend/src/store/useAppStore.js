import { create } from 'zustand'

const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme')
    if (stored) return stored
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  }
  return 'light'
}

export const useAppStore = create((set, get) => ({
  // UI State
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Theme
  theme: getInitialTheme(),
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light'
    set({ theme: newTheme })
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  },

  // User State
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Dashboard Stats
  dashboardStats: null,
  setDashboardStats: (stats) => set({ dashboardStats: stats }),

  // Logs
  logs: [],
  addLog: (log) => set((state) => {
    // Check for duplicate using timestamp + message as key
    const logKey = `${log.timestamp}-${log.message}`
    const exists = state.logs.some(l => `${l.timestamp}-${l.message}` === logKey)
    if (exists) return state
    
    return { 
      logs: [log, ...state.logs].slice(0, 1000) // Keep last 1000 logs
    }
  }),
  clearLogs: () => set({ logs: [] }),

  // Filters
  logFilters: {
    level: 'all',
    search: '',
    user: 'all',
  },
  setLogFilters: (filters) => set((state) => ({
    logFilters: { ...state.logFilters, ...filters }
  })),

  // Sync Status
  syncStatus: {
    status: 'idle',
    lastSync: null,
    progress: 0,
    message: '',
  },
  setSyncStatus: (status) => set((state) => ({
    syncStatus: { ...state.syncStatus, ...status }
  })),

  // Notifications
  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, {
      id: Date.now(),
      ...notification,
    }]
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
}))
