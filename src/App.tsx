import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider, RequireAdmin } from './state/auth'
import { AdminProvider } from './state/admin'
import { ContractStateProvider } from './state/contract'
import DashboardPage from './pages/DashboardPage'
import ContractPage from './pages/ContractPage'
import ArchivePage from './pages/ArchivePage'
import ArchiveDetailPage from './pages/ArchiveDetailPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <ContractStateProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="contract" element={<ContractPage />} />
                <Route path="archive" element={<ArchivePage />} />
                <Route path="archive/:number" element={<ArchiveDetailPage />} />
                <Route path="leaderboard" element={<LeaderboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route
                  path="admin"
                  element={
                    <RequireAdmin>
                      <AdminPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="*"
                  element={<p className="text-muted">Page not found.</p>}
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </ContractStateProvider>
      </AdminProvider>
    </AuthProvider>
  )
}
