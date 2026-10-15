import { RewardsTab } from '../../components/admin/tabs/RewardsTab'
import { useAdmin } from '../../state/admin'

export default function AdminRewardsPage() {
  const { rewardsHistory, issueReward, retryReward, cancelReward } = useAdmin()

  return (
    <RewardsTab
      rewardsHistory={rewardsHistory}
      issueReward={issueReward}
      retryReward={retryReward}
      cancelReward={cancelReward}
    />
  )
}
