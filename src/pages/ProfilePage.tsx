import {
  AchievementsCard,
  HistoryCard,
  StatsCard,
} from '../components/dashboard'
import { PageHeader } from '../components/ui'

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Agent Profile"
        subtitle="Your personal statistics, achievements and contract history."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <HistoryCard showLink={false} />
        <StatsCard />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <AchievementsCard />
      </div>
    </>
  )
}
