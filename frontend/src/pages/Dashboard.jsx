import { useQuery } from '@tanstack/react-query'
import { Activity, Users, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import { useEffect } from 'react'
import { wsService } from '@/services/websocket'

export function Dashboard() {
  const { setDashboardStats, setSyncStatus } = useAppStore()

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: apiClient.getDashboardStats.bind(apiClient),
    refetchInterval: false, // Poll every 5 seconds
  })

  // Fetch recent activity
  const { data: activity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: apiClient.getRecentActivity.bind(apiClient),
    refetchInterval: false,
  })

  useEffect(() => {
    if (stats) {
      setDashboardStats(stats)
    }
  }, [stats, setDashboardStats])

  // Subscribe to real-time sync status
  useEffect(() => {
    wsService.subscribeSyncStatus((status) => {
      setSyncStatus(status)
    })

    return () => {
      wsService.unsubscribe('sync-status')
    }
  }, [setSyncStatus])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'healthy':
        return 'success'
      case 'warning':
        return 'warning'
      case 'error':
        return 'error'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5" />
      case 'warning':
        return <AlertCircle className="h-5 w-5" />
      case 'error':
        return <AlertCircle className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your Authentik LDAP sync service
        </p>
      </div>

      {/* Status Banner */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(stats?.syncStatus)}
              <div>
                <div className="font-semibold">System Status</div>
                <div className="text-sm text-muted-foreground">
                  Last sync: {stats?.lastSyncTime
                    ? new Date(stats.lastSyncTime).toLocaleString()
                    : 'Never'}
                </div>
              </div>
            </div>
            <Badge variant={getStatusVariant(stats?.syncStatus)}>
              {stats?.syncStatus || 'Unknown'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Authentik Users"
          value={stats?.authentikUsers || 0}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Total users in Authentik"
        />
        <StatsCard
          title="LDAP Users"
          value={stats?.ldapUsers || 0}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Total users in LDAP"
        />
        <StatsCard
          title="Pending Changes"
          value={stats?.pendingChanges || 0}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description="Awaiting approval"
          variant={stats?.pendingChanges > 0 ? 'warning' : 'default'}
        />
        <StatsCard
          title="Failed Syncs"
          value={stats?.failedSyncs || 0}
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          description="Errors in last 24h"
          variant={stats?.failedSyncs > 0 ? 'error' : 'default'}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity && activity.length > 0 ? (
            <div className="space-y-4">
              {activity.map((item, index) => (
                <ActivityItem key={index} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatsCard({ title, value, icon, description, variant = 'default' }) {
  const variantStyles = {
    default: '',
    warning: 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20',
    error: 'border-red-500/50 bg-red-50 dark:bg-red-950/20',
  }

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

function ActivityItem({ item }) {
  const getActionColor = (action) => {
    switch (action) {
      case 'created':
        return 'success'
      case 'updated':
        return 'secondary'
      case 'deleted':
        return 'error'
      case 'failed':
        return 'error'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
      <Badge variant={getActionColor(item.action)} className="mt-0.5">
        {item.action}
      </Badge>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">{item.message}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(item.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
