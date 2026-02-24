import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { UserBrowser } from './pages/UserBrowser'
import { GroupBrowser } from './pages/GroupBrowser'
import { LogViewer } from './pages/LogViewer'
import { SchemaMapper } from './pages/SchemaMapper'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UserBrowser />} />
            <Route path="groups" element={<GroupBrowser />} />
            <Route path="logs" element={<LogViewer />} />
            <Route path="schema" element={<SchemaMapper />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
