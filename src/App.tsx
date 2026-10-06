import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ContractStateProvider } from './state/contract'
import DashboardPage from './pages/DashboardPage'
import ContractPage from './pages/ContractPage'
import ArchivePage from './pages/ArchivePage'
import ArchiveDetailPage from './pages/ArchiveDetailPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <ContractStateProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="contract" element={<ContractPage />} />
            <Route path="archive" element={<ArchivePage />} />
            <Route path="archive/:number" element={<ArchiveDetailPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route
              path="*"
              element={<p className="text-muted">Page not found.</p>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ContractStateProvider>
  )
}
