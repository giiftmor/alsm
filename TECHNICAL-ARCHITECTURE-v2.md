# Technical Architecture - Authentik LDAP Sync Management UI

## Document Information
- **Version**: 2.0.0 (Updated)
- **Date**: February 19, 2026
- **Status**: Production
- **Owner**: Technical Team
- **Previous Version**: 1.0.0 (February 16, 2026)

---

## Change Log

### Version 2.0.0 - February 19, 2026
- **BREAKING:** Integrated sync service into backend (no longer separate Docker)
- **BREAKING:** Migrated from SQLite to PostgreSQL
- **BREAKING:** Replaced ldapjs (deprecated) with ldapts
- **BREAKING:** Replaced axios with native fetch API
- Updated ports: Frontend 3331, Backend 3333
- Added change detection engine
- Added password validation detection
- Removed caching layer (not implemented)
- Updated module system to ES modules

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Component Design](#component-design)
3. [Data Flow](#data-flow)
4. [API Specifications](#api-specifications)
5. [Database Design](#database-design)
6. [Security Architecture](#security-architecture)
7. [Integration Patterns](#integration-patterns)
8. [Performance Considerations](#performance-considerations)

---

## System Architecture

### High-Level Architecture (As Built)

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Browser                                 │
│                (Chrome, Firefox, Safari, etc.)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                Frontend Layer (Port 3331)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         React 18 SPA (Vite + JavaScript)                  │  │
│  │                                                            │  │
│  │  Pages:                                                   │  │
│  │  • Dashboard       • User Browser    • Schema Mapper      │  │
│  │  • Log Viewer      • Changes (TODO)  • Settings (TODO)    │  │
│  │                                                            │  │
│  │  State: Zustand                                           │  │
│  │  Data: React Query + WebSocket                            │  │
│  │  UI: Tailwind CSS + shadcn/ui                             │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                   ┌─────┴──────┐
                   │            │
              REST API      WebSocket
                   │            │
                   ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│               Backend Layer (Port 3333)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Node.js 25.6.1 + Express + Socket.io              │  │
│  │                                                            │  │
│  │  Services:                                                │  │
│  │  • Sync Service      • Change Detector                    │  │
│  │  • Authentik Client  • LDAP Client (ldapts)               │  │
│  │  • Mailserver Client • WebSocket Server                   │  │
│  │  • Database Manager  • Logger (Winston)                   │  │
│  │                                                            │  │
│  │  Routes:                                                  │  │
│  │  • /api/dashboard    • /api/users     • /api/schema       │  │
│  │  • /api/changes      • /api/sync                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└──┬──────────┬───────────┬────────────┬─────────────┬───────────┘
   │          │           │            │             │
   ▼          ▼           ▼            ▼             ▼
┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Postgres│ │Authentik │ │ 389 DS   │ │Mailserver│ │WebSocket │
│   DB   │ │   API    │ │  LDAP    │ │ (Docker) │ │ Clients  │
│        │ │Port 9000 │ │ Port 389 │ │          │ │          │
└────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Architecture Principles

**1. Unified Backend**
- Sync service integrated (not separate container)
- Single Node.js process
- Shared database connection pool
- Centralized error handling

**2. ES Module Architecture**
```javascript
// All files use ES modules
import { something } from './module.js'
export const myFunction = () => {}
```

**3. Async/Await Throughout**
```javascript
// No callbacks - pure async/await
const users = await ldapClient.getUsers()
const response = await fetch(url)
```

**4. WebSocket for Real-Time**
```javascript
// Server → Client updates
io.to('logs').emit('log', logData)
io.to('sync-status').emit('sync-status', status)
io.to('changes').emit('changes-detected', changes)
```

---

## Component Design

### Frontend Components

#### Core Layout
```javascript
// src/App.jsx
<Router>
  <Layout>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/users" element={<UserBrowser />} />
      <Route path="/logs" element={<LogViewer />} />
      <Route path="/schema" element={<SchemaMapper />} />
      <Route path="/changes" element={<Changes />} />  {/* TODO */}
    </Routes>
  </Layout>
</Router>
```

#### Dashboard Component
```javascript
// src/pages/Dashboard.jsx
export function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: false, // Disabled - will use WebSocket
  })

  const { data: activity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: apiClient.getRecentActivity,
    refetchInterval: false,
  })

  return (
    <div className="space-y-4">
      <StatsCards stats={stats} />
      <SyncStatusIndicator status={stats?.syncStatus} />
      <RecentActivityFeed activity={activity} />
    </div>
  )
}
```

#### User Browser Component
```javascript
// src/pages/UserBrowser.jsx
export function UserBrowser() {
  const [filters, setFilters] = useState({ status: 'all', search: '' })
  
  const { data: users } = useQuery({
    queryKey: ['users', filters],
    queryFn: () => apiClient.getUsers(filters),
    refetchInterval: false,
  })

  return (
    <div>
      <UserFilters filters={filters} onChange={setFilters} />
      <UserTable users={users} />
    </div>
  )
}
```

#### Log Viewer Component
```javascript
// src/pages/LogViewer.jsx
export function LogViewer() {
  const [logs, addLog] = useStore(state => [state.logs, state.addLog])
  const [logFilters, setLogFilters] = useState({ level: 'all', search: '', user: 'all' })

  // WebSocket subscription
  useEffect(() => {
    wsService.subscribeLogs((log) => {
      addLog(log)
    }, logFilters)

    return () => wsService.unsubscribe('logs')
  }, [addLog, logFilters])

  const filteredLogs = useMemo(() => {
    return filterLogs(logs, logFilters)
  }, [logs, logFilters])

  return (
    <div>
      <LogFilters filters={logFilters} onChange={setLogFilters} />
      <LogList logs={filteredLogs} />
    </div>
  )
}
```

### Backend Services

#### Sync Service (Core)
```javascript
// src/services/syncService.js
import { Client } from 'ldapts'
import { detectChanges } from './changeDetector.js'

async function runSyncCycle(io) {
  // Connect to LDAP
  const client = new Client({ url: 'ldap://...' })
  await client.bind(dn, password)

  // Fetch from both sources
  const [authentikUsers, ldapUsers] = await Promise.all([
    fetchAuthentikUsers(config),
    searchLDAPUsers(client, config),
  ])

  // Sync logic
  for (const user of authentikUsers) {
    // Create, update, or delete in LDAP
  }

  // Detect changes
  await detectChanges(authentikUsers, ldapUsers)

  // Broadcast to UI
  io.to('sync-status').emit('sync-status', { status: 'success', ... })
}

export async function startSyncService(io) {
  await runSyncCycle(io)
  const interval = setInterval(() => runSyncCycle(io), 5 * 60 * 1000)
}
```

#### Change Detector
```javascript
// src/services/changeDetector.js
export async function detectChanges(authentikUsers, ldapUsers) {
  const orphans = detectOrphanedUsers(authentikUsers, ldapUsers)
  const mismatches = detectFieldMismatches(authentikUsers, ldapUsers)
  
  await storeChanges([...orphans, ...mismatches])
  
  return { orphans: orphans.length, mismatches: mismatches.length }
}

async function detectOrphanedUsers(authentikUsers, ldapUsers) {
  const authentikUsernames = new Set(authentikUsers.map(u => u.username))
  return ldapUsers.filter(u => !authentikUsernames.has(u.uid))
}
```

#### LDAP Client (ldapts)
```javascript
// src/services/ldapClient.js
import { Client } from 'ldapts'

export class LDAPClient {
  async connect() {
    this.client = new Client({ url: 'ldap://...' })
    await this.client.bind(this.bindDN, this.bindPassword)
  }

  async getUsers() {
    const { searchEntries } = await this.client.search(baseDN, {
      filter: '(objectClass=inetOrgPerson)',
      attributes: ['uid', 'cn', 'sn', 'mail'],
    })
    return searchEntries
  }
}
```

#### Authentik Client (Native Fetch)
```javascript
// src/services/authentikClient.js
export class AuthentikClient {
  async getUsers(params = {}) {
    const url = new URL('/api/v3/core/users/', this.baseUrl)
    url.searchParams.set('page_size', 1000)
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.apiToken}` }
    })
    
    const data = await response.json()
    return data.results
  }
}
```

---

## Data Flow

### Sync Flow (Every 5 Minutes)

```
1. Timer Triggers
   ↓
2. connectLDAP()
   ↓
3. Fetch Authentik Users (API)
   ↓
4. Fetch LDAP Users (ldapts)
   ↓
5. Compare & Sync
   ├─→ Create missing users
   ├─→ Update changed users
   └─→ Delete orphaned users (optional)
   ↓
6. Sync Groups (if enabled)
   ↓
7. Detect Changes
   ├─→ Find orphans
   ├─→ Find mismatches
   └─→ Store in changes table
   ↓
8. Update sync_history
   ↓
9. Broadcast to UI via WebSocket
   └─→ io.to('sync-status').emit(...)
```

### Change Detection Flow

```
1. Post-Sync Detection
   ↓
2. detectOrphanedUsers()
   └─→ Users in LDAP but not Authentik
   ↓
3. detectFieldMismatches()
   ├─→ Email mismatches
   ├─→ Name mismatches
   └─→ sn mismatches
   ↓
4. storeChanges()
   ├─→ Check if change already pending
   ├─→ Update existing OR insert new
   └─→ Store in PostgreSQL
   ↓
5. Broadcast to UI
   └─→ io.to('changes').emit('changes-detected', ...)
```

### Approval Flow (Future)

```
1. Admin views pending changes
   ↓
2. Reviews before/after comparison
   ↓
3. Clicks "Approve" or "Reject"
   ↓
4. POST /api/changes/:id/approve
   ↓
5. Backend applies change
   ├─→ Revert LDAP to match Authentik
   ├─→ Create version snapshot
   ├─→ Log to audit_log
   └─→ Update change status
   ↓
6. Broadcast success to UI
```

---

## API Specifications

### Dashboard Endpoints

```javascript
GET /api/dashboard/stats
Response: {
  authentikUsers: 8,
  ldapUsers: 8,
  pendingChanges: 0,
  failedSyncs: 0,
  lastSyncTime: "2026-02-19T12:00:00Z",
  lastSyncDuration: 250,
  syncStatus: "success"
}

GET /api/dashboard/activity
Response: [
  {
    action: "success",
    message: "Sync: 2 created, 3 updated, 0 deleted",
    timestamp: "2026-02-19T12:00:00Z",
    details: { created: 2, updated: 3, deleted: 0 }
  }
]
```

### User Endpoints

```javascript
GET /api/users?search=&status=all
Response: [
  {
    id: 57,
    username: "neomoruri",
    email: "neo@spectres.co.za",
    name: "Neo Moruri",
    syncStatus: "synced",
    lastSynced: "2026-02-19T12:00:00Z"
  }
]

GET /api/users/:id/compare
Response: {
  authentik: { email: "neo@spectres.co.za", name: "Neo Moruri" },
  ldap: { mail: "neo@spectres.co.za", cn: "Neo Moruri" },
  differences: []
}
```

### Sync Endpoints

```javascript
GET /api/sync/status
Response: {
  status: "success",
  lastSyncTime: "2026-02-19T12:00:00Z",
  lastSyncDuration: 250,
  isConnected: true,
  recentErrors: [],
  history: [...]
}

POST /api/sync/run
Response: {
  message: "Sync triggered",
  status: "running"
}
```

### Change Endpoints

```javascript
GET /api/changes/pending
Response: [
  {
    id: 1,
    entity_type: "user",
    entity_id: "akadmin",
    change_type: "field_mismatch",
    field_name: "email",
    authentik_value: "admin@spectres.co.za",
    ldap_value: "akadmin@spectres.co.za",
    detected_at: "2026-02-19T11:00:00Z",
    status: "pending"
  }
]

POST /api/changes/:id/approve
Request: { approved_by: "neomoruri" }
Response: {
  success: true,
  change: {...},
  message: "Change approved"
}
```

---

## Database Design

### PostgreSQL Schema

```sql
-- Changes table (awaiting approval)
CREATE TABLE changes (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100),
  authentik_value TEXT,
  ldap_value TEXT,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  applied_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_changes_status ON changes(status);
CREATE INDEX idx_changes_entity ON changes(entity_type, entity_id);

-- Versions table (snapshots for rollback)
CREATE TABLE versions (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  description TEXT
);

CREATE UNIQUE INDEX idx_versions_unique 
ON versions(entity_type, entity_id, version_number);

-- Audit log table (complete history)
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(100) NOT NULL,
  actor VARCHAR(255),
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  changes JSONB,
  source VARCHAR(50),
  ip_address VARCHAR(45),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);

-- Sync history table (cycle tracking)
CREATE TABLE sync_history (
  id SERIAL PRIMARY KEY,
  cycle_id VARCHAR(100) UNIQUE NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  status VARCHAR(50),
  users_created INTEGER DEFAULT 0,
  users_updated INTEGER DEFAULT 0,
  users_deleted INTEGER DEFAULT 0,
  groups_synced INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details JSONB,
  total_authentik_users INTEGER,
  total_ldap_users INTEGER
);
```

---

## Security Architecture

### Current State (Development)

**Authentication:** ❌ Not implemented
**Authorization:** ❌ Not implemented  
**Encryption:** ❌ HTTP only (no TLS)
**Input Validation:** ⚠️ Basic

### Planned (Production)

**Authentication:**
- Session-based authentication
- Integration with Authentik OIDC
- JWT tokens for API

**Authorization:**
- Role-based access control (RBAC)
- Roles: admin, reviewer, viewer
- Endpoint-level permissions

**Encryption:**
- HTTPS/TLS in production
- Encrypted database connections
- Secure credential storage

**Input Validation:**
- Zod schemas for API requests
- LDAP injection prevention
- SQL injection prevention (pg parameterized queries)

---

## Integration Patterns

### Authentik Integration

```javascript
// Read-only integration
const response = await fetch(authentikUrl + '/api/v3/core/users/', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Future: Write operations (not implemented)
// await fetch(authentikUrl + '/api/v3/core/users/:id/', {
//   method: 'PATCH',
//   body: JSON.stringify({ email: newEmail })
// })
```

### LDAP Integration

```javascript
// ldapts - async/await style
const client = new Client({ url: 'ldap://...' })
await client.bind(dn, password)

const { searchEntries } = await client.search(baseDN, {
  filter: '(uid=username)',
  attributes: ['uid', 'mail', 'cn']
})

await client.add(dn, entry)
await client.modify(dn, changes)
await client.del(dn)
```

### Mailserver Integration

```javascript
// Docker exec commands
import { exec } from 'child_process'

const command = `docker exec mailserver setup email add ${email}`
await execPromise(command)
```

### WebSocket Integration

```javascript
// Server-side broadcast
io.to('logs').emit('log', {
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Sync completed',
  context: { created: 2, updated: 3 }
})

// Client-side subscription
wsService.subscribeLogs((log) => {
  addLog(log)
})
```

---

## Performance Considerations

### Database Optimization

**Connection Pooling:**
```javascript
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

**Indexes:**
```sql
-- Fast status queries
CREATE INDEX idx_changes_status ON changes(status);

-- Fast entity lookups
CREATE INDEX idx_changes_entity ON changes(entity_type, entity_id);

-- Fast timestamp queries
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
```

### API Optimization

**Pagination** (Not yet implemented):
```javascript
GET /api/users?page=1&limit=50
GET /api/changes?page=1&limit=100
```

**Caching** (Not implemented):
```javascript
// Future: Redis caching
const cached = await redis.get(`users:${cacheKey}`)
if (cached) return JSON.parse(cached)
```

### WebSocket Optimization

**Room-based Broadcasting:**
```javascript
// Only send to subscribed clients
io.to('logs').emit('log', data)
io.to('sync-status').emit('sync-status', data)
```

**Throttling** (Future):
```javascript
// Limit log emission rate
const throttledEmit = throttle((log) => {
  io.to('logs').emit('log', log)
}, 100) // Max 10/second
```

---

## Deployment Architecture

### Development Setup

```
Host Machine (Ubuntu)
├── 389 Directory Server (systemd)
├── Authentik (Docker)
├── Mailserver (Docker)
└── ALSM-UI
    ├── Backend (Node.js 25.6.1)
    │   └── Port 3333
    └── Frontend (Vite dev server)
        └── Port 3331 --host
```

### Production Setup (Planned)

```
Reverse Proxy (Nginx)
    ├── HTTPS → Frontend (Static files)
    └── HTTPS → Backend API
              ├── PostgreSQL
              ├── Authentik API
              └── LDAP Server
```

---

**Document Control**
- Last Updated: February 19, 2026
- Next Review: February 26, 2026
- Owner: Technical Team
- Status: Living Document

---

*End of Technical Architecture Document v2.0*
