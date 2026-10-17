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

// Admin Modular Page Files
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminContractsPage from './pages/admin/AdminContractsPage'
import AdminObjectivesPage from './pages/admin/AdminObjectivesPage'
import AdminAgentsPage from './pages/admin/AdminAgentsPage'
import AdminTornSyncPage from './pages/admin/AdminTornSyncPage'
import AdminRewardsPage from './pages/admin/AdminRewardsPage'
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage'
import AdminAlertsPage from './pages/admin/AdminAlertsPage'
import AdminPatternsPage from './pages/admin/AdminPatternsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminActivityPage from './pages/admin/AdminActivityPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'

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

                {/* Dedicated Modular Admin Pages with no duplicate horizontal nav */}
                <Route
                  path="admin"
                  element={
                    <RequireAdmin>
                      <AdminLayout />
                    </RequireAdmin>
                  }
                >
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="contracts" element={<AdminContractsPage />} />
                  <Route path="objectives" element={<AdminObjectivesPage />} />
                  <Route path="agents" element={<AdminAgentsPage />} />
                  <Route path="participants" element={<AdminAgentsPage />} />
                  <Route path="torn-sync" element={<AdminTornSyncPage />} />
                  <Route path="rewards" element={<AdminRewardsPage />} />
                  <Route path="announcements" element={<AdminAnnouncementsPage />} />
                  <Route path="alerts" element={<AdminAlertsPage />} />
                  <Route path="patterns" element={<AdminPatternsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="activity" element={<AdminActivityPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>

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
