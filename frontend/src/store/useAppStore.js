import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // UI State
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // User State
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Dashboard Stats
  dashboardStats: null,
  setDashboardStats: (stats) => set({ dashboardStats: stats }),

  // Logs
  logs: [],
  addLog: (log) => set((state) => ({ 
    logs: [log, ...state.logs].slice(0, 1000) // Keep last 1000 logs
  })),
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
